import { parseProfile, type BotProfile } from '@blanko/bots';

/** Eine der vier festen Stufen aus dem Labor (Anfänger bis Meister). */
export interface Level {
  readonly level: string;
  readonly label: string;
  readonly profile: BotProfile;
}

/** Inhalt von profiles.json: feste Stufen und die Leiter für den dynamischen Modus. */
export interface AppProfiles {
  readonly levels: readonly Level[];
  /** Nach Wertung aufsteigend; jedes Profil hat eine im Labor gemessene Wertung. */
  readonly ladder: readonly BotProfile[];
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path}: Objekt erwartet`);
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${path}: Text erwartet`);
  return value;
}

function asList(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${path} fehlen`);
  return value;
}

function parseLevel(entry: unknown, index: number): Level {
  const path = `levels[${String(index)}]`;
  const raw = asRecord(entry, path);
  return {
    level: asText(raw.level, `${path}.level`),
    label: asText(raw.label, `${path}.label`),
    profile: parseProfile(raw.profile, `${path}.profile`),
  };
}

function parseRung(entry: unknown, index: number): BotProfile {
  const profile = parseProfile(entry, `ladder[${String(index)}]`);
  if (profile.rating === null) throw new Error(`ladder[${String(index)}]: Wertung fehlt`);
  return profile;
}

/** Prüft die vom Labor exportierte profiles.json. */
export function parseAppProfiles(data: unknown): AppProfiles {
  const raw = asRecord(data, 'profiles.json');
  const ladder = asList(raw.ladder, 'Leiter').map(parseRung);
  return {
    levels: asList(raw.levels, 'Stufen').map(parseLevel),
    ladder: [...ladder].sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0)),
  };
}

export async function loadAppProfiles(): Promise<AppProfiles> {
  const response = await fetch('./profiles.json');
  if (!response.ok) throw new Error(`profiles.json nicht ladbar (${String(response.status)})`);
  return parseAppProfiles(await response.json());
}
