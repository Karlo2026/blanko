import type { GameEvent, PlayerView } from '@blanko/engine';
import { cardAccusative, rankAccusative } from './card-names.ts';
import type { Selection } from './interaction.ts';

/** Wer gerade zuschaut: Namen aller Plätze und der eigene Platz. */
interface Audience {
  readonly names: readonly string[];
  readonly viewer: number;
}

/** Satzanfang mit passender Verbform: „Du legst“ bzw. „Karl legt“. */
function subject({ names, viewer }: Audience, player: number, own: string, other: string): string {
  return player === viewer ? `Du ${own}` : `${names[player] ?? '?'} ${other}`;
}

function target({ names, viewer }: Audience, player: number): string {
  return player === viewer ? 'dir' : (names[player] ?? '?');
}

function describe(event: GameEvent, audience: Audience): string | null {
  switch (event.type) {
    case 'reshuffled':
      return 'Der Ablagestapel wird neu gemischt.';
    case 'drew':
      return null;
    case 'kept':
      return `${subject(audience, event.player, 'tauschst und legst', 'tauscht und legt')} ${cardAccusative(event.discarded)} ab.`;
    case 'discarded':
      return `${subject(audience, event.player, 'legst', 'legt')} ${cardAccusative(event.card)} ab.`;
    case 'peekedOwn':
      return `${subject(audience, event.player, 'schaust', 'schaut')} eine eigene Karte an.`;
    case 'peekedOpponent':
      return `${subject(audience, event.player, 'schaust', 'schaut')} eine Karte von ${target(audience, event.target)} an.`;
    case 'swapped':
      return `${subject(audience, event.player, 'tauschst', 'tauscht')} blind mit ${target(audience, event.target)}.`;
    case 'matched':
      return `${subject(audience, event.player, 'legst', 'legt')} passend ${cardAccusative(event.card)} ab.`;
    case 'matchFailed':
      return `${subject(audience, event.player, 'legst', 'legt')} ${cardAccusative(event.card)} – passt nicht, Strafkarte.`;
    case 'knocked':
      return `${subject(audience, event.player, 'klopfst', 'klopft')}!`;
    case 'handEmptied':
      return `${subject(audience, event.player, 'hast', 'hat')} keine Karten mehr und ${event.player === audience.viewer ? 'gewinnst' : 'gewinnt'} die Runde!`;
    case 'roundEnded':
      return 'Die Runde ist vorbei.';
  }
}

/** Beschreibung eines abgeschlossenen Zuges aus Sicht von `viewer`, etwa „Karl legt eine 7 ab.“ */
export function moveText(
  events: readonly GameEvent[],
  names: readonly string[],
  viewer: number,
): string {
  return events
    .map((e) => describe(e, { names, viewer }))
    .filter((t): t is string => t !== null)
    .join(' ');
}

/**
 * Statuszeile: der letzte abgeschlossene Zug, dazu wer gerade gezogen hat oder dass man selbst dran
 * ist, etwa „Karl legt eine 7 ab. Du bist dran.“ Ein bloßes Ziehen überschreibt den letzten Zug nicht.
 */
export function statusText(lastMove: string, names: readonly string[], view: PlayerView): string {
  const parts = lastMove === '' ? [] : [lastMove];
  if (view.phase === 'drawn' && view.current !== view.viewer)
    parts.push(`${names[view.current] ?? '?'} zieht.`);
  if (view.phase === 'turnStart' && view.current === view.viewer) parts.push('Du bist dran.');
  return parts.join(' ');
}

/**
 * Online: Der Tisch wartet auf jemanden, der gerade nicht verbunden ist. Nach einer Minute zieht
 * der Server mit einem Bot für ihn (siehe ADR 0009).
 */
export function offlineText(
  names: readonly string[],
  view: PlayerView,
  offline: ReadonlySet<number>,
): string {
  if (view.phase === 'roundOver' || !offline.has(view.current)) return '';
  const name = names[view.current] ?? '?';
  return `${name} ist offline; spätestens nach einer Minute zieht ein Bot für ${name}.`;
}

/** Hinweiszeile: was man gerade tun kann. */
export function hintText(
  view: PlayerView,
  selection: Selection,
  names: readonly string[],
  canKnock: boolean,
): string {
  if (view.phase === 'roundOver') return '';
  if (view.current !== view.viewer) {
    return view.knocker === view.viewer
      ? 'Du hast geklopft. Die anderen haben noch einen Zug.'
      : `${names[view.current] ?? '?'} ist am Zug.`;
  }
  if (selection.kind === 'match') return 'Tippe die Ablage, um die Karte abzulegen.';
  if (selection.kind === 'swap') return 'Tippe jetzt die gegnerische Karte für den blinden Tausch.';
  if (view.phase === 'special') {
    if (view.specialRank === 8) return '8 abgelegt: Tippe eine eigene Karte, um sie anzuschauen.';
    if (view.specialRank === 9)
      return '9 abgelegt: Tippe eine Karte eines Gegners, um sie anzuschauen.';
    return '10 abgelegt: Tippe erst deine Karte, dann die eines Gegners, um sie blind zu tauschen.';
  }
  if (view.phase === 'drawn') {
    const rank = view.drawnCard?.rank;
    const special = rank === 8 || rank === 9 || rank === 10;
    return special
      ? `Ablage antippen: ${String(rank)} ablegen und ihre Wirkung nutzen. Eigene Karte antippen: tauschen.`
      : 'Tippe eine eigene Karte zum Tauschen oder die Ablage zum Ablegen.';
  }
  const match =
    view.matchableRank === null
      ? ''
      : `, eine eigene Karte für ${rankAccusative(view.matchableRank)}`;
  return `Tippe den Stapel zum Ziehen${match}${canKnock ? ' – oder klopfe' : ''}.`;
}

/**
 * Plätze, die kurz aufleuchten: wo jemand per 8 oder 9 eine Karte angeschaut hat. Bewegungen
 * zeigen die fliegenden Karten (flights.ts), Anschauen dagegen bewegt nichts.
 */
export function changedSlots(events: readonly GameEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.type === 'peekedOwn') keys.add(`${String(event.player)}:${String(event.slot)}`);
    if (event.type === 'peekedOpponent')
      keys.add(`${String(event.target)}:${String(event.targetSlot)}`);
  }
  return keys;
}
