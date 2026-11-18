/**
 * Zufallsgenerator mit Seed (sfc32, initialisiert über splitmix32).
 *
 * Warum ein eigener Generator: Math.random lässt sich nicht seeden. Für das Labor
 * muss aber jede Partie aus ihrem Seed exakt reproduzierbar sein, auf dem Mac
 * genauso wie im Browser. sfc32 ist schnell, hat einen 128-Bit-Zustand und
 * eine für Monte-Carlo-Simulationen ausreichende Qualität.
 */
export interface Rng {
  /** Gleichverteilte Zahl aus [0, 1). */
  next(): number;
  /** Gleichverteilte ganze Zahl aus [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

const UINT32_RANGE = 2 ** 32;

export function createRng(seed: number): Rng {
  let splitState = seed >>> 0;
  const nextSplit = (): number => {
    splitState = (splitState + 0x9e3779b9) >>> 0;
    let z = splitState;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };

  let a = nextSplit();
  let b = nextSplit();
  let c = nextSplit();
  let d = nextSplit();

  const nextUint32 = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t;
  };

  const next = (): number => nextUint32() / UINT32_RANGE;

  return {
    next,
    nextInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(
          `maxExclusive muss eine positive ganze Zahl sein: ${String(maxExclusive)}`,
        );
      }
      return Math.floor(next() * maxExclusive);
    },
  };
}
