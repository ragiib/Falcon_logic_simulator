import { useMemo } from 'react';
import { useCircuitStore } from '@/store';
import { findUnconnectedPins, groupWarningsByComponent } from '@/model';
import type { PinWarning } from '@/model';
import { circuitSimKey } from './useSimulationSync';

export function useCircuitWarnings(): {
  pinWarnings: PinWarning[];
  byComponent: Record<string, PinWarning[]>;
} {
  const circuit = useCircuitStore((state) => state.circuit);
  const simKey = circuitSimKey(circuit);

  return useMemo(() => {
    const currentCircuit = useCircuitStore.getState().circuit;
    const pinWarnings = findUnconnectedPins(currentCircuit);
    const byComponent = groupWarningsByComponent(pinWarnings);
    return { pinWarnings, byComponent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKey]);
}
