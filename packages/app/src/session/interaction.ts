import type { Action, PlayerView } from '@blanko/engine';
import { HUMAN } from './session.ts';

/**
 * Was der Mensch gerade ausgewählt hat. Die Oberfläche kennt nur Antippen; erst wenn eine
 * Auswahl vollständig ist, entsteht daraus genau eine Engine-Aktion.
 */
export type Selection =
  | { readonly kind: 'none' }
  /** Zu Beginn des Zuges angehobene eigene Karte für einen Gleiche-Karte-Zug. */
  | { readonly kind: 'match'; readonly slot: number }
  /** Gezogene 8, 9 oder 10 soll abgelegt werden; jetzt wird das Ziel gewählt. */
  | { readonly kind: 'special'; readonly rank: 8 | 9 | 10 }
  /** 10: eigene Karte gewählt, jetzt die gegnerische. */
  | { readonly kind: 'swap'; readonly slot: number };

export const NO_SELECTION: Selection = { kind: 'none' };

export type Tap =
  | { readonly kind: 'drawPile' }
  | { readonly kind: 'discardPile' }
  | { readonly kind: 'own'; readonly slot: number }
  | { readonly kind: 'opponent'; readonly player: number; readonly slot: number };

export interface TapResult {
  readonly selection: Selection;
  readonly action: Action | null;
}

export function tapKey(tap: Tap): string {
  switch (tap.kind) {
    case 'drawPile':
    case 'discardPile':
      return tap.kind;
    case 'own':
      return `own:${String(tap.slot)}`;
    case 'opponent':
      return `opponent:${String(tap.player)}:${String(tap.slot)}`;
  }
}

const has = (legal: readonly Action[], test: (a: Action) => boolean): boolean => legal.some(test);

function atTurnStart(legal: readonly Action[], selection: Selection, tap: Tap): TapResult | null {
  if (tap.kind === 'drawPile') {
    return has(legal, (a) => a.type === 'draw')
      ? { selection: NO_SELECTION, action: { type: 'draw' } }
      : null;
  }
  if (tap.kind === 'own' && has(legal, (a) => a.type === 'matchDiscard' && a.slot === tap.slot)) {
    // Ein zweiter Tipp auf dieselbe Karte hebt die Auswahl wieder auf.
    const again = selection.kind === 'match' && selection.slot === tap.slot;
    return { selection: again ? NO_SELECTION : { kind: 'match', slot: tap.slot }, action: null };
  }
  if (tap.kind === 'discardPile' && selection.kind === 'match') {
    return { selection: NO_SELECTION, action: { type: 'matchDiscard', slot: selection.slot } };
  }
  return null;
}

function specialRank(view: PlayerView, legal: readonly Action[]): 8 | 9 | 10 | null {
  const rank = view.drawnCard?.rank;
  const special = has(
    legal,
    (a) => a.type === 'peekOwn' || a.type === 'peekOpponent' || a.type === 'blindSwap',
  );
  return special && (rank === 8 || rank === 9 || rank === 10) ? rank : null;
}

function afterDraw(
  view: PlayerView,
  legal: readonly Action[],
  selection: Selection,
  tap: Tap,
): TapResult | null {
  const done = (action: Action): TapResult => ({ selection: NO_SELECTION, action });
  if (tap.kind === 'discardPile') {
    // Erster Tipp auf die Ablage bei 8/9/10 startet die Sonderfunktion, ein weiterer legt ohne Wirkung ab.
    const rank = specialRank(view, legal);
    return selection.kind === 'none' && rank !== null
      ? { selection: { kind: 'special', rank }, action: null }
      : done({ type: 'discardDrawn' });
  }
  if (selection.kind === 'none' && tap.kind === 'own') {
    return has(legal, (a) => a.type === 'keep' && a.slot === tap.slot)
      ? done({ type: 'keep', slot: tap.slot })
      : null;
  }
  if (selection.kind === 'special' && selection.rank === 8 && tap.kind === 'own') {
    return has(legal, (a) => a.type === 'peekOwn' && a.slot === tap.slot)
      ? done({ type: 'peekOwn', slot: tap.slot })
      : null;
  }
  if (selection.kind === 'special' && selection.rank === 9 && tap.kind === 'opponent') {
    const action: Action = { type: 'peekOpponent', target: tap.player, targetSlot: tap.slot };
    return has(
      legal,
      (a) => a.type === 'peekOpponent' && a.target === tap.player && a.targetSlot === tap.slot,
    )
      ? done(action)
      : null;
  }
  if (selection.kind === 'special' && selection.rank === 10 && tap.kind === 'own') {
    return has(legal, (a) => a.type === 'blindSwap' && a.slot === tap.slot)
      ? { selection: { kind: 'swap', slot: tap.slot }, action: null }
      : null;
  }
  if (selection.kind === 'swap' && tap.kind === 'own' && tap.slot === selection.slot) {
    return { selection: { kind: 'special', rank: 10 }, action: null };
  }
  if (selection.kind === 'swap' && tap.kind === 'opponent') {
    const fits = (a: Action): boolean =>
      a.type === 'blindSwap' &&
      a.slot === selection.slot &&
      a.target === tap.player &&
      a.targetSlot === tap.slot;
    return has(legal, fits)
      ? done({ type: 'blindSwap', slot: selection.slot, target: tap.player, targetSlot: tap.slot })
      : null;
  }
  return null;
}

/** Ergebnis eines Tipps; null heißt: Dieses Element reagiert gerade nicht. */
export function resolveTap(
  view: PlayerView,
  legal: readonly Action[],
  selection: Selection,
  tap: Tap,
): TapResult | null {
  if (view.current !== HUMAN || view.viewer !== HUMAN) return null;
  if (view.phase === 'turnStart') return atTurnStart(legal, selection, tap);
  if (view.phase === 'drawn') return afterDraw(view, legal, selection, tap);
  return null;
}

function allTaps(view: PlayerView): Tap[] {
  const taps: Tap[] = [{ kind: 'drawPile' }, { kind: 'discardPile' }];
  view.hands.forEach((hand, player) => {
    hand.forEach((_, slot) => {
      taps.push(player === HUMAN ? { kind: 'own', slot } : { kind: 'opponent', player, slot });
    });
  });
  return taps;
}

/** Alles, was gerade angetippt werden kann; genau diese Elemente bekommen den weißen Rahmen. */
export function tappableKeys(
  view: PlayerView,
  legal: readonly Action[],
  selection: Selection,
): Set<string> {
  return new Set(
    allTaps(view)
      .filter((tap) => resolveTap(view, legal, selection, tap) !== null)
      .map(tapKey),
  );
}

/** Der einzige Knopf unten: Klopfen zu Beginn des Zuges, Abbrechen bei angehobener Karte. */
export type MainButton = 'knock' | 'cancel' | null;

export function mainButton(
  view: PlayerView,
  legal: readonly Action[],
  selection: Selection,
): MainButton {
  if (view.current !== HUMAN || view.phase === 'roundOver') return null;
  if (selection.kind === 'match' || selection.kind === 'swap') return 'cancel';
  if (
    selection.kind === 'none' &&
    view.phase === 'turnStart' &&
    has(legal, (a) => a.type === 'knock')
  )
    return 'knock';
  return null;
}
