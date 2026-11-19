import type { GameEvent, PlayerView } from '@blanko/engine';
import type { CardFace } from '../components/CardView.tsx';
import { HUMAN } from './session.ts';

/** Stelle am Tisch, an der eine Karte startet oder landet. */
export type Anchor =
  | { readonly kind: 'drawPile' }
  | { readonly kind: 'discardPile' }
  /** Die gezogene Karte über dem Nachziehstapel. */
  | { readonly kind: 'drawn' }
  | { readonly kind: 'slot'; readonly player: number; readonly slot: number };

/** Eine Kartenbewegung: woher, wohin, was dabei zu sehen ist und mit welcher Verzögerung. */
export interface FlightPlan {
  readonly from: Anchor;
  readonly to: Anchor;
  readonly face: CardFace;
  readonly delayMs: number;
}

export function anchorKey(anchor: Anchor): string {
  return anchor.kind === 'slot'
    ? `slot:${String(anchor.player)}:${String(anchor.slot)}`
    : anchor.kind;
}

const BACK: CardFace = { kind: 'back' };
const slot = (player: number, index: number): Anchor => ({ kind: 'slot', player, slot: index });

/**
 * Welche Karten sich bei diesen Ereignissen sichtbar bewegen. Gesehen wird wie am echten Tisch:
 * Die eigene gezogene Karte offen, gezogene Karten der Gegner verdeckt, Abgelegtes offen.
 * `before` ist die Sicht des Menschen vor der Aktion, `after` danach. Folgebewegungen (Strafkarte
 * nach falschem Ablegen) starten jeweils nach einer Flugdauer `flightMs`.
 */
export function flightsFor(
  events: readonly GameEvent[],
  before: PlayerView,
  after: PlayerView,
  flightMs: number,
): FlightPlan[] {
  return events.flatMap((event): FlightPlan[] => {
    const now = (from: Anchor, to: Anchor, face: CardFace, delayMs = 0): FlightPlan => ({
      from,
      to,
      face,
      delayMs,
    });
    switch (event.type) {
      case 'reshuffled':
        return [now({ kind: 'discardPile' }, { kind: 'drawPile' }, BACK)];
      case 'drew': {
        const card = event.player === HUMAN ? after.drawnCard : null;
        return [
          now(
            { kind: 'drawPile' },
            { kind: 'drawn' },
            card === null ? BACK : { kind: 'face', card },
          ),
        ];
      }
      case 'kept': {
        const card = event.player === HUMAN ? before.drawnCard : null;
        return [
          now(
            { kind: 'drawn' },
            slot(event.player, event.slot),
            card === null ? BACK : { kind: 'face', card },
          ),
          now(
            slot(event.player, event.slot),
            { kind: 'discardPile' },
            { kind: 'face', card: event.discarded },
          ),
        ];
      }
      case 'discarded':
        return [
          now({ kind: 'drawn' }, { kind: 'discardPile' }, { kind: 'face', card: event.card }),
        ];
      case 'swapped':
        return [
          now(slot(event.player, event.slot), slot(event.target, event.targetSlot), BACK),
          now(slot(event.target, event.targetSlot), slot(event.player, event.slot), BACK),
        ];
      case 'matched':
        return [
          now(
            slot(event.player, event.slot),
            { kind: 'discardPile' },
            { kind: 'face', card: event.card },
          ),
        ];
      case 'matchFailed': {
        // Die Karte geht offen auf die Ablage, passt nicht, kommt zurück; dann folgt die Strafkarte.
        const back = [
          now(
            slot(event.player, event.slot),
            { kind: 'discardPile' },
            { kind: 'face', card: event.card },
          ),
          now(
            { kind: 'discardPile' },
            slot(event.player, event.slot),
            { kind: 'face', card: event.card },
            flightMs,
          ),
        ];
        return event.penaltySlot === null
          ? back
          : [
              ...back,
              now({ kind: 'drawPile' }, slot(event.player, event.penaltySlot), BACK, 2 * flightMs),
            ];
      }
      case 'peekedOwn':
      case 'peekedOpponent':
      case 'knocked':
      case 'handEmptied':
      case 'roundEnded':
        return [];
    }
  });
}

/** Gesamtdauer aller Flüge, damit der nächste Zug erst danach beginnt. */
export function flightDuration(
  plans: readonly Pick<FlightPlan, 'delayMs'>[],
  flightMs: number,
): number {
  return plans.reduce((longest, plan) => Math.max(longest, plan.delayMs + flightMs), 0);
}
