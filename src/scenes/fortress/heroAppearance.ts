/**
 * Picks a distinct character tile for each hero from the Kenney "Roguelike
 * Characters" sheet, so no two heroes on the map look alike.
 *
 * Pure/stateful and framework-free (no Phaser) so it stays unit-testable. The
 * sheet is a 54×12 grid of 16×16 tiles (frame index = row*54 + col); the
 * detailed humanoid characters live in the first two columns of the lower rows —
 * those are the only frames we treat as "heroes".
 */

/** Curated humanoid hero tiles (front-facing people, not the blob/enemy bases). */
export const CHARACTER_FRAMES: readonly number[] = [
  270, 271, 324, 325, 378, 379, 432, 433, 486, 487, 540, 541, 594, 595,
];

/** Stable 32-bit hash of a hero id (FNV-1a) — picks a preferred tile. */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Hands out a unique character frame per hero id. The first request for an id
 * picks a hash-preferred tile and linear-probes to the next free one, so live
 * heroes never share a tile; the choice is cached so adding a recruit doesn't
 * change anyone else's appearance. If the roster ever exceeds the curated pool,
 * later heroes fall back to their preferred (possibly shared) tile.
 */
export class HeroAppearances {
  private readonly assigned = new Map<string, number>();
  private readonly used = new Set<number>();

  frameFor(id: string): number {
    const cached = this.assigned.get(id);
    if (cached !== undefined) return cached;

    const n = CHARACTER_FRAMES.length;
    const start = hashId(id) % n;
    for (let i = 0; i < n; i++) {
      const frame = CHARACTER_FRAMES[(start + i) % n];
      if (!this.used.has(frame)) {
        this.used.add(frame);
        this.assigned.set(id, frame);
        return frame;
      }
    }
    // Pool exhausted — reuse the preferred tile (uniqueness no longer possible).
    const frame = CHARACTER_FRAMES[start];
    this.assigned.set(id, frame);
    return frame;
  }
}
