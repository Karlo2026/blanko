// Web Worker: Bots rechnen hier, damit die Oberfläche flüssig bleibt.
import { seatFromProfile, type Bot } from '@blanko/bots';
import { createRng } from '@blanko/engine';
import type { BotRequest, BotResponse } from './bot-protocol.ts';

const bots = new Map<string, Bot>();

function botFor(request: BotRequest): Bot {
  const cached = bots.get(request.profile.id);
  if (cached !== undefined) return cached;
  const { bot } = seatFromProfile(request.profile);
  bots.set(request.profile.id, bot);
  return bot;
}

addEventListener('message', (event: MessageEvent<BotRequest>) => {
  const request = event.data;
  const action = botFor(request).chooseAction(request.view, request.legal, createRng(request.seed));
  const response: BotResponse = { id: request.id, action };
  postMessage(response);
});
