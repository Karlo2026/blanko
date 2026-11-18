import { describe, expect, it } from 'vitest';
import { loadTempo, saveTempo, tempoById, TEMPOS } from './tempo.ts';

describe('Tempo', () => {
  it('ist von ruhig nach schnell abgestuft', () => {
    const pauses = TEMPOS.map((t) => t.botPauseMs);
    const flights = TEMPOS.map((t) => t.flightMs);
    expect(pauses).toEqual([...pauses].sort((a, b) => b - a));
    expect(flights).toEqual([...flights].sort((a, b) => b - a));
  });

  it('fällt bei Unbekanntem auf „Normal“ zurück', () => {
    expect(tempoById('turbo').id).toBe('normal');
    expect(tempoById(null).id).toBe('normal');
  });

  it('wird gespeichert und übersteht gesperrten Speicher', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    saveTempo(storage, tempoById('schnell'));
    expect(loadTempo(storage).id).toBe('schnell');
    expect(
      loadTempo({
        getItem: () => {
          throw new Error('gesperrt');
        },
      }).id,
    ).toBe('normal');
  });
});
