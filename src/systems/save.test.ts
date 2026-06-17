import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CENTER_ID } from '../data/structures';
import { createInitialFortress, getCell, placeStructure } from './grid';
import {
  clearSave,
  deserialize,
  loadFortress,
  loadOrCreateFortress,
  SAVE_KEY,
  saveFortress,
  serialize,
} from './save';

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

beforeEach(() => {
  (globalThis as unknown as { localStorage: LocalStorageStub }).localStorage =
    new LocalStorageStub();
});

afterEach(() => {
  clearSave();
});

describe('serialize / deserialize', () => {
  it('round-trips placed structures and resources', () => {
    const s = createInitialFortress();
    placeStructure(s, 0, 0, 'wall');
    placeStructure(s, 1, 0, 'tower');
    const back = deserialize(serialize(s));
    expect(back).not.toBeNull();
    expect(back!.resources).toBe(s.resources);
    expect(getCell(back!, 0, 0)).toEqual({ structureId: 'wall' });
    expect(getCell(back!, 1, 0)).toEqual({ structureId: 'tower' });
  });

  it('re-derives the capture center rather than storing it', () => {
    const s = createInitialFortress();
    const data = serialize(s);
    expect(data.placed).toHaveLength(0);
    const back = deserialize(data)!;
    const cc = back.cells.filter((c) => c?.structureId === CENTER_ID);
    expect(cc).toHaveLength(1);
  });

  it('stores a sparse payload (no nulls)', () => {
    const s = createInitialFortress();
    placeStructure(s, 3, 3, 'gate');
    const data = serialize(s);
    expect(data.placed).toEqual([[3, 3, 'gate']]);
  });

  it('rejects wrong-version or malformed data', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize({ v: 999, cols: 7, rows: 9, resources: 0, placed: [] })).toBeNull();
    expect(deserialize({ v: 1, cols: 7 })).toBeNull();
    expect(deserialize({ v: 1, cols: 7, rows: 9, resources: 0, placed: [[0, 0]] })).toBeNull();
  });
});

describe('saveFortress / loadFortress', () => {
  it('persists and restores via localStorage', () => {
    const s = createInitialFortress();
    placeStructure(s, 2, 1, 'wall');
    saveFortress(s);
    const loaded = loadFortress();
    expect(loaded).not.toBeNull();
    expect(getCell(loaded!, 2, 1)).toEqual({ structureId: 'wall' });
    expect(loaded!.resources).toBe(s.resources);
  });

  it('returns null when nothing is saved', () => {
    expect(loadFortress()).toBeNull();
  });

  it('clears and returns null on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{ not json');
    expect(loadFortress()).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('loadOrCreateFortress falls back to a fresh fortress', () => {
    const s = loadOrCreateFortress();
    expect(s.cells.filter((c) => c !== null)).toHaveLength(1);
  });
});
