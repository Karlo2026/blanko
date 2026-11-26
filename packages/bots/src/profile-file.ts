import { parseProfile, type BotProfile } from './profile.ts';
import { expectList, expectRecord, expectString, ValidationError } from './validate.ts';

/** Eine feste Stufe aus dem Labor (Anfänger bis Großmeister). */
export interface Level {
  readonly level: string;
  readonly label: string;
  readonly profile: BotProfile;
}

/** Inhalt von profiles.json: feste Stufen und die Leiter für den dynamischen Modus. */
export interface ProfileFile {
  readonly levels: readonly Level[];
  /** Nach Wertung aufsteigend; jedes Profil hat eine im Labor gemessene Wertung. */
  readonly ladder: readonly BotProfile[];
}

function parseLevel(entry: unknown, index: number): Level {
  const path = `levels[${String(index)}]`;
  const raw = expectRecord(entry, path);
  return {
    level: expectString(raw.level, `${path}.level`),
    label: expectString(raw.label, `${path}.label`),
    profile: parseProfile(raw.profile, `${path}.profile`),
  };
}

function parseRung(entry: unknown, index: number): BotProfile {
  const profile = parseProfile(entry, `ladder[${String(index)}]`);
  if (profile.rating === null) throw new ValidationError(`ladder[${String(index)}]: Wertung fehlt`);
  return profile;
}

/** Prüft die vom Labor exportierte profiles.json; App und Server lesen dieselbe Datei. */
export function parseProfileFile(data: unknown): ProfileFile {
  const raw = expectRecord(data, 'profiles.json');
  const ladder = expectList(raw.ladder, 'ladder').map(parseRung);
  return {
    levels: expectList(raw.levels, 'levels').map(parseLevel),
    ladder: [...ladder].sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0)),
  };
}
