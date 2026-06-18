/**
 * Hero task/job system and the deterministic world tick.
 *
 * Pure and framework-free (no Phaser): the scene drives `tickWorld` on a fixed
 * timestep and renders the resulting hero positions / fortress state. Heroes walk
 * along a precomputed path and perform work (assist construction, gather
 * resources). Because every step is a pure function of its inputs and a fixed
 * `dtMs`, the simulation is fully reproducible and unit-testable.
 */

import { advanceBuild, type FortressState, getCell, indexOf, isUnderConstruction } from './grid';
import { findPath, findPathAdjacent } from './pathfind';
import { gatherBonus, grantExp, type Hero, heroStats, idleTask } from './hero';
import type { TerrainType } from './terrain';

export type TaskKind = 'idle' | 'move' | 'guard' | 'assistBuild' | 'gather';

export interface TaskState {
  kind: TaskKind;
  /** Destination / work-target cell. */
  targetCol?: number;
  targetRow?: number;
  /** Remaining path as flat cell indices (path[0] is the current cell). Not persisted. */
  path?: number[];
  /** Fractional progress from the current cell toward the next, `[0, 1)`. */
  stepFrac?: number;
  /** Work accumulator: build progress contribution / gather unit fraction. */
  progress?: number;
}

/** A depletable resource node (a harvestable tree/rock cell). */
export interface GatherNode {
  col: number;
  row: number;
  /** Resource units left; the node is removed at 0. */
  remaining: number;
}

export interface WorldTickInput {
  state: FortressState;
  terrain: readonly TerrainType[];
  heroes: Hero[];
  nodes: GatherNode[];
  /** Fixed timestep in milliseconds. */
  dtMs: number;
}

/** Side-effects of a tick the scene needs to reflect visually. */
export interface WorldTickResult {
  /** Flat cell indices of gather nodes harvested out this tick (now open ground). */
  depletedCells: number[];
}

/** Build progress per second a hero adds while assisting (at work speed 1). */
const ASSIST_RATE = 0.2;
/** Build progress per second a site gains on its own (no hero). */
const PASSIVE_BUILD_RATE = 0.04;
/** Resource units gathered per second (at work speed 1). */
const GATHER_RATE = 0.6;
/** Experience granted per gathered unit and per assisted build completion. */
const EXP_PER_GATHER = 4;
const EXP_PER_BUILD = 12;

function decodeCol(idx: number, cols: number): number {
  return idx % cols;
}
function decodeRow(idx: number, cols: number): number {
  return Math.floor(idx / cols);
}

/**
 * Advance a hero along its task path by `speed * dt` cells. Snaps `hero.col/row`
 * to whole cells crossed and keeps the sub-cell remainder in `task.stepFrac`.
 * Returns true once the path is consumed (the hero is at the path end).
 */
function advanceAlongPath(hero: Hero, cols: number, speed: number, dt: number): boolean {
  const t = hero.task;
  if (!t.path || t.path.length <= 1) {
    t.stepFrac = 0;
    return true;
  }
  let frac = (t.stepFrac ?? 0) + speed * dt;
  while (frac >= 1 && t.path.length > 1) {
    frac -= 1;
    t.path.shift();
    const idx = t.path[0];
    hero.col = decodeCol(idx, cols);
    hero.row = decodeRow(idx, cols);
  }
  if (t.path.length <= 1) {
    t.stepFrac = 0;
    return true;
  }
  t.stepFrac = frac;
  return false;
}

/**
 * Advance every hero's task and the fortress by `dtMs`. Mutates the inputs and
 * returns the cells that changed in ways the renderer must reflect (harvested
 * gather nodes that became open ground).
 */
export function tickWorld(input: WorldTickInput): WorldTickResult {
  const { state, heroes, nodes } = input;
  const cols = state.cols;
  const dt = input.dtMs / 1000;
  const depletedCells: number[] = [];

  // 1) Passive construction trickle for every active build site.
  for (let i = 0; i < state.cells.length; i++) {
    const cell = state.cells[i];
    if (cell && cell.build !== undefined && cell.build < 1) {
      advanceBuild(state, decodeCol(i, cols), decodeRow(i, cols), PASSIVE_BUILD_RATE * dt);
    }
  }

  // 2) Each hero acts on its task.
  for (const hero of heroes) {
    const t = hero.task;
    const speed = heroStats(hero).moveSpeed;
    switch (t.kind) {
      case 'move': {
        if (advanceAlongPath(hero, cols, speed, dt)) hero.task = idleTask();
        break;
      }
      case 'guard': {
        // Walk to the post, then hold position (stays 'guard').
        if (advanceAlongPath(hero, cols, speed, dt)) {
          t.path = undefined;
          t.stepFrac = 0;
        }
        break;
      }
      case 'assistBuild': {
        const arrived = advanceAlongPath(hero, cols, speed, dt);
        if (!arrived) break;
        if (t.targetCol === undefined || t.targetRow === undefined) {
          hero.task = idleTask();
          break;
        }
        if (!isUnderConstruction(state, t.targetCol, t.targetRow)) {
          hero.task = idleTask();
          break;
        }
        const work = heroStats(hero).workSpeed * ASSIST_RATE * dt;
        const progress = advanceBuild(state, t.targetCol, t.targetRow, work);
        if (progress >= 1) {
          grantExp(hero, EXP_PER_BUILD);
          hero.task = idleTask();
        }
        break;
      }
      case 'gather': {
        const arrived = advanceAlongPath(hero, cols, speed, dt);
        if (!arrived) break;
        if (t.targetCol === undefined || t.targetRow === undefined) {
          hero.task = idleTask();
          break;
        }
        const node = nodes.find((nd) => nd.col === t.targetCol && nd.row === t.targetRow);
        if (!node || node.remaining <= 0) {
          hero.task = idleTask();
          break;
        }
        t.progress = (t.progress ?? 0) + heroStats(hero).workSpeed * GATHER_RATE * dt;
        while (t.progress >= 1 && node.remaining > 0) {
          t.progress -= 1;
          node.remaining -= 1;
          state.resources += 1 + gatherBonus(hero);
          grantExp(hero, EXP_PER_GATHER);
        }
        if (node.remaining <= 0) {
          // Harvested out: clear the obstacle so the cell opens, drop the node.
          const idx = indexOf(state, node.col, node.row);
          if (getCell(state, node.col, node.row) === null && !state.cleared.includes(idx)) {
            state.cleared.push(idx);
          }
          depletedCells.push(idx);
          const ni = nodes.indexOf(node);
          if (ni >= 0) nodes.splice(ni, 1);
          hero.task = idleTask();
        }
        break;
      }
      case 'idle':
      default:
        break;
    }
  }

  return { depletedCells };
}

// --- Command helpers (assign a task, computing the path) ---------------------

/** Send a hero to walk to (col,row). Returns false if unreachable. */
export function commandMove(
  state: FortressState,
  terrain: readonly TerrainType[],
  hero: Hero,
  col: number,
  row: number
): boolean {
  const path = findPath(state, terrain, hero.col, hero.row, col, row);
  if (!path) return false;
  hero.task = { kind: 'move', targetCol: col, targetRow: row, path, stepFrac: 0 };
  return true;
}

/** Station a hero at a guard post at (col,row). Returns false if unreachable. */
export function commandGuard(
  state: FortressState,
  terrain: readonly TerrainType[],
  hero: Hero,
  col: number,
  row: number
): boolean {
  const path = findPath(state, terrain, hero.col, hero.row, col, row);
  if (!path) return false;
  hero.task = { kind: 'guard', targetCol: col, targetRow: row, path, stepFrac: 0 };
  return true;
}

/** Send a hero to assist the build site at (col,row). Returns false if unreachable. */
export function commandAssist(
  state: FortressState,
  terrain: readonly TerrainType[],
  hero: Hero,
  col: number,
  row: number
): boolean {
  if (!isUnderConstruction(state, col, row)) return false;
  const path = findPathAdjacent(state, terrain, hero.col, hero.row, col, row);
  if (!path) return false;
  hero.task = { kind: 'assistBuild', targetCol: col, targetRow: row, path, stepFrac: 0 };
  return true;
}

/** Send a hero to gather from `node`. Returns false if unreachable. */
export function commandGather(
  state: FortressState,
  terrain: readonly TerrainType[],
  hero: Hero,
  node: GatherNode
): boolean {
  const path = findPathAdjacent(state, terrain, hero.col, hero.row, node.col, node.row);
  if (!path) return false;
  hero.task = {
    kind: 'gather',
    targetCol: node.col,
    targetRow: node.row,
    path,
    stepFrac: 0,
    progress: 0,
  };
  return true;
}

/**
 * Rebuild a hero's path after load (paths aren't persisted). Recomputes from the
 * current position to the stored target; clears the task if unreachable.
 */
export function rehydratePath(
  state: FortressState,
  terrain: readonly TerrainType[],
  hero: Hero
): void {
  const t = hero.task;
  if (t.kind === 'idle' || t.targetCol === undefined || t.targetRow === undefined) return;
  const path =
    t.kind === 'assistBuild' || t.kind === 'gather'
      ? findPathAdjacent(state, terrain, hero.col, hero.row, t.targetCol, t.targetRow)
      : findPath(state, terrain, hero.col, hero.row, t.targetCol, t.targetRow);
  if (!path) {
    hero.task = idleTask();
    return;
  }
  t.path = path;
  t.stepFrac = 0;
}
