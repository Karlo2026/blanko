import { createRng, type Action, type PlayerView } from '@blanko/engine';
import type { Bot } from './bot.ts';
import { seatFromProfile, type BotProfile } from './profile.ts';

/**
 * Auftrag an einen Bot-Worker (Web Worker in der App, worker_threads im Server). Der Bot sieht nur
 * seine gedächtnisgefilterte Sicht.
 */
export interface BotRequest {
  readonly id: number;
  readonly profile: BotProfile;
  readonly view: PlayerView;
  readonly legal: readonly Action[];
  readonly seed: number;
}

export interface BotResponse {
  readonly id: number;
  readonly action: Action;
}

/** Beantwortet Bot-Aufträge; Bots werden je Profil einmal erzeugt und wiederverwendet. */
export function createBotAnswerer(): (request: BotRequest) => BotResponse {
  const bots = new Map<string, Bot>();
  return (request) => {
    let bot = bots.get(request.profile.id);
    if (bot === undefined) {
      bot = seatFromProfile(request.profile).bot;
      bots.set(request.profile.id, bot);
    }
    return {
      id: request.id,
      action: bot.chooseAction(request.view, request.legal, createRng(request.seed)),
    };
  };
}
