import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model/types';
import { validateConnection } from '@/model/connections';

describe('validateConnection', () => {
  const baseCircuit: Circuit = {
    version: 1,
    name: 'Test Circuit',
    components: [
      {
        id: 'sw1',
        type: 'inputSwitch',
        position: { x: 0, y: 0 },
        params: { value: false },
      },
      {
        id: 'and1',
        type: 'and',
        position: { x: 100, y: 0 },
        params: { inputs: 2 },
      },
      {
        id: 'led1',
        type: 'outputLed',
        position: { x: 200, y: 0 },
        params: {},
      },
      {
        id: 'unknown1',
        type: 'nonExistentType',
        position: { x: 300, y: 0 },
        params: {},
      },
    ],
    wires: [],
  };

  it('accepts valid output to input connection', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(result.ok).toBe(true);
  });

  it('rejects connection if source component is missing', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'missingComp', pinId: 'out' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Source component "missingComp" does not exist');
    }
  });

  it('rejects connection if target component is missing', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'missingTarget', pinId: 'in0' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Target component "missingTarget" does not exist');
    }
  });

  it('rejects connection if component type is unknown', () => {
    const resultFrom = validateConnection(
      baseCircuit,
      { componentId: 'unknown1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(resultFrom.ok).toBe(false);
    if (!resultFrom.ok) {
      expect(resultFrom.reason).toContain('Unknown source component type');
    }

    const resultTo = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'unknown1', pinId: 'in0' },
    );
    expect(resultTo.ok).toBe(false);
    if (!resultTo.ok) {
      expect(resultTo.reason).toContain('Unknown target component type');
    }
  });

  it('rejects connection when from-pin is an input pin', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'and1', pinId: 'in0' },
      { componentId: 'led1', pinId: 'in' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('not a valid output pin');
    }
  });

  it('rejects connection when to-pin is an output pin', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'out' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('not a valid input pin');
    }
  });

  it('rejects connection when pin does not exist', () => {
    const resultFrom = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'invalidPin' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(resultFrom.ok).toBe(false);

    const resultTo = validateConnection(
      baseCircuit,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'invalidPin' },
    );
    expect(resultTo.ok).toBe(false);
  });

  it('rejects same-component self-connection', () => {
    const result = validateConnection(
      baseCircuit,
      { componentId: 'and1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('A component cannot connect to itself');
    }
  });

  it('rejects second wire into the same input pin while accepting different input on same component', () => {
    const circuitWithWire: Circuit = {
      ...baseCircuit,
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in0' },
        },
      ],
    };

    // Connecting to in0 again should fail
    const resultSameInput = validateConnection(
      circuitWithWire,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in0' },
    );
    expect(resultSameInput.ok).toBe(false);
    if (!resultSameInput.ok) {
      expect(resultSameInput.reason).toBe('This input already has a wire');
    }

    // Connecting to in1 on the same and1 component should succeed
    const resultOtherInput = validateConnection(
      circuitWithWire,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in1' },
    );
    expect(resultOtherInput.ok).toBe(true);
  });

  it('accepts one output fanning out to two different inputs', () => {
    const circuitWithWire: Circuit = {
      ...baseCircuit,
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in0' },
        },
      ],
    };

    const fanOutResult = validateConnection(
      circuitWithWire,
      { componentId: 'sw1', pinId: 'out' },
      { componentId: 'and1', pinId: 'in1' },
    );
    expect(fanOutResult.ok).toBe(true);
  });
});
