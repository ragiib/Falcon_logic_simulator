import type { Circuit } from './types';
import { getComponentDefinition } from '@/engine';

export interface PinWarning {
  componentId: string;
  pinId: string;
  kind: 'unconnectedInput' | 'unconnectedOutput';
  message: string;
}

/**
 * Scans a circuit for unconnected input and output pins.
 * Components with unknown types are skipped without throwing.
 * Returns warnings in circuit component order, then pin order.
 */
export function findUnconnectedPins(circuit: Circuit): PinWarning[] {
  const connectedInputs = new Set<string>();
  const connectedOutputs = new Set<string>();

  for (const wire of circuit.wires) {
    connectedOutputs.add(`${wire.from.componentId}:${wire.from.pinId}`);
    connectedInputs.add(`${wire.to.componentId}:${wire.to.pinId}`);
  }

  const warnings: PinWarning[] = [];

  for (const comp of circuit.components) {
    const def = getComponentDefinition(comp.type);
    if (!def) {
      continue;
    }

    const pins = def.getPins(comp.params);
    const displayName = comp.label || def.label;

    for (const pin of pins) {
      const pinKey = `${comp.id}:${pin.id}`;

      if (pin.direction === 'input') {
        if (!connectedInputs.has(pinKey)) {
          warnings.push({
            componentId: comp.id,
            pinId: pin.id,
            kind: 'unconnectedInput',
            message: `${displayName} input ${pin.label} is not connected (reads 0)`,
          });
        }
      } else if (pin.direction === 'output') {
        if (comp.type === 'outputLed') {
          continue;
        }
        if (!connectedOutputs.has(pinKey)) {
          const message =
            pin.label.toLowerCase() === 'out'
              ? `${displayName} output is not connected`
              : `${displayName} output ${pin.label} is not connected`;
          warnings.push({
            componentId: comp.id,
            pinId: pin.id,
            kind: 'unconnectedOutput',
            message,
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Groups a list of pin warnings by componentId.
 * Clean components (with zero warnings) are omitted from the returned record.
 */
export function groupWarningsByComponent(warnings: PinWarning[]): Record<string, PinWarning[]> {
  const result: Record<string, PinWarning[]> = {};
  for (const w of warnings) {
    const list = result[w.componentId];
    if (list) {
      list.push(w);
    } else {
      result[w.componentId] = [w];
    }
  }
  return result;
}
