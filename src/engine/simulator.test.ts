import { describe, expect, it } from 'vitest';
import type { SimCircuit } from '@/engine/simTypes';
import {
  carryOverState,
  compileCircuit,
  createInitialState,
  getInputPinValue,
  getOutputPinValue,
  getWireValue,
  settle,
  tick,
} from '@/engine/simulator';
import { CircuitBuilder, settleCircuit } from '@/engine/testing/builder';

describe('simulator', () => {
  describe('compile issues', () => {
    it('handles unknown component type gracefully', () => {
      const circuit: SimCircuit = {
        components: [{ id: 'c1', type: 'quantumGate', params: {} }],
        wires: [],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.components).toHaveLength(0);
      expect(compiled.issues).toEqual([
        expect.objectContaining({
          kind: 'unknownComponentType',
          componentId: 'c1',
        }),
      ]);
    });

    it('handles duplicate component id by keeping the first', () => {
      const circuit: SimCircuit = {
        components: [
          { id: 'c1', type: 'and', params: {} },
          { id: 'c1', type: 'or', params: {} },
        ],
        wires: [],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.components).toHaveLength(1);
      expect(compiled.components[0]?.type).toBe('and');
      expect(compiled.issues).toEqual([
        expect.objectContaining({
          kind: 'duplicateComponentId',
          componentId: 'c1',
        }),
      ]);
    });

    it('rejects wire to non-existent component', () => {
      const circuit: SimCircuit = {
        components: [{ id: 'c1', type: 'and', params: {} }],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'c1', pinId: 'out' },
            to: { componentId: 'missing', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'missing', pinId: 'out' },
            to: { componentId: 'c1', pinId: 'in0' },
          },
        ],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.wires).toHaveLength(0);
      expect(compiled.issues).toHaveLength(2);
      expect(compiled.issues[0]?.kind).toBe('invalidWire');
      expect(compiled.issues[1]?.kind).toBe('invalidWire');
    });

    it('rejects wire to non-existent pin', () => {
      const circuit: SimCircuit = {
        components: [
          { id: 'c1', type: 'and', params: {} },
          { id: 'c2', type: 'and', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'c1', pinId: 'nonExistent' },
            to: { componentId: 'c2', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'c1', pinId: 'out' },
            to: { componentId: 'c2', pinId: 'nonExistent' },
          },
        ],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.wires).toHaveLength(0);
      expect(compiled.issues).toHaveLength(2);
      expect(compiled.issues[0]?.kind).toBe('invalidWire');
      expect(compiled.issues[1]?.kind).toBe('invalidWire');
    });

    it('rejects wire in the wrong direction (input to output)', () => {
      const circuit: SimCircuit = {
        components: [
          { id: 'c1', type: 'and', params: {} },
          { id: 'c2', type: 'and', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'c1', pinId: 'in0' },
            to: { componentId: 'c2', pinId: 'out' },
          },
        ],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.wires).toHaveLength(0);
      expect(compiled.issues).toEqual([
        expect.objectContaining({
          kind: 'invalidWire',
          wireId: 'w1',
        }),
      ]);
    });

    it('handles multiple drivers for the same input pin by letting first win', () => {
      const circuit: SimCircuit = {
        components: [
          { id: 's1', type: 'inputSwitch', params: {} },
          { id: 's2', type: 'inputSwitch', params: {} },
          { id: 'led', type: 'outputLed', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 's1', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
          {
            id: 'w2',
            from: { componentId: 's2', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
        ],
      };
      const compiled = compileCircuit(circuit);
      expect(compiled.wires).toHaveLength(1);
      expect(compiled.wires[0]?.id).toBe('w1');
      expect(compiled.driverOfInput.get('led:in')).toBe('s1:out');
      expect(compiled.issues).toEqual([
        expect.objectContaining({
          kind: 'multipleDrivers',
          wireId: 'w2',
          componentId: 'led',
        }),
      ]);
    });
  });

  describe('initial state', () => {
    it('sets all output pins to 0 and tick to 0', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('gate', 'and')
        .connect('sw.out', 'gate.in0')
        .build();
      const compiled = compileCircuit(circuit);
      const state = createInitialState(compiled);

      expect(state.tick).toBe(0);
      expect(getOutputPinValue(state, 'sw', 'out')).toBe(0);
      expect(getOutputPinValue(state, 'gate', 'out')).toBe(0);
    });
  });

  describe('unit delay behavior', () => {
    it('simulates switch(true) -> NOT -> LED over sequential ticks', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('inv', 'not')
        .add('led', 'outputLed')
        .connect('sw.out', 'inv.in0')
        .connect('inv.out', 'led.in')
        .build();

      const compiled = compileCircuit(circuit);
      const s0 = createInitialState(compiled);
      expect(getOutputPinValue(s0, 'sw', 'out')).toBe(0);
      expect(getOutputPinValue(s0, 'inv', 'out')).toBe(0);

      // Tick 1: sw evaluates value=true => out: 1; inv sees sw.out=0 => out: 1
      const s1 = tick(compiled, s0);
      expect(s1.tick).toBe(1);
      expect(getOutputPinValue(s1, 'sw', 'out')).toBe(1);
      expect(getOutputPinValue(s1, 'inv', 'out')).toBe(1);

      // Tick 2: sw outputs 1; inv sees sw.out=1 => out: 0
      const s2 = tick(compiled, s1);
      expect(s2.tick).toBe(2);
      expect(getOutputPinValue(s2, 'sw', 'out')).toBe(1);
      expect(getOutputPinValue(s2, 'inv', 'out')).toBe(0);

      // Settle from s0 gives stable at tick 2, with LED input 0
      const settled = settle(compiled, s0);
      expect(settled.status).toBe('stable');
      expect(settled.ticks).toBe(2);
      expect(getInputPinValue(compiled, settled.state, 'led', 'in')).toBe(0);
      expect(getWireValue(settled.state, compiled.wires[1]!)).toBe(0);
    });
  });

  describe('switch -> LED', () => {
    it('settles to 1 when switch value is true', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('led', 'outputLed')
        .connect('sw.out', 'led.in')
        .build();

      const { compiled, result } = settleCircuit(circuit);
      expect(result.status).toBe('stable');
      expect(getInputPinValue(compiled, result.state, 'led', 'in')).toBe(1);
    });

    it('settles to 0 when switch value is false', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: false })
        .add('led', 'outputLed')
        .connect('sw.out', 'led.in')
        .build();

      const { compiled, result } = settleCircuit(circuit);
      expect(result.status).toBe('stable');
      expect(getInputPinValue(compiled, result.state, 'led', 'in')).toBe(0);
    });
  });

  describe('fan-out', () => {
    it('drives multiple LEDs from one switch', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('led1', 'outputLed')
        .add('led2', 'outputLed')
        .connect('sw.out', 'led1.in')
        .connect('sw.out', 'led2.in')
        .build();

      const { compiled, result } = settleCircuit(circuit);
      expect(result.status).toBe('stable');
      expect(getInputPinValue(compiled, result.state, 'led1', 'in')).toBe(1);
      expect(getInputPinValue(compiled, result.state, 'led2', 'in')).toBe(1);
    });
  });

  describe('immutability', () => {
    it('does not mutate state during tick', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('inv', 'not')
        .connect('sw.out', 'inv.in0')
        .build();

      const compiled = compileCircuit(circuit);
      const state = createInitialState(compiled);
      const snapshot = JSON.parse(JSON.stringify(state));

      tick(compiled, state);
      expect(state).toEqual(snapshot);
    });
  });

  describe('maxTicks limit', () => {
    it('returns limit status when maxTicks is exceeded before settling', () => {
      const circuit = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('inv', 'not')
        .connect('sw.out', 'inv.in0')
        .build();

      // Needs 2 ticks to settle, maxTicks 1 stops early
      const { result } = settleCircuit(circuit, { maxTicks: 1 });
      expect(result.status).toBe('limit');
      expect(result.ticks).toBe(1);
    });
  });

  describe('carryOverState', () => {
    it('preserves surviving components and drops removed ones', () => {
      const c1 = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: true })
        .add('inv', 'not')
        .connect('sw.out', 'inv.in0')
        .build();
      const comp1 = compileCircuit(c1);
      const s1 = tick(comp1, createInitialState(comp1));
      expect(getOutputPinValue(s1, 'sw', 'out')).toBe(1);
      expect(getOutputPinValue(s1, 'inv', 'out')).toBe(1);

      const c2 = new CircuitBuilder()
        .add('sw', 'inputSwitch', { value: false }) // same id & type
        .add('led', 'outputLed') // new component
        // inv removed
        .connect('sw.out', 'led.in')
        .build();
      const comp2 = compileCircuit(c2);
      const carried = carryOverState(comp1, s1, comp2);

      expect(carried.tick).toBe(s1.tick);
      expect(getOutputPinValue(carried, 'sw', 'out')).toBe(1);
      expect(carried.componentStates['sw']).toBeNull();
      expect(getOutputPinValue(carried, 'led', 'in')).toBe(0);
      expect(carried.pinValues['inv:out']).toBeUndefined();
    });
  });
});
