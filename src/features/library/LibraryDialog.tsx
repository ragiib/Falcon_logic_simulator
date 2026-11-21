import { useState } from 'react';
import { Modal } from '@/components/Modal';
import {
  deleteCircuit,
  getBrowserStorage,
  type LibraryEntrySummary,
  listCircuits,
  renameCircuit,
  type StorageLike,
  useCircuitStore,
  usePersistenceStore,
  useToastStore,
  useUiStore,
} from '@/store';

function LibraryDialogContent({
  storage,
  onClose,
}: {
  storage: StorageLike | null;
  onClose: () => void;
}) {
  const currentLibraryId = usePersistenceStore((state) => state.currentLibraryId);

  const [entries, setEntries] = useState<LibraryEntrySummary[]>(() =>
    storage ? listCircuits(storage) : [],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const reload = () => {
    if (storage) {
      setEntries(listCircuits(storage));
    }
  };

  const handleOpen = (entry: LibraryEntrySummary) => {
    if (!storage) return;

    if (usePersistenceStore.getState().isDirty()) {
      const ok = window.confirm('Discard unsaved changes to the current circuit?');
      if (!ok) return;
    }

    const res = usePersistenceStore.getState().openFromLibrary(storage, entry.id);
    if (res.ok) {
      onClose();
      useToastStore.getState().pushToast('success', `Opened "${entry.name}"`);
      for (const w of res.warnings.slice(0, 3)) {
        useToastStore.getState().pushToast('warning', w);
      }
    } else {
      useToastStore.getState().pushToast('error', res.error);
    }
  };

  const handleStartRename = (entry: LibraryEntrySummary) => {
    setEditingId(entry.id);
    setEditingName(entry.name);
  };

  const handleConfirmRename = (id: string) => {
    if (!storage) return;
    const res = renameCircuit(storage, id, editingName);
    if (res.ok) {
      if (id === currentLibraryId) {
        useCircuitStore.getState().setCircuitName(editingName);
      }
      setEditingId(null);
      reload();
    } else {
      useToastStore.getState().pushToast('error', res.error);
    }
  };

  const handleDelete = (entry: LibraryEntrySummary) => {
    if (!storage) return;
    const ok = window.confirm(`Delete "${entry.name}"? This cannot be undone.`);
    if (!ok) return;

    const res = deleteCircuit(storage, entry.id);
    if (res.ok) {
      usePersistenceStore.getState().forgetLibraryEntry(entry.id);
      reload();
    } else {
      useToastStore.getState().pushToast('error', res.error);
    }
  };

  if (!storage) {
    return (
      <div className="text-xs text-text-muted text-center py-6">
        Browser storage is unavailable. You can still use Export and Import.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-text-muted text-center py-6">
        No saved circuits yet. Use Save to add one.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const isOpen = entry.id === currentLibraryId;
        const isEditing = entry.id === editingId;

        return (
          <div
            key={entry.id}
            className={`p-3 rounded border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
              isOpen
                ? 'border-accent bg-accent/5'
                : 'border-border bg-surface hover:border-border-hover'
            }`}
          >
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    maxLength={80}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmRename(entry.id);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    className="bg-surface-2 border border-accent rounded px-2 py-0.5 text-xs text-text focus:outline-none flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleConfirmRename(entry.id)}
                    className="px-2 py-0.5 bg-accent text-bg rounded font-medium hover:opacity-90 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2 py-0.5 border border-border rounded text-text hover:bg-surface-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 font-medium text-text truncate">
                    <span className="truncate">{entry.name}</span>
                    {isOpen && (
                      <span className="text-[10px] text-accent font-semibold px-1 py-0.2 rounded border border-accent/40 bg-accent/10">
                        (open)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted flex items-center gap-2">
                    <span>
                      {entry.componentCount}{' '}
                      {entry.componentCount === 1 ? 'component' : 'components'}
                    </span>
                    <span>•</span>
                    <span>{new Date(entry.savedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-none">
                <button
                  type="button"
                  onClick={() => handleOpen(entry)}
                  className="px-2 py-1 rounded border border-border bg-surface text-text hover:bg-surface-2 hover:border-accent font-medium transition-colors cursor-pointer"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRename(entry)}
                  className="px-2 py-1 rounded border border-border bg-surface text-text hover:bg-surface-2 font-medium transition-colors cursor-pointer"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  className="px-2 py-1 rounded border border-border bg-surface text-danger hover:bg-danger/10 hover:border-danger font-medium transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LibraryDialog() {
  const libraryOpen = useUiStore((state) => state.libraryOpen);
  const closeLibrary = useUiStore((state) => state.closeLibrary);

  if (!libraryOpen) {
    return null;
  }

  const storage = getBrowserStorage();

  return (
    <Modal title="Saved circuits" onClose={closeLibrary}>
      <LibraryDialogContent storage={storage} onClose={closeLibrary} />
    </Modal>
  );
}
