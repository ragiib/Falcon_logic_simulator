import { describe, expect, it } from 'vitest';
import type { Signal } from '@/engine/types';
import {
  comparatorDefinition,
  decoderDefinition,
  demuxDefinition,
  muxDefinition,
  priorityEncoderDefinition,
} from './combinational';

describe('combinational components', () => {
  describe('multiplexer (mux)', () => {
    it('evaluates 2:1 mux over all 8 combinations of (d0, d1, s0)', () => {
      for (const d0 of [0, 1] as Signal[]) {
        for (const d1 of [0, 1] as Signal[]) {
          for (const s0 of [0, 1] as Signal[]) {
            const result = muxDefinition.evaluate({
              inputs: { d0, d1, s0 },
              state: null,
              params: { selectBits: 1 },
            });
            const expected = s0 === 1 ? d1 : d0;
            expect(result.outputs['y']).toBe(expected);
          }
        }
      }
    });

    it('evaluates 4:1 mux selecting each input with other inputs at opposite value', () => {
      // For each channel 0..3, test selecting it when it is 1 (others 0) and when it is 0 (others 1)
      for (let sel = 0; sel < 4; sel++) {
        const s0 = (sel & 1) as Signal;
        const s1 = ((sel >> 1) & 1) as Signal;

        // Channel is 1, others 0
        const inputsHigh: Record<string, Signal> = { s0, s1 };
        for (let i = 0; i < 4; i++) {
          inputsHigh[`d${i}`] = i === sel ? 1 : 0;
        }
        expect(
          muxDefinition.evaluate({
            inputs: inputsHigh,
            state: null,
            params: { selectBits: 2 },
          }).outputs['y'],
        ).toBe(1);

        // Channel is 0, others 1
        const inputsLow: Record<string, Signal> = { s0, s1 };
        for (let i = 0; i < 4; i++) {
          inputsLow[`d${i}`] = i === sel ? 0 : 1;
        }
        expect(
          muxDefinition.evaluate({
            inputs: inputsLow,
            state: null,
            params: { selectBits: 2 },
          }).outputs['y'],
        ).toBe(0);
      }
    });

    it('spot checks 8:1 mux at index 5 and 7', () => {
      // index 5: s0=1, s1=0, s2=1
      const res5 = muxDefinition.evaluate({
        inputs: { s0: 1, s1: 0, s2: 1, d5: 1, d7: 0 },
        state: null,
        params: { selectBits: 3 },
      });
      expect(res5.outputs['y']).toBe(1);

      // index 7: s0=1, s1=1, s2=1
      const res7 = muxDefinition.evaluate({
        inputs: { s0: 1, s1: 1, s2: 1, d5: 0, d7: 1 },
        state: null,
        params: { selectBits: 3 },
      });
      expect(res7.outputs['y']).toBe(1);
    });

    it('returns exact pin ids, order and directions for selectBits 1, 2, 3', () => {
      const pins1 = muxDefinition.getPins({ selectBits: 1 });
      expect(pins1.map((p) => p.id)).toEqual(['d0', 'd1', 's0', 'y']);
      expect(pins1.map((p) => p.direction)).toEqual(['input', 'input', 'input', 'output']);

      const pins2 = muxDefinition.getPins({ selectBits: 2 });
      expect(pins2.map((p) => p.id)).toEqual(['d0', 'd1', 'd2', 'd3', 's0', 's1', 'y']);

      const pins3 = muxDefinition.getPins({ selectBits: 3 });
      expect(pins3.map((p) => p.id)).toEqual([
        'd0',
        'd1',
        'd2',
        'd3',
        'd4',
        'd5',
        'd6',
        'd7',
        's0',
        's1',
        's2',
        'y',
      ]);
    });

    it('clamps or defaults params 0, 99, "abc"', () => {
      expect(muxDefinition.getPins({ selectBits: 0 })).toHaveLength(4); // clamped to 1: 2 data + 1 select + 1 out
      expect(muxDefinition.getPins({ selectBits: 99 })).toHaveLength(12); // clamped to 3: 8 data + 3 select + 1 out
      expect(muxDefinition.getPins({ selectBits: 'abc' as unknown as number })).toHaveLength(4); // fallback to 1
    });

    it('treats missing input key as 0', () => {
      const res = muxDefinition.evaluate({
        inputs: {},
        state: null,
        params: { selectBits: 1 },
      });
      expect(res.outputs['y']).toBe(0);
    });
  });

  describe('demultiplexer (demux)', () => {
    it('evaluates 1:2 demux with d=1 and d=0', () => {
      for (const s0 of [0, 1] as Signal[]) {
        const resHigh = demuxDefinition.evaluate({
          inputs: { d: 1, s0 },
          state: null,
          params: { selectBits: 1 },
        });
        expect(resHigh.outputs['y0']).toBe(s0 === 0 ? 1 : 0);
        expect(resHigh.outputs['y1']).toBe(s0 === 1 ? 1 : 0);

        const resLow = demuxDefinition.evaluate({
          inputs: { d: 0, s0 },
          state: null,
          params: { selectBits: 1 },
        });
        expect(resLow.outputs['y0']).toBe(0);
        expect(resLow.outputs['y1']).toBe(0);
      }
    });

    it('evaluates 1:4 demux across all select values with d=1 and d=0', () => {
      for (let sel = 0; sel < 4; sel++) {
        const s0 = (sel & 1) as Signal;
        const s1 = ((sel >> 1) & 1) as Signal;

        const resHigh = demuxDefinition.evaluate({
          inputs: { d: 1, s0, s1 },
          state: null,
          params: { selectBits: 2 },
        });
        for (let i = 0; i < 4; i++) {
          expect(resHigh.outputs[`y${i}`]).toBe(i === sel ? 1 : 0);
        }

        const resLow = demuxDefinition.evaluate({
          inputs: { d: 0, s0, s1 },
          state: null,
          params: { selectBits: 2 },
        });
        for (let i = 0; i < 4; i++) {
          expect(resLow.outputs[`y${i}`]).toBe(0);
        }
      }
    });

    it('returns exact pin ids, order and directions', () => {
      const pins = demuxDefinition.getPins({ selectBits: 2 });
      expect(pins.map((p) => p.id)).toEqual(['d', 's0', 's1', 'y0', 'y1', 'y2', 'y3']);
      expect(pins.map((p) => p.direction)).toEqual([
        'input',
        'input',
        'input',
        'output',
        'output',
        'output',
        'output',
      ]);
    });

    it('treats missing input key as 0', () => {
      const res = demuxDefinition.evaluate({
        inputs: {},
        state: null,
        params: { selectBits: 1 },
      });
      expect(res.outputs['y0']).toBe(0);
      expect(res.outputs['y1']).toBe(0);
    });
  });

  describe('decoder', () => {
    it('evaluates 2:4 decoder for all 4 addresses as one-hot', () => {
      for (let addr = 0; addr < 4; addr++) {
        const a0 = (addr & 1) as Signal;
        const a1 = ((addr >> 1) & 1) as Signal;
        const res = decoderDefinition.evaluate({
          inputs: { a0, a1 },
          state: null,
          params: { bits: 2 },
        });
        for (let i = 0; i < 4; i++) {
          expect(res.outputs[`y${i}`]).toBe(i === addr ? 1 : 0);
        }
      }
    });

    it('evaluates 3:8 decoder for all 8 addresses as one-hot', () => {
      for (let addr = 0; addr < 8; addr++) {
        const a0 = (addr & 1) as Signal;
        const a1 = ((addr >> 1) & 1) as Signal;
        const a2 = ((addr >> 2) & 1) as Signal;
        const res = decoderDefinition.evaluate({
          inputs: { a0, a1, a2 },
          state: null,
          params: { bits: 3 },
        });
        for (let i = 0; i < 8; i++) {
          expect(res.outputs[`y${i}`]).toBe(i === addr ? 1 : 0);
        }
      }
    });

    it('returns exact pin ids, order and directions', () => {
      const pins = decoderDefinition.getPins({ bits: 2 });
      expect(pins.map((p) => p.id)).toEqual(['a0', 'a1', 'y0', 'y1', 'y2', 'y3']);
    });

    it('clamps params 1 -> 2 and 99 -> 3', () => {
      expect(decoderDefinition.getPins({ bits: 1 })).toHaveLength(6); // 2 inputs, 4 outputs
      expect(decoderDefinition.getPins({ bits: 99 })).toHaveLength(11); // 3 inputs, 8 outputs
    });

    it('treats missing input key as 0', () => {
      const res = decoderDefinition.evaluate({
        inputs: {},
        state: null,
        params: { bits: 2 },
      });
      expect(res.outputs['y0']).toBe(1);
      expect(res.outputs['y1']).toBe(0);
    });
  });

  describe('priority encoder', () => {
    it('evaluates 4:2 encoder when no inputs are high', () => {
      const res = priorityEncoderDefinition.evaluate({
        inputs: {},
        state: null,
        params: { bits: 2 },
      });
      expect(res.outputs['a0']).toBe(0);
      expect(res.outputs['a1']).toBe(0);
      expect(res.outputs['v']).toBe(0);
    });

    it('evaluates 4:2 encoder for each single input i0..i3', () => {
      for (let i = 0; i < 4; i++) {
        const inputs: Record<string, Signal> = {};
        inputs[`i${i}`] = 1;
        const res = priorityEncoderDefinition.evaluate({
          inputs,
          state: null,
          params: { bits: 2 },
        });
        expect(res.outputs['a0']).toBe(i & 1);
        expect(res.outputs['a1']).toBe((i >> 1) & 1);
        expect(res.outputs['v']).toBe(1);
      }
    });

    it('handles priority correctly on 4:2 encoder', () => {
      // i1 + i2 high -> code 2
      const res1 = priorityEncoderDefinition.evaluate({
        inputs: { i1: 1, i2: 1 },
        state: null,
        params: { bits: 2 },
      });
      expect(res1.outputs['a0']).toBe(0);
      expect(res1.outputs['a1']).toBe(1);
      expect(res1.outputs['v']).toBe(1);

      // all high -> code 3
      const res2 = priorityEncoderDefinition.evaluate({
        inputs: { i0: 1, i1: 1, i2: 1, i3: 1 },
        state: null,
        params: { bits: 2 },
      });
      expect(res2.outputs['a0']).toBe(1);
      expect(res2.outputs['a1']).toBe(1);
      expect(res2.outputs['v']).toBe(1);

      // i0 + i1 high -> code 1
      const res3 = priorityEncoderDefinition.evaluate({
        inputs: { i0: 1, i1: 1 },
        state: null,
        params: { bits: 2 },
      });
      expect(res3.outputs['a0']).toBe(1);
      expect(res3.outputs['a1']).toBe(0);
      expect(res3.outputs['v']).toBe(1);
    });

    it('evaluates 8:3 encoder with priority cases', () => {
      // input 6 alone -> code 6
      const res6 = priorityEncoderDefinition.evaluate({
        inputs: { i6: 1 },
        state: null,
        params: { bits: 3 },
      });
      expect(res6.outputs['a0']).toBe(0);
      expect(res6.outputs['a1']).toBe(1);
      expect(res6.outputs['a2']).toBe(1);
      expect(res6.outputs['v']).toBe(1);

      // inputs 2 and 5 -> code 5
      const res5 = priorityEncoderDefinition.evaluate({
        inputs: { i2: 1, i5: 1 },
        state: null,
        params: { bits: 3 },
      });
      expect(res5.outputs['a0']).toBe(1);
      expect(res5.outputs['a1']).toBe(0);
      expect(res5.outputs['a2']).toBe(1);
      expect(res5.outputs['v']).toBe(1);
    });

    it('returns exact pin ids, order and directions including v last', () => {
      const pins = priorityEncoderDefinition.getPins({ bits: 2 });
      expect(pins.map((p) => p.id)).toEqual(['i0', 'i1', 'i2', 'i3', 'a0', 'a1', 'v']);
      expect(pins[pins.length - 1]?.direction).toBe('output');
    });

    it('treats missing input key as 0', () => {
      const res = priorityEncoderDefinition.evaluate({
        inputs: { i1: 1 },
        state: null,
        params: { bits: 2 },
      });
      expect(res.outputs['a0']).toBe(1);
      expect(res.outputs['v']).toBe(1);
    });
  });

  describe('comparator', () => {
    it('evaluates 1-bit comparator across all 4 combinations', () => {
      const cases: [Signal, Signal, Signal, Signal, Signal][] = [
        [0, 0, 0, 1, 0],
        [0, 1, 0, 0, 1],
        [1, 0, 1, 0, 0],
        [1, 1, 0, 1, 0],
      ];
      for (const [a0, b0, gt, eq, lt] of cases) {
        const res = comparatorDefinition.evaluate({
          inputs: { a0, b0 },
          state: null,
          params: { bits: 1 },
        });
        expect(res.outputs).toEqual({ gt, eq, lt });
      }
    });

    it('exhaustively evaluates 4-bit comparator over all 256 (A,B) pairs', () => {
      for (let a = 0; a < 16; a++) {
        for (let b = 0; b < 16; b++) {
          const inputs: Record<string, Signal> = {};
          for (let bit = 0; bit < 4; bit++) {
            inputs[`a${bit}`] = ((a >> bit) & 1) as Signal;
            inputs[`b${bit}`] = ((b >> bit) & 1) as Signal;
          }
          const res = comparatorDefinition.evaluate({
            inputs,
            state: null,
            params: { bits: 4 },
          });

          const expectedGt = a > b ? 1 : 0;
          const expectedEq = a === b ? 1 : 0;
          const expectedLt = a < b ? 1 : 0;

          expect(res.outputs['gt']).toBe(expectedGt);
          expect(res.outputs['eq']).toBe(expectedEq);
          expect(res.outputs['lt']).toBe(expectedLt);

          const sum =
            (res.outputs['gt'] ?? 0) + (res.outputs['eq'] ?? 0) + (res.outputs['lt'] ?? 0);
          expect(sum).toBe(1);
        }
      }
    });

    it('returns exact pin ids, order and directions for 4 bits', () => {
      const pins = comparatorDefinition.getPins({ bits: 4 });
      expect(pins.map((p) => p.id)).toEqual([
        'a0',
        'a1',
        'a2',
        'a3',
        'b0',
        'b1',
        'b2',
        'b3',
        'gt',
        'eq',
        'lt',
      ]);
    });

    it('clamps params 0 -> 1 and 99 -> 4', () => {
      expect(comparatorDefinition.getPins({ bits: 0 })).toHaveLength(5); // 1 A, 1 B, 3 out
      expect(comparatorDefinition.getPins({ bits: 99 })).toHaveLength(11); // 4 A, 4 B, 3 out
    });

    it('treats missing input key as 0', () => {
      const res = comparatorDefinition.evaluate({
        inputs: {},
        state: null,
        params: { bits: 1 },
      });
      expect(res.outputs).toEqual({ gt: 0, eq: 1, lt: 0 });
    });
  });
});
