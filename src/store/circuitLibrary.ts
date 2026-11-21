import type { Circuit } from '@/model';
import { MAX_NAME_LENGTH, deserializeCircuit, serializeCircuit } from '@/model';
import { createId } from '@/lib';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LibraryEntrySummary {
  id: string;
  name: string;
  savedAt: number;
  componentCount: number;
}

export type StorageResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export const LIBRARY_KEY = 'logicsim:library:v1';
export const AUTOSAVE_KEY = 'logicsim:autosave:v1';

interface LibraryEntry {
  id: string;
  name: string;
  savedAt: number;
  data: string;
}

interface LibraryPayload {
  version: number;
  entries: Record<string, LibraryEntry>;
}

function readLibrary(storage: StorageLike): LibraryPayload {
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    if (!raw) {
      return { version: 1, entries: {} };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { version: 1, entries: {} };
    }
    if (
      parsed.version !== 1 ||
      !parsed.entries ||
      typeof parsed.entries !== 'object' ||
      Array.isArray(parsed.entries)
    ) {
      return { version: 1, entries: {} };
    }
    return parsed as LibraryPayload;
  } catch {
    return { version: 1, entries: {} };
  }
}

export function listCircuits(storage: StorageLike): LibraryEntrySummary[] {
  const lib = readLibrary(storage);
  const summaries: LibraryEntrySummary[] = [];

  for (const entry of Object.values(lib.entries)) {
    if (!entry || typeof entry !== 'object' || typeof entry.data !== 'string') {
      continue;
    }
    const des = deserializeCircuit(entry.data);
    if (!des.ok) {
      continue;
    }
    summaries.push({
      id: entry.id,
      name: entry.name,
      savedAt: entry.savedAt,
      componentCount: des.circuit.components.length,
    });
  }

  return summaries.sort((a, b) => b.savedAt - a.savedAt);
}

export function saveCircuit(
  storage: StorageLike,
  circuit: Circuit,
  id?: string,
  now: number = Date.now(),
): StorageResult<{ id: string }> {
  const entryId = id || createId('lib');
  const trimmedName = circuit.name.trim().slice(0, MAX_NAME_LENGTH);
  const entryName = trimmedName.length > 0 ? trimmedName : 'Untitled circuit';

  const circuitToSave: Circuit = {
    ...circuit,
    name: entryName,
  };
  const serialized = serializeCircuit(circuitToSave);

  const lib = readLibrary(storage);
  lib.entries[entryId] = {
    id: entryId,
    name: entryName,
    savedAt: now,
    data: serialized,
  };

  try {
    storage.setItem(LIBRARY_KEY, JSON.stringify(lib));
    return { ok: true, id: entryId };
  } catch {
    return { ok: false, error: 'Could not save: storage is full or unavailable' };
  }
}

export function loadCircuit(
  storage: StorageLike,
  id: string,
): StorageResult<{ circuit: Circuit; warnings: string[] }> {
  const lib = readLibrary(storage);
  const entry = lib.entries[id];
  if (!entry) {
    return { ok: false, error: 'Circuit not found' };
  }

  const des = deserializeCircuit(entry.data);
  if (!des.ok) {
    return { ok: false, error: des.error };
  }

  return {
    ok: true,
    circuit: des.circuit,
    warnings: des.warnings,
  };
}

export function renameCircuit(storage: StorageLike, id: string, name: string): StorageResult<{}> {
  const lib = readLibrary(storage);
  const entry = lib.entries[id];
  if (!entry) {
    return { ok: false, error: 'Circuit not found' };
  }

  const trimmedName = name.trim().slice(0, MAX_NAME_LENGTH);
  const newName = trimmedName.length > 0 ? trimmedName : 'Untitled circuit';

  const des = deserializeCircuit(entry.data);
  if (!des.ok) {
    return { ok: false, error: des.error };
  }

  const updatedCircuit: Circuit = {
    ...des.circuit,
    name: newName,
  };

  entry.name = newName;
  entry.data = serializeCircuit(updatedCircuit);

  try {
    storage.setItem(LIBRARY_KEY, JSON.stringify(lib));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save: storage is full or unavailable' };
  }
}

export function deleteCircuit(storage: StorageLike, id: string): StorageResult<{}> {
  const lib = readLibrary(storage);
  if (!lib.entries[id]) {
    return { ok: false, error: 'Circuit not found' };
  }

  delete lib.entries[id];

  try {
    storage.setItem(LIBRARY_KEY, JSON.stringify(lib));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save: storage is full or unavailable' };
  }
}

export function saveAutosave(
  storage: StorageLike,
  circuit: Circuit,
  now: number = Date.now(),
): StorageResult<{}> {
  const payload = {
    version: 1,
    savedAt: now,
    data: serializeCircuit(circuit),
  };

  try {
    storage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save: storage is full or unavailable' };
  }
}

export function loadAutosave(
  storage: StorageLike,
): StorageResult<{ circuit: Circuit; warnings: string[]; savedAt: number }> {
  try {
    const raw = storage.getItem(AUTOSAVE_KEY);
    if (!raw) {
      return { ok: false, error: 'No autosave found' };
    }
    const payload = JSON.parse(raw);
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      payload.version !== 1 ||
      typeof payload.savedAt !== 'number' ||
      typeof payload.data !== 'string'
    ) {
      return { ok: false, error: 'Autosave data is corrupt' };
    }

    const des = deserializeCircuit(payload.data);
    if (!des.ok) {
      return { ok: false, error: des.error };
    }

    return {
      ok: true,
      circuit: des.circuit,
      warnings: des.warnings,
      savedAt: payload.savedAt,
    };
  } catch {
    return { ok: false, error: 'No autosave found' };
  }
}

export function clearAutosave(storage: StorageLike): void {
  try {
    storage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Ignore errors
  }
}

export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const testKey = '__logicsim_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}
