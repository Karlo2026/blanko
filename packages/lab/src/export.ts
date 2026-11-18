import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BotProfile } from '@blanko/bots';
import { tournament, type RunOptions } from './commands.ts';
import type { Entrant } from './entrant.ts';
import type { RunResult } from './report.ts';

/**
 * Die festen Stufen der App, schwächste zuerst: die vier aus dem Auftrag und darüber der
 * Großmeister, ein IsmctsBot, der Gegner liest (Phase 9).
 */
const LEVELS = [
  { level: 'anfaenger', label: 'Anfänger' },
  { level: 'mittel', label: 'Mittel' },
  { level: 'stark', label: 'Stark' },
  { level: 'meister', label: 'Meister' },
  { level: 'grossmeister', label: 'Großmeister' },
] as const;

export const DEFAULT_LEVEL_IDS = [
  'leiter-01',
  'leiter-04',
  'leiter-07',
  'leiter-10',
  'grossmeister',
];

/** Inhalt von profiles.json: feste Stufen und die Leiter für den dynamischen Modus, beide mit Wertung. */
export interface AppProfiles {
  readonly playersPerTable: number;
  readonly levels: readonly {
    readonly level: string;
    readonly label: string;
    readonly profile: BotProfile;
  }[];
  /** Nach Wertung aufsteigend sortiert. */
  readonly ladder: readonly BotProfile[];
}

const APP_PROFILES_FILE = join(import.meta.dirname, '..', '..', 'app', 'public', 'profiles.json');

function profileOf(entrant: Entrant): BotProfile {
  if (entrant.kind !== 'profile')
    throw new Error(`${entrant.id} ist kein Profil und kann nicht exportiert werden`);
  return entrant.profile;
}

/**
 * Vermisst Leiter und zusätzliche Stufen-Profile in einem gemeinsamen Turnier, damit alle Wertungen
 * auf derselben Skala liegen, und ordnet die Stufen zu. Zusätzliche Profile (etwa der langsame
 * Großmeister) gehören nicht zur Leiter des dynamischen Modus.
 */
export async function buildAppProfiles(
  ladder: readonly Entrant[],
  extras: readonly Entrant[],
  levelIds: readonly string[],
  playersPerTable: number,
  options: RunOptions,
): Promise<{ profiles: AppProfiles; result: RunResult }> {
  if (levelIds.length !== LEVELS.length) {
    throw new Error(
      `Es braucht genau ${String(LEVELS.length)} Stufen, nicht ${String(levelIds.length)}`,
    );
  }
  const result = await tournament([...ladder, ...extras], playersPerTable, options);
  const rate = (profile: BotProfile): BotProfile => ({
    ...profile,
    rating: result.elo?.[profile.id] ?? null,
  });
  const byRating = (a: BotProfile, b: BotProfile): number => (a.rating ?? 0) - (b.rating ?? 0);
  const ratedLadder = ladder.map(profileOf).map(rate).sort(byRating);
  const allRated = [...ratedLadder, ...extras.map(profileOf).map(rate)];
  const levels = LEVELS.map((level, index) => {
    const profile = allRated.find((p) => p.id === levelIds[index]);
    if (profile === undefined)
      throw new Error(`Stufe ${level.label}: ${String(levelIds[index])} wurde nicht vermessen`);
    return { ...level, profile };
  });
  return { profiles: { playersPerTable, levels, ladder: ratedLadder }, result };
}

export function writeAppProfiles(profiles: AppProfiles): string {
  mkdirSync(dirname(APP_PROFILES_FILE), { recursive: true });
  writeFileSync(APP_PROFILES_FILE, `${JSON.stringify(profiles, null, 2)}\n`);
  return APP_PROFILES_FILE;
}
