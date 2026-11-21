import { downloadTextFile, readFileAsText, sanitizeFileName } from '@/lib';
import { serializeCircuit } from '@/model';
import {
  getBrowserStorage,
  useCircuitStore,
  usePersistenceStore,
  useToastStore,
  useUiStore,
} from '@/store';

export function usePersistenceActions() {
  const openLibrary = useUiStore((state) => state.openLibrary);
  const pushToast = useToastStore((state) => state.pushToast);

  const newCircuit = () => {
    if (usePersistenceStore.getState().isDirty()) {
      const ok = window.confirm('Discard unsaved changes and start a new circuit?');
      if (!ok) return;
    }
    usePersistenceStore.getState().startNew();
    pushToast('info', 'New circuit');
  };

  const save = () => {
    const storage = getBrowserStorage();
    if (!storage) {
      pushToast('error', 'Browser storage is unavailable. Use Export instead.');
      return;
    }
    const circuit = useCircuitStore.getState().circuit;
    const res = usePersistenceStore.getState().saveCurrent(storage);
    if (res.ok) {
      const name = circuit.name.trim() || 'Untitled circuit';
      pushToast('success', `Saved "${name}"`);
    } else {
      pushToast('error', res.error);
    }
  };

  const importFile = async (file: File) => {
    if (usePersistenceStore.getState().isDirty()) {
      const ok = window.confirm('Discard unsaved changes and import a file?');
      if (!ok) return;
    }
    try {
      const text = await readFileAsText(file);
      const res = usePersistenceStore.getState().importFromText(text);
      if (res.ok) {
        const circuit = useCircuitStore.getState().circuit;
        pushToast('success', `Imported "${circuit.name}"`);
        const maxWarnings = 3;
        for (const w of res.warnings.slice(0, maxWarnings)) {
          pushToast('warning', w);
        }
        if (res.warnings.length > maxWarnings) {
          pushToast('warning', `${res.warnings.length - maxWarnings} more warnings`);
        }
      } else {
        pushToast('error', `Import failed: ${res.error}`);
      }
    } catch (err) {
      pushToast('error', `Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const exportCircuit = () => {
    const circuit = useCircuitStore.getState().circuit;
    const fileName = sanitizeFileName(circuit.name);
    const text = serializeCircuit(circuit);
    downloadTextFile(fileName, text);
    pushToast('success', `Exported ${fileName}`);
  };

  return {
    newCircuit,
    save,
    openLibrary,
    importFile,
    exportCircuit,
  };
}
