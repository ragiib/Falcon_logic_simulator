import { describe, expect, it } from 'vitest';
import {
  clockDefinition,
  dffDefinition,
  isRisingEdge,
  jkffDefinition,
  srffDefinition,
  tffDefinition,
} from './sequential';

describe('sequential components', () => {
  describe('isRisingEdge', () => {
    it('returns true only for 0 -> 1 transition', () => {
      expect(isRisingEdge(0, 1)).toBe(true);
      expect(isRisingEdge(0, 0)).toBe(false);
      expect(isRisingEdge(1, 0)).toBe(false);
      expect(isRisingEdge(1, 1)).toBe(false);
    });
  });

  describe('clock', () => {
    it('outputs 1 when value is true and 0 when false, missing, or non-boolean', () => {
      expect(
        clockDefinition.evaluate({
          inputs: {},
          state: null,
          params: { value: true },
        }).outputs['out'],
      ).toBe(1);

      expect(
        clockDefinition.evaluate({
          inputs: {},
          state: null,
          params: { value: false },
        }).outputs['out'],
      ).toBe(0);

      expect(
        clockDefinition.evaluate({
          inputs: {},
          state: null,
          params: {},
        }).outputs['out'],
      ).toBe(0);

      expect(
        clockDefinition.evaluate({
          inputs: {},
          state: null,
          params: { value: 'abc' as unknown as boolean },
        }).outputs['out'],
      ).toBe(0);
    });

    it('has one output and no inputs', () => {
      const pins = clockDefinition.getPins({});
      expect(pins).toHaveLength(1);
      expect(pins[0]).toEqual({ id: 'out', label: 'Out', direction: 'output' });
    });
  });

  describe('dff (D Flip-Flop)', () => {
    it('updates q on rising edge with asyncControls false', () => {
      // 1. Rising edge with d=1 -> q=1, qn=0
      const res1 = dffDefinition.evaluate({
        inputs: { d: 1, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(res1.outputs['q']).toBe(1);
      expect(res1.outputs['qn']).toBe(0);
      expect(res1.nextState).toEqual({ q: 1, prevClk: 1 });

      // 2. Rising edge with d=0 after q=1 -> q=0
      const res2 = dffDefinition.evaluate({
        inputs: { d: 0, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(res2.outputs['q']).toBe(0);
      expect(res2.outputs['qn']).toBe(1);
      expect(res2.nextState).toEqual({ q: 0, prevClk: 1 });
    });

    it('holds state when clock is held high, falling, or inactive', () => {
      // clk held at 1 with d changing -> q unchanged
      const resHeld = dffDefinition.evaluate({
        inputs: { d: 0, clk: 1 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resHeld.outputs['q']).toBe(1);
      expect(resHeld.nextState).toEqual({ q: 1, prevClk: 1 });

      // falling edge (1 -> 0) -> q unchanged
      const resFall = dffDefinition.evaluate({
        inputs: { d: 0, clk: 0 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resFall.outputs['q']).toBe(1);
      expect(resFall.nextState).toEqual({ q: 1, prevClk: 0 });

      // no clock activity (0 -> 0) -> q unchanged
      const resNone = dffDefinition.evaluate({
        inputs: { d: 1, clk: 0 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resNone.outputs['q']).toBe(0);
      expect(resNone.nextState).toEqual({ q: 0, prevClk: 0 });
    });

    it('defines correct pin ordering for asyncControls false and true', () => {
      const pinsNoAsync = dffDefinition.getPins({ asyncControls: false });
      expect(pinsNoAsync.map((p) => p.id)).toEqual(['d', 'clk', 'q', 'qn']);

      const pinsWithAsync = dffDefinition.getPins({ asyncControls: true });
      expect(pinsWithAsync.map((p) => p.id)).toEqual(['d', 'clk', 'pre', 'clr', 'q', 'qn']);
    });

    it('handles async controls (clr, pre) when enabled', () => {
      // clr=1 forces q=0 without clock edge
      const resClr = dffDefinition.evaluate({
        inputs: { d: 1, clk: 0, clr: 1, pre: 0 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resClr.outputs['q']).toBe(0);
      expect(resClr.outputs['qn']).toBe(1);

      // pre=1 forces q=1 without clock edge
      const resPre = dffDefinition.evaluate({
        inputs: { d: 0, clk: 0, clr: 0, pre: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resPre.outputs['q']).toBe(1);
      expect(resPre.outputs['qn']).toBe(0);

      // clr wins when both clr=1 and pre=1
      const resBoth = dffDefinition.evaluate({
        inputs: { d: 1, clk: 1, clr: 1, pre: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resBoth.outputs['q']).toBe(0);
      expect(resBoth.outputs['qn']).toBe(1);
    });

    it('ignores pre/clr when asyncControls is false', () => {
      const res = dffDefinition.evaluate({
        inputs: { d: 1, clk: 0, clr: 1, pre: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      // No clock edge and asyncControls false -> q remains 1
      expect(res.outputs['q']).toBe(1);
    });

    it('treats missing input key as 0', () => {
      const res = dffDefinition.evaluate({
        inputs: {},
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      // clk missing -> 0, prevClk 0 -> no edge -> q remains 1
      expect(res.outputs['q']).toBe(1);
      expect(res.nextState.prevClk).toBe(0);
    });

    it('falls back to false for invalid or missing asyncControls param', () => {
      expect(dffDefinition.getPins({ asyncControls: 'abc' as unknown as boolean })).toHaveLength(4);
      expect(dffDefinition.getPins({})).toHaveLength(4);
    });
  });

  describe('srff (SR Flip-Flop)', () => {
    it('sets on S=1,R=0 rising edge and resets on S=0,R=1 rising edge', () => {
      // S=1, R=0 -> 1
      const resSet = srffDefinition.evaluate({
        inputs: { s: 1, r: 0, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resSet.outputs['q']).toBe(1);
      expect(resSet.outputs['qn']).toBe(0);

      // S=0, R=1 -> 0
      const resReset = srffDefinition.evaluate({
        inputs: { s: 0, r: 1, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resReset.outputs['q']).toBe(0);
      expect(resReset.outputs['qn']).toBe(1);
    });

    it('holds previous value on S=0,R=0 from both 0 and 1', () => {
      const resHold0 = srffDefinition.evaluate({
        inputs: { s: 0, r: 0, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resHold0.outputs['q']).toBe(0);

      const resHold1 = srffDefinition.evaluate({
        inputs: { s: 0, r: 0, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resHold1.outputs['q']).toBe(1);
    });

    it('leaves q unchanged on invalid input S=1,R=1 from both 0 and 1', () => {
      const resInv0 = srffDefinition.evaluate({
        inputs: { s: 1, r: 1, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resInv0.outputs['q']).toBe(0);

      const resInv1 = srffDefinition.evaluate({
        inputs: { s: 1, r: 1, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resInv1.outputs['q']).toBe(1);
    });

    it('does not change state without a rising edge even if S=1', () => {
      const res = srffDefinition.evaluate({
        inputs: { s: 1, r: 0, clk: 1 },
        state: { q: 0, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(res.outputs['q']).toBe(0);
    });

    it('supports async clr and pre for srff', () => {
      const resClr = srffDefinition.evaluate({
        inputs: { s: 1, r: 0, clk: 1, clr: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resClr.outputs['q']).toBe(0);

      const resPre = srffDefinition.evaluate({
        inputs: { s: 0, r: 1, clk: 1, pre: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resPre.outputs['q']).toBe(1);
    });

    it('defines correct pin ordering for asyncControls false and true', () => {
      const pinsNoAsync = srffDefinition.getPins({ asyncControls: false });
      expect(pinsNoAsync.map((p) => p.id)).toEqual(['s', 'r', 'clk', 'q', 'qn']);

      const pinsWithAsync = srffDefinition.getPins({ asyncControls: true });
      expect(pinsWithAsync.map((p) => p.id)).toEqual(['s', 'r', 'clk', 'pre', 'clr', 'q', 'qn']);
    });
  });

  describe('jkff (JK Flip-Flop)', () => {
    it('handles rising edges correctly for all JK combinations from both q values', () => {
      // JK=00: hold
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 0, k: 0, clk: 1 },
          state: { q: 0, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(0);
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 0, k: 0, clk: 1 },
          state: { q: 1, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(1);

      // JK=10: set
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 1, k: 0, clk: 1 },
          state: { q: 0, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(1);
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 1, k: 0, clk: 1 },
          state: { q: 1, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(1);

      // JK=01: reset
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 0, k: 1, clk: 1 },
          state: { q: 0, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(0);
      expect(
        jkffDefinition.evaluate({
          inputs: { j: 0, k: 1, clk: 1 },
          state: { q: 1, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(0);

      // JK=11: toggle
      const resTog0 = jkffDefinition.evaluate({
        inputs: { j: 1, k: 1, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resTog0.outputs['q']).toBe(1);
      expect(resTog0.outputs['qn']).toBe(0);

      const resTog1 = jkffDefinition.evaluate({
        inputs: { j: 1, k: 1, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resTog1.outputs['q']).toBe(0);
      expect(resTog1.outputs['qn']).toBe(1);
    });

    it('holds state without a clock edge even when J=K=1', () => {
      // Clock held at 1 (1 -> 1)
      const resSteady1 = jkffDefinition.evaluate({
        inputs: { j: 1, k: 1, clk: 1 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resSteady1.outputs['q']).toBe(1);
      expect(resSteady1.nextState.prevClk).toBe(1);

      // Clock held at 0 (0 -> 0)
      const resSteady0 = jkffDefinition.evaluate({
        inputs: { j: 1, k: 1, clk: 0 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resSteady0.outputs['q']).toBe(0);
      expect(resSteady0.nextState.prevClk).toBe(0);

      // Falling edge (1 -> 0)
      const resFall = jkffDefinition.evaluate({
        inputs: { j: 1, k: 1, clk: 0 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resFall.outputs['q']).toBe(1);
      expect(resFall.nextState.prevClk).toBe(0);
    });

    it('handles async clr and pre, with clr taking priority over pre', () => {
      // clr=1 forces q=0 without an edge
      const resClr = jkffDefinition.evaluate({
        inputs: { j: 1, k: 0, clk: 0, clr: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resClr.outputs['q']).toBe(0);
      expect(resClr.outputs['qn']).toBe(1);

      // pre=1 forces q=1 without an edge
      const resPre = jkffDefinition.evaluate({
        inputs: { j: 0, k: 1, clk: 0, pre: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resPre.outputs['q']).toBe(1);
      expect(resPre.outputs['qn']).toBe(0);

      // clr wins over pre
      const resBoth = jkffDefinition.evaluate({
        inputs: { j: 1, k: 0, clk: 1, clr: 1, pre: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resBoth.outputs['q']).toBe(0);
      expect(resBoth.outputs['qn']).toBe(1);
    });

    it('ignores pre and clr when asyncControls is false', () => {
      const res = jkffDefinition.evaluate({
        inputs: { j: 0, k: 0, clk: 0, clr: 1, pre: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(res.outputs['q']).toBe(1);
    });

    it('follows clk on nextState.prevClk', () => {
      const res0 = jkffDefinition.evaluate({
        inputs: { clk: 0 },
        state: { q: 0, prevClk: 1 },
        params: {},
      });
      expect(res0.nextState.prevClk).toBe(0);

      const res1 = jkffDefinition.evaluate({
        inputs: { clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: {},
      });
      expect(res1.nextState.prevClk).toBe(1);
    });

    it('defines correct pin ordering for asyncControls false and true', () => {
      const pinsNoAsync = jkffDefinition.getPins({ asyncControls: false });
      expect(pinsNoAsync.map((p) => p.id)).toEqual(['j', 'k', 'clk', 'q', 'qn']);

      const pinsWithAsync = jkffDefinition.getPins({ asyncControls: true });
      expect(pinsWithAsync.map((p) => p.id)).toEqual(['j', 'k', 'clk', 'pre', 'clr', 'q', 'qn']);
    });

    it('treats missing inputs as 0', () => {
      const res = jkffDefinition.evaluate({
        inputs: {},
        state: { q: 1, prevClk: 0 },
        params: {},
      });
      // clk missing -> 0, prevClk 0 -> no edge -> hold q=1
      expect(res.outputs['q']).toBe(1);
      expect(res.nextState.prevClk).toBe(0);
    });
  });

  describe('tff (T Flip-Flop)', () => {
    it('toggles on rising edge with T=1 from both q=0 and q=1, and holds with T=0', () => {
      // T=1: toggle from 0 -> 1
      const resTog0 = tffDefinition.evaluate({
        inputs: { t: 1, clk: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resTog0.outputs['q']).toBe(1);
      expect(resTog0.outputs['qn']).toBe(0);

      // T=1: toggle from 1 -> 0
      const resTog1 = tffDefinition.evaluate({
        inputs: { t: 1, clk: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: false },
      });
      expect(resTog1.outputs['q']).toBe(0);
      expect(resTog1.outputs['qn']).toBe(1);

      // T=0: hold from 0 -> 0
      expect(
        tffDefinition.evaluate({
          inputs: { t: 0, clk: 1 },
          state: { q: 0, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(0);

      // T=0: hold from 1 -> 1
      expect(
        tffDefinition.evaluate({
          inputs: { t: 0, clk: 1 },
          state: { q: 1, prevClk: 0 },
          params: { asyncControls: false },
        }).outputs['q'],
      ).toBe(1);
    });

    it('holds state without a rising clock edge even if T=1', () => {
      const resSteady1 = tffDefinition.evaluate({
        inputs: { t: 1, clk: 1 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resSteady1.outputs['q']).toBe(1);

      const resFall = tffDefinition.evaluate({
        inputs: { t: 1, clk: 0 },
        state: { q: 1, prevClk: 1 },
        params: { asyncControls: false },
      });
      expect(resFall.outputs['q']).toBe(1);
    });

    it('handles async clr and pre, with clr taking priority', () => {
      const resClr = tffDefinition.evaluate({
        inputs: { t: 1, clk: 1, clr: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resClr.outputs['q']).toBe(0);

      const resPre = tffDefinition.evaluate({
        inputs: { t: 0, clk: 0, pre: 1 },
        state: { q: 0, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resPre.outputs['q']).toBe(1);

      const resBoth = tffDefinition.evaluate({
        inputs: { t: 1, clk: 1, clr: 1, pre: 1 },
        state: { q: 1, prevClk: 0 },
        params: { asyncControls: true },
      });
      expect(resBoth.outputs['q']).toBe(0);
    });

    it('defines correct pin ordering for asyncControls false and true', () => {
      const pinsNoAsync = tffDefinition.getPins({ asyncControls: false });
      expect(pinsNoAsync.map((p) => p.id)).toEqual(['t', 'clk', 'q', 'qn']);

      const pinsWithAsync = tffDefinition.getPins({ asyncControls: true });
      expect(pinsWithAsync.map((p) => p.id)).toEqual(['t', 'clk', 'pre', 'clr', 'q', 'qn']);
    });
  });
});
