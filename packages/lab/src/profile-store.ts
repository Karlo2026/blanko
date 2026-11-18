import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { entrantFromJson, RANDOM_ENTRANT_ID, type Entrant } from './entrant.ts';

const PROFILES_DIR = join(import.meta.dirname, '..', 'profiles');

export function availableProfileIds(): string[] {
  return readdirSync(PROFILES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .sort();
}

/** Lädt ein Profil aus packages/lab/profiles; „zufall“ ist der eingebaute Zufalls-Bot. */
export function loadEntrant(id: string): Entrant {
  if (id === RANDOM_ENTRANT_ID) {
    return { kind: 'random', id };
  }
  if (!availableProfileIds().includes(id)) {
    throw new Error(
      `Unbekanntes Profil „${id}“. Vorhanden: ${[...availableProfileIds(), RANDOM_ENTRANT_ID].join(', ')}`,
    );
  }
  const file = join(PROFILES_DIR, `${id}.json`);
  return entrantFromJson(JSON.parse(readFileSync(file, 'utf8')), file);
}
