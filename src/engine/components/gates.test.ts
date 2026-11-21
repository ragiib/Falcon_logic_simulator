import { describe, expect, it } from 'vitest';
import type { ComponentDefinition, ParamValues, Signal } from '@/engine/types';
import {
  andGate,
  orGate,
  notGate,
  nandGate,
  norGate,
  xorGate,
  xnorGate,
} from '@/engine/components/gates';

function evalGate(
  def: ComponentDefinition,
  inputs: Record<string, Signal>,
  params: ParamValues = {},
): Signal {
  const result = def.evaluate({
    inputs,
    state: null,
    params,
  });
  return result.outputs['out'] ?? 0;
}

type Row2 = [in0: Signal, in1: Signal, expected: Signal];
type Row3 = [in0: Signal, in1: Signal, in2: Signal, expected: Signal];

describe('gates', () => {
  describe('2-input truth tables', () => {
    it('evaluates AND truth table', () => {
      const table: Row2[] = [
        [0, 0, 0],
        [0, 1, 0],
        [1, 0, 0],
        [1, 1, 1],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(andGate, { in0, in1 })).toBe(expected);
      }
    });

    it('evaluates OR truth table', () => {
      const table: Row2[] = [
        [0, 0, 0],
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(orGate, { in0, in1 })).toBe(expected);
      }
    });

    it('evaluates NAND truth table', () => {
      const table: Row2[] = [
        [0, 0, 1],
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(nandGate, { in0, in1 })).toBe(expected);
      }
    });

    it('evaluates NOR truth table', () => {
      const table: Row2[] = [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0],
        [1, 1, 0],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(norGate, { in0, in1 })).toBe(expected);
      }
    });

    it('evaluates XOR truth table', () => {
      const table: Row2[] = [
        [0, 0, 0],
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(xorGate, { in0, in1 })).toBe(expected);
      }
    });

    it('evaluates XNOR truth table', () => {
      const table: Row2[] = [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0],
        [1, 1, 1],
      ];
      for (const [in0, in1, expected] of table) {
        expect(evalGate(xnorGate, { in0, in1 })).toBe(expected);
      }
    });
  });

  describe('NOT gate', () => {
    it('inverts single input', () => {
      expect(evalGate(notGate, { in0: 0 })).toBe(1);
      expect(evalGate(notGate, { in0: 1 })).toBe(0);
    });
  });

  describe('3-input gates (all 8 combinations)', () => {
    const params3 = { inputs: 3 };

    it('evaluates 3-input AND', () => {
      const table: Row3[] = [
        [0, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 0, 0, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 0],
        [1, 1, 1, 1],
      ];
      for (const [in0, in1, in2, expected] of table) {
        expect(evalGate(andGate, { in0, in1, in2 }, params3)).toBe(expected);
      }
    });

    it('evaluates 3-input OR', () => {
      const table: Row3[] = [
        [0, 0, 0, 0],
        [0, 0, 1, 1],
        [0, 1, 0, 1],
        [0, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 1, 1],
        [1, 1, 0, 1],
        [1, 1, 1, 1],
      ];
      for (const [in0, in1, in2, expected] of table) {
        expect(evalGate(orGate, { in0, in1, in2 }, params3)).toBe(expected);
      }
    });

    it('evaluates 3-input XOR (odd parity)', () => {
      const table: Row3[] = [
        [0, 0, 0, 0],
        [0, 0, 1, 1],
        [0, 1, 0, 1],
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 0, 1, 0],
        [1, 1, 0, 0],
        [1, 1, 1, 1],
      ];
      for (const [in0, in1, in2, expected] of table) {
        expect(evalGate(xorGate, { in0, in1, in2 }, params3)).toBe(expected);
      }
    });

    it('evaluates 3-input XNOR (even parity)', () => {
      const table: Row3[] = [
        [0, 0, 0, 1],
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 0, 1],
        [1, 1, 1, 0],
      ];
      for (const [in0, in1, in2, expected] of table) {
        expect(evalGate(xnorGate, { in0, in1, in2 }, params3)).toBe(expected);
      }
    });
  });

  describe('getPins pin definitions', () => {
    it('returns correct pins for 2-input gate', () => {
      const pins = andGate.getPins({ inputs: 2 });
      expect(pins).toEqual([
        { id: 'in0', label: 'A', direction: 'input' },
        { id: 'in1', label: 'B', direction: 'input' },
        { id: 'out', label: 'Out', direction: 'output' },
      ]);
    });

    it('returns correct pins for 4-input gate', () => {
      const pins = andGate.getPins({ inputs: 4 });
      expect(pins).toEqual([
        { id: 'in0', label: 'A', direction: 'input' },
        { id: 'in1', label: 'B', direction: 'input' },
        { id: 'in2', label: 'C', direction: 'input' },
        { id: 'in3', label: 'D', direction: 'input' },
        { id: 'out', label: 'Out', direction: 'output' },
      ]);
    });

    it('returns exactly 1 input and 1 output for NOT gate', () => {
      const pins = notGate.getPins({});
      expect(pins).toEqual([
        { id: 'in0', label: 'A', direction: 'input' },
        { id: 'out', label: 'Out', direction: 'output' },
      ]);
    });
  });

  describe('param clamping and fallback in getPins and evaluate', () => {
    it('clamps out-of-range inputs param to [2, 8] or fallback', () => {
      expect(andGate.getPins({ inputs: 1 })).toHaveLength(3); // 2 inputs + 1 out
      expect(andGate.getPins({ inputs: 99 })).toHaveLength(9); // 8 inputs + 1 out
      expect(andGate.getPins({ inputs: 'abc' })).toHaveLength(3); // fallback 2 inputs + 1 out
    });

    it('treats a missing input key as 0', () => {
      expect(evalGate(andGate, { in0: 1 })).toBe(0); // in1 missing => 0
      expect(evalGate(orGate, { in0: 1 })).toBe(1); // in1 missing => 0, but in0=1 => 1
      expect(evalGate(orGate, {})).toBe(0); // both missing => 0
    });
  });
});
