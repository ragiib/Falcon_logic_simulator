import type { Circuit, PinRef } from './types';
import { getComponentDefinition } from '@/engine';

export type ConnectionCheck = { ok: true } | { ok: false; reason: string };

/**
 * Validates whether a wire connection from an output pin to an input pin is allowed.
 * Checked in order:
 * 1. Source component exists and its definition is known.
 * 2. Target component exists and its definition is known.
 * 3. from.pinId is an OUTPUT pin of the source.
 * 4. to.pinId is an INPUT pin of the target.
 * 5. Source and target are different components.
 * 6. The target input pin has no wire yet.
 */
export function validateConnection(circuit: Circuit, from: PinRef, to: PinRef): ConnectionCheck {
  const sourceComp = circuit.components.find((c) => c.id === from.componentId);
  if (!sourceComp) {
    return { ok: false, reason: `Source component "${from.componentId}" does not exist` };
  }
  const sourceDef = getComponentDefinition(sourceComp.type);
  if (!sourceDef) {
    return { ok: false, reason: `Unknown source component type "${sourceComp.type}"` };
  }

  const targetComp = circuit.components.find((c) => c.id === to.componentId);
  if (!targetComp) {
    return { ok: false, reason: `Target component "${to.componentId}" does not exist` };
  }
  const targetDef = getComponentDefinition(targetComp.type);
  if (!targetDef) {
    return { ok: false, reason: `Unknown target component type "${targetComp.type}"` };
  }

  const sourcePins = sourceDef.getPins(sourceComp.params);
  const sourcePin = sourcePins.find((p) => p.id === from.pinId);
  if (!sourcePin || sourcePin.direction !== 'output') {
    return {
      ok: false,
      reason: `Pin "${from.pinId}" is not a valid output pin of component "${from.componentId}"`,
    };
  }

  const targetPins = targetDef.getPins(targetComp.params);
  const targetPin = targetPins.find((p) => p.id === to.pinId);
  if (!targetPin || targetPin.direction !== 'input') {
    return {
      ok: false,
      reason: `Pin "${to.pinId}" is not a valid input pin of component "${to.componentId}"`,
    };
  }

  if (from.componentId === to.componentId) {
    return { ok: false, reason: 'A component cannot connect to itself' };
  }

  const hasWire = circuit.wires.some(
    (w) => w.to.componentId === to.componentId && w.to.pinId === to.pinId,
  );
  if (hasWire) {
    return { ok: false, reason: 'This input already has a wire' };
  }

  return { ok: true };
}
