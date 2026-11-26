import type { PlayerView } from '@blanko/engine';
import type { CardFace } from '../components/CardView.tsx';

export type SeatPosition = 'top-left' | 'top' | 'top-right' | 'left' | 'right';

/** Gegner im Uhrzeigersinn ab links vom eigenen Platz; bei 5 oder 6 Spielern auch oben links und rechts. */
const POSITIONS: Readonly<Record<number, readonly SeatPosition[]>> = {
  1: ['top'],
  2: ['left', 'right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
  5: ['left', 'top-left', 'top', 'top-right', 'right'],
};

/** Der Tisch ist gedreht: Der eigene Platz ist unten, die Gegner folgen im Uhrzeigersinn. */
export function opponentOrder(viewer: number, playerCount: number): number[] {
  return Array.from({ length: playerCount - 1 }, (_, i) => (viewer + 1 + i) % playerCount);
}

/** Punkte mit Vorzeichen, etwa „+2“ oder „-1“. */
export const signed = (value: number): string => (value > 0 ? `+${String(value)}` : String(value));

export function seatPositions(opponents: number): readonly SeatPosition[] {
  const positions = POSITIONS[opponents];
  if (positions === undefined) throw new Error(`Keine Sitzordnung für ${String(opponents)} Gegner`);
  return positions;
}

/**
 * Was auf einem Platz zu sehen ist. Offen liegen nur: die eigenen unteren Karten bis zum ersten
 * Ziehen, eine gerade per 8 oder 9 angeschaute Karte und am Rundenende alles. Was der Mensch sich
 * gemerkt haben könnte, bleibt verdeckt – Merken gehört zum Spiel.
 */
export function faceFor(
  view: PlayerView,
  player: number,
  slot: number,
  reveal: { readonly player: number; readonly slot: number } | null,
): CardFace {
  const seen = view.hands[player]?.[slot];
  if (seen === undefined || seen.kind === 'empty') return { kind: 'empty' };
  if (seen.kind === 'hidden') return { kind: 'back' };
  const peeked = reveal !== null && reveal.player === player && reveal.slot === slot;
  const ownAtStart = player === view.viewer && view.canStillPeek;
  return view.phase === 'roundOver' || peeked || ownAtStart
    ? { kind: 'face', card: seen.card }
    : { kind: 'back' };
}
