import { beforeEach, describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import {
  selectInputValue,
  selectPinValue,
  selectWireValue,
  useCircuitStore,
  useSimStore,
} from '@/store';
import { circuitSimKey, syncIfNeeded } from '@/features/canvas/useSimulationSync';

describe('simStore', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
    useSimStore.setState({
      compiled: null,
      simState: null,
      mode: 'instant',
      running: false,
      speedMs: 500,
      status: 'idle',
      settleTicks: 0,
      period: null,
    });
  });

  describe('instant mode', () => {
    it('evaluates switch(true) -> LED circuit to 1 and stable; switch(false) to 0', () => {
      const circuitOn: Circuit = {
        version: 1,
        name: 'Switch LED',
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            params: { value: true },
          },
          {
            id: 'led1',
            type: 'outputLed',
            position: { x: 100, y: 0 },
            params: {},
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

      useSimStore.getState().syncWithCircuit(circuitOn);
      const stateOn = useSimStore.getState();
      expect(stateOn.status).toBe('stable');
      expect(selectInputValue('led1', 'in')(stateOn)).toBe(1);
      expect(selectPinValue('sw1', 'out')(stateOn)).toBe(1);

      const circuitOff: Circuit = {
        ...circuitOn,
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          circuitOn.components[1]!,
        ],
      };

      useSimStore.getState().syncWithCircuit(circuitOff);
      const stateOff = useSimStore.getState();
      expect(stateOff.status).toBe('stable');
      expect(selectInputValue('led1', 'in')(stateOff)).toBe(0);
      expect(selectPinValue('sw1', 'out')(stateOff)).toBe(0);
    });

    it('toggles switch param and updates state without clearing SR latch memory (carryOverState)', () => {
      // SR NOR latch:
      // NOR_Q produces Q; inputs: R, Qbar
      // NOR_Qbar produces Qbar; inputs: S, Q
      const makeLatchCircuit = (sValue: boolean, rValue: boolean): Circuit => ({
        version: 1,
        name: 'SR Latch',
        components: [
          { id: 'swS', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: sValue } },
          { id: 'swR', type: 'inputSwitch', position: { x: 0, y: 80 }, params: { value: rValue } },
          { id: 'norQ', type: 'nor', position: { x: 120, y: 0 }, params: { inputs: 2 } },
          { id: 'norQbar', type: 'nor', position: { x: 120, y: 80 }, params: { inputs: 2 } },
          { id: 'ledQ', type: 'outputLed', position: { x: 240, y: 0 }, params: {} },
          { id: 'ledQbar', type: 'outputLed', position: { x: 240, y: 80 }, params: {} },
        ],
        wires: [
          // Inputs to NOR_Q: in0 from swR, in1 from norQbar
          {
            id: 'w_r',
            from: { componentId: 'swR', pinId: 'out' },
            to: { componentId: 'norQ', pinId: 'in0' },
          },
          {
            id: 'w_fb_qbar',
            from: { componentId: 'norQbar', pinId: 'out' },
            to: { componentId: 'norQ', pinId: 'in1' },
          },
          // Inputs to NOR_Qbar: in0 from swS, in1 from norQ
          {
            id: 'w_s',
            from: { componentId: 'swS', pinId: 'out' },
            to: { componentId: 'norQbar', pinId: 'in0' },
          },
          {
            id: 'w_fb_q',
            from: { componentId: 'norQ', pinId: 'out' },
            to: { componentId: 'norQbar', pinId: 'in1' },
          },
          // Outputs to LEDs
          {
            id: 'w_led_q',
            from: { componentId: 'norQ', pinId: 'out' },
            to: { componentId: 'ledQ', pinId: 'in' },
          },
          {
            id: 'w_led_qbar',
            from: { componentId: 'norQbar', pinId: 'out' },
            to: { componentId: 'ledQbar', pinId: 'in' },
          },
        ],
      });

      // 1. SET: S=1, R=0 -> Q=1, Qbar=0
      useSimStore.getState().syncWithCircuit(makeLatchCircuit(true, false));
      let state = useSimStore.getState();
      expect(state.status).toBe('stable');
      expect(selectInputValue('ledQ', 'in')(state)).toBe(1);
      expect(selectInputValue('ledQbar', 'in')(state)).toBe(0);

      // 2. HOLD: S=0, R=0 -> Q remains 1, Qbar remains 0 (memory preserved via carry-over!)
      useSimStore.getState().syncWithCircuit(makeLatchCircuit(false, false));
      state = useSimStore.getState();
      expect(state.status).toBe('stable');
      expect(selectInputValue('ledQ', 'in')(state)).toBe(1);
      expect(selectInputValue('ledQbar', 'in')(state)).toBe(0);

      // 3. RESET: S=0, R=1 -> Q becomes 0, Qbar becomes 1
      useSimStore.getState().syncWithCircuit(makeLatchCircuit(false, true));
      state = useSimStore.getState();
      expect(state.status).toBe('stable');
      expect(selectInputValue('ledQ', 'in')(state)).toBe(0);
      expect(selectInputValue('ledQbar', 'in')(state)).toBe(1);
    });
  });

  describe('step mode', () => {
    it('advances simulation one tick at a time matching synchronous unit-delay model', () => {
      // Circuit: switch(true) -> not -> led
      const circuit: Circuit = {
        version: 1,
        name: 'Step Test',
        components: [
          { id: 'sw', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: true } },
          { id: 'not1', type: 'not', position: { x: 100, y: 0 }, params: {} },
          { id: 'led', type: 'outputLed', position: { x: 200, y: 0 }, params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'not1', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'not1', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
        ],
      };

      useSimStore.getState().setMode('step', circuit);
      useSimStore.getState().syncWithCircuit(circuit);

      // Tick 0 (Initial state):
      // All outputs are 0.
      let s = useSimStore.getState();
      expect(s.simState?.tick).toBe(0);
      expect(s.status).toBe('idle');
      expect(selectPinValue('sw', 'out')(s)).toBe(0);
      expect(selectPinValue('not1', 'out')(s)).toBe(0);
      expect(selectInputValue('led', 'in')(s)).toBe(0);

      // Tick 1 (Step 1):
      // switch evaluates value=true -> switch.out = 1
      // not1 evaluates input from tick 0 (sw.out = 0) -> not1.out = 1
      // led.in reads not1.out at tick 1 -> 1
      useSimStore.getState().stepOnce();
      s = useSimStore.getState();
      expect(s.simState?.tick).toBe(1);
      expect(selectPinValue('sw', 'out')(s)).toBe(1);
      expect(selectPinValue('not1', 'out')(s)).toBe(1);
      expect(selectInputValue('led', 'in')(s)).toBe(1);
      expect(s.status).toBe('idle');

      // Tick 2 (Step 2):
      // switch evaluates value=true -> switch.out = 1
      // not1 evaluates input from tick 1 (sw.out = 1) -> not1.out = 0
      // led.in reads not1.out at tick 2 -> 0
      useSimStore.getState().stepOnce();
      s = useSimStore.getState();
      expect(s.simState?.tick).toBe(2);
      expect(selectPinValue('sw', 'out')(s)).toBe(1);
      expect(selectPinValue('not1', 'out')(s)).toBe(0);
      expect(selectInputValue('led', 'in')(s)).toBe(0);
      expect(s.status).toBe('idle');

      // Tick 3 (Step 3):
      // switch.out = 1, not1.out = 0, led.in = 0.
      // Next state matches previous state -> settles to 'stable'!
      useSimStore.getState().stepOnce();
      s = useSimStore.getState();
      expect(s.simState?.tick).toBe(3);
      expect(selectPinValue('sw', 'out')(s)).toBe(1);
      expect(selectPinValue('not1', 'out')(s)).toBe(0);
      expect(selectInputValue('led', 'in')(s)).toBe(0);
      expect(s.status).toBe('stable');
    });
  });

  describe('setSpeedMs', () => {
    it('clamps below 100, above 2000, and rounds to integers', () => {
      useSimStore.getState().setSpeedMs(50);
      expect(useSimStore.getState().speedMs).toBe(100);

      useSimStore.getState().setSpeedMs(3000);
      expect(useSimStore.getState().speedMs).toBe(2000);

      useSimStore.getState().setSpeedMs(450.6);
      expect(useSimStore.getState().speedMs).toBe(451);
    });
  });

  describe('setClockHalfPeriodMs', () => {
    it('clamps below 100, above 2000, and rounds to integers', () => {
      useSimStore.getState().setClockHalfPeriodMs(50);
      expect(useSimStore.getState().clockHalfPeriodMs).toBe(100);

      useSimStore.getState().setClockHalfPeriodMs(3000);
      expect(useSimStore.getState().clockHalfPeriodMs).toBe(2000);

      useSimStore.getState().setClockHalfPeriodMs(450.6);
      expect(useSimStore.getState().clockHalfPeriodMs).toBe(451);
    });
  });

  describe('resetSimulation', () => {
    it('resets simulation state without carry-over and stops running', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Reset Test',
        components: [
          { id: 'sw', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: true } },
          { id: 'led', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
        ],
      };

      useSimStore.getState().setMode('step', circuit);
      useSimStore.getState().syncWithCircuit(circuit);
      useSimStore.getState().stepOnce();
      useSimStore.getState().setRunning(true);

      expect(useSimStore.getState().simState?.tick).toBe(1);
      expect(useSimStore.getState().running).toBe(true);

      useSimStore.getState().resetSimulation(circuit);
      const s = useSimStore.getState();
      expect(s.running).toBe(false);
      expect(s.simState?.tick).toBe(0);
      expect(selectPinValue('sw', 'out')(s)).toBe(0);
    });

    it('resets clockRunning to false', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Reset Clock Test',
        components: [
          { id: 'clk', type: 'clock', position: { x: 0, y: 0 }, params: { value: true } },
        ],
        wires: [],
      };

      useSimStore.getState().setClockRunning(true);
      expect(useSimStore.getState().clockRunning).toBe(true);

      useSimStore.getState().resetSimulation(circuit);
      expect(useSimStore.getState().clockRunning).toBe(false);
    });
  });

  describe('selectWireValue', () => {
    it('returns the driving pin value and 0 for unknown wire id', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Wire Test',
        components: [
          { id: 'sw', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: true } },
          { id: 'led', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
        ],
      };

      useSimStore.getState().syncWithCircuit(circuit);
      const s = useSimStore.getState();
      expect(selectWireValue('w1')(s)).toBe(1);
      expect(selectWireValue('unknown_wire')(s)).toBe(0);
    });
  });

  describe('circuitSimKey', () => {
    it('does not change key when component position changes', () => {
      const c1: Circuit = {
        version: 1,
        name: 'Test',
        components: [{ id: 'c1', type: 'and', position: { x: 0, y: 0 }, params: { inputs: 2 } }],
        wires: [],
      };

      const c2: Circuit = {
        ...c1,
        components: [
          { id: 'c1', type: 'and', position: { x: 150, y: 300 }, params: { inputs: 2 } },
        ],
      };

      expect(circuitSimKey(c1)).toBe(circuitSimKey(c2));
    });

    it('changes key when params change, wires change, or component type changes', () => {
      const base: Circuit = {
        version: 1,
        name: 'Test',
        components: [{ id: 'c1', type: 'and', position: { x: 0, y: 0 }, params: { inputs: 2 } }],
        wires: [],
      };

      const paramChanged: Circuit = {
        ...base,
        components: [{ id: 'c1', type: 'and', position: { x: 0, y: 0 }, params: { inputs: 3 } }],
      };
      expect(circuitSimKey(base)).not.toBe(circuitSimKey(paramChanged));

      const typeChanged: Circuit = {
        ...base,
        components: [{ id: 'c1', type: 'or', position: { x: 0, y: 0 }, params: { inputs: 2 } }],
      };
      expect(circuitSimKey(base)).not.toBe(circuitSimKey(typeChanged));

      const wireAdded: Circuit = {
        ...base,
        wires: [
          {
            id: 'w1',
            from: { componentId: 'c1', pinId: 'out' },
            to: { componentId: 'c2', pinId: 'in0' },
          },
        ],
      };
      expect(circuitSimKey(base)).not.toBe(circuitSimKey(wireAdded));
    });
  });

  describe('syncIfNeeded with sequential circuits', () => {
    it('updates flip-flop output when clock is toggled without manually calling setMode', () => {
      const dffCircuit: Circuit = {
        version: 1,
        name: 'DFF Test',
        components: [
          { id: 'clk', type: 'clock', position: { x: 0, y: 0 }, params: { value: false } },
          { id: 'd', type: 'inputSwitch', position: { x: 0, y: 50 }, params: { value: true } },
          { id: 'ff', type: 'dff', position: { x: 100, y: 0 }, params: { asyncControls: false } },
        ],
        wires: [
          {
            id: 'w_clk',
            from: { componentId: 'clk', pinId: 'out' },
            to: { componentId: 'ff', pinId: 'clk' },
          },
          {
            id: 'w_d',
            from: { componentId: 'd', pinId: 'out' },
            to: { componentId: 'ff', pinId: 'd' },
          },
        ],
      };

      // Initial sync (clk = 0, d = 1)
      expect(syncIfNeeded(dffCircuit)).toBe(true);
      let s = useSimStore.getState();
      expect(selectPinValue('ff', 'q')(s)).toBe(0);
      expect(selectPinValue('ff', 'qn')(s)).toBe(1);

      // Toggle clock from false to true (rising edge)
      const toggledCircuit: Circuit = {
        ...dffCircuit,
        components: [
          { id: 'clk', type: 'clock', position: { x: 0, y: 0 }, params: { value: true } },
          dffCircuit.components[1]!,
          dffCircuit.components[2]!,
        ],
      };

      // Calling syncIfNeeded (simulating circuitStore subscription)
      expect(syncIfNeeded(toggledCircuit)).toBe(true);
      s = useSimStore.getState();
      // On rising edge, DFF latches D (1) -> Q becomes 1, Qn becomes 0
      expect(selectPinValue('ff', 'q')(s)).toBe(1);
      expect(selectPinValue('ff', 'qn')(s)).toBe(0);

      // Calling syncIfNeeded again without circuit change should return false (no-op)
      expect(syncIfNeeded(toggledCircuit)).toBe(false);
    });
  });
});
