/**
 * Data-driven structure catalog for fortress build mode.
 *
 * Pure data — no engine/Phaser code. New structures are added here without
 * touching the grid system, scene, or UI.
 *
 * The stronghold is the indestructible capture point. It is now a normal
 * *buildable* structure (the player places it as their first action) but is
 * `unique` (only one) and `removable: false` (it can never be torn down).
 * Higher-tier structures are gated behind the fortress `level`, which the
 * player raises by spending resources.
 */

import { HEX } from '../ui/theme';

/**
 * Structure roles.
 * - `stronghold`: the indestructible capture point — unique, non-removable.
 * - `wall` / `gate` / `tower` / `keep`: defensive structures the player builds.
 *
 * NOTE: hero-managed weapon emplacements arrive with the hero/combat phases.
 * When they land, add a category here and a matching def — the grid/save/UI
 * layers are agnostic to the set of categories.
 */
export type StructureCategory = 'stronghold' | 'wall' | 'gate' | 'tower' | 'keep';

export interface StructureDef {
  /** Stable id, also the key in {@link STRUCTURES} and what the save stores. */
  id: string;
  /** Display name shown in the build menu and on the grid. */
  name: string;
  category: StructureCategory;
  /** Resource cost to build (refunded on removal, when removable). */
  cost: number;
  /** Fortress level required before this can be built. */
  requiredLevel: number;
  /** Only one of this structure may exist on the map. */
  unique?: boolean;
  /** Whether it can be removed/refunded (defaults true). */
  removable?: boolean;
  /** Fill color for the drawn fallback (HEX number). */
  fillColor: number;
  /** Texture key for sprite art (drawn fallback used if absent). */
  texKey?: string;
  /** Short one-line description for the build menu. */
  desc: string;
}

/** The stronghold id — the capture point the player must place. */
export const STRONGHOLD_ID = 'stronghold';

/** Resources the player starts a fresh fortress with (stronghold + defenses). */
export const STARTING_RESOURCES = 200;

/** Cost to clear a tree/rock obstacle so the cell becomes buildable. */
export const CLEAR_COST = 8;

export const STRUCTURES: Record<string, StructureDef> = {
  [STRONGHOLD_ID]: {
    id: STRONGHOLD_ID,
    name: 'Stronghold',
    category: 'stronghold',
    cost: 50,
    requiredLevel: 1,
    unique: true,
    removable: false,
    fillColor: HEX.gold,
    texKey: 'struct-stronghold',
    desc: 'The heart of the fortress. Build it first, then defend it.',
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    category: 'wall',
    cost: 10,
    requiredLevel: 1,
    fillColor: 0x6b7280,
    texKey: 'struct-wall',
    desc: 'Blocks enemy advance.',
  },
  gate: {
    id: 'gate',
    name: 'Gate',
    category: 'gate',
    cost: 20,
    requiredLevel: 1,
    fillColor: 0x8b5a2b,
    texKey: 'struct-gate',
    desc: 'A defended passage in the wall.',
  },
  tower: {
    id: 'tower',
    name: 'Tower',
    category: 'tower',
    cost: 35,
    requiredLevel: 2,
    fillColor: 0x4f6d9e,
    texKey: 'struct-tower',
    desc: 'High ground for defenders. Requires level 2.',
  },
  keep: {
    id: 'keep',
    name: 'Keep',
    category: 'keep',
    cost: 70,
    requiredLevel: 3,
    fillColor: 0x9e7b4f,
    texKey: 'struct-stronghold',
    desc: 'A fortified inner hall. Requires level 3.',
  },
};

/**
 * Build-menu palette order. The stronghold comes first (built first). Add new
 * buildable ids here to surface them in the build menu.
 */
export const BUILDABLE: readonly string[] = [STRONGHOLD_ID, 'wall', 'gate', 'tower', 'keep'];

/** Highest fortress level that unlocks anything new. */
export const MAX_LEVEL = 3;

/** Resource cost to raise the fortress from `level` to `level + 1`. */
export function levelUpCost(level: number): number {
  return 60 * level;
}

/** Look up a structure def by id, or `undefined` if unknown. */
export function getStructure(id: string): StructureDef | undefined {
  return STRUCTURES[id];
}
