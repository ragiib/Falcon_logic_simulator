import { useEffect } from 'react';
import type { Circuit } from '@/model';
import { useCircuitStore } from '@/store/circuitStore';
import { circuitSimKey, useSimStore } from '@/store/simStore';

export { circuitSimKey };

/**
 * Checks whether the circuit needs simulation synchronization, and syncs if different.
 * Returns true if a sync was performed, false if already up-to-date.
 */
export function syncIfNeeded(circuit: Circuit): boolean {
  const nextKey = circuitSimKey(circuit);
  if (nextKey === useSimStore.getState().lastSyncedKey) {
    return false;
  }
  useSimStore.getState().syncWithCircuit(circuit);
  return true;
}

/**
 * Automatically synchronizes the headless simulation engine with the circuit document
 * and manages auto-advance interval when running in step mode.
 */
export function useSimulationSync() {
  useEffect(() => {
    const unsubscribe = useCircuitStore.subscribe((state) => {
      syncIfNeeded(state.circuit);
    });

    // Sync once on mount AFTER subscribing (so changes during mount are not missed)
    syncIfNeeded(useCircuitStore.getState().circuit);

    return unsubscribe;
  }, []);

  const mode = useSimStore((s) => s.mode);
  const running = useSimStore((s) => s.running);
  const speedMs = useSimStore((s) => s.speedMs);

  useEffect(() => {
    if (mode !== 'step' || !running) return;

    const interval = setInterval(() => {
      useSimStore.getState().stepOnce();
    }, speedMs);

    return () => clearInterval(interval);
  }, [mode, running, speedMs]);
}
