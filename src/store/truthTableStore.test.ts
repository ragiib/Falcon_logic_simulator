import { beforeEach, describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import { CURRENT_SCHEMA_VERSION } from '@/model';
import { useCircuitStore, useTruthTableStore } from '@/store';

function makeSimpleAndCircuit(): Circuit {
  return {
    version: CURRENT_SCHEMA_VERSION,
    name: 'AND Circuit',
    components: [
      {
        id: 'sw1',
        type: 'inputSwitch',
        position: { x: 0, y: 0 },
        params: { value: false },
        label: 'A',
      },
      {
        id: 'sw2',
        type: 'inputSwitch',
        position: { x: 0, y: 50 },
        params: { value: false },
        label: 'B',
      },
      {
        id: 'and1',
        type: 'and',
        position: { x: 100, y: 25 },
        params: { inputs: 2 },
      },
      {
        id: 'led1',
        type: 'outputLed',
        position: { x: 200, y: 25 },
        params: {},
        label: 'Y',
      },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'sw1', pinId: 'out' },
        to: { componentId: 'and1', pinId: 'in0' },
      },
      {
        id: 'w2',
        from: { componentId: 'sw2', pinId: 'out' },
        to: { componentId: 'and1', pinId: 'in1' },
      },
      {
        id: 'w3',
        from: { componentId: 'and1', pinId: 'out' },
        to: { componentId: 'led1', pinId: 'in' },
      },
    ],
  };
}

describe('truthTableStore', () => {
  beforeEach(() => {
    useTruthTableStore.getState().clear();
    useCircuitStore.getState().resetCircuit();
  });

  it('generate on a switch->AND circuit stores an ok result, a key, and a timestamp', () => {
    const circuit = makeSimpleAndCircuit();
    const beforeTime = Date.now();

    useTruthTableStore.getState().generate(circuit);

    const state = useTruthTableStore.getState();
    expect(state.result).not.toBeNull();
    expect(state.result?.ok).toBe(true);
    expect(state.generatedKey).toBeTruthy();
    expect(typeof state.generatedAt).toBe('number');
    expect(state.generatedAt).toBeGreaterThanOrEqual(beforeTime);

    if (state.result && state.result.ok) {
      expect(state.result.rows).toHaveLength(4);
    }
  });

  it('generate on a circuit with no switches stores ok: false with reason noInputs', () => {
    const circuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'No Switch Circuit',
      components: [
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 100, y: 0 },
          params: {},
        },
      ],
      wires: [],
    };

    useTruthTableStore.getState().generate(circuit);

    const state = useTruthTableStore.getState();
    expect(state.result).not.toBeNull();
    expect(state.result?.ok).toBe(false);
    if (state.result && !state.result.ok) {
      expect(state.result.reason).toBe('noInputs');
    }
  });

  it('clear resets result, generatedKey, and generatedAt to null', () => {
    const circuit = makeSimpleAndCircuit();
    useTruthTableStore.getState().generate(circuit);

    expect(useTruthTableStore.getState().result).not.toBeNull();

    useTruthTableStore.getState().clear();

    const state = useTruthTableStore.getState();
    expect(state.result).toBeNull();
    expect(state.generatedKey).toBeNull();
    expect(state.generatedAt).toBeNull();
  });

  it('replaceCircuit clears a stored truth table result', () => {
    const circuit = makeSimpleAndCircuit();
    useTruthTableStore.getState().generate(circuit);

    expect(useTruthTableStore.getState().result).not.toBeNull();

    const newCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'New Circuit',
      components: [],
      wires: [],
    };

    useCircuitStore.getState().replaceCircuit(newCircuit);

    const state = useTruthTableStore.getState();
    expect(state.result).toBeNull();
    expect(state.generatedKey).toBeNull();
    expect(state.generatedAt).toBeNull();
  });
});
