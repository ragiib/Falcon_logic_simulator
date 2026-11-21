import type { Circuit, CircuitComponent, Wire } from './types';

export interface CircuitFragment {
  components: CircuitComponent[];
  wires: Wire[];
}

/**
 * Deep-copies the selected components and ONLY the wires whose from AND to components
 * are both in the selection.
 */
export function extractFragment(circuit: Circuit, ids: readonly string[]): CircuitFragment {
  const selectedSet = new Set(ids);

  const components: CircuitComponent[] = circuit.components
    .filter((c) => selectedSet.has(c.id))
    .map((c) => ({
      id: c.id,
      type: c.type,
      position: { ...c.position },
      params: { ...c.params },
      ...(c.label !== undefined ? { label: c.label } : {}),
    }));

  const wires: Wire[] = circuit.wires
    .filter((w) => selectedSet.has(w.from.componentId) && selectedSet.has(w.to.componentId))
    .map((w) => ({
      id: w.id,
      from: { ...w.from },
      to: { ...w.to },
    }));

  return { components, wires };
}

/**
 * Returns a new fragment with fresh component ids and wire ids, wires remapped to the new ids,
 * positions shifted by offset, and params deep-copied. Does not mutate the input fragment.
 */
export function instantiateFragment(
  fragment: CircuitFragment,
  offset: { x: number; y: number },
  createId: (prefix: string) => string,
): CircuitFragment {
  const idMap = new Map<string, string>();

  const components: CircuitComponent[] = fragment.components.map((c) => {
    const newId = createId('c');
    idMap.set(c.id, newId);
    return {
      id: newId,
      type: c.type,
      position: {
        x: c.position.x + offset.x,
        y: c.position.y + offset.y,
      },
      params: { ...c.params },
      ...(c.label !== undefined ? { label: c.label } : {}),
    };
  });

  const wires: Wire[] = fragment.wires.map((w) => ({
    id: createId('w'),
    from: {
      componentId: idMap.get(w.from.componentId) ?? w.from.componentId,
      pinId: w.from.pinId,
    },
    to: {
      componentId: idMap.get(w.to.componentId) ?? w.to.componentId,
      pinId: w.to.pinId,
    },
  }));

  return { components, wires };
}
