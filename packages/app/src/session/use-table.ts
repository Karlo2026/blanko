import { freshMemory, recall, updateMemory, type Memory } from '@blanko/bots';
import {
  applyAction,
  getPlayerView,
  legalActions,
  scoreRound,
  type Action,
  type GameState,
  type PlayerView,
  type RoundScore,
  type Rng,
} from '@blanko/engine';
import { useEffect, useRef, useState } from 'react';
import { measureAnchor, type Flight } from '../components/FlightLayer.tsx';
import { BotClient } from './bot-client.ts';
import { anchorKey, flightDuration, flightsFor } from './flights.ts';
import { NO_SELECTION, resolveTap, type Selection, type Tap } from './interaction.ts';
import { HUMAN, type Session } from './session.ts';
import type { Tempo } from './tempo.ts';
import { changedSlots, moveText, statusText } from './texts.ts';

/** So lange bleibt eine per 8 oder 9 angeschaute Karte offen. */
const REVEAL_MS = 2200;

interface TableState {
  readonly game: GameState;
  readonly memories: readonly Memory[];
  readonly selection: Selection;
  /** Text des letzten abgeschlossenen Zuges; ein bloßes Ziehen ändert ihn nicht. */
  readonly lastMove: string;
  readonly changed: ReadonlySet<string>;
  /** Per 8 oder 9 angeschaute Karte, die gerade offen gezeigt wird. */
  readonly reveal: { readonly player: number; readonly slot: number } | null;
  readonly score: RoundScore | null;
  /** Karten, die gerade fliegen; solange wartet der Tisch. */
  readonly flights: readonly Flight[];
}

export interface Table {
  readonly view: PlayerView;
  readonly legal: readonly Action[];
  readonly selection: Selection;
  readonly status: string;
  readonly changed: ReadonlySet<string>;
  readonly reveal: TableState['reveal'];
  readonly score: RoundScore | null;
  readonly flights: readonly Flight[];
  /** Anker, auf denen gerade eine Karte landet; dort bleibt der Platz bis zur Landung leer. */
  readonly landing: ReadonlySet<string>;
  /** Solange Karten fliegen, reagiert nichts auf Tipps. */
  readonly busy: boolean;
  readonly tap: (tap: Tap) => void;
  readonly knock: () => void;
  readonly cancel: () => void;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealOf(action: Action): TableState['reveal'] {
  if (action.type === 'peekOwn') return { player: HUMAN, slot: action.slot };
  if (action.type === 'peekOpponent') return { player: action.target, slot: action.targetSlot };
  return null;
}

/**
 * Steuert eine Runde am Tisch: menschliche Tipps, Bot-Züge im Worker und das Gedächtnis der
 * Bots. Spielregeln stecken ausschließlich in der Engine.
 */
export function useTable(
  session: Session,
  start: GameState,
  rng: Rng,
  tempo: Tempo,
  onScored: (score: RoundScore) => void,
): Table {
  const initial: TableState = {
    game: start,
    memories: session.names.map(() => freshMemory),
    selection: NO_SELECTION,
    lastMove: '',
    changed: new Set(),
    reveal: null,
    score: null,
    flights: [],
  };
  const [table, setTable] = useState<TableState>(initial);
  const tableRef = useRef(table);
  const clientRef = useRef<BotClient | null>(null);
  const nextFlightId = useRef(1);
  const onScoredRef = useRef(onScored);
  onScoredRef.current = onScored;
  // Das Tempo lässt sich mitten in der Runde ändern; die Zeitgeber lesen immer den aktuellen Wert.
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;

  const commit = (next: TableState): void => {
    tableRef.current = next;
    setTable(next);
  };

  /** Führt eine Aktion aus und aktualisiert Statuszeile, Bot-Gedächtnis und gegebenenfalls die Wertung. */
  const perform = (action: Action, selection: Selection): void => {
    const current = tableRef.current;
    const { state, events } = applyAction(current.game, action, rng);
    const memories = current.memories.map((memory, player) => {
      const forgetRate = player === HUMAN ? 0 : session.profile.forgetRate;
      return forgetRate === 0
        ? memory
        : updateMemory(memory, events, getPlayerView(state, player), forgetRate, rng);
    });
    const score = state.phase.kind === 'roundOver' ? scoreRound(state, rng) : null;
    const reveal = current.game.current === HUMAN ? revealOf(action) : null;
    const move = moveText(events, session.names);
    // Startpositionen jetzt messen, solange noch der alte Zustand gezeichnet ist.
    const plans = prefersReducedMotion()
      ? []
      : flightsFor(
          events,
          getPlayerView(current.game, HUMAN),
          getPlayerView(state, HUMAN),
          tempoRef.current.flightMs,
        );
    const flights = plans.flatMap((plan): Flight[] => {
      const from = measureAnchor(anchorKey(plan.from));
      return from === null
        ? []
        : [
            {
              id: nextFlightId.current++,
              from,
              toKey: anchorKey(plan.to),
              face: plan.face,
              delayMs: plan.delayMs,
              durationMs: tempoRef.current.flightMs,
            },
          ];
    });
    commit({
      game: state,
      memories,
      selection,
      lastMove: move === '' ? current.lastMove : move,
      changed: changedSlots(events),
      reveal,
      score,
      flights,
    });
    if (score !== null) onScoredRef.current(score);
  };

  useEffect(() => {
    const client = new BotClient();
    clientRef.current = client;
    return () => {
      client.dispose();
    };
  }, []);

  // Bot-Züge: nach einer kurzen Pause rechnet der Worker, dann wird der Zug ausgeführt.
  useEffect(() => {
    const { game, reveal, memories, flights } = table;
    if (game.phase.kind === 'roundOver' || game.current === HUMAN || flights.length > 0) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        const player = game.current;
        const view = recall(getPlayerView(game, player), memories[player] ?? freshMemory);
        void clientRef.current
          ?.chooseAction(session.profile, view, legalActions(game), rng.nextInt(2 ** 31))
          .then((action) => {
            if (!cancelled && tableRef.current.game === game) perform(action, NO_SELECTION);
          });
      },
      reveal === null ? tempoRef.current.botPauseMs : REVEAL_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [table]);

  // Nach der Landung aller Karten geht es weiter.
  useEffect(() => {
    if (table.flights.length === 0) return;
    const timer = setTimeout(
      () => {
        commit({ ...tableRef.current, flights: [] });
      },
      flightDuration(
        table.flights.map((f) => ({ delayMs: f.delayMs })),
        Math.max(0, ...table.flights.map((f) => f.durationMs)),
      ),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [table.flights]);

  // Eine angeschaute Karte schließt sich nach kurzer Zeit wieder, auch wenn der Mensch am Zug bleibt.
  useEffect(() => {
    if (table.reveal === null) return;
    const timer = setTimeout(() => {
      commit({ ...tableRef.current, reveal: null });
    }, REVEAL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [table.reveal]);

  const busy = table.flights.length > 0;
  const view = getPlayerView(table.game, HUMAN);
  const legal = table.game.current === HUMAN ? legalActions(table.game) : [];
  return {
    view,
    legal,
    selection: table.selection,
    status: statusText(table.lastMove, session.names, view),
    changed: table.changed,
    reveal: table.reveal,
    score: table.score,
    flights: table.flights,
    landing: new Set(table.flights.map((f) => f.toKey)),
    busy,
    tap(tap) {
      if (busy) return;
      const result = resolveTap(view, legal, table.selection, tap);
      if (result === null) return;
      if (result.action === null) commit({ ...tableRef.current, selection: result.selection });
      else perform(result.action, result.selection);
    },
    knock() {
      if (!busy && legal.some((a) => a.type === 'knock')) perform({ type: 'knock' }, NO_SELECTION);
    },
    cancel() {
      commit({ ...tableRef.current, selection: NO_SELECTION });
    },
  };
}
