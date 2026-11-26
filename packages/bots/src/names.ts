/**
 * Namen für Bots am Tisch. Sechs Namen, damit auch online bei einem menschlichen „Karl“ noch genug
 * freie Namen für fünf Bots bleiben.
 */
export const BOT_NAMES: readonly string[] = ['Karl', 'Greta', 'Otto', 'Ilse', 'Bruno', 'Frieda'];

/** Erster Bot-Name, der am Tisch noch nicht vergeben ist. */
export function freeBotName(taken: readonly string[]): string {
  return BOT_NAMES.find((name) => !taken.includes(name)) ?? `Bot ${String(taken.length + 1)}`;
}
