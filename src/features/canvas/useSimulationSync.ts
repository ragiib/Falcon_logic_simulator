import { useEffect } from 'react';
import type { Circuit } from '@/model';
import { useCircuitStore, useSimStore } from '@/store';

/**
 * Computes a cheap signature of circuit components and wires to determine
 * whether a simulation resync is necessary. Position changes do not alter this key.
 */
export function circuitSimKey(circuit: Circuit): string {
  const compPart = circuit.components
    .map((c) => `${c.id}|${c.type}|${JSON.stringify(c.params)}`)
    .join(';');
  const wirePart = circuit.wires
    .map((w) => `${w.id}|${w.from.componentId}:${w.from.pinId}|${w.to.componentId}:${w.to.pinId}`)
    .join(';');
  return `${compPart}#${wirePart}`;
}

/**
 * Automatically synchronizes the headless simulation engine with the circuit document
 * and manages auto-advance interval when running in step mode.
 */
export function useSimulationSync() {
  useEffect(() => {
    let prevKey = circuitSimKey(useCircuitStore.getState().circuit);
    useSimStore.getState().syncWithCircuit(useCircuitStore.getState().circuit);

    const unsubscribe = useCircuitStore.subscribe((state) => {
      const nextKey = circuitSimKey(state.circuit);
      if (nextKey !== prevKey) {
        prevKey = nextKey;
        useSimStore.getState().syncWithCircuit(state.circuit);
      }
    });

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
