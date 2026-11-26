import type { Action, GameEvent, PlayerView, RoundScore } from '@blanko/engine';
import { useEffect } from 'react';
import { measureAnchor, type Flight } from '../components/FlightLayer.tsx';
import { anchorKey, flightDuration, flightsFor } from './flights.ts';
import { NO_SELECTION, resolveTap, type Selection, type Tap } from './interaction.ts';
import { changedSlots, moveText, statusText } from './texts.ts';

/** So lange bleibt eine per 8 oder 9 angeschaute Karte offen. */
export const REVEAL_MS = 2200;

/** Per 8 oder 9 angeschaute Karte, die gerade offen gezeigt wird. */
interface Reveal {
  readonly player: number;
  readonly slot: number;
}

/** Was am Tisch gerade zu sehen ist; lokal wie online dieselbe Form. */
export interface Scene {
  readonly view: PlayerView;
  readonly legal: readonly Action[];
  readonly selection: Selection;
  /** Text des letzten abgeschlossenen Zuges; ein bloßes Ziehen ändert ihn nicht. */
  readonly lastMove: string;
  readonly changed: ReadonlySet<string>;
  readonly reveal: Reveal | null;
  readonly score: RoundScore | null;
  /** Karten, die gerade fliegen; solange wartet der Tisch. */
  readonly flights: readonly Flight[];
}

/**
 * Ein Tisch, wie RoundTable ihn zeichnet. Ob die Züge lokal gerechnet werden oder vom Server
 * kommen, sieht man ihm nicht an.
 */
export interface Table {
  readonly names: readonly string[];
  readonly view: PlayerView;
  readonly legal: readonly Action[];
  readonly selection: Selection;
  readonly status: string;
  readonly changed: ReadonlySet<string>;
  readonly reveal: Reveal | null;
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

/** Ein Zug, wie der Tisch ihn zeigt: seine Ereignisse und die eigene Sicht danach. */
interface Step {
  readonly events: readonly GameEvent[];
  readonly view: PlayerView;
  readonly legal: readonly Action[];
}

export function firstScene(view: PlayerView, legal: readonly Action[]): Scene {
  return {
    view,
    legal,
    selection: NO_SELECTION,
    lastMove: '',
    changed: new Set(),
    reveal: null,
    score: null,
    flights: [],
  };
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eine Karte, die man selbst gerade per 8 oder 9 angeschaut hat. */
function revealOf(events: readonly GameEvent[], viewer: number): Reveal | null {
  for (const event of events) {
    if (event.type === 'peekedOwn' && event.player === viewer)
      return { player: viewer, slot: event.slot };
    if (event.type === 'peekedOpponent' && event.player === viewer)
      return { player: event.target, slot: event.targetSlot };
  }
  return null;
}

let nextFlightId = 1;

/**
 * Die Szene nach einem Zug: Statuszeile, Aufleuchten, angeschaute Karte und Flüge. Die
 * Startpositionen der Flüge werden jetzt gemessen, solange noch die alte Sicht gezeichnet ist.
 */
export function nextScene(
  scene: Scene,
  step: Step,
  names: readonly string[],
  selection: Selection,
  flightMs: number,
): Scene {
  const move = moveText(step.events, names, step.view.viewer);
  const plans = prefersReducedMotion()
    ? []
    : flightsFor(step.events, scene.view, step.view, flightMs);
  const flights = plans.flatMap((plan): Flight[] => {
    const from = measureAnchor(anchorKey(plan.from));
    return from === null
      ? []
      : [
          {
            id: nextFlightId++,
            from,
            toKey: anchorKey(plan.to),
            face: plan.face,
            delayMs: plan.delayMs,
            durationMs: flightMs,
          },
        ];
  });
  return {
    view: step.view,
    legal: step.legal,
    selection,
    lastMove: move === '' ? scene.lastMove : move,
    changed: changedSlots(step.events),
    reveal: revealOf(step.events, step.view.viewer),
    score: scene.score,
    flights,
  };
}

/** Räumt gelandete Karten weg und schließt eine angeschaute Karte nach kurzer Zeit wieder. */
export function useSceneTimers(
  scene: Scene | null,
  update: (change: (scene: Scene) => Scene) => void,
): void {
  const flights = scene?.flights;
  const reveal = scene?.reveal ?? null;
  useEffect(() => {
    if (flights === undefined || flights.length === 0) return;
    const timer = setTimeout(
      () => {
        update((s) => ({ ...s, flights: [] }));
      },
      flightDuration(flights, Math.max(0, ...flights.map((f) => f.durationMs))),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [flights]);

  useEffect(() => {
    if (reveal === null) return;
    const timer = setTimeout(() => {
      update((s) => ({ ...s, reveal: null }));
    }, REVEAL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [reveal]);
}

/**
 * Macht aus einer Szene den Tisch für RoundTable. `play` führt eine fertige Aktion aus (lokal oder
 * per Server), `select` ändert nur die Auswahl.
 */
export function tableFrom(
  scene: Scene,
  names: readonly string[],
  play: (action: Action, selection: Selection) => void,
  select: (selection: Selection) => void,
): Table {
  const { view, legal, selection } = scene;
  const busy = scene.flights.length > 0;
  return {
    names,
    view,
    legal,
    selection,
    status: statusText(scene.lastMove, names, view),
    changed: scene.changed,
    reveal: scene.reveal,
    score: scene.score,
    flights: scene.flights,
    landing: new Set(scene.flights.map((f) => f.toKey)),
    busy,
    tap(tap) {
      if (busy) return;
      const result = resolveTap(view, legal, selection, tap);
      if (result === null) return;
      if (result.action === null) select(result.selection);
      else play(result.action, result.selection);
    },
    knock() {
      if (!busy && legal.some((a) => a.type === 'knock')) play({ type: 'knock' }, NO_SELECTION);
    },
    cancel() {
      select(NO_SELECTION);
    },
  };
}
