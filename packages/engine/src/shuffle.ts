import type { Rng } from './rng.ts';

/** Fisher-Yates-Mischen; liefert eine neue Liste und lässt die Eingabe unverändert. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}
