import { describe, expect, it } from 'vitest';
import type { Circuit } from './types';
import { setComponentLabel, setComponentParam } from './edit';

describe('model/edit', () => {
  const createBaseCircuit = (): Circuit => ({
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
        id: 'g1',
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
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'sw1', pinId: 'out' },
        to: { componentId: 'g1', pinId: 'in0' },
      },
      {
        id: 'w2',
        from: { componentId: 'g1', pinId: 'out' },
        to: { componentId: 'led1', pinId: 'in' },
      },
    ],
  });

  describe('setComponentParam', () => {
    it('increases gate inputs and preserves existing wires', () => {
      const circuit = createBaseCircuit();
      const next = setComponentParam(circuit, 'g1', 'inputs', 4);

      expect(next).not.toBe(circuit);
      const gate = next.components.find((c) => c.id === 'g1')!;
      expect(gate.params['inputs']).toBe(4);
      expect(next.wires).toHaveLength(2);
      expect(next.wires).toEqual(circuit.wires);
    });

    it('decreases gate inputs and removes wires attached to removed pins', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Test',
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          {
            id: 'sw2',
            type: 'inputSwitch',
            position: { x: 0, y: 50 },
            params: { value: false },
          },
          {
            id: 'sw3',
            type: 'inputSwitch',
            position: { x: 0, y: 100 },
            params: { value: false },
          },
          {
            id: 'g1',
            type: 'and',
            position: { x: 100, y: 0 },
            params: { inputs: 3 },
          },
          {
            id: 'led1',
            type: 'outputLed',
            position: { x: 200, y: 0 },
            params: {},
          },
        ],
        wires: [
          {
            id: 'w0',
            from: { componentId: 'sw1', pinId: 'out' },
            to: { componentId: 'g1', pinId: 'in0' },
          },
          {
            id: 'w1',
            from: { componentId: 'sw2', pinId: 'out' },
            to: { componentId: 'g1', pinId: 'in1' },
          },
          {
            id: 'w2',
            from: { componentId: 'sw3', pinId: 'out' },
            to: { componentId: 'g1', pinId: 'in2' },
          },
          {
            id: 'w_out',
            from: { componentId: 'g1', pinId: 'out' },
            to: { componentId: 'led1', pinId: 'in' },
          },
        ],
      };

      // Reduce inputs from 3 to 2; pin 'in2' is removed so 'w2' must be removed
      const next = setComponentParam(circuit, 'g1', 'inputs', 2);
      expect(next.wires).toHaveLength(3);
      expect(next.wires.map((w) => w.id)).toEqual(['w0', 'w1', 'w_out']);
    });

    it('clamps number parameters to definition min and max', () => {
      const circuit = createBaseCircuit();

      // andGate inputs min=2, max=8
      const clampedLow = setComponentParam(circuit, 'g1', 'inputs', 1);
      expect(clampedLow.components.find((c) => c.id === 'g1')?.params['inputs']).toBe(2);

      const clampedHigh = setComponentParam(circuit, 'g1', 'inputs', 99);
      expect(clampedHigh.components.find((c) => c.id === 'g1')?.params['inputs']).toBe(8);
    });

    it('rounds non-integer numbers', () => {
      const circuit = createBaseCircuit();
      const rounded = setComponentParam(circuit, 'g1', 'inputs', 3.7);
      expect(rounded.components.find((c) => c.id === 'g1')?.params['inputs']).toBe(4);
    });

    it('ignores invalid number values (NaN, Infinity, wrong type)', () => {
      const circuit = createBaseCircuit();
      expect(setComponentParam(circuit, 'g1', 'inputs', NaN)).toBe(circuit);
      expect(setComponentParam(circuit, 'g1', 'inputs', Infinity)).toBe(circuit);
      expect(setComponentParam(circuit, 'g1', 'inputs', '4' as unknown as number)).toBe(circuit);
    });

    it('updates boolean parameter on inputSwitch', () => {
      const circuit = createBaseCircuit();
      const next = setComponentParam(circuit, 'sw1', 'value', true);
      expect(next.components.find((c) => c.id === 'sw1')?.params['value']).toBe(true);
    });

    it('ignores non-boolean values for boolean parameter', () => {
      const circuit = createBaseCircuit();
      expect(setComponentParam(circuit, 'sw1', 'value', 1 as unknown as boolean)).toBe(circuit);
      expect(setComponentParam(circuit, 'sw1', 'value', 'true' as unknown as boolean)).toBe(
        circuit,
      );
    });

    it('returns original circuit reference if param value is identical', () => {
      const circuit = createBaseCircuit();
      expect(setComponentParam(circuit, 'g1', 'inputs', 2)).toBe(circuit);
      expect(setComponentParam(circuit, 'sw1', 'value', false)).toBe(circuit);
    });

    it('returns original circuit reference if componentId or paramId is unknown', () => {
      const circuit = createBaseCircuit();
      expect(setComponentParam(circuit, 'unknownId', 'inputs', 4)).toBe(circuit);
      expect(setComponentParam(circuit, 'g1', 'unknownParam', 4)).toBe(circuit);
    });

    it('does not mutate the original circuit object', () => {
      const circuit = createBaseCircuit();
      const circuitCopy = JSON.parse(JSON.stringify(circuit));
      setComponentParam(circuit, 'g1', 'inputs', 4);
      expect(circuit).toEqual(circuitCopy);
    });
  });

  describe('setComponentLabel', () => {
    it('sets a trimmed label on a component', () => {
      const circuit = createBaseCircuit();
      const next = setComponentLabel(circuit, 'sw1', '  Switch A  ');
      expect(next.components.find((c) => c.id === 'sw1')?.label).toBe('Switch A');
    });

    it('truncates labels longer than 16 characters', () => {
      const circuit = createBaseCircuit();
      const next = setComponentLabel(circuit, 'sw1', 'ThisLabelIsWayTooLongForAComponent');
      expect(next.components.find((c) => c.id === 'sw1')?.label).toBe('ThisLabelIsWayTo');
      expect(next.components.find((c) => c.id === 'sw1')?.label?.length).toBe(16);
    });

    it('removes the label property when given an empty or whitespace string', () => {
      const circuit: Circuit = {
        ...createBaseCircuit(),
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            label: 'Existing',
            params: { value: false },
          },
        ],
      };

      const next = setComponentLabel(circuit, 'sw1', '   ');
      const comp = next.components.find((c) => c.id === 'sw1')!;
      expect('label' in comp).toBe(false);
      expect(comp.label).toBeUndefined();
    });

    it('returns original circuit reference if label is unchanged', () => {
      const circuit = createBaseCircuit();
      // Already has no label, setting empty string returns same circuit
      expect(setComponentLabel(circuit, 'sw1', '')).toBe(circuit);

      const withLabel: Circuit = {
        ...circuit,
        components: [{ ...circuit.components[0]!, label: 'Alpha' }],
      };
      expect(setComponentLabel(withLabel, 'sw1', 'Alpha')).toBe(withLabel);
      expect(setComponentLabel(withLabel, 'sw1', '  Alpha  ')).toBe(withLabel);
    });

    it('returns original circuit reference if componentId does not exist', () => {
      const circuit = createBaseCircuit();
      expect(setComponentLabel(circuit, 'unknownId', 'Label')).toBe(circuit);
    });

    it('does not mutate the original circuit object', () => {
      const circuit = createBaseCircuit();
      const circuitCopy = JSON.parse(JSON.stringify(circuit));
      setComponentLabel(circuit, 'sw1', 'My Switch');
      expect(circuit).toEqual(circuitCopy);
    });
  });
});
