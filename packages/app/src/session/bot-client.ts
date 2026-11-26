import type { BotProfile, BotRequest, BotResponse } from '@blanko/bots';
import type { Action, PlayerView } from '@blanko/engine';

/** Schmale Promise-Schnittstelle zum Bot-Worker. */
export class BotClient {
  private readonly worker = new Worker(new URL('./bot.worker.ts', import.meta.url), {
    type: 'module',
  });
  private readonly pending = new Map<number, (action: Action) => void>();
  private nextId = 1;

  constructor() {
    this.worker.addEventListener('message', (event: MessageEvent<BotResponse>) => {
      this.pending.get(event.data.id)?.(event.data.action);
      this.pending.delete(event.data.id);
    });
  }

  chooseAction(
    profile: BotProfile,
    view: PlayerView,
    legal: readonly Action[],
    seed: number,
  ): Promise<Action> {
    const id = this.nextId++;
    const request: BotRequest = { id, profile, view, legal, seed };
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}
