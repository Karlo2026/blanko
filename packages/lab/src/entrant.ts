import { parseProfile, randomBot, seatFromProfile, type BotProfile, type Seat } from '@blanko/bots';

/**
 * Teilnehmer im Labor: ein Profil oder der eingebaute Zufalls-Bot als Vergleichsmaßstab.
 * Reine Daten, damit sie an Worker übergeben werden können.
 */
export type Entrant =
  | { readonly kind: 'profile'; readonly id: string; readonly profile: BotProfile }
  | { readonly kind: 'random'; readonly id: string };

export const RANDOM_ENTRANT_ID = 'zufall';

export function entrantFromJson(data: unknown, source: string): Entrant {
  const profile = parseProfile(data, source);
  return { kind: 'profile', id: profile.id, profile };
}

export function seatFor(entrant: Entrant): Seat {
  return entrant.kind === 'random'
    ? { bot: randomBot, forgetRate: 0 }
    : seatFromProfile(entrant.profile);
}
