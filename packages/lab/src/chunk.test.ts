import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, runChunk, splitIntoChunks } from './chunk.ts';
import type { Entrant } from './entrant.ts';
import { seatsForRound } from './line-up.ts';
import { createRng } from '@blanko/engine';

const entrants: Entrant[] = [
  { kind: 'random', id: 'zufall' },
  { kind: 'random', id: 'auch-zufall' },
];

describe('runChunk', () => {
  it('spielt die verlangte Zahl Runden und ist reproduzierbar', () => {
    const task = {
      entrants,
      plan: { kind: 'fixed' as const, seats: [0, 1, 0] },
      rounds: 20,
      seed: 3,
    };
    const first = runChunk(task);
    expect(first).toHaveLength(20);
    expect(runChunk(task)).toEqual(first);
    for (const record of first) {
      expect(record.placementPoints.reduce((a, b) => a + b, 0)).toBe(0);
      expect(record.seats).toEqual([0, 1, 0]);
    }
  });
});

describe('splitIntoChunks', () => {
  it('teilt in Pakete fester Größe mit eigenen Seeds', () => {
    const plan = { kind: 'fixed' as const, seats: [0, 1] };
    const chunks = splitIntoChunks({ entrants, plan }, CHUNK_SIZE * 2 + 7, 1);
    expect(chunks.map((c) => c.rounds)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 7]);
    expect(new Set(chunks.map((c) => c.seed)).size).toBe(3);
    expect(splitIntoChunks({ entrants, plan }, 10, 1)[0]?.seed).toBe(chunks[0]?.seed);
  });
});

describe('seatsForRound', () => {
  it('lost bei genug Teilnehmern jede Runde verschiedene Profile aus', () => {
    const rng = createRng(5);
    const plan = { kind: 'rotating' as const, entrantCount: 6, playerCount: 4 };
    const tables = Array.from({ length: 50 }, () => seatsForRound(plan, rng));
    for (const seats of tables) {
      expect(new Set(seats).size).toBe(4);
    }
    expect(new Set(tables.map((t) => t.join())).size).toBeGreaterThan(10);
  });

  it('setzt bei zu wenigen Teilnehmern jeden mindestens einmal ein', () => {
    const rng = createRng(6);
    const seats = seatsForRound({ kind: 'rotating', entrantCount: 2, playerCount: 5 }, rng);
    expect(seats).toHaveLength(5);
    expect(new Set(seats)).toEqual(new Set([0, 1]));
  });
});
