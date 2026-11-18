import { MAX_PLAYERS, MIN_PLAYERS } from '@blanko/engine';
import { createRuleBot, type RuleParams } from './rule-bot.ts';
import type { Seat } from './runner.ts';
import {
  expectNumber,
  expectNumberList,
  expectRecord,
  expectString,
  ValidationError,
} from './validate.ts';

/**
 * Beschreibung eines Gegners als JSON. `type` wird um 'ismcts' erweitert, sobald es den
 * IsmctsBot gibt (Phase 5); bis dahin wäre es ein Feld ohne Wirkung.
 */
export interface BotProfile {
  readonly id: string;
  readonly name: string;
  readonly type: 'rule';
  /** Wahrscheinlichkeit pro Zug, eine bekannte Handkarte zu vergessen. */
  readonly forgetRate: number;
  /** Wahrscheinlichkeit pro Entscheidung, zufällig zu ziehen statt nach Regeln. */
  readonly mistakeRate: number;
  readonly rule: RuleParams;
  /** Im Labor gemessene Elo-Wertung; null, solange nicht gemessen. */
  readonly rating: number | null;
}

function parseRuleParams(value: unknown, path: string): RuleParams {
  const raw = expectRecord(value, path);
  return {
    keepMargin: expectNumber(raw.keepMargin, `${path}.keepMargin`),
    knockThresholds: expectNumberList(
      raw.knockThresholds,
      `${path}.knockThresholds`,
      MAX_PLAYERS - MIN_PLAYERS + 1,
    ),
    knockLead: expectNumber(raw.knockLead, `${path}.knockLead`),
    peekOwnValue: expectNumber(raw.peekOwnValue, `${path}.peekOwnValue`),
    peekOpponentValue: expectNumber(raw.peekOpponentValue, `${path}.peekOpponentValue`),
    swapMargin: expectNumber(raw.swapMargin, `${path}.swapMargin`),
    suspicionThreshold: expectNumber(raw.suspicionThreshold, `${path}.suspicionThreshold`, 0),
  };
}

/** Prüft geladene Daten und liefert ein typisiertes Profil oder wirft einen ValidationError. */
export function parseProfile(value: unknown, path = 'profile'): BotProfile {
  const raw = expectRecord(value, path);
  if (raw.type !== 'rule') {
    throw new ValidationError(`${path}.type: 'rule' erwartet`);
  }
  return {
    id: expectString(raw.id, `${path}.id`),
    name: expectString(raw.name, `${path}.name`),
    type: raw.type,
    forgetRate: expectNumber(raw.forgetRate, `${path}.forgetRate`, 0, 1),
    mistakeRate: expectNumber(raw.mistakeRate, `${path}.mistakeRate`, 0, 1),
    rule: parseRuleParams(raw.rule, `${path}.rule`),
    rating:
      raw.rating === null || raw.rating === undefined
        ? null
        : expectNumber(raw.rating, `${path}.rating`),
  };
}

export function seatFromProfile(profile: BotProfile): Seat {
  return { bot: createRuleBot(profile.rule, profile.mistakeRate), forgetRate: profile.forgetRate };
}
