import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import { CURRENT_SCHEMA_VERSION } from '@/model';
import { currentRowIndex, rowToSwitchValues } from './currentRow';

function makeTestCircuit(values: boolean[]): Circuit {
  return {
    version: CURRENT_SCHEMA_VERSION,
    name: 'Current Row Test',
    components: values.map((val, idx) => ({
      id: `sw${idx + 1}`,
      type: 'inputSwitch',
      position: { x: idx * 50, y: 0 },
      params: { value: val },
      label: `S${idx + 1}`,
    })),
    wires: [],
  };
}

describe('currentRow', () => {
  it('3 switches with values (1,0,1) -> index 5', () => {
    const circuit = makeTestCircuit([true, false, true]);
    const inputs = [{ componentId: 'sw1' }, { componentId: 'sw2' }, { componentId: 'sw3' }];

    expect(currentRowIndex(inputs, circuit)).toBe(5);
  });

  it('all false -> 0', () => {
    const circuit = makeTestCircuit([false, false, false]);
    const inputs = [{ componentId: 'sw1' }, { componentId: 'sw2' }, { componentId: 'sw3' }];

    expect(currentRowIndex(inputs, circuit)).toBe(0);
  });

  it('all true -> 7 for 3 switches', () => {
    const circuit = makeTestCircuit([true, true, true]);
    const inputs = [{ componentId: 'sw1' }, { componentId: 'sw2' }, { componentId: 'sw3' }];

    expect(currentRowIndex(inputs, circuit)).toBe(7);
  });

  it('returns null if any component is missing or not an inputSwitch', () => {
    const circuit = makeTestCircuit([true, true]);
    // Missing component id
    expect(
      currentRowIndex([{ componentId: 'sw1' }, { componentId: 'missing' }], circuit),
    ).toBeNull();

    // Non-switch component
    const circuitWithGate: Circuit = {
      ...circuit,
      components: [
        circuit.components[0]!,
        { id: 'gate1', type: 'and', position: { x: 0, y: 0 }, params: {} },
      ],
    };
    expect(
      currentRowIndex([{ componentId: 'sw1' }, { componentId: 'gate1' }], circuitWithGate),
    ).toBeNull();

    // Empty inputs
    expect(currentRowIndex([], circuit)).toBeNull();
  });

  it('rowToSwitchValues for index 5 with 3 inputs gives [true, false, true]', () => {
    const inputs = [{ componentId: 'sw1' }, { componentId: 'sw2' }, { componentId: 'sw3' }];

    const switchVals = rowToSwitchValues(inputs, 5);
    expect(switchVals).toEqual([
      { componentId: 'sw1', value: true },
      { componentId: 'sw2', value: false },
      { componentId: 'sw3', value: true },
    ]);
  });

  it('round trip: currentRowIndex after applying rowToSwitchValues returns the same index for every row of a 4-input table', () => {
    const inputs = [
      { componentId: 'sw1' },
      { componentId: 'sw2' },
      { componentId: 'sw3' },
      { componentId: 'sw4' },
    ];

    for (let r = 0; r < 16; r++) {
      const switchVals = rowToSwitchValues(inputs, r);
      const circuit: Circuit = {
        version: CURRENT_SCHEMA_VERSION,
        name: 'Roundtrip Test',
        components: switchVals.map((item) => ({
          id: item.componentId,
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: item.value },
        })),
        wires: [],
      };

      const computedIndex = currentRowIndex(inputs, circuit);
      expect(computedIndex).toBe(r);
    }
  });
});
