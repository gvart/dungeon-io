/**
 * Data-driven skill catalog.
 *
 * Pure data — no engine/Phaser code. In Phase 3 a hero carries a small skill
 * *loadout* that contributes **passive** stat mods (read by the hero system) and
 * a gather-yield bonus (read by the task system). Active, player-timed combat
 * skills land in Phase 4: the `kind: 'active'` fields are declared here so the
 * data/save shape is forward-compatible, but they are inert this phase.
 */

import type { DerivedStats } from './attributes';

export type SkillKind = 'passive' | 'active';

export interface SkillDef {
  /** Stable id, also the key in {@link SKILLS} and what the save stores. */
  id: string;
  name: string;
  kind: SkillKind;
  desc: string;
  /** Star promotion required before this skill can be slotted. */
  requiredStars?: number;
  /** Passive stat mods folded into a hero's derived stats. */
  mods?: Partial<DerivedStats>;
  /** Extra resources per gather unit (read by the task system). */
  gatherBonus?: number;
  /** Cooldown for active skills, in ms — inert until Phase 4 combat. */
  cooldownMs?: number;
}

/** Maximum skills a hero may have slotted at once. */
export const MAX_SKILL_SLOTS = 3;

export const SKILLS: Record<string, SkillDef> = {
  'power-strike': {
    id: 'power-strike',
    name: 'Power Strike',
    kind: 'passive',
    desc: '+4 attack.',
    mods: { attack: 4 },
  },
  quickfoot: {
    id: 'quickfoot',
    name: 'Quickfoot',
    kind: 'passive',
    desc: '+0.4 move speed.',
    mods: { moveSpeed: 0.4 },
  },
  laborer: {
    id: 'laborer',
    name: 'Laborer',
    kind: 'passive',
    desc: '+0.25 work speed.',
    mods: { workSpeed: 0.25 },
  },
  tough: {
    id: 'tough',
    name: 'Tough',
    kind: 'passive',
    desc: '+25 health.',
    mods: { hp: 25 },
  },
  'keen-eye': {
    id: 'keen-eye',
    name: 'Keen Eye',
    kind: 'passive',
    desc: '+8% crit.',
    mods: { critPct: 8 },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    kind: 'passive',
    desc: '+1 resource per gather.',
    gatherBonus: 1,
  },
};

/** All skill ids, in catalog order (for builder UI listing). */
export const SKILL_IDS: readonly string[] = Object.keys(SKILLS);

/** Look up a skill def by id, or `undefined` if unknown. */
export function getSkill(id: string): SkillDef | undefined {
  return SKILLS[id];
}
