import type { BotProfile } from '@blanko/bots';

/**
 * Wie weit die schwächste Stufe vom Ausgangsprofil abweicht. Schwäche entsteht wie bei Menschen:
 * mehr Fehlgriffe, mehr Vergessen, gröberes Behalten und waghalsigeres Klopfen.
 */
const WEAKEST = {
  mistakeRate: 0.6,
  // Mild, weil der RuleBot vergessene Karten wie unbekannte schätzt und dann kaum noch klopft.
  forgetRate: 0.03,
  keepMarginExtra: 3,
  knockThresholdExtra: 5,
} as const;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Profil mit Stärke s zwischen 0 (schwächste Stufe) und 1 (Ausgangsprofil). */
function weakenedProfile(base: BotProfile, strength: number, id: string, name: string): BotProfile {
  const weakness = 1 - strength;
  return {
    ...base,
    id,
    name,
    mistakeRate: round2(Math.max(base.mistakeRate, WEAKEST.mistakeRate * weakness)),
    forgetRate: round2(Math.max(base.forgetRate, WEAKEST.forgetRate * weakness)),
    rule: {
      ...base.rule,
      keepMargin: round2(base.rule.keepMargin + WEAKEST.keepMarginExtra * weakness),
      knockThresholds: base.rule.knockThresholds.map((t) =>
        round2(t + WEAKEST.knockThresholdExtra * weakness),
      ),
    },
    rating: null,
  };
}

/** Leiter mit `steps` Sprossen, Sprosse 1 am schwächsten, die letzte gleich stark wie das Ausgangsprofil. */
export function ladderProfiles(base: BotProfile, steps: number): BotProfile[] {
  return Array.from({ length: steps }, (_, index) => {
    const rung = String(index + 1).padStart(2, '0');
    const strength = steps === 1 ? 1 : index / (steps - 1);
    return weakenedProfile(base, strength, `leiter-${rung}`, `Leiter ${rung}`);
  });
}
