import { describe, expect, it } from 'vitest';
import type { Circuit } from './types';
import { setComponentLabel, setComponentParam, toggleClocks } from './edit';

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

    it('handles mux selectBits changes by pruning removed pins or clamping to max', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Mux Test',
        components: [
          {
            id: 'mux1',
            type: 'mux',
            position: { x: 100, y: 100 },
            params: { selectBits: 2 },
          },
          {
            id: 'sw_d0',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          {
            id: 'sw_d3',
            type: 'inputSwitch',
            position: { x: 0, y: 50 },
            params: { value: false },
          },
          {
            id: 'sw_s0',
            type: 'inputSwitch',
            position: { x: 0, y: 100 },
            params: { value: false },
          },
          {
            id: 'sw_s1',
            type: 'inputSwitch',
            position: { x: 0, y: 150 },
            params: { value: false },
          },
          {
            id: 'led_y',
            type: 'outputLed',
            position: { x: 200, y: 100 },
            params: {},
          },
        ],
        wires: [
          {
            id: 'w_d0',
            from: { componentId: 'sw_d0', pinId: 'out' },
            to: { componentId: 'mux1', pinId: 'd0' },
          },
          {
            id: 'w_d3',
            from: { componentId: 'sw_d3', pinId: 'out' },
            to: { componentId: 'mux1', pinId: 'd3' },
          },
          {
            id: 'w_s0',
            from: { componentId: 'sw_s0', pinId: 'out' },
            to: { componentId: 'mux1', pinId: 's0' },
          },
          {
            id: 'w_s1',
            from: { componentId: 'sw_s1', pinId: 'out' },
            to: { componentId: 'mux1', pinId: 's1' },
          },
          {
            id: 'w_y',
            from: { componentId: 'mux1', pinId: 'y' },
            to: { componentId: 'led_y', pinId: 'in' },
          },
        ],
      };

      // Setting selectBits to 1 removes d3 and s1, keeping d0, s0, y
      const reduced = setComponentParam(circuit, 'mux1', 'selectBits', 1);
      const reducedWireIds = reduced.wires.map((w) => w.id);
      expect(reducedWireIds).toEqual(['w_d0', 'w_s0', 'w_y']);

      // Setting to 99 clamps to 3 and keeps all wires
      const clamped = setComponentParam(circuit, 'mux1', 'selectBits', 99);
      expect(clamped.wires).toHaveLength(5);
      const muxComp = clamped.components.find((c) => c.id === 'mux1')!;
      expect(muxComp.params['selectBits']).toBe(3);
    });

    it('removes pre and clr wires when dff asyncControls is set to false', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'DFF Async Test',
        components: [
          {
            id: 'dff1',
            type: 'dff',
            position: { x: 100, y: 100 },
            params: { asyncControls: true },
          },
          { id: 'sw_d', type: 'inputSwitch', position: { x: 0, y: 0 }, params: {} },
          { id: 'sw_clk', type: 'inputSwitch', position: { x: 0, y: 50 }, params: {} },
          { id: 'sw_pre', type: 'inputSwitch', position: { x: 0, y: 100 }, params: {} },
          { id: 'sw_clr', type: 'inputSwitch', position: { x: 0, y: 150 }, params: {} },
          { id: 'led_q', type: 'outputLed', position: { x: 200, y: 100 }, params: {} },
        ],
        wires: [
          {
            id: 'w_d',
            from: { componentId: 'sw_d', pinId: 'out' },
            to: { componentId: 'dff1', pinId: 'd' },
          },
          {
            id: 'w_clk',
            from: { componentId: 'sw_clk', pinId: 'out' },
            to: { componentId: 'dff1', pinId: 'clk' },
          },
          {
            id: 'w_pre',
            from: { componentId: 'sw_pre', pinId: 'out' },
            to: { componentId: 'dff1', pinId: 'pre' },
          },
          {
            id: 'w_clr',
            from: { componentId: 'sw_clr', pinId: 'out' },
            to: { componentId: 'dff1', pinId: 'clr' },
          },
          {
            id: 'w_q',
            from: { componentId: 'dff1', pinId: 'q' },
            to: { componentId: 'led_q', pinId: 'in' },
          },
        ],
      };

      const updated = setComponentParam(circuit, 'dff1', 'asyncControls', false);
      const remainingWireIds = updated.wires.map((w) => w.id);
      expect(remainingWireIds).toEqual(['w_d', 'w_clk', 'w_q']);
    });

    it('prunes wires on removed pins when register bits are reduced', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Register Wire Prune Test',
        components: [
          { id: 'reg1', type: 'register', position: { x: 100, y: 100 }, params: { bits: 4 } },
          { id: 'sw_d0', type: 'inputSwitch', position: { x: 0, y: 0 }, params: {} },
          { id: 'sw_d3', type: 'inputSwitch', position: { x: 0, y: 60 }, params: {} },
          { id: 'led_q3', type: 'outputLed', position: { x: 200, y: 60 }, params: {} },
        ],
        wires: [
          {
            id: 'w_d0',
            from: { componentId: 'sw_d0', pinId: 'out' },
            to: { componentId: 'reg1', pinId: 'd0' },
          },
          {
            id: 'w_d3',
            from: { componentId: 'sw_d3', pinId: 'out' },
            to: { componentId: 'reg1', pinId: 'd3' },
          },
          {
            id: 'w_q3',
            from: { componentId: 'reg1', pinId: 'q3' },
            to: { componentId: 'led_q3', pinId: 'in' },
          },
        ],
      };

      const updated = setComponentParam(circuit, 'reg1', 'bits', 2);
      const remainingWireIds = updated.wires.map((w) => w.id);
      expect(remainingWireIds).toEqual(['w_d0']);
    });

    it('prunes wire on load pin when register loadEnable is turned off', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Register Load Enable Wire Prune Test',
        components: [
          {
            id: 'reg1',
            type: 'register',
            position: { x: 100, y: 100 },
            params: { bits: 4, loadEnable: true },
          },
          { id: 'sw_load', type: 'inputSwitch', position: { x: 0, y: 0 }, params: {} },
          { id: 'sw_d0', type: 'inputSwitch', position: { x: 0, y: 50 }, params: {} },
        ],
        wires: [
          {
            id: 'w_load',
            from: { componentId: 'sw_load', pinId: 'out' },
            to: { componentId: 'reg1', pinId: 'load' },
          },
          {
            id: 'w_d0',
            from: { componentId: 'sw_d0', pinId: 'out' },
            to: { componentId: 'reg1', pinId: 'd0' },
          },
        ],
      };

      const updated = setComponentParam(circuit, 'reg1', 'loadEnable', false);
      const remainingWireIds = updated.wires.map((w) => w.id);
      expect(remainingWireIds).toEqual(['w_d0']);
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

  describe('toggleClocks', () => {
    it('flips every clock component and leaves other components untouched', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Clocks',
        components: [
          {
            id: 'clk1',
            type: 'clock',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          {
            id: 'clk2',
            type: 'clock',
            position: { x: 0, y: 50 },
            params: { value: true },
          },
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 100 },
            params: { value: false },
          },
        ],
        wires: [],
      };

      const flipped = toggleClocks(circuit);
      expect(flipped).not.toBe(circuit);

      const clk1 = flipped.components.find((c) => c.id === 'clk1')!;
      const clk2 = flipped.components.find((c) => c.id === 'clk2')!;
      const sw1 = flipped.components.find((c) => c.id === 'sw1')!;

      expect(clk1.params['value']).toBe(true);
      expect(clk2.params['value']).toBe(false);
      expect(sw1.params['value']).toBe(false);
    });

    it('returns the same object when there are no clocks in the circuit', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'No Clocks',
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
        ],
        wires: [],
      };

      const result = toggleClocks(circuit);
      expect(result).toBe(circuit);
    });

    it('does not mutate its input circuit', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Immutable Clock',
        components: [
          {
            id: 'clk1',
            type: 'clock',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
        ],
        wires: [],
      };
      const copy = JSON.parse(JSON.stringify(circuit));
      toggleClocks(circuit);
      expect(circuit).toEqual(copy);
    });
  });
});
