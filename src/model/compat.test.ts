import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import { CURRENT_SCHEMA_VERSION } from '@/model';
import { compileCircuit, createInitialState, getInputPinValue, settle } from '@/engine';

describe('model and engine structural compatibility', () => {
  it('allows model Circuit to be directly compiled and simulated by engine', () => {
    const circuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Test Compatibility Circuit',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 50, y: 100 },
          params: { value: true },
          label: 'Input A',
        },
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 250, y: 100 },
          params: {},
          label: 'Output Z',
        },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };

    const compiled = compileCircuit(circuit);
    expect(compiled.issues).toEqual([]);
    expect(compiled.components).toHaveLength(2);
    expect(compiled.wires).toHaveLength(1);

    const initialState = createInitialState(compiled);
    const result = settle(compiled, initialState);

    expect(result.status).toBe('stable');
    expect(getInputPinValue(compiled, result.state, 'led1', 'in')).toBe(1);
  });
});
