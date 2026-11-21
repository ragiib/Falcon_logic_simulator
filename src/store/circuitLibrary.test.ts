import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import {
  AUTOSAVE_KEY,
  LIBRARY_KEY,
  clearAutosave,
  deleteCircuit,
  getBrowserStorage,
  listCircuits,
  loadAutosave,
  loadCircuit,
  renameCircuit,
  saveAutosave,
  saveCircuit,
  type StorageLike,
} from './circuitLibrary';

class MockStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(_key: string): string | null {
    return null;
  }

  setItem(_key: string, _value: string): void {
    throw new Error('QuotaExceededError');
  }

  removeItem(_key: string): void {
    throw new Error('StorageError');
  }
}

function makeSampleCircuit(name: string = 'Test Circuit'): Circuit {
  return {
    version: 1,
    name,
    components: [
      {
        id: 'sw1',
        type: 'inputSwitch',
        position: { x: 10, y: 20 },
        params: { value: true },
      },
      {
        id: 'led1',
        type: 'outputLed',
        position: { x: 100, y: 20 },
        params: {},
      },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'sw1', pinId: 'out' },
        to: { componentId: 'led1', pinId: 'in' },
      },
    ],
  };
}

describe('circuitLibrary', () => {
  it('saves, lists (sorted newest first), and loads circuits round-trip', () => {
    const storage = new MockStorage();
    const c1 = makeSampleCircuit('Circuit Alpha');
    const c2 = {
      ...makeSampleCircuit('Circuit Beta'),
      components: [makeSampleCircuit().components[0]!],
    };

    const res1 = saveCircuit(storage, c1, undefined, 1000);
    expect(res1.ok).toBe(true);
    const id1 = (res1 as { ok: true; id: string }).id;

    const res2 = saveCircuit(storage, c2, undefined, 2000);
    expect(res2.ok).toBe(true);
    const id2 = (res2 as { ok: true; id: string }).id;

    const list = listCircuits(storage);
    expect(list).toHaveLength(2);
    // Newest first
    expect(list[0]?.id).toBe(id2);
    expect(list[0]?.name).toBe('Circuit Beta');
    expect(list[0]?.savedAt).toBe(2000);
    expect(list[0]?.componentCount).toBe(1);

    expect(list[1]?.id).toBe(id1);
    expect(list[1]?.name).toBe('Circuit Alpha');
    expect(list[1]?.savedAt).toBe(1000);
    expect(list[1]?.componentCount).toBe(2);

    const loaded = loadCircuit(storage, id1);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.circuit.name).toBe('Circuit Alpha');
      expect(loaded.circuit.components).toHaveLength(2);
      expect(loaded.circuit.wires).toHaveLength(1);
      expect(loaded.warnings).toEqual([]);
    }
  });

  it('saving with an existing id updates the entry instead of duplicating', () => {
    const storage = new MockStorage();
    const c1 = makeSampleCircuit('Initial');

    const res1 = saveCircuit(storage, c1, 'test-id', 1000);
    expect(res1.ok).toBe(true);

    const updated = { ...c1, name: 'Updated' };
    const res2 = saveCircuit(storage, updated, 'test-id', 3000);
    expect(res2.ok).toBe(true);

    const list = listCircuits(storage);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('test-id');
    expect(list[0]?.name).toBe('Updated');
    expect(list[0]?.savedAt).toBe(3000);

    const loaded = loadCircuit(storage, 'test-id');
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.circuit.name).toBe('Updated');
    }
  });

  it('renameCircuit updates both entry name and internal serialized circuit name', () => {
    const storage = new MockStorage();
    const c = makeSampleCircuit('Old Name');
    const saveRes = saveCircuit(storage, c, 'c-1');
    expect(saveRes.ok).toBe(true);

    const renameRes = renameCircuit(storage, 'c-1', '  New Name  ');
    expect(renameRes.ok).toBe(true);

    const list = listCircuits(storage);
    expect(list[0]?.name).toBe('New Name');

    const loaded = loadCircuit(storage, 'c-1');
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.circuit.name).toBe('New Name');
    }
  });

  it('renameCircuit with unknown id returns error', () => {
    const storage = new MockStorage();
    const res = renameCircuit(storage, 'non-existent', 'New Name');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('Circuit not found');
    }
  });

  it('deleteCircuit removes entry; unknown id returns error', () => {
    const storage = new MockStorage();
    const c = makeSampleCircuit('To Delete');
    saveCircuit(storage, c, 'del-1');

    const delRes = deleteCircuit(storage, 'del-1');
    expect(delRes.ok).toBe(true);

    expect(listCircuits(storage)).toEqual([]);
    const loadRes = loadCircuit(storage, 'del-1');
    expect(loadRes.ok).toBe(false);
    if (!loadRes.ok) {
      expect(loadRes.error).toBe('Circuit not found');
    }

    const delUnknown = deleteCircuit(storage, 'unknown-id');
    expect(delUnknown.ok).toBe(false);
    if (!delUnknown.ok) {
      expect(delUnknown.error).toBe('Circuit not found');
    }
  });

  it('handles corrupt library JSON by returning empty list without throwing and allows subsequent save', () => {
    const storage = new MockStorage();
    storage.setItem(LIBRARY_KEY, '{invalid json');

    expect(listCircuits(storage)).toEqual([]);

    const c = makeSampleCircuit('Fresh');
    const saveRes = saveCircuit(storage, c);
    expect(saveRes.ok).toBe(true);

    expect(listCircuits(storage)).toHaveLength(1);
  });

  it('handles wrongly shaped library payload by returning empty list', () => {
    const storage = new MockStorage();
    // Not version 1
    storage.setItem(LIBRARY_KEY, JSON.stringify({ version: 99, entries: {} }));
    expect(listCircuits(storage)).toEqual([]);

    // Array instead of object
    storage.setItem(LIBRARY_KEY, JSON.stringify([1, 2, 3]));
    expect(listCircuits(storage)).toEqual([]);

    // entries is array
    storage.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, entries: [] }));
    expect(listCircuits(storage)).toEqual([]);
  });

  it('skips a corrupt entry while listing valid entries', () => {
    const storage = new MockStorage();
    const c1 = makeSampleCircuit('Valid');
    saveCircuit(storage, c1, 'valid-1');

    // Manually inject a corrupt entry into the library JSON
    const raw = storage.getItem(LIBRARY_KEY)!;
    const parsed = JSON.parse(raw);
    parsed.entries['corrupt-1'] = {
      id: 'corrupt-1',
      name: 'Corrupt',
      savedAt: 9999,
      data: '{not valid json circuit',
    };
    storage.setItem(LIBRARY_KEY, JSON.stringify(parsed));

    const list = listCircuits(storage);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('valid-1');
  });

  it('returns failure when storage.setItem throws (e.g. quota exceeded)', () => {
    const storage = new ThrowingStorage();
    const c = makeSampleCircuit();

    const saveRes = saveCircuit(storage, c);
    expect(saveRes.ok).toBe(false);
    if (!saveRes.ok) {
      expect(saveRes.error).toBe('Could not save: storage is full or unavailable');
    }

    const renameRes = renameCircuit(storage, 'any', 'new');
    expect(renameRes.ok).toBe(false);

    const deleteRes = deleteCircuit(storage, 'any');
    expect(deleteRes.ok).toBe(false);

    const autoRes = saveAutosave(storage, c);
    expect(autoRes.ok).toBe(false);
    if (!autoRes.ok) {
      expect(autoRes.error).toBe('Could not save: storage is full or unavailable');
    }
  });

  it('saves, loads, and clears autosave', () => {
    const storage = new MockStorage();
    const c = makeSampleCircuit('Autosaved');

    // Missing autosave
    const initialLoad = loadAutosave(storage);
    expect(initialLoad.ok).toBe(false);
    if (!initialLoad.ok) {
      expect(initialLoad.error).toBe('No autosave found');
    }

    // Save autosave
    const saveRes = saveAutosave(storage, c, 54321);
    expect(saveRes.ok).toBe(true);

    // Load autosave
    const loaded = loadAutosave(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.savedAt).toBe(54321);
      expect(loaded.circuit.name).toBe('Autosaved');
      expect(loaded.circuit.components).toHaveLength(2);
      expect(loaded.warnings).toEqual([]);
    }

    // Clear autosave
    clearAutosave(storage);
    const postClear = loadAutosave(storage);
    expect(postClear.ok).toBe(false);
  });

  it('loadAutosave handles corrupt autosave data gracefully', () => {
    const storage = new MockStorage();

    // Invalid JSON
    storage.setItem(AUTOSAVE_KEY, '{invalid');
    expect(loadAutosave(storage).ok).toBe(false);

    // Invalid payload structure
    storage.setItem(AUTOSAVE_KEY, JSON.stringify({ version: 2 }));
    const badPayload = loadAutosave(storage);
    expect(badPayload.ok).toBe(false);
    if (!badPayload.ok) {
      expect(badPayload.error).toBe('Autosave data is corrupt');
    }

    // Invalid circuit data string
    storage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ version: 1, savedAt: 1000, data: '{bad circuit' }),
    );
    const badCircuit = loadAutosave(storage);
    expect(badCircuit.ok).toBe(false);
  });

  it('getBrowserStorage returns null in node test environment without throwing', () => {
    expect(getBrowserStorage()).toBeNull();
  });
});
