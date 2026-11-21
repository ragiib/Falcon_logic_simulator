import { useEffect, useRef } from 'react';
import type { Circuit } from '@/model';
import {
  getBrowserStorage,
  saveAutosave,
  useCircuitStore,
  usePersistenceStore,
  useToastStore,
} from '@/store';

let hasRestoredGlobal = false;
let hasReportedAutosaveError = false;

export function useAutosave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCircuitRef = useRef<Circuit>(useCircuitStore.getState().circuit);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (storage && !hasRestoredGlobal) {
      hasRestoredGlobal = true;
      try {
        const res = usePersistenceStore.getState().restoreFromAutosave(storage);
        if (res.restored) {
          useToastStore.getState().pushToast('info', 'Restored your last session');
          for (const w of res.warnings.slice(0, 3)) {
            useToastStore.getState().pushToast('warning', w);
          }
        }
      } catch {
        // Defensive
      }
    }

    latestCircuitRef.current = useCircuitStore.getState().circuit;

    const performSave = () => {
      const s = getBrowserStorage();
      if (!s) return;
      try {
        const res = saveAutosave(s, latestCircuitRef.current);
        if (!res.ok && !hasReportedAutosaveError) {
          hasReportedAutosaveError = true;
          useToastStore
            .getState()
            .pushToast('error', 'Autosave failed: storage is full or unavailable');
        }
      } catch {
        // Defensive
      }
    };

    const flush = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        performSave();
      }
    };

    const unsubscribe = useCircuitStore.subscribe((state) => {
      latestCircuitRef.current = state.circuit;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        performSave();
      }, 800);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, []);
}
