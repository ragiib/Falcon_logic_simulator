import type { Circuit } from './types';
import type { ParamValue } from '@/engine';
import { getComponentDefinition } from '@/engine';

/**
 * Sets a parameter on a component in the circuit, returning a new Circuit.
 * Coerces/validates parameter values against definition constraints.
 * Removes wires referencing pins that no longer exist after parameter changes.
 */
export function setComponentParam(
  circuit: Circuit,
  componentId: string,
  paramId: string,
  value: ParamValue,
): Circuit {
  const compIndex = circuit.components.findIndex((c) => c.id === componentId);
  if (compIndex === -1) {
    return circuit;
  }
  const comp = circuit.components[compIndex]!;
  const def = getComponentDefinition(comp.type);
  if (!def) {
    return circuit;
  }

  const paramDef = def.params.find((p) => p.id === paramId);
  if (!paramDef) {
    return circuit;
  }

  let validatedValue: ParamValue;
  if (paramDef.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return circuit;
    }
    let num = Math.round(value);
    if (paramDef.min !== undefined && num < paramDef.min) {
      num = paramDef.min;
    }
    if (paramDef.max !== undefined && num > paramDef.max) {
      num = paramDef.max;
    }
    validatedValue = num;
  } else if (paramDef.type === 'boolean') {
    if (typeof value !== 'boolean') {
      return circuit;
    }
    validatedValue = value;
  } else if (paramDef.type === 'string') {
    if (typeof value !== 'string') {
      return circuit;
    }
    validatedValue = value;
  } else {
    return circuit;
  }

  if (comp.params[paramId] === validatedValue) {
    return circuit;
  }

  const newParams = {
    ...comp.params,
    [paramId]: validatedValue,
  };

  const newPins = def.getPins(newParams);
  const validOutputPins = new Set(newPins.filter((p) => p.direction === 'output').map((p) => p.id));
  const validInputPins = new Set(newPins.filter((p) => p.direction === 'input').map((p) => p.id));

  const newWires = circuit.wires.filter((w) => {
    if (w.from.componentId === componentId && !validOutputPins.has(w.from.pinId)) {
      return false;
    }
    if (w.to.componentId === componentId && !validInputPins.has(w.to.pinId)) {
      return false;
    }
    return true;
  });

  const updatedComponents = [...circuit.components];
  updatedComponents[compIndex] = {
    ...comp,
    params: newParams,
  };

  return {
    ...circuit,
    components: updatedComponents,
    wires: newWires,
  };
}

/**
 * Sets or removes a component's user-visible label, returning a new Circuit.
 * Trims and truncates to 16 characters. Empty/whitespace removes the label field.
 */
export function setComponentLabel(circuit: Circuit, componentId: string, label: string): Circuit {
  const compIndex = circuit.components.findIndex((c) => c.id === componentId);
  if (compIndex === -1) {
    return circuit;
  }
  const comp = circuit.components[compIndex]!;
  const trimmed = label.trim().slice(0, 16);

  if (trimmed.length === 0) {
    if (comp.label === undefined) {
      return circuit;
    }
    const { label: _removed, ...rest } = comp;
    const updatedComponents = [...circuit.components];
    updatedComponents[compIndex] = rest;
    return {
      ...circuit,
      components: updatedComponents,
    };
  }

  if (comp.label === trimmed) {
    return circuit;
  }

  const updatedComponents = [...circuit.components];
  updatedComponents[compIndex] = {
    ...comp,
    label: trimmed,
  };

  return {
    ...circuit,
    components: updatedComponents,
  };
}

/**
 * Toggles the 'value' param of every clock component in the circuit.
 * If no clock components exist, returns the original circuit unmodified.
 */
export function toggleClocks(circuit: Circuit): Circuit {
  let hasClocks = false;
  for (const c of circuit.components) {
    if (c.type === 'clock') {
      hasClocks = true;
      break;
    }
  }
  if (!hasClocks) {
    return circuit;
  }

  const updatedComponents = circuit.components.map((c) => {
    if (c.type !== 'clock') {
      return c;
    }
    const currentVal = c.params['value'] === true;
    return {
      ...c,
      params: {
        ...c.params,
        value: !currentVal,
      },
    };
  });

  return {
    ...circuit,
    components: updatedComponents,
  };
}
