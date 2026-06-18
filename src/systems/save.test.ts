import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STARTING_RESOURCES, STRONGHOLD_ID } from '../data/structures';
import { createInitialFortress, getCell, placeStructure } from './grid';
import { type TerrainType } from './terrain';
import {
  clearSave,
  deserialize,
  loadFortress,
  loadOrCreateFortress,
  SAVE_KEY,
  saveFortress,
  serialize,
} from './save';

const V1_KEY = 'fortgion.save.v1';

/** Minimal in-memory localStorage stub for the node test environment. */
class LocalStorageStub {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

function grassTerrain(cols: number, rows: number): TerrainType[] {
  return new Array<TerrainType>(cols * rows).fill('grass');
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: LocalStorageStub }).localStorage =
    new LocalStorageStub();
});

afterEach(() => {
  clearSave();
});

describe('serialize / deserialize', () => {
  it('round-trips placed structures (incl. stronghold), seed, level, cleared', () => {
    const s = createInitialFortress(99);
    const t = grassTerrain(s.cols, s.rows);
    placeStructure(s, t, 2, 2, STRONGHOLD_ID);
    placeStructure(s, t, 0, 0, 'wall');
    s.level = 2;
    s.cleared.push(5);
    const back = deserialize(serialize(s));
    expect(back).not.toBeNull();
    expect(back!.resources).toBe(s.resources);
    expect(back!.seed).toBe(99);
    expect(back!.level).toBe(2);
    expect(back!.cleared).toEqual([5]);
    expect(getCell(back!, 2, 2)).toEqual({ structureId: STRONGHOLD_ID });
    expect(getCell(back!, 0, 0)).toEqual({ structureId: 'wall' });
  });

  it('rejects wrong-version or malformed data', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize({ v: 1, cols: 7, rows: 9, resources: 0, placed: [] })).toBeNull();
    expect(deserialize({ v: 2, cols: 16 })).toBeNull();
  });
});

describe('saveFortress / loadFortress', () => {
  it('persists and restores via localStorage', () => {
    const s = createInitialFortress(7);
    const t = grassTerrain(s.cols, s.rows);
    placeStructure(s, t, 2, 1, 'wall');
    saveFortress(s);
    const loaded = loadFortress();
    expect(loaded).not.toBeNull();
    expect(getCell(loaded!, 2, 1)).toEqual({ structureId: 'wall' });
    expect(loaded!.seed).toBe(7);
  });

  it('returns null when nothing is saved', () => {
    expect(loadFortress()).toBeNull();
  });

  it('clears and returns null on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{ not json');
    expect(loadFortress()).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('migrates a legacy v1 save: keeps resources, starts fresh', () => {
    localStorage.setItem(
      V1_KEY,
      JSON.stringify({ v: 1, cols: 7, rows: 9, resources: 73, placed: [[0, 0, 'wall']] })
    );
    const loaded = loadFortress();
    expect(loaded).not.toBeNull();
    expect(loaded!.resources).toBe(73);
    expect(loaded!.cols).toBe(createInitialFortress().cols);
    expect(loaded!.cells.filter((c) => c !== null)).toHaveLength(0);
    // v1 key is consumed and a v2 save written.
    expect(localStorage.getItem(V1_KEY)).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('loadOrCreateFortress falls back to a fresh fortress', () => {
    const s = loadOrCreateFortress();
    expect(s.resources).toBe(STARTING_RESOURCES);
    expect(s.cells.filter((c) => c !== null)).toHaveLength(0);
  });
});
