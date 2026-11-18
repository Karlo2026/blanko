import type { BotProfile } from '@blanko/bots';
import type { RoundScore } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import {
  chooseOpponent,
  expectedPlacementPoints,
  initialRating,
  loadRating,
  saveRating,
  updateRating,
  winProbability,
} from './rating.ts';

const scoreWithHumanAt = (place: number, players: number): RoundScore => {
  const others = Array.from({ length: players - 1 }, (_, i) => i + 1);
  const ranking = [...others.slice(0, place), 0, ...others.slice(place)];
  return { handPoints: ranking.map(() => 0), ranking, placementPoints: ranking.map(() => 0) };
};

const rung = (rating: number): BotProfile =>
  ({
    id: `r${String(rating)}`,
    name: 'x',
    type: 'rule',
    forgetRate: 0,
    mistakeRate: 0,
    rating,
  }) as BotProfile;

describe('Spielerwertung', () => {
  it('folgt der Elo-Skala: gleich stark 50 %, 400 Punkte Abstand etwa 10:1', () => {
    expect(winProbability(1500, 1500)).toBe(0.5);
    expect(winProbability(1900, 1500)).toBeCloseTo(10 / 11, 10);
  });

  it('steigt nach einem Sieg und fällt nach dem letzten Platz', () => {
    const start = { rating: 1500, rounds: 20 };
    expect(updateRating(start, scoreWithHumanAt(0, 4), 1500).rating).toBeCloseTo(1520, 10);
    expect(updateRating(start, scoreWithHumanAt(3, 4), 1500).rating).toBeCloseTo(1480, 10);
    expect(updateRating(start, scoreWithHumanAt(0, 4), 1500).rounds).toBe(21);
  });

  it('bewegt sich in den ersten Runden doppelt so stark', () => {
    expect(
      updateRating({ rating: 1500, rounds: 0 }, scoreWithHumanAt(0, 2), 1500).rating,
    ).toBeCloseTo(1540, 10);
  });

  it('beginnt bei der Stufe „Mittel“', () => {
    const levels = ['anfaenger', 'mittel', 'stark', 'meister'].map((level, i) => ({
      level,
      label: level,
      profile: rung(1300 + i * 100),
    }));
    expect(initialRating(levels)).toEqual({
      rating: 1400,
      rounds: 0,
    });
  });

  it('wird gespeichert und übersteht kaputte Daten', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    saveRating(storage, { rating: 1612, rounds: 7 });
    expect(loadRating(storage, { rating: 1500, rounds: 0 })).toEqual({ rating: 1612, rounds: 7 });
    expect(loadRating({ getItem: () => '{kaputt' }, { rating: 1500, rounds: 0 })).toEqual({
      rating: 1500,
      rounds: 0,
    });
  });
});

describe('Gegnerwahl', () => {
  it('erwartet 0 Platzierungspunkte gegen gleich starke Gegner, bei jeder Spielerzahl', () => {
    for (let players = 2; players <= 6; players++) {
      expect(expectedPlacementPoints(1500, 1500, players)).toBeCloseTo(0, 10);
    }
    expect(expectedPlacementPoints(1700, 1500, 4)).toBeGreaterThan(0.5);
  });

  it('wählt das Leiter-Profil mit der passenden Stärke', () => {
    const ladder = [rung(1350), rung(1450), rung(1550), rung(1650)];
    expect(chooseOpponent(ladder, 1460, 4).rating).toBe(1450);
    expect(chooseOpponent(ladder, 2000, 4).rating).toBe(1650);
    expect(chooseOpponent(ladder, 1000, 3).rating).toBe(1350);
  });
});
