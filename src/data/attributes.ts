/**
 * Hero attribute system: the four primary attributes and the pure formulas that
 * map them (plus level and equipment/skill bonuses) to derived combat/work stats.
 *
 * Pure data + pure functions — no engine/Phaser code, fully unit-testable. The
 * hero system (`src/systems/hero.ts`) composes these with skill and gear mods.
 *
 * Heroes are *freeform*: the player allocates a fixed point pool across the four
 * attributes when building a hero. Combat stats (attack/crit) are computed now
 * even though combat lands in Phase 4 — the heroes persist, so deriving them is
 * free and keeps the save shape stable.
 */

export type AttributeKey = 'str' | 'agi' | 'int' | 'vit';

export interface AttributeDef {
  key: AttributeKey;
  /** Display name, e.g. 'Strength'. */
  name: string;
  /** Short label for compact UI, e.g. 'STR'. */
  abbr: string;
  /** One-line description for the hero builder. */
  desc: string;
}

export const ATTRIBUTES: Record<AttributeKey, AttributeDef> = {
  str: { key: 'str', name: 'Strength', abbr: 'STR', desc: 'Attack power and work output.' },
  agi: { key: 'agi', name: 'Agility', abbr: 'AGI', desc: 'Move speed and critical chance.' },
  int: { key: 'int', name: 'Intellect', abbr: 'INT', desc: 'Work speed and skill potency.' },
  vit: { key: 'vit', name: 'Vitality', abbr: 'VIT', desc: 'Health and stamina.' },
};

/** Canonical iteration order for UI rows and compact save tuples. */
export const ATTRIBUTE_ORDER: readonly AttributeKey[] = ['str', 'agi', 'int', 'vit'];

/** A point value per attribute. */
export type Attributes = Record<AttributeKey, number>;

/** Freeform allocation bounds (per attribute) and the starting point pool. */
export const ATTR_MIN = 1;
export const ATTR_MAX = 20;
/** Each attribute starts at this baseline; the pool tops it up. */
export const ATTR_BASELINE = 4;
/** Extra points the player distributes when building a fresh hero. */
export const ATTR_POINTS_START = 12;

/** Derived stats computed from attributes (+ level, + equipment/skill bonuses). */
export interface DerivedStats {
  /** Max health. */
  hp: number;
  /** Basic-attack damage (used in Phase 4 combat). */
  attack: number;
  /** Critical-hit chance, 0..100. */
  critPct: number;
  /** Movement speed in grid cells per second (drives the task tick). */
  moveSpeed: number;
  /** Work multiplier for build-assist and gather progress. */
  workSpeed: number;
}

/** Clamp a number into [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

const EMPTY_STATS: DerivedStats = { hp: 0, attack: 0, critPct: 0, moveSpeed: 0, workSpeed: 0 };

/**
 * Compute derived stats from attributes and level, optionally adding a flat
 * bonus (the summed equipment + skill mods). Pure and deterministic.
 */
export function deriveStats(
  attr: Attributes,
  level: number,
  bonus: Partial<DerivedStats> = {}
): DerivedStats {
  const lvl = Math.max(1, Math.floor(level));
  const { str, agi, int, vit } = attr;
  const hp = (20 + vit * 8) * (1 + 0.08 * (lvl - 1)) + (bonus.hp ?? 0);
  const attack = (2 + str * 1.5 + agi * 0.5) * (1 + 0.06 * (lvl - 1)) + (bonus.attack ?? 0);
  const critPct = clamp(2 + agi * 0.8 + (bonus.critPct ?? 0), 0, 75);
  const moveSpeed = 1.6 + agi * 0.06 + (bonus.moveSpeed ?? 0);
  const workSpeed = 0.7 + str * 0.03 + int * 0.04 + (bonus.workSpeed ?? 0);
  return { hp, attack, critPct, moveSpeed, workSpeed };
}

/** Sum any number of partial stat mods into one flat bonus. */
export function sumStatMods(mods: Array<Partial<DerivedStats> | undefined>): Partial<DerivedStats> {
  const out: DerivedStats = { ...EMPTY_STATS };
  for (const m of mods) {
    if (!m) continue;
    out.hp += m.hp ?? 0;
    out.attack += m.attack ?? 0;
    out.critPct += m.critPct ?? 0;
    out.moveSpeed += m.moveSpeed ?? 0;
    out.workSpeed += m.workSpeed ?? 0;
  }
  return out;
}

/** Look up an attribute def by key. */
export function getAttribute(key: AttributeKey): AttributeDef {
  return ATTRIBUTES[key];
}
