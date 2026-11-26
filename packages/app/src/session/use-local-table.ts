import { freshMemory, recall, rememberAll, type Memory } from '@blanko/bots';
import {
  applyAction,
  getPlayerView,
  legalActions,
  scoreRound,
  type Action,
  type GameState,
  type RoundScore,
  type Rng,
} from '@blanko/engine';
import { useEffect, useRef, useState } from 'react';
import { BotClient } from './bot-client.ts';
import type { Selection } from './interaction.ts';
import { NO_SELECTION } from './interaction.ts';
import { LOCAL_SEAT, type Session } from './session.ts';
import {
  firstScene,
  nextScene,
  REVEAL_MS,
  tableFrom,
  useSceneTimers,
  type Scene,
  type Table,
} from './table.ts';
import type { Tempo } from './tempo.ts';

interface LocalState {
  readonly game: GameState;
  readonly memories: readonly Memory[];
  readonly scene: Scene;
}

const legalFor = (game: GameState): readonly Action[] =>
  game.current === LOCAL_SEAT ? legalActions(game) : [];

/**
 * Einzelspielermodus: Die Runde läuft im Browser, Bots rechnen im Worker und haben ein Gedächtnis.
 * Spielregeln stecken ausschließlich in der Engine.
 */
export function useLocalTable(
  session: Session,
  start: GameState,
  rng: Rng,
  tempo: Tempo,
  onScored: (score: RoundScore) => void,
): Table {
  const [state, setState] = useState<LocalState>(() => ({
    game: start,
    memories: session.names.map(() => freshMemory),
    scene: firstScene(getPlayerView(start, LOCAL_SEAT), legalFor(start)),
  }));
  const stateRef = useRef(state);
  const clientRef = useRef<BotClient | null>(null);
  const onScoredRef = useRef(onScored);
  onScoredRef.current = onScored;
  // Das Tempo lässt sich mitten in der Runde ändern; die Zeitgeber lesen immer den aktuellen Wert.
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;

  const commit = (next: LocalState): void => {
    stateRef.current = next;
    setState(next);
  };
  const updateScene = (change: (scene: Scene) => Scene): void => {
    commit({ ...stateRef.current, scene: change(stateRef.current.scene) });
  };

  /** Führt eine Aktion aus und aktualisiert Szene, Bot-Gedächtnis und gegebenenfalls die Wertung. */
  const perform = (action: Action, selection: Selection): void => {
    const current = stateRef.current;
    const { state: game, events } = applyAction(current.game, action, rng);
    const memories = rememberAll(
      current.memories,
      events,
      game,
      (player) => (player === LOCAL_SEAT ? 0 : session.profile.forgetRate),
      rng,
    );
    const score = game.phase.kind === 'roundOver' ? scoreRound(game, rng) : null;
    const scene = nextScene(
      current.scene,
      { events, view: getPlayerView(game, LOCAL_SEAT), legal: legalFor(game) },
      session.names,
      selection,
      tempoRef.current.flightMs,
    );
    commit({ game, memories, scene: { ...scene, score } });
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
    const { game, memories, scene } = state;
    if (game.phase.kind === 'roundOver' || game.current === LOCAL_SEAT) return;
    if (scene.flights.length > 0) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        const player = game.current;
        const view = recall(getPlayerView(game, player), memories[player] ?? freshMemory);
        void clientRef.current
          ?.chooseAction(session.profile, view, legalActions(game), rng.nextInt(2 ** 31))
          .then((action) => {
            if (!cancelled && stateRef.current.game === game) perform(action, NO_SELECTION);
          });
      },
      scene.reveal === null ? tempoRef.current.botPauseMs : REVEAL_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state]);

  useSceneTimers(state.scene, updateScene);

  return tableFrom(state.scene, session.names, perform, (selection) => {
    updateScene((scene) => ({ ...scene, selection }));
  });
}
