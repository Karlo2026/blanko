import type { GameEvent, PlayerView } from '@blanko/engine';
import { cardAccusative, rankAccusative } from './card-names.ts';
import type { Selection } from './interaction.ts';
import { HUMAN } from './session.ts';

/** Satzanfang mit passender Verbform: „Du legst“ bzw. „Karl legt“. */
function subject(names: readonly string[], player: number, own: string, other: string): string {
  return player === HUMAN ? `Du ${own}` : `${names[player] ?? '?'} ${other}`;
}

function target(names: readonly string[], player: number): string {
  return player === HUMAN ? 'dir' : (names[player] ?? '?');
}

function describe(event: GameEvent, names: readonly string[]): string | null {
  switch (event.type) {
    case 'reshuffled':
      return 'Der Ablagestapel wird neu gemischt.';
    case 'drew':
      return null;
    case 'kept':
      return `${subject(names, event.player, 'tauschst und legst', 'tauscht und legt')} ${cardAccusative(event.discarded)} ab.`;
    case 'discarded':
      return `${subject(names, event.player, 'legst', 'legt')} ${cardAccusative(event.card)} ab.`;
    case 'peekedOwn':
      return `${subject(names, event.player, 'schaust', 'schaut')} eine eigene Karte an.`;
    case 'peekedOpponent':
      return `${subject(names, event.player, 'schaust', 'schaut')} eine Karte von ${target(names, event.target)} an.`;
    case 'swapped':
      return `${subject(names, event.player, 'tauschst', 'tauscht')} blind mit ${target(names, event.target)}.`;
    case 'matched':
      return `${subject(names, event.player, 'legst', 'legt')} passend ${cardAccusative(event.card)} ab.`;
    case 'matchFailed':
      return `${subject(names, event.player, 'legst', 'legt')} ${cardAccusative(event.card)} – passt nicht, Strafkarte.`;
    case 'knocked':
      return `${subject(names, event.player, 'klopfst', 'klopft')}!`;
    case 'roundEnded':
      return 'Die Runde ist vorbei.';
  }
}

/** Beschreibung eines abgeschlossenen Zuges, etwa „Karl legt eine 7 ab.“ */
export function moveText(events: readonly GameEvent[], names: readonly string[]): string {
  return events
    .map((e) => describe(e, names))
    .filter((t): t is string => t !== null)
    .join(' ');
}

/**
 * Statuszeile: der letzte abgeschlossene Zug, dazu wer gerade gezogen hat oder dass der Mensch dran
 * ist, etwa „Karl legt eine 7 ab. Du bist dran.“ Ein bloßes Ziehen überschreibt den letzten Zug nicht.
 */
export function statusText(lastMove: string, names: readonly string[], view: PlayerView): string {
  const parts = lastMove === '' ? [] : [lastMove];
  if (view.phase === 'drawn' && view.current !== HUMAN)
    parts.push(`${names[view.current] ?? '?'} zieht.`);
  if (view.phase === 'turnStart' && view.current === HUMAN) parts.push('Du bist dran.');
  return parts.join(' ');
}

/** Hinweiszeile: was der Mensch gerade tun kann. */
export function hintText(
  view: PlayerView,
  selection: Selection,
  names: readonly string[],
  canKnock: boolean,
): string {
  if (view.phase === 'roundOver') return '';
  if (view.current !== HUMAN) {
    return view.knocker === HUMAN
      ? 'Du hast geklopft. Die anderen haben noch einen Zug.'
      : `${names[view.current] ?? '?'} ist am Zug.`;
  }
  const skip = ' Oder tippe die Ablage, um ohne Wirkung abzulegen.';
  switch (selection.kind) {
    case 'match':
      return 'Tippe die Ablage, um die Karte abzulegen.';
    case 'swap':
      return 'Tippe die gegnerische Karte für den blinden Tausch.';
    case 'special':
      if (selection.rank === 8) return `Tippe eine eigene Karte, um sie anzuschauen.${skip}`;
      if (selection.rank === 9) return `Tippe eine Karte eines Gegners, um sie anzuschauen.${skip}`;
      return `Tippe erst die eigene Karte für den blinden Tausch.${skip}`;
    case 'none':
      break;
  }
  if (view.phase === 'drawn')
    return 'Tippe eine eigene Karte zum Tauschen oder die Ablage zum Ablegen.';
  const match =
    view.matchableRank === null
      ? ''
      : `, eine eigene Karte für ${rankAccusative(view.matchableRank)}`;
  return `Tippe den Stapel zum Ziehen${match}${canKnock ? ' – oder klopfe' : ''}.`;
}

/** Plätze, die sich durch die Ereignisse verändert haben; sie bekommen eine kurze Bewegung. */
export function changedSlots(events: readonly GameEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.type === 'kept' || event.type === 'matched')
      keys.add(`${String(event.player)}:${String(event.slot)}`);
    if (event.type === 'matchFailed' && event.penaltySlot !== null) {
      keys.add(`${String(event.player)}:${String(event.penaltySlot)}`);
    }
    if (event.type === 'swapped') {
      keys.add(`${String(event.player)}:${String(event.slot)}`);
      keys.add(`${String(event.target)}:${String(event.targetSlot)}`);
    }
  }
  return keys;
}
