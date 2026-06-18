/**
 * Data-driven equipment catalog.
 *
 * Pure data — no engine/Phaser code. Each hero has three equipment slots
 * (weapon / armor / trinket); equipped gear contributes flat stat mods folded
 * into the hero's derived stats. Phase 3 ships a small fixed catalog and equips
 * a couple of items on the starter roster — there is **no inventory economy yet**
 * (loot/materials arrive in Phase 6).
 */

import type { DerivedStats } from './attributes';

export type GearSlot = 'weapon' | 'armor' | 'trinket';

/** Equipment slots, in canonical order (UI rows, compact save). */
export const GEAR_SLOTS: readonly GearSlot[] = ['weapon', 'armor', 'trinket'];

export interface GearDef {
  /** Stable id, also the key in {@link GEAR} and what the save stores. */
  id: string;
  name: string;
  slot: GearSlot;
  desc: string;
  /** Hero level required before this can be equipped. */
  requiredLevel?: number;
  /** Flat stat mods folded into the hero's derived stats. */
  mods: Partial<DerivedStats>;
}

export const GEAR: Record<string, GearDef> = {
  'iron-sword': {
    id: 'iron-sword',
    name: 'Iron Sword',
    slot: 'weapon',
    desc: '+6 attack.',
    mods: { attack: 6 },
  },
  'war-axe': {
    id: 'war-axe',
    name: 'War Axe',
    slot: 'weapon',
    desc: '+10 attack, +3% crit.',
    requiredLevel: 4,
    mods: { attack: 10, critPct: 3 },
  },
  'leather-armor': {
    id: 'leather-armor',
    name: 'Leather Armor',
    slot: 'armor',
    desc: '+20 health.',
    mods: { hp: 20 },
  },
  'plate-armor': {
    id: 'plate-armor',
    name: 'Plate Armor',
    slot: 'armor',
    desc: '+45 health, -0.1 move speed.',
    requiredLevel: 4,
    mods: { hp: 45, moveSpeed: -0.1 },
  },
  'swift-charm': {
    id: 'swift-charm',
    name: 'Swift Charm',
    slot: 'trinket',
    desc: '+0.3 move speed.',
    mods: { moveSpeed: 0.3 },
  },
  'work-gloves': {
    id: 'work-gloves',
    name: 'Work Gloves',
    slot: 'trinket',
    desc: '+0.3 work speed.',
    mods: { workSpeed: 0.3 },
  },
};

/** All gear ids, in catalog order (for builder/management UI listing). */
export const GEAR_IDS: readonly string[] = Object.keys(GEAR);

/** Look up a gear def by id, or `undefined` if unknown. */
export function getGear(id: string): GearDef | undefined {
  return GEAR[id];
}
