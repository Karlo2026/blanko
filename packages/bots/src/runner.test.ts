import { createRng, scoreRound, startRound } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { randomBot } from './random-bot.ts';
import { createRuleBot } from './rule-bot.ts';
import { playRound, type Seat } from './runner.ts';
import { BASE_PARAMS } from './test-support.ts';

const ruleSeat: Seat = { bot: createRuleBot(BASE_PARAMS, 0), forgetRate: 0 };
const randomSeat: Seat = { bot: randomBot, forgetRate: 0 };

/** Durchschnittliche Platzierungspunkte der RuleBots an einem gemischten Tisch. */
function averageRulePoints(playerCount: number, rounds: number): number {
  const rng = createRng(playerCount);
  let points = 0;
  let ruleSeats = 0;
  for (let round = 0; round < rounds; round++) {
    const seats = Array.from({ length: playerCount }, (_, i) =>
      (i + round) % 2 === 0 ? ruleSeat : randomSeat,
    );
    const final = playRound(
      startRound({ playerCount, dealer: round % playerCount }, rng),
      seats,
      rng,
    );
    const score = scoreRound(final, rng);
    seats.forEach((seat, player) => {
      if (seat === ruleSeat) {
        points += score.placementPoints[player] ?? 0;
        ruleSeats++;
      }
    });
  }
  return points / ruleSeats;
}

describe('playRound', () => {
  it('spielt ganze Runden mit vergesslichen RuleBots zu Ende', () => {
    const rng = createRng(3);
    const seats = Array.from({ length: 5 }, () => ({
      bot: createRuleBot(BASE_PARAMS, 0.1),
      forgetRate: 0.2,
    }));
    for (let round = 0; round < 50; round++) {
      expect(playRound(startRound({ playerCount: 5, dealer: 0 }, rng), seats, rng).phase.kind).toBe(
        'roundOver',
      );
    }
  });

  it('ist bei gleichem Seed reproduzierbar', () => {
    const seats = Array.from({ length: 3 }, () => ({
      bot: createRuleBot(BASE_PARAMS, 0.1),
      forgetRate: 0.1,
    }));
    const run = () => {
      const rng = createRng(21);
      return playRound(startRound({ playerCount: 3, dealer: 0 }, rng), seats, rng);
    };
    expect(run()).toEqual(run());
  });
});

describe('RuleBot gegen Zufalls-Bot', () => {
  it.each([2, 4, 6])('gewinnt bei %i Spielern klar', (playerCount) => {
    // Erwartung bei gleicher Stärke wäre 0; das Maximum ist +2.
    expect(averageRulePoints(playerCount, 600)).toBeGreaterThan(0.6);
  });
});
