/**
 * Versioned localStorage persistence for the hero roster, recruit stream, and
 * gather nodes.
 *
 * Kept **separate** from the fortress save (`save.ts`): heroes have their own
 * lifecycle and will keep evolving (Phase 4 combat), so they version
 * independently. Serialization is compact (mirroring `save.ts`): attributes as a
 * fixed 4-tuple, sparse skills/equipment, idle tasks omitted. Derived stats and
 * task paths are never stored — they are recomputed on load (`heroStats`,
 * `rehydratePath`) so stale/corrupt data can't brick a save.
 */

import { type Attributes } from '../data/attributes';
import { type GearSlot } from '../data/gear';
import { createStarterRoster, type Hero, idleTask } from './hero';
import { createRecruitState, type RecruitState } from './recruit';
import { randomSeed } from './rng';
import type { GatherNode, TaskKind, TaskState } from './task';

export const HERO_SAVE_KEY = 'fortgion.heroes.v1';
export const HERO_SAVE_VERSION = 1;

const TASK_KINDS: readonly TaskKind[] = ['idle', 'move', 'guard', 'assistBuild', 'gather'];

/** Compact, non-idle task. Path/stepFrac are omitted (rehydrated on load). */
interface CompactTask {
  k: TaskKind;
  tc?: number;
  tr?: number;
  pr?: number;
}

interface CompactHero {
  id: string;
  name: string;
  /** Attributes in `ATTRIBUTE_ORDER`: [str, agi, int, vit]. */
  a: [number, number, number, number];
  lvl: number;
  exp: number;
  stars: number;
  sk: string[];
  /** Equipped gear as sparse [slot, id] pairs. */
  eq: [GearSlot, string][];
  c: number;
  r: number;
  t?: CompactTask;
}

export interface HeroSaveData {
  v: number;
  heroes: CompactHero[];
  /** [seed, counter, nextArrivalMs]. */
  recruit: [number, number, number];
  /** [col, row, remaining] per gather node. */
  nodes: [number, number, number][];
  /** [candidate, expiresAtMs] or null. */
  pending: [CompactHero, number] | null;
}

/** Bundle the scene reads/writes. */
export interface HeroWorld {
  heroes: Hero[];
  recruit: RecruitState;
  nodes: GatherNode[];
}

function compactTask(t: TaskState): CompactTask | undefined {
  if (t.kind === 'idle') return undefined;
  const ct: CompactTask = { k: t.kind };
  if (t.targetCol !== undefined) ct.tc = t.targetCol;
  if (t.targetRow !== undefined) ct.tr = t.targetRow;
  if (t.progress !== undefined) ct.pr = t.progress;
  return ct;
}

function compactHero(h: Hero): CompactHero {
  const eq: [GearSlot, string][] = [];
  for (const slot of Object.keys(h.equipment) as GearSlot[]) {
    const id = h.equipment[slot];
    if (id) eq.push([slot, id]);
  }
  const c: CompactHero = {
    id: h.id,
    name: h.name,
    a: [h.attributes.str, h.attributes.agi, h.attributes.int, h.attributes.vit],
    lvl: h.level,
    exp: h.exp,
    stars: h.stars,
    sk: [...h.skills],
    eq,
    c: h.col,
    r: h.row,
  };
  const t = compactTask(h.task);
  if (t) c.t = t;
  return c;
}

export function serializeHeroes(world: HeroWorld): HeroSaveData {
  return {
    v: HERO_SAVE_VERSION,
    heroes: world.heroes.map(compactHero),
    recruit: [world.recruit.seed, world.recruit.counter, world.recruit.nextArrivalMs],
    nodes: world.nodes.map((n) => [n.col, n.row, n.remaining]),
    pending: world.recruit.pending
      ? [compactHero(world.recruit.pending.hero), world.recruit.pending.expiresAtMs]
      : null,
  };
}

function expandTask(ct: CompactTask | undefined): TaskState {
  if (!ct) return idleTask();
  return { kind: ct.k, targetCol: ct.tc, targetRow: ct.tr, progress: ct.pr };
}

function expandHero(c: CompactHero): Hero {
  const attributes: Attributes = {
    str: c.a[0],
    agi: c.a[1],
    int: c.a[2],
    vit: c.a[3],
  };
  const equipment: Partial<Record<GearSlot, string>> = {};
  for (const [slot, id] of c.eq) equipment[slot] = id;
  return {
    id: c.id,
    name: c.name,
    attributes,
    level: c.lvl,
    exp: c.exp,
    stars: c.stars,
    skills: [...c.sk],
    equipment,
    col: c.c,
    row: c.r,
    task: expandTask(c.t),
  };
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCompactHero(v: unknown): v is CompactHero {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  if (typeof h.id !== 'string' || typeof h.name !== 'string') return false;
  if (!Array.isArray(h.a) || h.a.length !== 4 || !h.a.every(isNum)) return false;
  if (!isNum(h.lvl) || !isNum(h.exp) || !isNum(h.stars)) return false;
  if (!Array.isArray(h.sk) || !h.sk.every((s) => typeof s === 'string')) return false;
  if (
    !Array.isArray(h.eq) ||
    !h.eq.every(
      (e) =>
        Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' && typeof e[1] === 'string'
    )
  )
    return false;
  if (!isNum(h.c) || !isNum(h.r)) return false;
  if (h.t !== undefined) {
    const t = h.t as Record<string, unknown>;
    if (typeof t !== 'object' || t === null) return false;
    if (!TASK_KINDS.includes(t.k as TaskKind)) return false;
  }
  return true;
}

function isHeroSaveData(data: unknown): data is HeroSaveData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.v !== HERO_SAVE_VERSION) return false;
  if (!Array.isArray(d.heroes) || !d.heroes.every(isCompactHero)) return false;
  if (!Array.isArray(d.recruit) || d.recruit.length !== 3 || !d.recruit.every(isNum)) return false;
  if (
    !Array.isArray(d.nodes) ||
    !d.nodes.every((n) => Array.isArray(n) && n.length === 3 && n.every(isNum))
  )
    return false;
  if (d.pending !== null) {
    if (!Array.isArray(d.pending) || d.pending.length !== 2) return false;
    if (!isCompactHero(d.pending[0]) || !isNum(d.pending[1])) return false;
  }
  return true;
}

/** Rebuild the hero world from compact save data, or `null` if malformed. */
export function deserializeHeroes(data: unknown): HeroWorld | null {
  if (!isHeroSaveData(data)) return null;
  const recruit: RecruitState = {
    seed: data.recruit[0] >>> 0,
    counter: data.recruit[1],
    nextArrivalMs: data.recruit[2],
    pending: null,
  };
  if (data.pending) {
    const hero = expandHero(data.pending[0]);
    recruit.pending = { id: hero.id, hero, expiresAtMs: data.pending[1] };
  }
  return {
    heroes: data.heroes.map(expandHero),
    recruit,
    nodes: data.nodes.map(([col, row, remaining]) => ({ col, row, remaining })),
  };
}

/** Persist the hero world. Swallows storage errors (private mode / quota). */
export function saveHeroes(world: HeroWorld): void {
  try {
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(serializeHeroes(world)));
  } catch {
    // Storage unavailable — the in-memory roster still works for the session.
  }
}

/** Load the hero world, or `null` if absent/corrupt (a corrupt save is cleared). */
export function loadHeroes(): HeroWorld | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(HERO_SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearHeroSave();
    return null;
  }
  const world = deserializeHeroes(parsed);
  if (world === null) {
    clearHeroSave();
    return null;
  }
  return world;
}

/**
 * Load the saved hero world, or create a fresh one (starter roster + a new
 * recruit stream + no nodes). The scene places starter heroes on walkable cells
 * and seeds gather nodes from the terrain.
 */
export function loadOrCreateHeroWorld(seed: number = randomSeed()): HeroWorld {
  return (
    loadHeroes() ?? {
      heroes: createStarterRoster(seed),
      recruit: createRecruitState(seed),
      nodes: [],
    }
  );
}

export function clearHeroSave(): void {
  try {
    localStorage.removeItem(HERO_SAVE_KEY);
  } catch {
    // ignore
  }
}
