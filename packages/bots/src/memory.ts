import {
  getPlayerView,
  type CardId,
  type GameEvent,
  type GameState,
  type PlayerView,
  type Rng,
  type SlotView,
} from '@blanko/engine';

/**
 * Gedächtnis eines Bots. Die Engine merkt sich alles perfekt; hier wird festgehalten,
 * welche bekannten Handkarten der Bot inzwischen wieder vergessen hat – wie ein Mensch.
 */
export interface Memory {
  readonly forgotten: ReadonlySet<CardId>;
  /** Stand von view.turnCount bei der letzten Aktualisierung. */
  readonly turnCount: number;
}

export const freshMemory: Memory = { forgotten: new Set(), turnCount: 0 };

function slotCard(view: PlayerView, player: number, slot: number): CardId | null {
  const seen = view.hands[player]?.[slot];
  return seen?.kind === 'known' ? seen.card.id : null;
}

/** Karten, die der Spieler durch diese Ereignisse (wieder) gesehen hat. */
function relearnedCards(events: readonly GameEvent[], view: PlayerView): CardId[] {
  const me = view.viewer;
  return events
    .flatMap((event): (CardId | null)[] => {
      switch (event.type) {
        case 'drew':
          return event.player === me && view.drawnCard !== null ? [view.drawnCard.id] : [];
        case 'peekedOwn':
          return event.player === me ? [slotCard(view, me, event.slot)] : [];
        case 'peekedOpponent':
          return event.player === me ? [slotCard(view, event.target, event.targetSlot)] : [];
        case 'matchFailed':
          return [event.card.id];
        default:
          return [];
      }
    })
    .filter((id): id is CardId => id !== null);
}

function rememberedHandCards(view: PlayerView, forgotten: ReadonlySet<CardId>): CardId[] {
  return view.hands.flatMap((hand) =>
    hand.flatMap((slot) =>
      slot.kind === 'known' && !forgotten.has(slot.card.id) ? [slot.card.id] : [],
    ),
  );
}

/**
 * Pro abgeschlossenem Zug vergisst der Bot jede erinnerte Handkarte mit `forgetRate`.
 * Erst danach kommt hinzu, was er gerade gesehen hat, damit Frisches nicht sofort verfällt.
 */
export function updateMemory(
  memory: Memory,
  events: readonly GameEvent[],
  view: PlayerView,
  forgetRate: number,
  rng: Rng,
): Memory {
  const forgotten = new Set(memory.forgotten);
  for (let turn = memory.turnCount; turn < view.turnCount; turn++) {
    for (const card of rememberedHandCards(view, forgotten)) {
      if (rng.next() < forgetRate) forgotten.add(card);
    }
  }
  for (const card of relearnedCards(events, view)) forgotten.delete(card);
  return { forgotten, turnCount: view.turnCount };
}

/** Die Sicht, wie der Bot sie im Kopf hat: Vergessenes erscheint wieder verdeckt. */
export function recall(view: PlayerView, memory: Memory): PlayerView {
  if (memory.forgotten.size === 0) return view;
  const mask = (slot: SlotView): SlotView =>
    slot.kind === 'known' && memory.forgotten.has(slot.card.id) ? { kind: 'hidden' } : slot;
  return { ...view, hands: view.hands.map((hand) => hand.map(mask)) };
}

/**
 * Aktualisiert das Gedächtnis aller Plätze nach einer Aktion. Plätze ohne Vergessen (Menschen,
 * Rate 0) bleiben unverändert, weil ihr Gedächtnis sich nie ändert.
 */
export function rememberAll(
  memories: readonly Memory[],
  events: readonly GameEvent[],
  state: GameState,
  forgetRateOf: (player: number) => number,
  rng: Rng,
): readonly Memory[] {
  return memories.map((memory, player) => {
    const forgetRate = forgetRateOf(player);
    return forgetRate === 0
      ? memory
      : updateMemory(memory, events, getPlayerView(state, player), forgetRate, rng);
  });
}
