import { pickRandom, type Bot } from './bot.ts';

/** Vergleichsmaßstab: wählt gleichverteilt unter allen erlaubten Aktionen. */
export const randomBot: Bot = {
  chooseAction: (_view, legal, rng) => pickRandom(legal, rng),
};
