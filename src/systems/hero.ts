/**
 * Hero model: pure, framework-free state and math for heroes (the mobile
 * colonist pawns). No Phaser — the scene renders heroes and the task system
 * advances them; this module owns their data shape and derived numbers so it is
 * fully unit-testable.
 *
 * Heroes are *freeform*: the player allocates a point pool across the four
 * attributes when building one (`makePlayerHero`), and wandering recruits are
 * generated deterministically from a seed (`generateHero`). Derived stats come
 * from attributes + level + star promotion + equipped gear + slotted skills.
 */

import {
  ATTR_BASELINE,
  ATTR_MAX,
  ATTR_MIN,
  ATTR_POINTS_START,
  ATTRIBUTE_ORDER,
  type AttributeKey,
  type Attributes,
  type DerivedStats,
  deriveStats,
  sumStatMods,
} from '../data/attributes';
import { GEAR, type GearSlot, getGear } from '../data/gear';
import { getSkill, MAX_SKILL_SLOTS, SKILL_IDS } from '../data/skills';
import { mulberry32 } from './rng';
import type { TaskState } from './task';

/** Max hero level before star promotion is required to advance. */
export const HERO_MAX_LEVEL = 20;
/** Max star promotions. */
export const MAX_STARS = 5;
/** Each star multiplies hp and attack by this much. */
const STAR_POWER_PER_STAR = 0.1;

export interface Hero {
  /** Stable unique id (also the save key). */
  id: string;
  name: string;
  attributes: Attributes;
  level: number;
  exp: number;
  stars: number;
  /** Slotted skill ids (up to {@link MAX_SKILL_SLOTS}). */
  skills: string[];
  /** Equipped gear id per slot (sparse). */
  equipment: Partial<Record<GearSlot, string>>;
  /** Current grid position. */
  col: number;
  row: number;
  /** Current task (idle by default). */
  task: TaskState;
}

/** A fresh idle task. */
export function idleTask(): TaskState {
  return { kind: 'idle' };
}

/** Sum of points allocated above the per-attribute baseline. */
export function pointsSpent(attr: Attributes): number {
  let sum = 0;
  for (const k of ATTRIBUTE_ORDER) sum += attr[k] - ATTR_BASELINE;
  return sum;
}

/**
 * Validate a freeform allocation: every attribute within `[ATTR_MIN, ATTR_MAX]`
 * and no more than `ATTR_POINTS_START` points spent above baseline. Returns a
 * normalized copy, or `null` if invalid.
 */
export function allocateAttributes(attr: Attributes): Attributes | null {
  for (const k of ATTRIBUTE_ORDER) {
    const v = attr[k];
    if (!Number.isFinite(v) || v < ATTR_MIN || v > ATTR_MAX || !Number.isInteger(v)) return null;
  }
  const spent = pointsSpent(attr);
  if (spent < 0 || spent > ATTR_POINTS_START) return null;
  return { str: attr.str, agi: attr.agi, int: attr.int, vit: attr.vit };
}

/** A starting allocation with every attribute at baseline (no points spent). */
export function baselineAttributes(): Attributes {
  return { str: ATTR_BASELINE, agi: ATTR_BASELINE, int: ATTR_BASELINE, vit: ATTR_BASELINE };
}

/** Build a player-created hero at level 1. Position defaults to (0,0). */
export function makePlayerHero(id: string, name: string, attr: Attributes, col = 0, row = 0): Hero {
  return {
    id,
    name,
    attributes: { ...attr },
    level: 1,
    exp: 0,
    stars: 0,
    skills: [],
    equipment: {},
    col,
    row,
    task: idleTask(),
  };
}

/** Flat stat bonus a hero gets from equipped gear and slotted passive skills. */
function gearAndSkillBonus(hero: Hero): Partial<DerivedStats> {
  const mods: Array<Partial<DerivedStats> | undefined> = [];
  for (const slot of Object.keys(hero.equipment) as GearSlot[]) {
    const id = hero.equipment[slot];
    if (id) mods.push(getGear(id)?.mods);
  }
  for (const id of hero.skills) mods.push(getSkill(id)?.mods);
  return sumStatMods(mods);
}

/** Derived stats for a hero: attributes + level + gear/skills, scaled by stars. */
export function heroStats(hero: Hero): DerivedStats {
  const base = deriveStats(hero.attributes, hero.level, gearAndSkillBonus(hero));
  const starMul = 1 + STAR_POWER_PER_STAR * hero.stars;
  return { ...base, hp: base.hp * starMul, attack: base.attack * starMul };
}

/** Extra resources per gather unit from slotted skills (e.g. Scavenger). */
export function gatherBonus(hero: Hero): number {
  let bonus = 0;
  for (const id of hero.skills) bonus += getSkill(id)?.gatherBonus ?? 0;
  return bonus;
}

/** Experience needed to advance from `level` to `level + 1`. */
export function expForLevel(level: number): number {
  return 50 * Math.max(1, level);
}

/**
 * Grant experience, leveling up while thresholds are met (capped at
 * {@link HERO_MAX_LEVEL}). Mutates and returns whether any level-up happened.
 */
export function grantExp(hero: Hero, amount: number): boolean {
  if (amount <= 0) return false;
  hero.exp += amount;
  let leveled = false;
  while (hero.level < HERO_MAX_LEVEL && hero.exp >= expForLevel(hero.level)) {
    hero.exp -= expForLevel(hero.level);
    hero.level += 1;
    leveled = true;
  }
  if (hero.level >= HERO_MAX_LEVEL) hero.exp = 0;
  return leveled;
}

/** Whether the hero is eligible for star promotion (at level cap, stars left). */
export function canPromote(hero: Hero): boolean {
  return hero.level >= HERO_MAX_LEVEL && hero.stars < MAX_STARS;
}

/**
 * Promote a hero: +1 star, reset to level 1 (a permanent star power bonus
 * remains). Mutates and returns whether it promoted.
 */
export function promote(hero: Hero): boolean {
  if (!canPromote(hero)) return false;
  hero.stars += 1;
  hero.level = 1;
  hero.exp = 0;
  return true;
}

// --- Seedable recruit generation --------------------------------------------

const RECRUIT_NAMES: readonly string[] = [
  'Aldric',
  'Bryn',
  'Cael',
  'Dara',
  'Eira',
  'Finn',
  'Gwen',
  'Hale',
  'Iris',
  'Joss',
  'Kara',
  'Lyle',
  'Mira',
  'Nox',
  'Orin',
  'Pell',
  'Rhea',
  'Soren',
  'Tana',
  'Veil',
];

/** Distribute `extra` points across the four attributes from a baseline. */
function distributePoints(rnd: () => number, extra: number): Attributes {
  const attr = baselineAttributes();
  for (let i = 0; i < extra; i++) {
    // Pick a random attribute that still has headroom.
    const open = ATTRIBUTE_ORDER.filter((k) => attr[k] < ATTR_MAX);
    if (open.length === 0) break;
    const k = open[Math.floor(rnd() * open.length)] as AttributeKey;
    attr[k] += 1;
  }
  return attr;
}

/**
 * Generate a recruit deterministically from a seed. `quality` in `[0, 1]` (from
 * fortress development) scales the attribute pool, level, star chance, and the
 * number of skills/gear pieces. Identical `(seed, quality)` always yields an
 * identical hero — no `Math.random` / wall-clock.
 */
export function generateHero(seed: number, quality: number): Hero {
  const q = Math.max(0, Math.min(1, quality));
  const rnd = mulberry32(seed);

  const name = RECRUIT_NAMES[Math.floor(rnd() * RECRUIT_NAMES.length)];
  const id = `h-${seed >>> 0}`;

  // Attribute pool grows with quality (small jitter so two similar fortresses
  // don't draw identical heroes).
  const base = 6 + Math.round(q * 14);
  const extra = base + Math.floor(rnd() * 4);
  const attributes = distributePoints(rnd, extra);

  const level = 1 + Math.floor(rnd() * (1 + q * 4));
  const stars = rnd() < q * 0.4 ? 1 : 0;

  // Skills: more on higher quality.
  const skillCount = Math.min(MAX_SKILL_SLOTS, Math.floor(rnd() * (1 + q * 3)));
  const skills: string[] = [];
  const pool = [...SKILL_IDS];
  for (let i = 0; i < skillCount && pool.length > 0; i++) {
    const idx = Math.floor(rnd() * pool.length);
    skills.push(pool.splice(idx, 1)[0]);
  }

  // Gear: a chance per slot, scaled by quality.
  const equipment: Partial<Record<GearSlot, string>> = {};
  for (const slot of ['weapon', 'armor', 'trinket'] as GearSlot[]) {
    if (rnd() < q * 0.6) {
      const options = Object.values(GEAR).filter(
        (g) => g.slot === slot && (g.requiredLevel ?? 1) <= level
      );
      if (options.length > 0) equipment[slot] = options[Math.floor(rnd() * options.length)].id;
    }
  }

  return {
    id,
    name,
    attributes,
    level,
    exp: 0,
    stars,
    skills,
    equipment,
    col: 0,
    row: 0,
    task: idleTask(),
  };
}

/**
 * Deterministic starter roster (positions are placeholders; the scene places
 * each hero on a walkable cell). Three modestly-built heroes.
 */
export function createStarterRoster(seed: number): Hero[] {
  const heroes: Hero[] = [];
  for (let i = 0; i < 3; i++) {
    const h = generateHero((seed ^ ((i + 1) * 0x9e3779b1)) >>> 0, 0.35);
    h.id = `starter-${i}`;
    heroes.push(h);
  }
  return heroes;
}
