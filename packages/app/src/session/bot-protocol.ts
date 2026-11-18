import type { BotProfile } from '@blanko/bots';
import type { Action, PlayerView } from '@blanko/engine';

/** Nachricht an den Bot-Worker: Der Bot sieht nur seine (gedächtnisgefilterte) Sicht. */
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
