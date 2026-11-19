import type { Card } from './cards.ts';
import type { PlayerId } from './state.ts';

/** Alle Züge. `slot` meint immer einen Platz in der eigenen Auslage des aktuellen Spielers. */
export type Action =
  | { readonly type: 'draw' }
  | { readonly type: 'knock' }
  | { readonly type: 'matchDiscard'; readonly slot: number }
  | { readonly type: 'keep'; readonly slot: number }
  | { readonly type: 'discardDrawn' }
  /** Nach einer abgelegten 8: eine eigene Karte anschauen. */
  | { readonly type: 'peekOwn'; readonly slot: number }
  /** Nach einer abgelegten 9: eine Karte eines Gegners anschauen. */
  | { readonly type: 'peekOpponent'; readonly target: PlayerId; readonly targetSlot: number }
  /** Nach einer abgelegten 8, 9 oder 10: auf die Wirkung verzichten. */
  | { readonly type: 'skipSpecial' }
  /** Nach einer abgelegten 10: eine eigene Karte blind mit einer gegnerischen tauschen. */
  | {
      readonly type: 'blindSwap';
      readonly slot: number;
      readonly target: PlayerId;
      readonly targetSlot: number;
    };

/**
 * Was am Tisch passiert ist. Ereignisse enthalten nur öffentlich sichtbare Information,
 * deshalb dürfen alle Spieler alle Ereignisse sehen. Die gezogene Karte steht nur in der PlayerView.
 */
export type GameEvent =
  | { readonly type: 'reshuffled' }
  | { readonly type: 'drew'; readonly player: PlayerId }
  | {
      readonly type: 'kept';
      readonly player: PlayerId;
      readonly slot: number;
      readonly discarded: Card;
    }
  | { readonly type: 'discarded'; readonly player: PlayerId; readonly card: Card }
  | { readonly type: 'peekedOwn'; readonly player: PlayerId; readonly slot: number }
  | {
      readonly type: 'peekedOpponent';
      readonly player: PlayerId;
      readonly target: PlayerId;
      readonly targetSlot: number;
    }
  | {
      readonly type: 'swapped';
      readonly player: PlayerId;
      readonly slot: number;
      readonly target: PlayerId;
      readonly targetSlot: number;
    }
  | {
      readonly type: 'matched';
      readonly player: PlayerId;
      readonly slot: number;
      readonly card: Card;
    }
  | {
      readonly type: 'matchFailed';
      readonly player: PlayerId;
      readonly slot: number;
      readonly card: Card;
      /** Platz der Strafkarte; null, wenn kein Stapel mehr eine Karte hergibt. */
      readonly penaltySlot: number | null;
    }
  | { readonly type: 'knocked'; readonly player: PlayerId }
  /** Der Spieler hat keine Karten mehr; die Runde endet sofort, er wird Erster. */
  | { readonly type: 'handEmptied'; readonly player: PlayerId }
  | { readonly type: 'roundEnded' };

/** Eindeutiger Schlüssel einer Aktion, um sie mit den erlaubten Aktionen zu vergleichen. */
export function actionKey(action: Action): string {
  switch (action.type) {
    case 'draw':
    case 'knock':
    case 'discardDrawn':
    case 'skipSpecial':
      return action.type;
    case 'matchDiscard':
    case 'keep':
    case 'peekOwn':
      return `${action.type}:${String(action.slot)}`;
    case 'peekOpponent':
      return `${action.type}:${String(action.target)}:${String(action.targetSlot)}`;
    case 'blindSwap':
      return `${action.type}:${String(action.slot)}:${String(action.target)}:${String(action.targetSlot)}`;
  }
}
