import { createRng, type Action } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { createRuleBot } from './rule-bot.ts';
import { BASE_PARAMS, cardFor, hidden, known, makeView } from './test-support.ts';

const bot = createRuleBot(BASE_PARAMS, 0);
const rng = createRng(1);
const opponentHidden = [hidden, hidden, hidden, hidden];

describe('RuleBot zu Beginn des Zuges', () => {
  const legalStart = (slots: number[]): Action[] => [
    { type: 'draw' },
    { type: 'knock' },
    ...slots.map((slot): Action => ({ type: 'matchDiscard', slot })),
  ];

  it('legt eine bekannte passende Karte ab', () => {
    const view = makeView({
      hands: [[hidden, known(13), known(7), hidden], opponentHidden],
      matchableRank: 7,
    });
    expect(bot.chooseAction(view, legalStart([0, 1, 2, 3]), rng)).toEqual({
      type: 'matchDiscard',
      slot: 2,
    });
  });

  it('legt unbekannte Karten nur ab der Verdachtsgrenze ab', () => {
    const view = makeView({
      hands: [[hidden, known(13), known(12), known(11)], opponentHidden],
      matchableRank: 7,
    });
    expect(bot.chooseAction(view, legalStart([0, 1, 2, 3]), rng)).toEqual({ type: 'draw' });
    const gambler = createRuleBot({ ...BASE_PARAMS, suspicionThreshold: 0 }, 0);
    expect(gambler.chooseAction(view, legalStart([0, 1, 2, 3]), rng)).toEqual({
      type: 'matchDiscard',
      slot: 0,
    });
  });

  it('klopft mit einer sicher niedrigen Hand', () => {
    const view = makeView({
      hands: [[known(1), known(2), known(3), { kind: 'empty' }], opponentHidden],
    });
    expect(bot.chooseAction(view, legalStart([]), rng)).toEqual({ type: 'knock' });
  });

  it('klopft nicht mit einer hohen oder unbekannten Hand', () => {
    const high = makeView({ hands: [[known(13), known(12), known(3), known(2)], opponentHidden] });
    expect(bot.chooseAction(high, legalStart([]), rng)).toEqual({ type: 'draw' });
    const unknown = makeView({ hands: [[hidden, hidden, known(1), known(2)], opponentHidden] });
    expect(bot.chooseAction(unknown, legalStart([]), rng)).toEqual({ type: 'draw' });
  });

  it('klopft nicht, wenn ein Gegner bekanntermaßen besser steht', () => {
    const view = makeView({
      hands: [
        [known(1), known(2), known(3), { kind: 'empty' }],
        [known(1, 'hearts'), known(2, 'hearts'), { kind: 'empty' }, { kind: 'empty' }],
      ],
    });
    expect(bot.chooseAction(view, legalStart([]), rng)).toEqual({ type: 'draw' });
  });
});

describe('RuleBot nach dem Ziehen', () => {
  const legalDrawn = (extra: Action[] = []): Action[] => [
    { type: 'discardDrawn' },
    ...[0, 1, 2, 3].map((slot): Action => ({ type: 'keep', slot })),
    ...extra,
  ];

  it('tauscht ein gezogenes Ass gegen seinen bekannten König', () => {
    const view = makeView({
      phase: 'drawn',
      drawnCard: cardFor(1),
      hands: [[known(4), known(13), known(3), known(2)], opponentHidden],
    });
    expect(bot.chooseAction(view, legalDrawn(), rng)).toEqual({ type: 'keep', slot: 1 });
  });

  it('legt eine gezogene hohe Karte ab, wenn die eigene Hand niedrig ist', () => {
    const view = makeView({
      phase: 'drawn',
      drawnCard: cardFor(12),
      hands: [[known(1), known(2), known(3), known(4)], opponentHidden],
    });
    expect(bot.chooseAction(view, legalDrawn(), rng)).toEqual({ type: 'discardDrawn' });
  });

  it('nutzt eine 8, um eine unbekannte eigene Karte anzuschauen', () => {
    const view = makeView({
      phase: 'drawn',
      drawnCard: cardFor(8),
      hands: [[known(2), hidden, known(3), known(4)], opponentHidden],
    });
    const peeks = [0, 1, 2, 3].map((slot): Action => ({ type: 'peekOwn', slot }));
    expect(bot.chooseAction(view, legalDrawn(peeks), rng)).toEqual({ type: 'peekOwn', slot: 1 });
  });

  it('tauscht per 10 seinen bekannten König gegen ein bekanntes Ass des Gegners', () => {
    const view = makeView({
      phase: 'drawn',
      drawnCard: cardFor(10),
      hands: [
        [known(2), known(13), known(3), known(4)],
        [hidden, known(1, 'hearts'), hidden, hidden],
      ],
    });
    const swaps = [0, 1, 2, 3].flatMap((slot) =>
      [0, 1, 2, 3].map((targetSlot): Action => ({
        type: 'blindSwap',
        slot,
        target: 1,
        targetSlot,
      })),
    );
    expect(bot.chooseAction(view, legalDrawn(swaps), rng)).toEqual({
      type: 'blindSwap',
      slot: 1,
      target: 1,
      targetSlot: 1,
    });
  });
});

describe('RuleBot mit Fehlerquote', () => {
  it('macht zufällige Züge, klopft dabei aber nie', () => {
    const clumsy = createRuleBot(BASE_PARAMS, 1);
    const view = makeView({
      hands: [[known(1), known(2), known(3), { kind: 'empty' }], opponentHidden],
    });
    const legal: Action[] = [{ type: 'draw' }, { type: 'knock' }];
    for (let i = 0; i < 50; i++) {
      expect(clumsy.chooseAction(view, legal, rng)).toEqual({ type: 'draw' });
    }
  });
});

describe('RuleBot: weitere Klopf-Regeln', () => {
  const legal: Action[] = [{ type: 'draw' }, { type: 'knock' }];
  // Hand mit 10 Punkten: über der strengen Grenze (5), also Klopfen nur über die neuen Regeln.
  const view = (turnCount: number) =>
    makeView({
      hands: [[known(4), known(5), known(1), { kind: 'empty' }], opponentHidden],
      turnCount,
    });
  const strict = { ...BASE_PARAMS, knockThresholds: [5, 5, 5, 5, 5], knockLead: 0 };

  it('hebt die Klopf-Grenze mit dem Rundenfortschritt an', () => {
    const progressing = createRuleBot({ ...strict, knockProgress: 1 }, 0);
    expect(progressing.chooseAction(view(0), legal, rng)).toEqual({ type: 'draw' });
    // 10 Züge bei 2 Spielern = 5 Tischrunden, Grenze 5 + 5 = 10.
    expect(progressing.chooseAction(view(10), legal, rng)).toEqual({ type: 'knock' });
  });

  it('klopft, sobald die geschätzte Gewinnwahrscheinlichkeit hoch genug ist', () => {
    const confident = createRuleBot({ ...strict, knockWinProbability: 0.5 }, 0);
    expect(confident.chooseAction(view(0), legal, rng)).toEqual({ type: 'knock' });
    expect(createRuleBot(strict, 0).chooseAction(view(0), legal, rng)).toEqual({ type: 'draw' });
  });
});

describe('RuleBot: Zielwahl bei Gleichstand', () => {
  const swapsFrom = (slot: number, targets: number[]): Action[] =>
    targets.flatMap((target) =>
      [0, 1, 2, 3].map((targetSlot): Action => ({ type: 'blindSwap', slot, target, targetSlot })),
    );

  it('schiebt eine hohe Karte dem Gegner zu, der am besten dasteht', () => {
    const view = makeView({
      phase: 'drawn',
      drawnCard: cardFor(10),
      hands: [
        [known(2), known(13), known(3), known(4)],
        [hidden, hidden, hidden, hidden],
        [hidden, hidden, known(1, 'hearts'), known(2, 'hearts')],
        [hidden, hidden, hidden, hidden],
      ],
    });
    const choice = bot.chooseAction(
      view,
      [{ type: 'discardDrawn' }, ...swapsFrom(1, [1, 2, 3])],
      rng,
    );
    expect(choice).toMatchObject({ type: 'blindSwap', slot: 1, target: 2 });
  });

  it('verteilt gleichwertige Ziele zufällig statt immer auf Spieler 0', () => {
    const view = makeView({
      viewer: 2,
      current: 2,
      phase: 'drawn',
      drawnCard: cardFor(10),
      hands: [
        [hidden, hidden, hidden, hidden],
        [hidden, hidden, hidden, hidden],
        [known(2), known(13), known(3), known(4)],
      ],
    });
    const targets = new Set(
      Array.from({ length: 40 }, () => {
        const choice = bot.chooseAction(
          view,
          [{ type: 'discardDrawn' }, ...swapsFrom(1, [0, 1])],
          rng,
        );
        return choice.type === 'blindSwap' ? choice.target : -1;
      }),
    );
    expect(targets).toEqual(new Set([0, 1]));
  });
});
