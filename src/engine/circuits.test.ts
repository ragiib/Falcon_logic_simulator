import { describe, expect, it } from 'vitest';
import type { Signal } from '@/engine/types';
import type { SimCircuit } from '@/engine/simTypes';
import {
  carryOverState,
  compileCircuit,
  createInitialState,
  getInputPinValue,
  settle,
} from '@/engine/simulator';
import { CircuitBuilder, settleCircuit } from '@/engine/testing/builder';

describe('canonical circuits', () => {
  describe('half adder', () => {
    function buildHalfAdder(a: boolean, b: boolean): SimCircuit {
      return new CircuitBuilder()
        .add('swA', 'inputSwitch', { value: a })
        .add('swB', 'inputSwitch', { value: b })
        .add('xor1', 'xor')
        .add('and1', 'and')
        .add('sumLed', 'outputLed')
        .add('carryLed', 'outputLed')
        .connect('swA.out', 'xor1.in0')
        .connect('swB.out', 'xor1.in1')
        .connect('swA.out', 'and1.in0')
        .connect('swB.out', 'and1.in1')
        .connect('xor1.out', 'sumLed.in')
        .connect('and1.out', 'carryLed.in')
        .build();
    }

    const testCases: Array<{
      a: boolean;
      b: boolean;
      expectedSum: Signal;
      expectedCarry: Signal;
    }> = [
      { a: false, b: false, expectedSum: 0, expectedCarry: 0 },
      { a: false, b: true, expectedSum: 1, expectedCarry: 0 },
      { a: true, b: false, expectedSum: 1, expectedCarry: 0 },
      { a: true, b: true, expectedSum: 0, expectedCarry: 1 },
    ];

    for (const { a, b, expectedSum, expectedCarry } of testCases) {
      it(`evaluates a=${a}, b=${b} -> Sum=${expectedSum}, Carry=${expectedCarry}`, () => {
        const circuit = buildHalfAdder(a, b);
        const { compiled, result } = settleCircuit(circuit);

        expect(result.status).toBe('stable');
        expect(getInputPinValue(compiled, result.state, 'sumLed', 'in')).toBe(expectedSum);
        expect(getInputPinValue(compiled, result.state, 'carryLed', 'in')).toBe(expectedCarry);
      });
    }
  });

  describe('full adder', () => {
    function buildFullAdder(a: boolean, b: boolean, cin: boolean): SimCircuit {
      return (
        new CircuitBuilder()
          .add('swA', 'inputSwitch', { value: a })
          .add('swB', 'inputSwitch', { value: b })
          .add('swCin', 'inputSwitch', { value: cin })
          .add('xor1', 'xor')
          .add('xor2', 'xor')
          .add('and1', 'and')
          .add('and2', 'and')
          .add('or1', 'or')
          .add('sumLed', 'outputLed')
          .add('coutLed', 'outputLed')
          // Sum = (a ^ b) ^ cin
          .connect('swA.out', 'xor1.in0')
          .connect('swB.out', 'xor1.in1')
          .connect('xor1.out', 'xor2.in0')
          .connect('swCin.out', 'xor2.in1')
          .connect('xor2.out', 'sumLed.in')
          // Cout = ((a ^ b) & cin) | (a & b)
          .connect('xor1.out', 'and1.in0')
          .connect('swCin.out', 'and1.in1')
          .connect('swA.out', 'and2.in0')
          .connect('swB.out', 'and2.in1')
          .connect('and1.out', 'or1.in0')
          .connect('and2.out', 'or1.in1')
          .connect('or1.out', 'coutLed.in')
          .build()
      );
    }

    const testCases: Array<{
      a: boolean;
      b: boolean;
      cin: boolean;
      expectedSum: Signal;
      expectedCout: Signal;
    }> = [
      { a: false, b: false, cin: false, expectedSum: 0, expectedCout: 0 },
      { a: false, b: false, cin: true, expectedSum: 1, expectedCout: 0 },
      { a: false, b: true, cin: false, expectedSum: 1, expectedCout: 0 },
      { a: false, b: true, cin: true, expectedSum: 0, expectedCout: 1 },
      { a: true, b: false, cin: false, expectedSum: 1, expectedCout: 0 },
      { a: true, b: false, cin: true, expectedSum: 0, expectedCout: 1 },
      { a: true, b: true, cin: false, expectedSum: 0, expectedCout: 1 },
      { a: true, b: true, cin: true, expectedSum: 1, expectedCout: 1 },
    ];

    for (const { a, b, cin, expectedSum, expectedCout } of testCases) {
      it(`evaluates a=${a}, b=${b}, cin=${cin} -> Sum=${expectedSum}, Cout=${expectedCout}`, () => {
        const circuit = buildFullAdder(a, b, cin);
        const { compiled, result } = settleCircuit(circuit);

        expect(result.status).toBe('stable');
        expect(getInputPinValue(compiled, result.state, 'sumLed', 'in')).toBe(expectedSum);
        expect(getInputPinValue(compiled, result.state, 'coutLed', 'in')).toBe(expectedCout);
      });
    }
  });

  describe('ring oscillator', () => {
    it('oscillates with period 2 across 3 NOT gates in a feedback loop', () => {
      const circuit = new CircuitBuilder()
        .add('n1', 'not')
        .add('n2', 'not')
        .add('n3', 'not')
        .connect('n1.out', 'n2.in0')
        .connect('n2.out', 'n3.in0')
        .connect('n3.out', 'n1.in0')
        .build();

      const { result } = settleCircuit(circuit);
      expect(result.status).toBe('oscillating');
      expect(result.period).toBe(2);
    });
  });

  describe('SR latch from NOR gates', () => {
    function buildSrLatch(s: boolean, r: boolean): SimCircuit {
      return (
        new CircuitBuilder()
          .add('swS', 'inputSwitch', { value: s })
          .add('swR', 'inputSwitch', { value: r })
          .add('nor1', 'nor')
          .add('nor2', 'nor')
          .add('qLed', 'outputLed')
          .add('qbarLed', 'outputLed')
          // Q = nor(R, Qbar)
          .connect('swR.out', 'nor1.in0')
          .connect('nor2.out', 'nor1.in1')
          // Qbar = nor(S, Q)
          .connect('swS.out', 'nor2.in0')
          .connect('nor1.out', 'nor2.in1')
          .connect('nor1.out', 'qLed.in')
          .connect('nor2.out', 'qbarLed.in')
          .build()
      );
    }

    it('maintains state across S/R transitions using carryOverState', () => {
      // 1. Power-on with S=1, R=0 -> Q=1, Qbar=0
      const c1 = buildSrLatch(true, false);
      const comp1 = compileCircuit(c1);
      const s1 = createInitialState(comp1);
      const res1 = settle(comp1, s1);
      expect(res1.status).toBe('stable');
      expect(getInputPinValue(comp1, res1.state, 'qLed', 'in')).toBe(1);
      expect(getInputPinValue(comp1, res1.state, 'qbarLed', 'in')).toBe(0);

      // 2. S=0, R=0 (hold) -> still Q=1, Qbar=0
      const c2 = buildSrLatch(false, false);
      const comp2 = compileCircuit(c2);
      const s2 = carryOverState(comp1, res1.state, comp2);
      const res2 = settle(comp2, s2);
      expect(res2.status).toBe('stable');
      expect(getInputPinValue(comp2, res2.state, 'qLed', 'in')).toBe(1);
      expect(getInputPinValue(comp2, res2.state, 'qbarLed', 'in')).toBe(0);

      // 3. S=0, R=1 (reset) -> Q=0, Qbar=1
      const c3 = buildSrLatch(false, true);
      const comp3 = compileCircuit(c3);
      const s3 = carryOverState(comp2, res2.state, comp3);
      const res3 = settle(comp3, s3);
      expect(res3.status).toBe('stable');
      expect(getInputPinValue(comp3, res3.state, 'qLed', 'in')).toBe(0);
      expect(getInputPinValue(comp3, res3.state, 'qbarLed', 'in')).toBe(1);

      // 4. S=0, R=0 (hold) -> still Q=0, Qbar=1
      const c4 = buildSrLatch(false, false);
      const comp4 = compileCircuit(c4);
      const s4 = carryOverState(comp3, res3.state, comp4);
      const res4 = settle(comp4, s4);
      expect(res4.status).toBe('stable');
      expect(getInputPinValue(comp4, res4.state, 'qLed', 'in')).toBe(0);
      expect(getInputPinValue(comp4, res4.state, 'qbarLed', 'in')).toBe(1);
    });

    it('documents limitation: uninitialized power-on with S=0, R=0 oscillates with period 2', () => {
      // Documented limitation: an SR latch powered on with S=0, R=0 returns status 'oscillating' with period === 2.
      // This is expected for the synchronous unit-delay model: both NOR gates start at output 0,
      // so in tick 1 both see (0, 0) and output 1; in tick 2 both see 1 and output 0.
      // This symmetrical oscillation is a known race condition at power-on.
      const cOsc = buildSrLatch(false, false);
      const compOsc = compileCircuit(cOsc);
      const sOsc = createInitialState(compOsc);
      const resOsc = settle(compOsc, sOsc);

      expect(resOsc.status).toBe('oscillating');
      expect(resOsc.period).toBe(2);
    });
  });
});
