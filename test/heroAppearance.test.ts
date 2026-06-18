import { describe, it, expect } from 'vitest';
import { CHARACTER_FRAMES, HeroAppearances } from '../src/scenes/fortress/heroAppearance';

describe('HeroAppearances', () => {
  it('hands every hero a distinct character frame', () => {
    const a = new HeroAppearances();
    const ids = ['starter-0', 'starter-1', 'starter-2', 'h-42', 'h-7', 'h-99'];
    const frames = ids.map((id) => a.frameFor(id));

    expect(new Set(frames).size).toBe(ids.length); // all unique
    for (const f of frames) expect(CHARACTER_FRAMES).toContain(f);
  });

  it('is stable: a hero keeps its frame across calls and as others are added', () => {
    const a = new HeroAppearances();
    const first = a.frameFor('starter-0');
    a.frameFor('starter-1');
    a.frameFor('h-123');
    expect(a.frameFor('starter-0')).toBe(first);
  });

  it('stays unique up to the size of the curated pool', () => {
    const a = new HeroAppearances();
    const frames = Array.from({ length: CHARACTER_FRAMES.length }, (_, i) =>
      a.frameFor(`hero-${i}`)
    );
    expect(new Set(frames).size).toBe(CHARACTER_FRAMES.length);
  });
});
