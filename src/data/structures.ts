/**
 * Data-driven structure catalog for fortress build mode.
 *
 * Pure data — no engine/Phaser code. New structures are added here without
 * touching the grid system, scene, or UI. Phase 2 ships passive defensive
 * structures only; hero-operated weapon emplacements come later (see below).
 */

import { HEX } from '../ui/theme';

/**
 * Structure roles.
 * - `center`: the indestructible stronghold capture point (auto-placed, not
 *   buildable). It has no HP — the run is lost when enemies occupy it with no
 *   defenders left, not when it is destroyed.
 * - `wall` / `gate` / `tower`: passive defensive structures the player builds.
 *
 * NOTE: hero-managed weapon emplacements (e.g. a turret or crossbow operated by
 * a stationed hero) are deliberately deferred to the hero/combat phases. When
 * they land, add a category here (e.g. `'emplacement'`) and a matching def — the
 * grid/save/UI layers are agnostic to the set of categories.
 */
export type StructureCategory = 'center' | 'wall' | 'gate' | 'tower';

export interface StructureDef {
  /** Stable id, also the key in {@link STRUCTURES} and what the save stores. */
  id: string;
  /** Display name shown in the build menu and on the grid. */
  name: string;
  category: StructureCategory;
  /** Resource cost to build (refunded on removal). The center is free/unbuilt. */
  cost: number;
  /** Fill color for the drawn fallback (HEX number). Sprite-ready later. */
  fillColor: number;
  /** Optional texture key for future sprite art (drawn fallback used if absent). */
  texKey?: string;
  /** Short one-line description for the build menu. */
  desc: string;
}

/** The stronghold capture point — auto-placed at the grid center, never built. */
export const CENTER_ID = 'center';

/** Resources the player starts a fresh fortress with. */
export const STARTING_RESOURCES = 120;

export const STRUCTURES: Record<string, StructureDef> = {
  [CENTER_ID]: {
    id: CENTER_ID,
    name: 'Stronghold',
    category: 'center',
    cost: 0,
    fillColor: HEX.gold,
    texKey: 'struct-stronghold',
    desc: 'The heart of the fortress. Hold it.',
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    category: 'wall',
    cost: 10,
    fillColor: 0x6b7280,
    texKey: 'struct-wall',
    desc: 'Blocks enemy advance.',
  },
  gate: {
    id: 'gate',
    name: 'Gate',
    category: 'gate',
    cost: 20,
    fillColor: 0x8b5a2b,
    texKey: 'struct-gate',
    desc: 'A defended passage in the wall.',
  },
  tower: {
    id: 'tower',
    name: 'Tower',
    category: 'tower',
    cost: 35,
    fillColor: 0x4f6d9e,
    texKey: 'struct-tower',
    desc: 'High ground for defenders.',
  },
};

/**
 * Build-menu palette order. Excludes the non-buildable `center`. Add new
 * buildable ids here to surface them in the build menu.
 */
export const BUILDABLE: readonly string[] = ['wall', 'gate', 'tower'];

/** Look up a structure def by id, or `undefined` if unknown. */
export function getStructure(id: string): StructureDef | undefined {
  return STRUCTURES[id];
}
