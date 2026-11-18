import { parseProfile, type BotProfile } from '@blanko/bots';

/** Eine der vier festen Stufen aus dem Labor (Anfänger bis Meister). */
export interface Level {
  readonly level: string;
  readonly label: string;
  readonly profile: BotProfile;
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

/** Prüft die vom Labor exportierte profiles.json und liefert die Stufen. */
export function parseLevels(data: unknown): Level[] {
  const levels = asRecord(data, 'profiles.json').levels;
  if (!Array.isArray(levels) || levels.length === 0)
    throw new Error('profiles.json: Stufen fehlen');
  return levels.map((entry, index) => {
    const path = `levels[${String(index)}]`;
    const raw = asRecord(entry, path);
    return {
      level: asText(raw.level, `${path}.level`),
      label: asText(raw.label, `${path}.label`),
      profile: parseProfile(raw.profile, `${path}.profile`),
    };
  });
}

export async function loadLevels(): Promise<Level[]> {
  const response = await fetch('./profiles.json');
  if (!response.ok) throw new Error(`profiles.json nicht ladbar (${String(response.status)})`);
  return parseLevels(await response.json());
}
