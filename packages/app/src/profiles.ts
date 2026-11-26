import { parseProfileFile, type ProfileFile } from '@blanko/bots';

export async function loadAppProfiles(): Promise<ProfileFile> {
  const response = await fetch('./profiles.json');
  if (!response.ok) throw new Error(`profiles.json nicht ladbar (${String(response.status)})`);
  return parseProfileFile(await response.json());
}
