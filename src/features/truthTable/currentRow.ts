import type { Circuit } from '@/model';

/**
 * Computes the active row index in the truth table based on current input switch values.
 * Returns null if any input component is missing or not an inputSwitch.
 */
export function currentRowIndex(
  inputs: readonly { componentId: string }[],
  circuit: Circuit,
): number | null {
  const n = inputs.length;
  if (n === 0) return null;

  const compMap = new Map(circuit.components.map((c) => [c.id, c]));
  let rowIndex = 0;

  for (let i = 0; i < n; i++) {
    const col = inputs[i]!;
    const comp = compMap.get(col.componentId);
    if (!comp || comp.type !== 'inputSwitch') {
      return null;
    }
    const bit = comp.params['value'] === true ? 1 : 0;
    if (bit === 1) {
      rowIndex |= 1 << (n - 1 - i);
    }
  }

  return rowIndex;
}

/**
 * Returns the boolean switch value assignments for a given truth table row index.
 */
export function rowToSwitchValues(
  inputs: readonly { componentId: string }[],
  rowIndex: number,
): { componentId: string; value: boolean }[] {
  const n = inputs.length;
  const result: { componentId: string; value: boolean }[] = [];

  for (let i = 0; i < n; i++) {
    const col = inputs[i]!;
    const bit = (rowIndex >> (n - 1 - i)) & 1;
    result.push({
      componentId: col.componentId,
      value: bit === 1,
    });
  }

  return result;
}
