import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type Circuit, serializeCircuit } from '@/model';
import {
  type StorageLike,
  listCircuits,
  saveAutosave,
  saveCircuit,
  useCircuitStore,
  usePersistenceStore,
  useSimStore,
  useUiStore,
} from '@/store';

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

describe('persistenceStore', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    useCircuitStore.getState().resetCircuit();
    usePersistenceStore.setState({
      currentLibraryId: null,
      savedSnapshot: null,
    });
    useUiStore.setState({
      selectedIds: [],
      selectedWireIds: [],
      libraryOpen: false,
    });
    useSimStore.getState().resetSimulation(useCircuitStore.getState().circuit);
  });

  it('isDirty is false on an empty fresh circuit and true after adding a component', () => {
    expect(usePersistenceStore.getState().isDirty()).toBe(false);

    useCircuitStore.getState().addComponent('and', { x: 10, y: 10 });
    expect(usePersistenceStore.getState().isDirty()).toBe(true);
  });

  it('saveCurrent creates an entry, sets currentLibraryId, and makes isDirty false', () => {
    useCircuitStore.getState().addComponent('and', { x: 10, y: 10 });
    expect(usePersistenceStore.getState().isDirty()).toBe(true);

    const res = usePersistenceStore.getState().saveCurrent(storage);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(usePersistenceStore.getState().currentLibraryId).toBe(res.id);
    }
    expect(usePersistenceStore.getState().isDirty()).toBe(false);

    const list = listCircuits(storage);
    expect(list).toHaveLength(1);
  });

  it('editing after save (move component with setPositions, or rename) makes it dirty', () => {
    const id = useCircuitStore.getState().addComponent('and', { x: 10, y: 10 })!;
    usePersistenceStore.getState().saveCurrent(storage);
    expect(usePersistenceStore.getState().isDirty()).toBe(false);

    // Moving component makes it dirty
    useCircuitStore.getState().setPositions({ [id]: { x: 50, y: 50 } });
    expect(usePersistenceStore.getState().isDirty()).toBe(true);

    // Save again clears dirty
    usePersistenceStore.getState().saveCurrent(storage);
    expect(usePersistenceStore.getState().isDirty()).toBe(false);

    // Renaming circuit makes it dirty
    useCircuitStore.getState().setCircuitName('New Name');
    expect(usePersistenceStore.getState().isDirty()).toBe(true);
  });

  it('saving again updates the same entry (still one entry in the list)', () => {
    useCircuitStore.getState().addComponent('and', { x: 10, y: 10 });
    const firstSave = usePersistenceStore.getState().saveCurrent(storage);
    expect(firstSave.ok).toBe(true);

    useCircuitStore.getState().setCircuitName('Updated Name');
    const secondSave = usePersistenceStore.getState().saveCurrent(storage);
    expect(secondSave.ok).toBe(true);

    const list = listCircuits(storage);
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Updated Name');
    if (firstSave.ok && secondSave.ok) {
      expect(secondSave.id).toBe(firstSave.id);
    }
  });

  it('openFromLibrary swaps the circuit, sets id/snapshot, clears selections, and returns ok: false for unknown id', () => {
    const originalCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Original',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 10, y: 10 },
          params: { value: true },
        },
      ],
      wires: [],
    };
    saveCircuit(storage, originalCircuit, 'saved-c-1');

    useUiStore.setState({
      selectedIds: ['dummy'],
      selectedWireIds: ['dummy-wire'],
    });

    const res = usePersistenceStore.getState().openFromLibrary(storage, 'saved-c-1');
    expect(res.ok).toBe(true);
    expect(useCircuitStore.getState().circuit.name).toBe('Original');
    expect(useCircuitStore.getState().circuit.components).toHaveLength(1);
    expect(usePersistenceStore.getState().currentLibraryId).toBe('saved-c-1');
    expect(usePersistenceStore.getState().isDirty()).toBe(false);
    expect(useUiStore.getState().selectedIds).toEqual([]);
    expect(useUiStore.getState().selectedWireIds).toEqual([]);

    // Unknown id returns ok: false without modifying circuit
    const failRes = usePersistenceStore.getState().openFromLibrary(storage, 'non-existent');
    expect(failRes.ok).toBe(false);
    expect(useCircuitStore.getState().circuit.name).toBe('Original');
  });

  it('importFromText success sets currentLibraryId null and replaces circuit; error returns message and leaves circuit unchanged', () => {
    const importCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Imported',
      components: [
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 50, y: 50 },
          params: {},
        },
      ],
      wires: [],
    };
    const validJson = serializeCircuit(importCircuit);

    usePersistenceStore.setState({ currentLibraryId: 'old-id', savedSnapshot: 'dummy' });

    const res = usePersistenceStore.getState().importFromText(validJson);
    expect(res.ok).toBe(true);
    expect(useCircuitStore.getState().circuit.name).toBe('Imported');
    expect(usePersistenceStore.getState().currentLibraryId).toBeNull();
    expect(usePersistenceStore.getState().savedSnapshot).toBeNull();

    // Invalid JSON error leaves circuit unchanged
    const failRes = usePersistenceStore.getState().importFromText('{invalid-json');
    expect(failRes.ok).toBe(false);
    if (!failRes.ok) {
      expect(failRes.error).toBeDefined();
    }
    expect(useCircuitStore.getState().circuit.name).toBe('Imported');
  });

  it('startNew empties the circuit and resets id/snapshot', () => {
    useCircuitStore.getState().addComponent('and', { x: 10, y: 10 });
    usePersistenceStore.setState({ currentLibraryId: 'some-id', savedSnapshot: 'dummy' });

    usePersistenceStore.getState().startNew();
    const current = useCircuitStore.getState().circuit;
    expect(current.name).toBe('Untitled circuit');
    expect(current.components).toHaveLength(0);
    expect(current.wires).toHaveLength(0);
    expect(usePersistenceStore.getState().currentLibraryId).toBeNull();
    expect(usePersistenceStore.getState().savedSnapshot).toBeNull();
    expect(usePersistenceStore.getState().isDirty()).toBe(false);
  });

  it('restoreFromAutosave restores a non-empty autosave, returns restored: false for missing or empty autosave', () => {
    // Missing autosave
    const res1 = usePersistenceStore.getState().restoreFromAutosave(storage);
    expect(res1.restored).toBe(false);

    // Empty components autosave
    const emptyCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Empty',
      components: [],
      wires: [],
    };
    saveAutosave(storage, emptyCircuit);
    const res2 = usePersistenceStore.getState().restoreFromAutosave(storage);
    expect(res2.restored).toBe(false);

    // Non-empty autosave
    const populatedCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Autosaved Circuit',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: {},
        },
      ],
      wires: [],
    };
    saveAutosave(storage, populatedCircuit);
    const res3 = usePersistenceStore.getState().restoreFromAutosave(storage);
    expect(res3.restored).toBe(true);
    expect(useCircuitStore.getState().circuit.name).toBe('Autosaved Circuit');
    expect(useCircuitStore.getState().circuit.components).toHaveLength(1);
    expect(usePersistenceStore.getState().currentLibraryId).toBeNull();
    expect(usePersistenceStore.getState().savedSnapshot).toBeNull();
  });

  it('forgetLibraryEntry clears the id only when it matches', () => {
    usePersistenceStore.setState({
      currentLibraryId: 'id-123',
      savedSnapshot: 'snapshot-123',
    });

    usePersistenceStore.getState().forgetLibraryEntry('id-999');
    expect(usePersistenceStore.getState().currentLibraryId).toBe('id-123');
    expect(usePersistenceStore.getState().savedSnapshot).toBe('snapshot-123');

    usePersistenceStore.getState().forgetLibraryEntry('id-123');
    expect(usePersistenceStore.getState().currentLibraryId).toBeNull();
    expect(usePersistenceStore.getState().savedSnapshot).toBeNull();
  });
});
