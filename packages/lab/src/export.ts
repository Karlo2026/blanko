import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BotProfile } from '@blanko/bots';
import { tournament, type RunOptions } from './commands.ts';
import type { Entrant } from './entrant.ts';
import type { RunResult } from './report.ts';

/** Die vier festen Stufen der App, schwächste zuerst. */
const LEVELS = [
  { level: 'anfaenger', label: 'Anfänger' },
  { level: 'mittel', label: 'Mittel' },
  { level: 'stark', label: 'Stark' },
  { level: 'meister', label: 'Meister' },
] as const;

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

/**
 * Vermisst alle Leiter-Profile in einem gemeinsamen Turnier und ordnet die Stufen zu.
 * Die Stufen sind Sprossen der Leiter, damit beide Wertungen auf derselben Skala liegen.
 */
export async function buildAppProfiles(
  ladder: readonly Entrant[],
  levelIds: readonly string[],
  playersPerTable: number,
  options: RunOptions,
): Promise<{ profiles: AppProfiles; result: RunResult }> {
  if (levelIds.length !== LEVELS.length) {
    throw new Error(
      `Es braucht genau ${String(LEVELS.length)} Stufen, nicht ${String(levelIds.length)}`,
    );
  }
  const rated = ladder.map((entrant) => {
    if (entrant.kind !== 'profile')
      throw new Error(`${entrant.id} ist kein Profil und kann nicht exportiert werden`);
    return entrant.profile;
  });
  const result = await tournament(ladder, playersPerTable, options);
  const withRating = rated
    .map((profile): BotProfile => ({ ...profile, rating: result.elo?.[profile.id] ?? null }))
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
  const levels = LEVELS.map((level, index) => {
    const profile = withRating.find((p) => p.id === levelIds[index]);
    if (profile === undefined)
      throw new Error(`Stufe ${level.label}: ${String(levelIds[index])} ist nicht in der Leiter`);
    return { ...level, profile };
  });
  return { profiles: { playersPerTable, levels, ladder: withRating }, result };
}

export function writeAppProfiles(profiles: AppProfiles): string {
  mkdirSync(dirname(APP_PROFILES_FILE), { recursive: true });
  writeFileSync(APP_PROFILES_FILE, `${JSON.stringify(profiles, null, 2)}\n`);
  return APP_PROFILES_FILE;
}
