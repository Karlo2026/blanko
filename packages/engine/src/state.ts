import type { CardId, Rank } from './cards.ts';
import type { Knowledge } from './knowledge.ts';

/** Sitzplatz am Tisch, 0 bis playerCount-1, im Uhrzeigersinn aufsteigend. */
export type PlayerId = number;

/** Ein Platz in der Auslage: Karte oder leer (nach einem Gleiche-Karte-Zug). */
export type Slot = CardId | null;

/**
 * Plätze 0 und 1 bilden die obere, 2 und 3 die untere Reihe des Quadrats.
 * Strafkarten ohne freien Platz kommen ab Index 4 als neue Reihen dazu.
 */
export type Hand = readonly Slot[];

export const BOTTOM_SLOTS: readonly number[] = [2, 3];
export const INITIAL_HAND_SIZE = 4;

export type Phase =
  | { readonly kind: 'turnStart' }
  | { readonly kind: 'drawn'; readonly card: CardId }
  | { readonly kind: 'roundOver' };

/** Vollständiger, unveränderlicher Zustand einer Runde. Ändert sich nur über applyAction. */
export interface GameState {
  readonly playerCount: number;
  readonly dealer: PlayerId;
  readonly current: PlayerId;
  readonly phase: Phase;
  readonly hands: readonly Hand[];
  /** Oberste Karte ist das letzte Element. */
  readonly drawPile: readonly CardId[];
  /** Oberste Karte ist das letzte Element. */
  readonly discardPile: readonly CardId[];
  readonly knowledge: Knowledge;
  /** Rang, auf den der aktuelle Spieler eine gleiche Karte legen darf, sonst null. */
  readonly matchableRank: Rank | null;
  readonly knocker: PlayerId | null;
  /** Wie viele Züge nach dem Klopfen noch ausstehen. */
  readonly turnsAfterKnock: number;
  /** Abgeschlossene Züge dieser Runde. */
  readonly turnCount: number;
  /** Ob ein Spieler seine unteren Karten noch ansehen darf (bis zu seinem ersten Ziehen). */
  readonly canStillPeek: readonly boolean[];
  /**
   * Öffentlich beobachtet, je Karten-ID: welche Karte offen abgeworfen wurde, als diese Karte
   * behalten wurde; sonst null. Hängt an der Karte und wandert deshalb bei einem 10-Tausch mit.
   */
  readonly keptOver: readonly (CardId | null)[];
}

export function nextPlayer(player: PlayerId, playerCount: number): PlayerId {
  return (player + 1) % playerCount;
}
