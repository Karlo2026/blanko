import { MAX_PLAYERS, MIN_PLAYERS } from '@blanko/engine';
import { createIsmctsBot } from './ismcts-bot.ts';
import { createRuleBot, type RuleParams } from './rule-bot.ts';
import type { Seat } from './runner.ts';
import {
  expectNumber,
  expectNumberList,
  expectRecord,
  expectString,
  ValidationError,
} from './validate.ts';

interface CommonProfile {
  readonly id: string;
  readonly name: string;
  /** Wahrscheinlichkeit pro Zug, eine bekannte Handkarte zu vergessen. */
  readonly forgetRate: number;
  /** Wahrscheinlichkeit pro Entscheidung, zufällig zu ziehen statt nach Regeln. */
  readonly mistakeRate: number;
  readonly rule: RuleParams;
  /** Im Labor gemessene Elo-Wertung; null, solange nicht gemessen. */
  readonly rating: number | null;
}

/**
 * Beschreibung eines Gegners als JSON. Beim IsmctsBot sind die Faustregeln (`rule`) die
 * Strategie in seinen Rollouts.
 */
export type BotProfile = CommonProfile &
  (
    | { readonly type: 'rule' }
    | {
        readonly type: 'ismcts';
        /** Determinisierungen pro Entscheidung. */
        readonly iterations: number;
        /** Zeitbudget pro Entscheidung in ms; null heißt nur Iterationen (reproduzierbar). */
        readonly timeBudgetMs: number | null;
      }
  );

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
    knockProgress: expectNumber(raw.knockProgress, `${path}.knockProgress`),
    knockWinProbability: expectNumber(raw.knockWinProbability, `${path}.knockWinProbability`, 0),
    opponentLowBias: expectNumber(raw.opponentLowBias, `${path}.opponentLowBias`, 0),
    peekOwnValue: expectNumber(raw.peekOwnValue, `${path}.peekOwnValue`),
    peekOpponentValue: expectNumber(raw.peekOpponentValue, `${path}.peekOpponentValue`),
    swapMargin: expectNumber(raw.swapMargin, `${path}.swapMargin`),
    suspicionThreshold: expectNumber(raw.suspicionThreshold, `${path}.suspicionThreshold`, 0),
  };
}

/** Prüft geladene Daten und liefert ein typisiertes Profil oder wirft einen ValidationError. */
export function parseProfile(value: unknown, path = 'profile'): BotProfile {
  const raw = expectRecord(value, path);
  const common: CommonProfile = {
    id: expectString(raw.id, `${path}.id`),
    name: expectString(raw.name, `${path}.name`),
    forgetRate: expectNumber(raw.forgetRate, `${path}.forgetRate`, 0, 1),
    mistakeRate: expectNumber(raw.mistakeRate, `${path}.mistakeRate`, 0, 1),
    rule: parseRuleParams(raw.rule, `${path}.rule`),
    rating:
      raw.rating === null || raw.rating === undefined
        ? null
        : expectNumber(raw.rating, `${path}.rating`),
  };
  switch (raw.type) {
    case 'rule':
      return { ...common, type: 'rule' };
    case 'ismcts':
      return {
        ...common,
        type: 'ismcts',
        iterations: expectNumber(raw.iterations, `${path}.iterations`, 1),
        timeBudgetMs:
          raw.timeBudgetMs === null || raw.timeBudgetMs === undefined
            ? null
            : expectNumber(raw.timeBudgetMs, `${path}.timeBudgetMs`, 1),
      };
    default:
      throw new ValidationError(`${path}.type: 'rule' oder 'ismcts' erwartet`);
  }
}

export function seatFromProfile(profile: BotProfile): Seat {
  const bot =
    profile.type === 'rule'
      ? createRuleBot(profile.rule, profile.mistakeRate)
      : createIsmctsBot(
          {
            iterations: profile.iterations,
            timeBudgetMs: profile.timeBudgetMs,
            rollout: profile.rule,
          },
          profile.mistakeRate,
        );
  return { bot, forgetRate: profile.forgetRate };
}
