import type { RoundScore } from '@blanko/engine';
import type { ServerMessage, UpdateMessage } from '@blanko/protocol';
import { useEffect, useRef, useState } from 'react';
import type { Connection } from './connection.ts';
import { NO_SELECTION } from './interaction.ts';
import {
  firstScene,
  nextScene,
  tableFrom,
  useSceneTimers,
  type Scene,
  type Table,
} from './table.ts';
import type { Tempo } from './tempo.ts';

/** Was vom Server kommt und am Tisch nacheinander abgespielt wird. */
type Incoming = UpdateMessage | { readonly type: 'roundScored'; readonly score: RoundScore };

interface OnlineState {
  readonly scene: Scene;
  readonly names: readonly string[];
  readonly totals: readonly number[];
  readonly round: number;
}

export interface OnlineTable {
  readonly table: Table;
  readonly totals: readonly number[];
  readonly round: number;
}

/** Übernimmt eine Server-Nachricht in den Tisch; eine neue Runde beginnt mit frischer Szene. */
function apply(current: OnlineState | null, message: Incoming, flightMs: number): OnlineState {
  if (message.type === 'roundScored') {
    if (current === null) throw new Error('Wertung ohne Runde');
    return { ...current, scene: { ...current.scene, score: message.score } };
  }
  const { view, legal, events, names, totals, round } = message;
  const scene =
    current === null || current.round !== round
      ? firstScene(view, legal)
      : nextScene(current.scene, { events, view, legal }, names, NO_SELECTION, flightMs);
  return { scene, names, totals, round };
}

/**
 * Online-Tisch mit derselben Schnittstelle wie der lokale. Der Server schickt nur die eigene Sicht,
 * die Ereignisse und die erlaubten Züge; sie werden nacheinander abgespielt, damit jede Bewegung
 * zu sehen ist. Tipps werden wie lokal über resolveTap aufgelöst und als action verschickt.
 * Null, solange noch keine Runde läuft.
 */
export function useOnlineTable(connection: Connection, tempo: Tempo): OnlineTable | null {
  const [state, setState] = useState<OnlineState | null>(null);
  const stateRef = useRef(state);
  const queue = useRef<Incoming[]>([]);
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;

  const commit = (next: OnlineState): void => {
    stateRef.current = next;
    setState(next);
  };

  /** Spielt ab, was ansteht, solange nichts fliegt und keine angeschaute Karte offen liegt. */
  const playQueue = (): void => {
    for (;;) {
      const current = stateRef.current;
      if (current !== null && (current.scene.flights.length > 0 || current.scene.reveal !== null))
        return;
      const message = queue.current.shift();
      if (message === undefined) return;
      commit(apply(current, message, tempoRef.current.flightMs));
    }
  };

  useEffect(
    () =>
      connection.subscribe((message: ServerMessage) => {
        if (message.type !== 'update' && message.type !== 'roundScored') return;
        queue.current.push(message);
        playQueue();
      }),
    [connection],
  );

  // Nach jeder Landung und jedem Zuklappen geht es mit der Warteschlange weiter.
  useEffect(playQueue, [state]);

  const updateScene = (change: (scene: Scene) => Scene): void => {
    const current = stateRef.current;
    if (current !== null) commit({ ...current, scene: change(current.scene) });
  };
  useSceneTimers(state?.scene ?? null, updateScene);

  if (state === null) return null;
  const table = tableFrom(
    state.scene,
    state.names,
    (action, selection) => {
      connection.send({ type: 'action', action });
      // Bis die Antwort des Servers da ist, ist nichts mehr antippbar.
      updateScene((scene) => ({ ...scene, selection, legal: [] }));
    },
    (selection) => {
      updateScene((scene) => ({ ...scene, selection }));
    },
  );
  return { table, totals: state.totals, round: state.round };
}
