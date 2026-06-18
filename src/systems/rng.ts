/**
 * Tiny deterministic PRNG (mulberry32).
 *
 * Pure and framework-free. Given the same 32-bit seed it always yields the same
 * sequence, so terrain generation is reproducible from a stored seed instead of
 * persisting the whole map. Not cryptographically strong — we only need cheap,
 * stable, well-distributed floats in `[0, 1)`.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random 32-bit seed (for new fortresses). */
export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}
