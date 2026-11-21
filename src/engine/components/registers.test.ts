import { describe, expect, it } from 'vitest';
import type { Signal } from '@/engine/types';
import { registerDefinition, shiftRegisterDefinition } from './registers';

describe('registers', () => {
  describe('register (parallel Register)', () => {
    it('loads d0..d3 into q0..q3 on rising edge', () => {
      // Load 0b1010: d3=1, d2=0, d1=1, d0=0 -> q0=0, q1=1, q2=0, q3=1
      const res1 = registerDefinition.evaluate({
        inputs: { d0: 0, d1: 1, d2: 0, d3: 1, clk: 1 },
        state: { bits: [0, 0, 0, 0], prevClk: 0 },
        params: { bits: 4 },
      });
      expect(res1.outputs['q0']).toBe(0);
      expect(res1.outputs['q1']).toBe(1);
      expect(res1.outputs['q2']).toBe(0);
      expect(res1.outputs['q3']).toBe(1);
      expect(res1.nextState.bits).toEqual([0, 1, 0, 1]);
      expect(res1.nextState.prevClk).toBe(1);

      // Next edge: load 0b0101: d3=0, d2=1, d1=0, d0=1 -> q0=1, q1=0, q2=1, q3=0
      const res2 = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 0, d2: 1, d3: 0, clk: 1 },
        state: { bits: res1.nextState.bits, prevClk: 0 },
        params: { bits: 4 },
      });
      expect(res2.outputs['q0']).toBe(1);
      expect(res2.outputs['q1']).toBe(0);
      expect(res2.outputs['q2']).toBe(1);
      expect(res2.outputs['q3']).toBe(0);
      expect(res2.nextState.bits).toEqual([1, 0, 1, 0]);
    });

    it('holds previous bits when there is no clock edge even if d inputs change', () => {
      const res = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 0 },
        state: { bits: [0, 1, 0, 1], prevClk: 0 },
        params: { bits: 4 },
      });
      expect(res.outputs['q0']).toBe(0);
      expect(res.outputs['q1']).toBe(1);
      expect(res.outputs['q2']).toBe(0);
      expect(res.outputs['q3']).toBe(1);
      expect(res.nextState.bits).toEqual([0, 1, 0, 1]);
    });

    it('holds previous bits when clk is steady at 1', () => {
      const res = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 1 },
        state: { bits: [0, 1, 0, 1], prevClk: 1 },
        params: { bits: 4 },
      });
      expect(res.outputs['q0']).toBe(0);
      expect(res.outputs['q1']).toBe(1);
      expect(res.outputs['q2']).toBe(0);
      expect(res.outputs['q3']).toBe(1);
    });

    it('respects loadEnable: edge with load=0 holds, edge with load=1 loads', () => {
      // Rising edge with load=0 -> hold
      const resHold = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 1, load: 0 },
        state: { bits: [0, 0, 0, 0], prevClk: 0 },
        params: { bits: 4, loadEnable: true },
      });
      expect(resHold.outputs['q0']).toBe(0);
      expect(resHold.outputs['q1']).toBe(0);
      expect(resHold.outputs['q2']).toBe(0);
      expect(resHold.outputs['q3']).toBe(0);

      // Rising edge with load=1 -> load
      const resLoad = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 1, load: 1 },
        state: { bits: [0, 0, 0, 0], prevClk: 0 },
        params: { bits: 4, loadEnable: true },
      });
      expect(resLoad.outputs['q0']).toBe(1);
      expect(resLoad.outputs['q1']).toBe(1);
      expect(resLoad.outputs['q2']).toBe(1);
      expect(resLoad.outputs['q3']).toBe(1);
    });

    it('handles asyncClear: clr=1 zeroes bits immediately and wins over simultaneous load edge', () => {
      // clr=1 zeroes bits without an edge
      const resClrNoEdge = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 0, clr: 1 },
        state: { bits: [1, 1, 1, 1], prevClk: 0 },
        params: { bits: 4, asyncClear: true },
      });
      expect(resClrNoEdge.outputs['q0']).toBe(0);
      expect(resClrNoEdge.outputs['q1']).toBe(0);
      expect(resClrNoEdge.outputs['q2']).toBe(0);
      expect(resClrNoEdge.outputs['q3']).toBe(0);

      // clr=1 wins over simultaneous load edge
      const resClrWins = registerDefinition.evaluate({
        inputs: { d0: 1, d1: 1, d2: 1, d3: 1, clk: 1, load: 1, clr: 1 },
        state: { bits: [1, 1, 1, 1], prevClk: 0 },
        params: { bits: 4, loadEnable: true, asyncClear: true },
      });
      expect(resClrWins.outputs['q0']).toBe(0);
      expect(resClrWins.outputs['q1']).toBe(0);
      expect(resClrWins.outputs['q2']).toBe(0);
      expect(resClrWins.outputs['q3']).toBe(0);
    });

    it('ignores clr input when asyncClear is false', () => {
      const res = registerDefinition.evaluate({
        inputs: { d0: 0, d1: 0, d2: 0, d3: 0, clk: 0, clr: 1 },
        state: { bits: [1, 1, 1, 1], prevClk: 0 },
        params: { bits: 4, asyncClear: false },
      });
      expect(res.outputs['q0']).toBe(1);
      expect(res.outputs['q1']).toBe(1);
      expect(res.outputs['q2']).toBe(1);
      expect(res.outputs['q3']).toBe(1);
    });

    it('defines correct pin IDs and order for different parameter combinations', () => {
      // bits 4, no extras
      const p1 = registerDefinition.getPins({ bits: 4 });
      expect(p1.map((p) => p.id)).toEqual(['d0', 'd1', 'd2', 'd3', 'clk', 'q0', 'q1', 'q2', 'q3']);

      // bits 2, loadEnable
      const p2 = registerDefinition.getPins({ bits: 2, loadEnable: true });
      expect(p2.map((p) => p.id)).toEqual(['d0', 'd1', 'clk', 'load', 'q0', 'q1']);

      // bits 2, both loadEnable and asyncClear
      const p3 = registerDefinition.getPins({ bits: 2, loadEnable: true, asyncClear: true });
      expect(p3.map((p) => p.id)).toEqual(['d0', 'd1', 'clk', 'load', 'clr', 'q0', 'q1']);
    });

    it('clamps bits parameter: 0 -> 1, 99 -> 8, "abc" -> default 4', () => {
      expect(registerDefinition.getPins({ bits: 0 }).map((p) => p.id)).toEqual(['d0', 'clk', 'q0']);
      expect(registerDefinition.getPins({ bits: 99 }).map((p) => p.id)).toHaveLength(8 + 1 + 8);
      expect(
        registerDefinition.getPins({ bits: 'abc' as unknown as number }).map((p) => p.id),
      ).toHaveLength(4 + 1 + 4);
    });

    it('handles malformed stored state without throwing and yields correct-length outputs', () => {
      // Stored state with wrong length
      const resWrongLen = registerDefinition.evaluate({
        inputs: { clk: 0 },
        state: { bits: [1], prevClk: 0 },
        params: { bits: 4 },
      });
      expect(resWrongLen.outputs['q0']).toBe(1);
      expect(resWrongLen.outputs['q1']).toBe(0);
      expect(resWrongLen.outputs['q2']).toBe(0);
      expect(resWrongLen.outputs['q3']).toBe(0);
      expect(resWrongLen.nextState.bits).toHaveLength(4);

      // Stored state missing bits array entirely
      const resMissingBits = registerDefinition.evaluate({
        inputs: { clk: 0 },
        state: {} as unknown as { bits: Signal[]; prevClk: Signal },
        params: { bits: 4 },
      });
      expect(resMissingBits.outputs['q0']).toBe(0);
      expect(resMissingBits.outputs['q1']).toBe(0);
      expect(resMissingBits.outputs['q2']).toBe(0);
      expect(resMissingBits.outputs['q3']).toBe(0);
      expect(resMissingBits.nextState.bits).toHaveLength(4);
    });
  });

  describe('shiftRegister (Shift Register)', () => {
    it('shifts serial in through q0..q3 and then out over successive clock edges', () => {
      // Start with all 0s
      let state = shiftRegisterDefinition.initState({ bits: 4 });
      expect(state.bits).toEqual([0, 0, 0, 0]);

      // Edge 1: si=1
      let res = shiftRegisterDefinition.evaluate({
        inputs: { si: 1, clk: 1 },
        state,
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 1, q1: 0, q2: 0, q3: 0 });
      state = { bits: res.nextState.bits, prevClk: 0 };

      // Edge 2: si=0
      res = shiftRegisterDefinition.evaluate({
        inputs: { si: 0, clk: 1 },
        state,
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 0, q1: 1, q2: 0, q3: 0 });
      state = { bits: res.nextState.bits, prevClk: 0 };

      // Edge 3: si=0
      res = shiftRegisterDefinition.evaluate({
        inputs: { si: 0, clk: 1 },
        state,
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 0, q1: 0, q2: 1, q3: 0 });
      state = { bits: res.nextState.bits, prevClk: 0 };

      // Edge 4: si=0
      res = shiftRegisterDefinition.evaluate({
        inputs: { si: 0, clk: 1 },
        state,
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 0, q1: 0, q2: 0, q3: 1 });
      state = { bits: res.nextState.bits, prevClk: 0 };

      // Edge 5: si=0 (bit shifted out)
      res = shiftRegisterDefinition.evaluate({
        inputs: { si: 0, clk: 1 },
        state,
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 0, q1: 0, q2: 0, q3: 0 });
    });

    it('fills all ones when si=1 is held for 4 clock edges', () => {
      let state = shiftRegisterDefinition.initState({ bits: 4 });
      for (let i = 0; i < 4; i++) {
        const res = shiftRegisterDefinition.evaluate({
          inputs: { si: 1, clk: 1 },
          state: { bits: state.bits, prevClk: 0 },
          params: { bits: 4 },
        });
        state = res.nextState;
      }
      expect(state.bits).toEqual([1, 1, 1, 1]);
    });

    it('holds state when there is no clock edge', () => {
      const res = shiftRegisterDefinition.evaluate({
        inputs: { si: 1, clk: 0 },
        state: { bits: [1, 0, 1, 0], prevClk: 0 },
        params: { bits: 4 },
      });
      expect(res.outputs).toEqual({ q0: 1, q1: 0, q2: 1, q3: 0 });
      expect(res.nextState.bits).toEqual([1, 0, 1, 0]);
    });

    it('zeroes immediately when async clr is high', () => {
      const res = shiftRegisterDefinition.evaluate({
        inputs: { si: 1, clk: 1, clr: 1 },
        state: { bits: [1, 1, 1, 1], prevClk: 0 },
        params: { bits: 4, asyncClear: true },
      });
      expect(res.outputs).toEqual({ q0: 0, q1: 0, q2: 0, q3: 0 });
      expect(res.nextState.bits).toEqual([0, 0, 0, 0]);
    });

    it('defines correct pin ordering for shiftRegister', () => {
      const p1 = shiftRegisterDefinition.getPins({ bits: 4 });
      expect(p1.map((p) => p.id)).toEqual(['si', 'clk', 'q0', 'q1', 'q2', 'q3']);

      const p2 = shiftRegisterDefinition.getPins({ bits: 4, asyncClear: true });
      expect(p2.map((p) => p.id)).toEqual(['si', 'clk', 'clr', 'q0', 'q1', 'q2', 'q3']);
    });

    it('clamps bits parameter: 1 -> 2, 99 -> 8', () => {
      expect(shiftRegisterDefinition.getPins({ bits: 1 }).map((p) => p.id)).toEqual([
        'si',
        'clk',
        'q0',
        'q1',
      ]);
      expect(shiftRegisterDefinition.getPins({ bits: 99 }).map((p) => p.id)).toEqual([
        'si',
        'clk',
        'q0',
        'q1',
        'q2',
        'q3',
        'q4',
        'q5',
        'q6',
        'q7',
      ]);
    });
  });
});
