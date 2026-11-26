import { createRng, getPlayerView, legalActions, startRound } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { createBotAnswerer } from './bot-request.ts';
import { BOT_NAMES, freeBotName } from './names.ts';
import { parseProfileFile } from './profile-file.ts';
import { BASE_PARAMS } from './test-support.ts';

const profile = (id: string, rating: number) => ({
  id,
  name: id,
  type: 'rule',
  forgetRate: 0,
  mistakeRate: 0,
  rule: BASE_PARAMS,
  rating,
});
const file = parseProfileFile({
  levels: [{ level: 'mittel', label: 'Mittel', profile: profile('leiter-02', 1450) }],
  ladder: [profile('leiter-02', 1450), profile('leiter-01', 1300)],
});

describe('Bausteine für App und Server', () => {
  it('vergibt freie Bot-Namen und meidet vergebene', () => {
    expect(freeBotName([])).toBe(BOT_NAMES[0]);
    expect(freeBotName(['Anna', 'Karl'])).toBe('Greta');
    expect(freeBotName([...BOT_NAMES])).toBe('Bot 7');
  });

  it('liest die Profildatei mit Stufen und nach Wertung sortierter Leiter', () => {
    expect(file.levels.map((l) => l.label)).toEqual(['Mittel']);
    expect(file.ladder.map((p) => p.id)).toEqual(['leiter-01', 'leiter-02']);
    expect(() => parseProfileFile({ levels: [] })).toThrow();
  });

  it('beantwortet Bot-Aufträge mit einem erlaubten Zug, reproduzierbar je Seed', () => {
    const answer = createBotAnswerer();
    const state = startRound({ playerCount: 3, dealer: 0 }, createRng(4));
    const profile = file.levels[0]?.profile;
    if (profile === undefined) throw new Error('Stufe fehlt');
    const request = {
      id: 7,
      profile,
      view: getPlayerView(state, state.current),
      legal: legalActions(state),
      seed: 3,
    };
    const response = answer(request);
    expect(response.id).toBe(7);
    expect(request.legal).toContainEqual(response.action);
    expect(answer(request)).toEqual(response);
  });
});
