import { describe, expect, it } from 'vitest';
import { parseProfile, seatFromProfile } from './profile.ts';
import { BASE_PARAMS } from './test-support.ts';
import { ValidationError } from './validate.ts';

const valid = {
  id: 'mittel',
  name: 'Mittel',
  type: 'rule',
  forgetRate: 0.1,
  mistakeRate: 0.05,
  rule: BASE_PARAMS,
  rating: 1500,
};

describe('Bot-Profil', () => {
  it('liest ein gültiges Profil', () => {
    expect(parseProfile(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it('liest ein IsmctsBot-Profil mit Iterationen und optionalem Zeitbudget', () => {
    const ismcts = { ...valid, type: 'ismcts', iterations: 200 };
    expect(parseProfile(ismcts)).toMatchObject({
      type: 'ismcts',
      iterations: 200,
      timeBudgetMs: null,
      reading: 0,
    });
    expect(parseProfile({ ...ismcts, reading: 0.8 })).toMatchObject({ reading: 0.8 });
    expect(() => parseProfile({ ...ismcts, reading: 2 })).toThrow('profile.reading');
    expect(parseProfile({ ...ismcts, timeBudgetMs: 300 })).toMatchObject({ timeBudgetMs: 300 });
    expect(() => parseProfile({ ...ismcts, iterations: 0 })).toThrow('profile.iterations');
    expect(typeof seatFromProfile(parseProfile(ismcts)).bot.chooseAction).toBe('function');
  });

  it('setzt eine fehlende Wertung auf null', () => {
    expect(parseProfile({ ...valid, rating: undefined }).rating).toBeNull();
  });

  it.each([
    ['unbekannter Typ', { ...valid, type: 'magic' }, 'profile.type'],
    ['Rate außerhalb 0..1', { ...valid, forgetRate: 1.5 }, 'profile.forgetRate'],
    ['fehlender Name', { ...valid, name: '' }, 'profile.name'],
    [
      'falsche Anzahl Klopf-Grenzen',
      { ...valid, rule: { ...BASE_PARAMS, knockThresholds: [1, 2] } },
      'knockThresholds',
    ],
    ['kein Objekt', 42, 'profile'],
  ])('lehnt ab: %s', (_label, data, field) => {
    expect(() => parseProfile(data)).toThrow(ValidationError);
    expect(() => parseProfile(data)).toThrow(field);
  });

  it('erzeugt einen spielbereiten Platz am Tisch', () => {
    const seat = seatFromProfile(parseProfile(valid));
    expect(seat.forgetRate).toBe(0.1);
    expect(typeof seat.bot.chooseAction).toBe('function');
  });
});
