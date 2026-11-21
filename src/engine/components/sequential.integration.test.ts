import { describe, expect, it } from 'vitest';
import {
  carryOverState,
  compileCircuit,
  createInitialState,
  getOutputPinValue,
  settle,
} from '@/engine';
import { CircuitBuilder } from '@/engine/testing/builder';

describe('sequential components integration', () => {
  it('verifies D flip-flop sequence across clock and data transitions', () => {
    function buildCircuit(dVal: boolean, clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_d', 'inputSwitch', { value: dVal })
        .add('clk', 'clock', { value: clkVal })
        .add('dff', 'dff', { asyncControls: false })
        .connect('sw_d.out', 'dff.d')
        .connect('clk.out', 'dff.clk')
        .build();
    }

    // Phase 1: D=1, clock=0 -> q=0 (no edge yet)
    const c1 = buildCircuit(true, false);
    const comp1 = compileCircuit(c1);
    const s1 = createInitialState(comp1);
    const res1 = settle(comp1, s1);
    expect(res1.status).toBe('stable');
    expect(getOutputPinValue(res1.state, 'dff', 'q')).toBe(0);

    // Phase 2: D=1, clock=1 -> q=1 (rising edge captures D=1)
    const c2 = buildCircuit(true, true);
    const comp2 = compileCircuit(c2);
    const s2 = carryOverState(comp1, res1.state, comp2);
    const res2 = settle(comp2, s2);
    expect(res2.status).toBe('stable');
    expect(getOutputPinValue(res2.state, 'dff', 'q')).toBe(1);

    // Phase 3: D=0, clock=1 -> q stays 1 (clock held, no rising edge)
    const c3 = buildCircuit(false, true);
    const comp3 = compileCircuit(c3);
    const s3 = carryOverState(comp2, res2.state, comp3);
    const res3 = settle(comp3, s3);
    expect(res3.status).toBe('stable');
    expect(getOutputPinValue(res3.state, 'dff', 'q')).toBe(1);

    // Phase 4: D=0, clock=0 -> q stays 1 (falling edge, no rising edge)
    const c4 = buildCircuit(false, false);
    const comp4 = compileCircuit(c4);
    const s4 = carryOverState(comp3, res3.state, comp4);
    const res4 = settle(comp4, s4);
    expect(res4.status).toBe('stable');
    expect(getOutputPinValue(res4.state, 'dff', 'q')).toBe(1);

    // Phase 5: D=0, clock=1 -> q=0 (rising edge captures D=0)
    const c5 = buildCircuit(false, true);
    const comp5 = compileCircuit(c5);
    const s5 = carryOverState(comp4, res4.state, comp5);
    const res5 = settle(comp5, s5);
    expect(res5.status).toBe('stable');
    expect(getOutputPinValue(res5.state, 'dff', 'q')).toBe(0);
  });

  it('verifies toggle (divide-by-2) flip-flop flips on rising edges only', () => {
    function buildToggleCircuit(clkVal: boolean) {
      return new CircuitBuilder()
        .add('clk', 'clock', { value: clkVal })
        .add('dff', 'dff', { asyncControls: false })
        .connect('clk.out', 'dff.clk')
        .connect('dff.qn', 'dff.d')
        .build();
    }

    // 4 clock pulses: 0 -> 1 -> 0 -> 1 -> 0 -> 1 -> 0 -> 1
    const clockLevels = [false, true, false, true, false, true, false, true];
    let prevComp = compileCircuit(buildToggleCircuit(false));
    let prevState = createInitialState(prevComp);

    // Initial settle with clk=0
    const initRes = settle(prevComp, prevState);
    expect(initRes.status).toBe('stable');
    expect(getOutputPinValue(initRes.state, 'dff', 'q')).toBe(0);
    prevState = initRes.state;

    const qValues: number[] = [];

    for (let i = 0; i < clockLevels.length; i++) {
      const clkLevel = clockLevels[i]!;
      const nextCircuit = buildToggleCircuit(clkLevel);
      const nextComp = compileCircuit(nextCircuit);
      const carried = carryOverState(prevComp, prevState, nextComp);
      const res = settle(nextComp, carried);
      expect(res.status).toBe('stable');

      const q = getOutputPinValue(res.state, 'dff', 'q');
      qValues.push(q);

      prevComp = nextComp;
      prevState = res.state;
    }

    // Phase 0 (clk 0): q holds 0
    // Phase 1 (clk 1 - edge 1): q flips to 1
    // Phase 2 (clk 0): q holds 1
    // Phase 3 (clk 1 - edge 2): q flips to 0
    // Phase 4 (clk 0): q holds 0
    // Phase 5 (clk 1 - edge 3): q flips to 1
    // Phase 6 (clk 0): q holds 1
    // Phase 7 (clk 1 - edge 4): q flips to 0
    expect(qValues).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
  });

  it('verifies async clear resets q immediately without a clock edge', () => {
    function buildAsyncCircuit(dVal: boolean, clkVal: boolean, clrVal: boolean) {
      return new CircuitBuilder()
        .add('sw_d', 'inputSwitch', { value: dVal })
        .add('clk', 'clock', { value: clkVal })
        .add('sw_clr', 'inputSwitch', { value: clrVal })
        .add('dff', 'dff', { asyncControls: true })
        .connect('sw_d.out', 'dff.d')
        .connect('clk.out', 'dff.clk')
        .connect('sw_clr.out', 'dff.clr')
        .build();
    }

    // Set q to 1 on clock rising edge with clr=0
    const c1 = buildAsyncCircuit(true, false, false);
    const comp1 = compileCircuit(c1);
    const s1 = createInitialState(comp1);
    const res1 = settle(comp1, s1);

    const c2 = buildAsyncCircuit(true, true, false);
    const comp2 = compileCircuit(c2);
    const s2 = carryOverState(comp1, res1.state, comp2);
    const res2 = settle(comp2, s2);
    expect(getOutputPinValue(res2.state, 'dff', 'q')).toBe(1);

    // Now clock goes low, clr becomes 1 (no clock edge)
    const c3 = buildAsyncCircuit(true, false, true);
    const comp3 = compileCircuit(c3);
    const s3 = carryOverState(comp2, res2.state, comp3);
    const res3 = settle(comp3, s3);
    expect(res3.status).toBe('stable');
    expect(getOutputPinValue(res3.state, 'dff', 'q')).toBe(0);
  });

  it('verifies two chained flip-flops advance data one stage per clock edge without race-through', () => {
    function buildChainedCircuit(dVal: boolean, clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_d', 'inputSwitch', { value: dVal })
        .add('clk', 'clock', { value: clkVal })
        .add('ff1', 'dff', { asyncControls: false })
        .add('ff2', 'dff', { asyncControls: false })
        .connect('sw_d.out', 'ff1.d')
        .connect('clk.out', 'ff1.clk')
        .connect('ff1.q', 'ff2.d')
        .connect('clk.out', 'ff2.clk')
        .build();
    }

    // Initialize with D=1, Clock=0 -> ff1.q = 0, ff2.q = 0
    const c0 = buildChainedCircuit(true, false);
    const comp0 = compileCircuit(c0);
    const s0 = createInitialState(comp0);
    const res0 = settle(comp0, s0);
    expect(getOutputPinValue(res0.state, 'ff1', 'q')).toBe(0);
    expect(getOutputPinValue(res0.state, 'ff2', 'q')).toBe(0);

    // 1st rising edge (Clock 0 -> 1): ff1 gets D (1), ff2 gets previous ff1.q (0)
    const c1 = buildChainedCircuit(true, true);
    const comp1 = compileCircuit(c1);
    const s1 = carryOverState(comp0, res0.state, comp1);
    const res1 = settle(comp1, s1);
    expect(res1.status).toBe('stable');
    expect(getOutputPinValue(res1.state, 'ff1', 'q')).toBe(1);
    expect(getOutputPinValue(res1.state, 'ff2', 'q')).toBe(0);

    // Clock falling edge (Clock 1 -> 0): state holds
    const c2 = buildChainedCircuit(true, false);
    const comp2 = compileCircuit(c2);
    const s2 = carryOverState(comp1, res1.state, comp2);
    const res2 = settle(comp2, s2);
    expect(res2.status).toBe('stable');
    expect(getOutputPinValue(res2.state, 'ff1', 'q')).toBe(1);
    expect(getOutputPinValue(res2.state, 'ff2', 'q')).toBe(0);

    // 2nd rising edge (Clock 0 -> 1): ff2 gets previous ff1.q (1)
    const c3 = buildChainedCircuit(true, true);
    const comp3 = compileCircuit(c3);
    const s3 = carryOverState(comp2, res2.state, comp3);
    const res3 = settle(comp3, s3);
    expect(res3.status).toBe('stable');
    expect(getOutputPinValue(res3.state, 'ff1', 'q')).toBe(1);
    expect(getOutputPinValue(res3.state, 'ff2', 'q')).toBe(1);
  });

  it('verifies JK flip-flop toggle sequence with J=1, K=1 across rising edges', () => {
    function buildJkCircuit(clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_j', 'inputSwitch', { value: true })
        .add('sw_k', 'inputSwitch', { value: true })
        .add('clk', 'clock', { value: clkVal })
        .add('jkff', 'jkff', { asyncControls: false })
        .connect('sw_j.out', 'jkff.j')
        .connect('sw_k.out', 'jkff.k')
        .connect('clk.out', 'jkff.clk')
        .build();
    }

    // Initial state: clk=0 -> q=0
    let prevComp = compileCircuit(buildJkCircuit(false));
    let prevState = createInitialState(prevComp);
    const initRes = settle(prevComp, prevState);
    expect(initRes.status).toBe('stable');
    expect(getOutputPinValue(initRes.state, 'jkff', 'q')).toBe(0);
    prevState = initRes.state;

    // 5 phases: 0->1 (toggle to 1), 1->0 (hold 1), 0->1 (toggle to 0), 1->0 (hold 0), 0->1 (toggle to 1)
    const phases = [true, false, true, false, true];
    const expectedQ = [1, 1, 0, 0, 1];

    for (let i = 0; i < phases.length; i++) {
      const clkVal = phases[i]!;
      const nextComp = compileCircuit(buildJkCircuit(clkVal));
      const carried = carryOverState(prevComp, prevState, nextComp);
      const res = settle(nextComp, carried);
      expect(res.status).toBe('stable');
      expect(getOutputPinValue(res.state, 'jkff', 'q')).toBe(expectedQ[i]);
      prevComp = nextComp;
      prevState = res.state;
    }
  });

  it('verifies T flip-flop as frequency divider flips on each rising edge only', () => {
    function buildTCircuit(clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_t', 'inputSwitch', { value: true })
        .add('clk', 'clock', { value: clkVal })
        .add('tff', 'tff', { asyncControls: false })
        .connect('sw_t.out', 'tff.t')
        .connect('clk.out', 'tff.clk')
        .build();
    }

    let prevComp = compileCircuit(buildTCircuit(false));
    let prevState = createInitialState(prevComp);
    const initRes = settle(prevComp, prevState);
    expect(initRes.status).toBe('stable');
    expect(getOutputPinValue(initRes.state, 'tff', 'q')).toBe(0);
    prevState = initRes.state;

    const phases = [true, false, true, false, true];
    const expectedQ = [1, 1, 0, 0, 1];

    for (let i = 0; i < phases.length; i++) {
      const clkVal = phases[i]!;
      const nextComp = compileCircuit(buildTCircuit(clkVal));
      const carried = carryOverState(prevComp, prevState, nextComp);
      const res = settle(nextComp, carried);
      expect(res.status).toBe('stable');
      expect(getOutputPinValue(res.state, 'tff', 'q')).toBe(expectedQ[i]);
      prevComp = nextComp;
      prevState = res.state;
    }
  });

  it('verifies 4-bit register loads on clock edge and holds when clock is held', () => {
    function buildRegCircuit(dVals: [boolean, boolean, boolean, boolean], clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_d0', 'inputSwitch', { value: dVals[0] })
        .add('sw_d1', 'inputSwitch', { value: dVals[1] })
        .add('sw_d2', 'inputSwitch', { value: dVals[2] })
        .add('sw_d3', 'inputSwitch', { value: dVals[3] })
        .add('clk', 'clock', { value: clkVal })
        .add('reg', 'register', { bits: 4 })
        .add('led0', 'outputLed', {})
        .add('led1', 'outputLed', {})
        .add('led2', 'outputLed', {})
        .add('led3', 'outputLed', {})
        .connect('sw_d0.out', 'reg.d0')
        .connect('sw_d1.out', 'reg.d1')
        .connect('sw_d2.out', 'reg.d2')
        .connect('sw_d3.out', 'reg.d3')
        .connect('clk.out', 'reg.clk')
        .connect('reg.q0', 'led0.in')
        .connect('reg.q1', 'led1.in')
        .connect('reg.q2', 'led2.in')
        .connect('reg.q3', 'led3.in')
        .build();
    }

    // Phase 1: Set data to 1010 (d0=0, d1=1, d2=0, d3=1) with clock low -> outputs stay 0
    let prevComp = compileCircuit(buildRegCircuit([false, true, false, true], false));
    let prevState = createInitialState(prevComp);
    let res = settle(prevComp, prevState);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'reg', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q3')).toBe(0);
    prevState = res.state;

    // Phase 2: Raise clock -> outputs become 1010 (q0=0, q1=1, q2=0, q3=1)
    let nextComp = compileCircuit(buildRegCircuit([false, true, false, true], true));
    let carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'reg', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q1')).toBe(1);
    expect(getOutputPinValue(res.state, 'reg', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q3')).toBe(1);
    prevComp = nextComp;
    prevState = res.state;

    // Phase 3: Change data to 0101 (d0=1, d1=0, d2=1, d3=0) with clock held high -> outputs still 1010
    nextComp = compileCircuit(buildRegCircuit([true, false, true, false], true));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'reg', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q1')).toBe(1);
    expect(getOutputPinValue(res.state, 'reg', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q3')).toBe(1);
    prevComp = nextComp;
    prevState = res.state;

    // Phase 4: Lower clock -> outputs still 1010
    nextComp = compileCircuit(buildRegCircuit([true, false, true, false], false));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    prevComp = nextComp;
    prevState = res.state;

    // Phase 5: Raise clock -> outputs become 0101 (q0=1, q1=0, q2=1, q3=0)
    nextComp = compileCircuit(buildRegCircuit([true, false, true, false], true));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'reg', 'q0')).toBe(1);
    expect(getOutputPinValue(res.state, 'reg', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'reg', 'q2')).toBe(1);
    expect(getOutputPinValue(res.state, 'reg', 'q3')).toBe(0);
  });

  it('verifies shift register serial-in chain moves bits through stages', () => {
    function buildShiftCircuit(siVal: boolean, clkVal: boolean) {
      return new CircuitBuilder()
        .add('sw_si', 'inputSwitch', { value: siVal })
        .add('clk', 'clock', { value: clkVal })
        .add('sr', 'shiftRegister', { bits: 4 })
        .connect('sw_si.out', 'sr.si')
        .connect('clk.out', 'sr.clk')
        .build();
    }

    // Step 0: Initial state with si=1, clk=0 -> all 0
    let prevComp = compileCircuit(buildShiftCircuit(true, false));
    let prevState = createInitialState(prevComp);
    let res = settle(prevComp, prevState);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'sr', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q3')).toBe(0);
    prevState = res.state;

    // Edge 1: clk 0 -> 1 with si=1 -> q0=1, q1=0, q2=0, q3=0
    let nextComp = compileCircuit(buildShiftCircuit(true, true));
    let carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'sr', 'q0')).toBe(1);
    expect(getOutputPinValue(res.state, 'sr', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q3')).toBe(0);
    prevComp = nextComp;
    prevState = res.state;

    // Lower clk with si=0
    nextComp = compileCircuit(buildShiftCircuit(false, false));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    prevComp = nextComp;
    prevState = res.state;

    // Edge 2: clk 0 -> 1 with si=0 -> q0=0, q1=1, q2=0, q3=0
    nextComp = compileCircuit(buildShiftCircuit(false, true));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'sr', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q1')).toBe(1);
    expect(getOutputPinValue(res.state, 'sr', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q3')).toBe(0);
    prevComp = nextComp;
    prevState = res.state;

    // Lower clk
    nextComp = compileCircuit(buildShiftCircuit(false, false));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    prevComp = nextComp;
    prevState = res.state;

    // Edge 3: clk 0 -> 1 with si=0 -> q0=0, q1=0, q2=1, q3=0
    nextComp = compileCircuit(buildShiftCircuit(false, true));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'sr', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q2')).toBe(1);
    expect(getOutputPinValue(res.state, 'sr', 'q3')).toBe(0);
    prevComp = nextComp;
    prevState = res.state;

    // Lower clk
    nextComp = compileCircuit(buildShiftCircuit(false, false));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    prevComp = nextComp;
    prevState = res.state;

    // Edge 4: clk 0 -> 1 with si=0 -> q0=0, q1=0, q2=0, q3=1
    nextComp = compileCircuit(buildShiftCircuit(false, true));
    carried = carryOverState(prevComp, prevState, nextComp);
    res = settle(nextComp, carried);
    expect(res.status).toBe('stable');
    expect(getOutputPinValue(res.state, 'sr', 'q0')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q1')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q2')).toBe(0);
    expect(getOutputPinValue(res.state, 'sr', 'q3')).toBe(1);
  });
});
