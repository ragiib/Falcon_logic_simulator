import { create } from 'zustand';
import {
  CURRENT_SCHEMA_VERSION,
  type Circuit,
  deserializeCircuit,
  serializeCircuit,
} from '@/model';
import {
  type StorageLike,
  type StorageResult,
  loadAutosave,
  loadCircuit,
  saveCircuit,
} from './circuitLibrary';
import { useCircuitStore } from './circuitStore';
import { useSimStore } from './simStore';

export interface PersistenceState {
  currentLibraryId: string | null;
  savedSnapshot: string | null;
  isDirty: () => boolean;
  saveCurrent: (storage: StorageLike) => StorageResult<{ id: string }>;
  openFromLibrary: (storage: StorageLike, id: string) => StorageResult<{ warnings: string[] }>;
  importFromText: (text: string) => { ok: true; warnings: string[] } | { ok: false; error: string };
  startNew: () => void;
  restoreFromAutosave: (storage: StorageLike) => { restored: boolean; warnings: string[] };
  forgetLibraryEntry: (id: string) => void;
}

export const usePersistenceStore = create<PersistenceState>((set, get) => ({
  currentLibraryId: null,
  savedSnapshot: null,

  isDirty: () => {
    const { savedSnapshot } = get();
    const circuit = useCircuitStore.getState().circuit;
    if (savedSnapshot === null) {
      return circuit.components.length > 0;
    }
    return serializeCircuit(circuit) !== savedSnapshot;
  },

  saveCurrent: (storage) => {
    const circuit = useCircuitStore.getState().circuit;
    const { currentLibraryId } = get();
    const res = saveCircuit(storage, circuit, currentLibraryId ?? undefined);
    if (res.ok) {
      set({
        currentLibraryId: res.id,
        savedSnapshot: serializeCircuit(circuit),
      });
    }
    return res;
  },

  openFromLibrary: (storage, id) => {
    const res = loadCircuit(storage, id);
    if (!res.ok) {
      return res;
    }
    useCircuitStore.getState().replaceCircuit(res.circuit);
    set({
      currentLibraryId: id,
      savedSnapshot: serializeCircuit(res.circuit),
    });
    useSimStore.getState().resetSimulation(res.circuit);
    return { ok: true, warnings: res.warnings };
  },

  importFromText: (text) => {
    const res = deserializeCircuit(text);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    useCircuitStore.getState().replaceCircuit(res.circuit);
    set({
      currentLibraryId: null,
      savedSnapshot: null,
    });
    useSimStore.getState().resetSimulation(res.circuit);
    return { ok: true, warnings: res.warnings };
  },

  startNew: () => {
    const emptyCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Untitled circuit',
      components: [],
      wires: [],
    };
    useCircuitStore.getState().replaceCircuit(emptyCircuit);
    set({
      currentLibraryId: null,
      savedSnapshot: null,
    });
    useSimStore.getState().resetSimulation(emptyCircuit);
  },

  restoreFromAutosave: (storage) => {
    const res = loadAutosave(storage);
    if (res.ok && res.circuit.components.length > 0) {
      useCircuitStore.getState().replaceCircuit(res.circuit);
      useSimStore.getState().resetSimulation(res.circuit);
      set({
        currentLibraryId: null,
        savedSnapshot: null,
      });
      return { restored: true, warnings: res.warnings };
    }
    return { restored: false, warnings: [] };
  },

  forgetLibraryEntry: (id) => {
    if (id === get().currentLibraryId) {
      set({
        currentLibraryId: null,
        savedSnapshot: null,
      });
    }
  },
}));
