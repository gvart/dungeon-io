import { describe, expect, it } from 'vitest';
import {
  createInitialFortress,
  type FortressState,
  indexOf,
  isUnderConstruction,
  placeStructure,
} from './grid';
import { baselineAttributes, type Hero, makePlayerHero } from './hero';
import { commandAssist, commandGather, commandMove, type GatherNode, tickWorld } from './task';
import { type TerrainType } from './terrain';

function grass(state: FortressState): TerrainType[] {
  return new Array<TerrainType>(state.cols * state.rows).fill('grass');
}

function hero(col: number, row: number): Hero {
  return makePlayerHero('h1', 'Worker', baselineAttributes(), col, row);
}

function run(
  state: FortressState,
  terrain: readonly TerrainType[],
  heroes: Hero[],
  nodes: GatherNode[],
  steps: number,
  dtMs = 100
): void {
  for (let i = 0; i < steps; i++) tickWorld({ state, terrain, heroes, nodes, dtMs });
}

describe('move task', () => {
  it('walks the hero to the goal and returns to idle', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    const h = hero(0, 0);
    expect(commandMove(s, t, h, 0, 4)).toBe(true);
    run(s, t, [h], [], 60);
    expect(h.col).toBe(0);
    expect(h.row).toBe(4);
    expect(h.task.kind).toBe('idle');
  });

  it('is deterministic across identical worlds', () => {
    const make = (): [FortressState, TerrainType[], Hero] => {
      const s = createInitialFortress(1);
      const t = grass(s);
      const h = hero(0, 0);
      commandMove(s, t, h, 5, 5);
      return [s, t, h];
    };
    const [s1, t1, h1] = make();
    const [s2, t2, h2] = make();
    run(s1, t1, [h1], [], 25);
    run(s2, t2, [h2], [], 25);
    expect(h1).toEqual(h2);
  });
});

describe('assistBuild task', () => {
  it('completes a construction site faster than passive trickle alone', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 2, 0, 'wall'); // build site
    expect(isUnderConstruction(s, 2, 0)).toBe(true);
    const h = hero(0, 0);
    expect(commandAssist(s, t, h, 2, 0)).toBe(true);
    run(s, t, [h], [], 120); // 12s
    expect(isUnderConstruction(s, 2, 0)).toBe(false);
    expect(h.task.kind).toBe('idle');
  });
});

describe('gather task', () => {
  it('accrues resources, depletes the node, and clears the cell', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    const node: GatherNode = { col: 3, row: 3, remaining: 3 };
    const startResources = s.resources;
    const h = hero(0, 0);
    expect(commandGather(s, t, h, node)).toBe(true);
    run(s, t, [h], [node], 200); // plenty of time
    expect(s.resources).toBe(startResources + 3);
    expect(h.task.kind).toBe('idle');
    expect(s.cleared).toContain(indexOf(s, 3, 3));
  });

  it('reports the depleted cell once so the renderer can erase it', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    const node: GatherNode = { col: 3, row: 3, remaining: 2 };
    const h = hero(0, 0);
    commandGather(s, t, h, node);
    const reported: number[] = [];
    for (let i = 0; i < 200; i++) {
      const { depletedCells } = tickWorld({
        state: s,
        terrain: t,
        heroes: [h],
        nodes: [node],
        dtMs: 100,
      });
      reported.push(...depletedCells);
    }
    expect(reported).toEqual([indexOf(s, 3, 3)]);
  });
});
