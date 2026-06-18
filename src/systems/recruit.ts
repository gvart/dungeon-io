/**
 * Wandering-recruit system: heroes periodically arrive at the fortress and the
 * player may accept or reject them. Higher fortress development draws
 * higher-quality candidates.
 *
 * Pure and framework-free (no Phaser). Arrivals are fully seedable: the Nth
 * candidate is a deterministic function of the stream seed and an arrival
 * counter, so a reload reproduces the same stream. Arrival timing is driven by a
 * sim clock (not wall time) passed in by the scene.
 *
 * NOTE: the third option — *attacking* an arrival — is deferred to Phase 4
 * (combat). This module exposes accept/reject only; the UI shows a disabled
 * Attack action to stay forward-compatible.
 */

import { MAX_LEVEL } from '../data/structures';
import { type FortressState } from './grid';
import { generateHero, type Hero } from './hero';
import { mulberry32, randomSeed } from './rng';

/** A candidate hero currently waiting at the gate. */
export interface Arrival {
  id: string;
  hero: Hero;
  /** Sim-clock time after which the candidate wanders off. */
  expiresAtMs: number;
}

export interface RecruitState {
  /** Seed for the arrival stream (persisted). */
  seed: number;
  /** Number of arrivals generated so far (persisted, advances the stream). */
  counter: number;
  /** Sim-clock time of the next arrival (persisted). */
  nextArrivalMs: number;
  /** The candidate currently waiting, or null. */
  pending: Arrival | null;
}

/** Sim-time between arrivals. */
export const ARRIVAL_INTERVAL_MS = 45_000;
/** How long a candidate waits before wandering off. */
export const ARRIVAL_VISIBLE_MS = 30_000;

export function createRecruitState(seed: number = randomSeed()): RecruitState {
  return { seed: seed >>> 0, counter: 0, nextArrivalMs: ARRIVAL_INTERVAL_MS, pending: null };
}

/**
 * Fortress development quality in `[0, 1]`: blends fortress level and the number
 * of completed defensive structures. A bigger, higher-level fortress draws
 * stronger recruits.
 */
export function fortressQuality(state: FortressState): number {
  const levelPart = MAX_LEVEL > 1 ? (state.level - 1) / (MAX_LEVEL - 1) : 0;
  const structures = state.cells.reduce((n, c) => (c ? n + 1 : n), 0);
  const structurePart = Math.min(1, structures / 12);
  return Math.max(0, Math.min(1, 0.2 + 0.4 * levelPart + 0.4 * structurePart));
}

/** Deterministic per-arrival RNG seeded from the stream seed + counter. */
function arrivalRng(seed: number, counter: number): () => number {
  return mulberry32((seed + counter * 2654435761) >>> 0);
}

/**
 * Advance the arrival clock. May populate `pending` when due, or clear an expired
 * candidate. Deterministic given `(seed, counter)` and the fortress state.
 */
export function tickRecruit(rs: RecruitState, state: FortressState, simClockMs: number): void {
  if (rs.pending && simClockMs >= rs.pending.expiresAtMs) {
    rs.pending = null;
  }
  if (rs.pending || simClockMs < rs.nextArrivalMs) return;

  const rnd = arrivalRng(rs.seed, rs.counter);
  const heroSeed = (rnd() * 0x100000000) >>> 0;
  const hero = generateHero(heroSeed, fortressQuality(state));
  hero.id = `arr-${rs.counter}`;
  rs.pending = { id: hero.id, hero, expiresAtMs: simClockMs + ARRIVAL_VISIBLE_MS };

  rs.counter += 1;
  // Next arrival, with a little seeded jitter so cadence isn't perfectly regular.
  const jitter = Math.floor(rnd() * 15_000);
  rs.nextArrivalMs = simClockMs + ARRIVAL_INTERVAL_MS + jitter;
}

/** Accept the pending candidate, returning its hero (caller adds to roster). */
export function acceptArrival(rs: RecruitState): Hero | null {
  if (!rs.pending) return null;
  const hero = rs.pending.hero;
  rs.pending = null;
  return hero;
}

/** Reject (dismiss) the pending candidate. */
export function rejectArrival(rs: RecruitState): void {
  rs.pending = null;
}
