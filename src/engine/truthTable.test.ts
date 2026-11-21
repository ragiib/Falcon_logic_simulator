import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import { CURRENT_SCHEMA_VERSION } from '@/model';
import { CircuitBuilder } from './testing/builder';
import {
  MAX_TRUTH_TABLE_INPUTS,
  generateTruthTable,
  hasFeedbackLoop,
  type TruthTableCircuit,
} from './index';

describe('truthTable generator', () => {
  it('single AND gate with 2 switches and 1 LED: 4 rows in order 00, 01, 10, 11 with outputs 0,0,0,1 and default names', () => {
    const circuit = new CircuitBuilder()
      .add('sw1', 'inputSwitch', { value: false })
      .add('sw2', 'inputSwitch', { value: false })
      .add('and1', 'and', { inputs: 2 })
      .add('led1', 'outputLed')
      .connect('sw1.out', 'and1.in0')
      .connect('sw2.out', 'and1.in1')
      .connect('and1.out', 'led1.in')
      .build();

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs.map((c) => c.name)).toEqual(['IN1', 'IN2']);
    expect(res.outputs.map((c) => c.name)).toEqual(['OUT1']);
    expect(res.rows).toEqual([
      { inputs: [0, 0], outputs: [0] },
      { inputs: [0, 1], outputs: [0] },
      { inputs: [1, 0], outputs: [0] },
      { inputs: [1, 1], outputs: [1] },
    ]);
  });

  it('row order check with 3 inputs: row index 5 (binary 101) has inputs [1,0,1]', () => {
    const circuit = new CircuitBuilder()
      .add('sw1', 'inputSwitch')
      .add('sw2', 'inputSwitch')
      .add('sw3', 'inputSwitch')
      .add('led1', 'outputLed')
      .connect('sw1.out', 'led1.in')
      .build();

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.rows).toHaveLength(8);
    expect(res.rows[5]?.inputs).toEqual([1, 0, 1]);
    expect(res.rows[0]?.inputs).toEqual([0, 0, 0]);
    expect(res.rows[7]?.inputs).toEqual([1, 1, 1]);
  });

  it('half adder (XOR + AND, 2 switches, 2 LEDs): outputs Sum/Carry correct for all rows with custom labels', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'swA', type: 'inputSwitch', params: { value: false }, label: 'A' },
        { id: 'swB', type: 'inputSwitch', params: { value: false }, label: 'B' },
        { id: 'xor1', type: 'xor', params: { inputs: 2 } },
        { id: 'and1', type: 'and', params: { inputs: 2 } },
        { id: 'ledSum', type: 'outputLed', params: {}, label: 'Sum' },
        { id: 'ledCarry', type: 'outputLed', params: {}, label: 'Carry' },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'swA', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'in0' },
        },
        {
          id: 'w2',
          from: { componentId: 'swB', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'in1' },
        },
        {
          id: 'w3',
          from: { componentId: 'swA', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in0' },
        },
        {
          id: 'w4',
          from: { componentId: 'swB', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in1' },
        },
        {
          id: 'w5',
          from: { componentId: 'xor1', pinId: 'out' },
          to: { componentId: 'ledSum', pinId: 'in' },
        },
        {
          id: 'w6',
          from: { componentId: 'and1', pinId: 'out' },
          to: { componentId: 'ledCarry', pinId: 'in' },
        },
      ],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs.map((c) => c.name)).toEqual(['A', 'B']);
    expect(res.outputs.map((c) => c.name)).toEqual(['Sum', 'Carry']);
    expect(res.rows).toEqual([
      { inputs: [0, 0], outputs: [0, 0] },
      { inputs: [0, 1], outputs: [1, 0] },
      { inputs: [1, 0], outputs: [1, 0] },
      { inputs: [1, 1], outputs: [0, 1] },
    ]);
  });

  it('full adder (2 XOR, 2 AND, 1 OR; 3 switches, 2 LEDs): all 8 rows correct', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'swA', type: 'inputSwitch', params: {}, label: 'A' },
        { id: 'swB', type: 'inputSwitch', params: {}, label: 'B' },
        { id: 'swCin', type: 'inputSwitch', params: {}, label: 'Cin' },
        { id: 'xor1', type: 'xor', params: { inputs: 2 } },
        { id: 'xor2', type: 'xor', params: { inputs: 2 } },
        { id: 'and1', type: 'and', params: { inputs: 2 } },
        { id: 'and2', type: 'and', params: { inputs: 2 } },
        { id: 'or1', type: 'or', params: { inputs: 2 } },
        { id: 'ledSum', type: 'outputLed', params: {}, label: 'Sum' },
        { id: 'ledCout', type: 'outputLed', params: {}, label: 'Cout' },
      ],
      wires: [
        // xor1 = A XOR B
        {
          id: 'w1',
          from: { componentId: 'swA', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'in0' },
        },
        {
          id: 'w2',
          from: { componentId: 'swB', pinId: 'out' },
          to: { componentId: 'xor1', pinId: 'in1' },
        },
        // Sum = xor1 XOR Cin
        {
          id: 'w3',
          from: { componentId: 'xor1', pinId: 'out' },
          to: { componentId: 'xor2', pinId: 'in0' },
        },
        {
          id: 'w4',
          from: { componentId: 'swCin', pinId: 'out' },
          to: { componentId: 'xor2', pinId: 'in1' },
        },
        {
          id: 'w5',
          from: { componentId: 'xor2', pinId: 'out' },
          to: { componentId: 'ledSum', pinId: 'in' },
        },
        // and1 = A AND B
        {
          id: 'w6',
          from: { componentId: 'swA', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in0' },
        },
        {
          id: 'w7',
          from: { componentId: 'swB', pinId: 'out' },
          to: { componentId: 'and1', pinId: 'in1' },
        },
        // and2 = xor1 AND Cin
        {
          id: 'w8',
          from: { componentId: 'xor1', pinId: 'out' },
          to: { componentId: 'and2', pinId: 'in0' },
        },
        {
          id: 'w9',
          from: { componentId: 'swCin', pinId: 'out' },
          to: { componentId: 'and2', pinId: 'in1' },
        },
        // Cout = and1 OR and2
        {
          id: 'w10',
          from: { componentId: 'and1', pinId: 'out' },
          to: { componentId: 'or1', pinId: 'in0' },
        },
        {
          id: 'w11',
          from: { componentId: 'and2', pinId: 'out' },
          to: { componentId: 'or1', pinId: 'in1' },
        },
        {
          id: 'w12',
          from: { componentId: 'or1', pinId: 'out' },
          to: { componentId: 'ledCout', pinId: 'in' },
        },
      ],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.rows).toEqual([
      { inputs: [0, 0, 0], outputs: [0, 0] },
      { inputs: [0, 0, 1], outputs: [1, 0] },
      { inputs: [0, 1, 0], outputs: [1, 0] },
      { inputs: [0, 1, 1], outputs: [0, 1] },
      { inputs: [1, 0, 0], outputs: [1, 0] },
      { inputs: [1, 0, 1], outputs: [0, 1] },
      { inputs: [1, 1, 0], outputs: [0, 1] },
      { inputs: [1, 1, 1], outputs: [1, 1] },
    ]);
  });

  it('column ordering by position: sorted by y asc, then x asc; unpositioned components keep circuit order after positioned ones', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'sw_unpos1', type: 'inputSwitch', params: {}, label: 'Unpos1' },
        {
          id: 'sw_bottom',
          type: 'inputSwitch',
          position: { x: 50, y: 200 },
          params: {},
          label: 'Bottom',
        },
        {
          id: 'sw_top_right',
          type: 'inputSwitch',
          position: { x: 100, y: 10 },
          params: {},
          label: 'TopRight',
        },
        {
          id: 'sw_top_left',
          type: 'inputSwitch',
          position: { x: 20, y: 10 },
          params: {},
          label: 'TopLeft',
        },
        { id: 'sw_unpos2', type: 'inputSwitch', params: {}, label: 'Unpos2' },
        { id: 'led1', type: 'outputLed', params: {} },
      ],
      wires: [],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs.map((c) => c.name)).toEqual([
      'TopLeft',
      'TopRight',
      'Bottom',
      'Unpos1',
      'Unpos2',
    ]);
  });

  it('duplicate labels become A, A (2); a label that collides with a suffixed name stays unique', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'sw1', type: 'inputSwitch', params: {}, label: 'A' },
        { id: 'sw2', type: 'inputSwitch', params: {}, label: 'A (2)' },
        { id: 'sw3', type: 'inputSwitch', params: {}, label: 'A' },
        { id: 'led1', type: 'outputLed', params: {} },
      ],
      wires: [],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs.map((c) => c.name)).toEqual(['A', 'A (2)', 'A (3)']);
  });

  it('whitespace-only label falls back to the default name', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'sw1', type: 'inputSwitch', params: {}, label: '   ' },
        { id: 'led1', type: 'outputLed', params: {}, label: '' },
      ],
      wires: [],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs[0]?.name).toBe('IN1');
    expect(res.outputs[0]?.name).toBe('OUT1');
  });

  it("a switch's current params.value does not affect the generated truth table", () => {
    const c1 = new CircuitBuilder()
      .add('sw1', 'inputSwitch', { value: false })
      .add('led1', 'outputLed')
      .connect('sw1.out', 'led1.in')
      .build();

    const c2 = new CircuitBuilder()
      .add('sw1', 'inputSwitch', { value: true })
      .add('led1', 'outputLed')
      .connect('sw1.out', 'led1.in')
      .build();

    const res1 = generateTruthTable(c1);
    const res2 = generateTruthTable(c2);

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    expect(res1.rows).toEqual(res2.rows);
    expect(res1.rows).toEqual([
      { inputs: [0], outputs: [0] },
      { inputs: [1], outputs: [1] },
    ]);
  });

  describe('failures and limits', () => {
    it('returns noInputs when zero switches present', () => {
      const circuit = new CircuitBuilder().add('led1', 'outputLed').build();
      const res = generateTruthTable(circuit);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('noInputs');
        expect(res.message).toBe('Add at least one Input Switch to generate a truth table.');
      }
    });

    it('returns noOutputs when zero LEDs present', () => {
      const circuit = new CircuitBuilder().add('sw1', 'inputSwitch').build();
      const res = generateTruthTable(circuit);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('noOutputs');
        expect(res.message).toBe('Add at least one Output LED to generate a truth table.');
      }
    });

    it('returns tooManyInputs when more than MAX_TRUTH_TABLE_INPUTS switches are present', () => {
      const b = new CircuitBuilder();
      for (let i = 1; i <= 11; i++) {
        b.add(`sw${i}`, 'inputSwitch');
      }
      b.add('led1', 'outputLed');

      const res = generateTruthTable(b.build());
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('tooManyInputs');
        expect(res.message).toContain('11');
        expect(res.message).toContain('10');
      }
    });

    it('exactly 10 switches builds 1024 rows', () => {
      const b = new CircuitBuilder();
      for (let i = 1; i <= MAX_TRUTH_TABLE_INPUTS; i++) {
        b.add(`sw${i}`, 'inputSwitch');
      }
      b.add('led1', 'outputLed');
      b.connect('sw1.out', 'led1.in');

      const res = generateTruthTable(b.build());
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.rows).toHaveLength(1024);
    });

    it('returns circuitIssues when circuit has compilation issues', () => {
      const circuit = new CircuitBuilder()
        .add('sw1', 'inputSwitch')
        .add('sw2', 'inputSwitch')
        .add('led1', 'outputLed')
        .connect('sw1.out', 'led1.in')
        .connect('sw2.out', 'led1.in') // Multiple drivers on led1.in
        .build();

      const res = generateTruthTable(circuit);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('circuitIssues');
        expect(res.message).toContain('Fix the circuit issues first:');
      }
    });

    it('returns notCombinational when a ring of NOT gates oscillates', () => {
      const circuit = new CircuitBuilder()
        .add('sw1', 'inputSwitch')
        .add('led1', 'outputLed')
        .add('not1', 'not')
        .add('not2', 'not')
        .add('not3', 'not')
        .connect('not1.out', 'not2.in0')
        .connect('not2.out', 'not3.in0')
        .connect('not3.out', 'not1.in0')
        .connect('sw1.out', 'led1.in')
        .build();

      const res = generateTruthTable(circuit);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('notCombinational');
      }
    });

    it('returns notCombinational for an SR latch with feedback before enumerating rows', () => {
      const circuit: TruthTableCircuit = {
        components: [
          { id: 'swS', type: 'inputSwitch', params: {}, label: 'S' },
          { id: 'swR', type: 'inputSwitch', params: {}, label: 'R' },
          { id: 'nor1', type: 'nor', params: { inputs: 2 } },
          { id: 'nor2', type: 'nor', params: { inputs: 2 } },
          { id: 'ledQ', type: 'outputLed', params: {}, label: 'Q' },
          { id: 'ledQbar', type: 'outputLed', params: {}, label: 'Qbar' },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'swR', pinId: 'out' },
            to: { componentId: 'nor1', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'nor2', pinId: 'out' },
            to: { componentId: 'nor1', pinId: 'in1' },
          },
          {
            id: 'w3',
            from: { componentId: 'swS', pinId: 'out' },
            to: { componentId: 'nor2', pinId: 'in0' },
          },
          {
            id: 'w4',
            from: { componentId: 'nor1', pinId: 'out' },
            to: { componentId: 'nor2', pinId: 'in1' },
          },
          {
            id: 'w5',
            from: { componentId: 'nor1', pinId: 'out' },
            to: { componentId: 'ledQ', pinId: 'in' },
          },
          {
            id: 'w6',
            from: { componentId: 'nor2', pinId: 'out' },
            to: { componentId: 'ledQbar', pinId: 'in' },
          },
        ],
      };

      const res = generateTruthTable(circuit);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('notCombinational');
        expect(res.message).toBe(
          'This circuit contains a feedback loop, so its output may depend on history. Truth tables are only generated for combinational circuits.',
        );
      }
    });
  });

  describe('hasFeedbackLoop helper', () => {
    it('returns false for a simple feedforward chain', () => {
      const circuit: TruthTableCircuit = {
        components: [
          { id: 'a', type: 'and', params: {} },
          { id: 'b', type: 'and', params: {} },
          { id: 'c', type: 'and', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'b', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'b', pinId: 'out' },
            to: { componentId: 'c', pinId: 'in0' },
          },
        ],
      };
      expect(hasFeedbackLoop(circuit)).toBe(false);
    });

    it('returns true for a ring', () => {
      const circuit: TruthTableCircuit = {
        components: [
          { id: 'a', type: 'and', params: {} },
          { id: 'b', type: 'and', params: {} },
          { id: 'c', type: 'and', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'b', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'b', pinId: 'out' },
            to: { componentId: 'c', pinId: 'in0' },
          },
          {
            id: 'w3',
            from: { componentId: 'c', pinId: 'out' },
            to: { componentId: 'a', pinId: 'in0' },
          },
        ],
      };
      expect(hasFeedbackLoop(circuit)).toBe(true);
    });

    it('returns true for a self-wired component', () => {
      const circuit: TruthTableCircuit = {
        components: [{ id: 'a', type: 'and', params: {} }],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'a', pinId: 'in0' },
          },
        ],
      };
      expect(hasFeedbackLoop(circuit)).toBe(true);
    });

    it('returns false when wires reference missing components', () => {
      const circuit: TruthTableCircuit = {
        components: [{ id: 'a', type: 'and', params: {} }],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'missing', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'missing', pinId: 'out' },
            to: { componentId: 'a', pinId: 'in0' },
          },
        ],
      };
      expect(hasFeedbackLoop(circuit)).toBe(false);
    });

    it('returns false for diamond-shaped fan-out / fan-in', () => {
      const circuit: TruthTableCircuit = {
        components: [
          { id: 'a', type: 'and', params: {} },
          { id: 'b', type: 'and', params: {} },
          { id: 'c', type: 'and', params: {} },
          { id: 'd', type: 'and', params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'b', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'a', pinId: 'out' },
            to: { componentId: 'c', pinId: 'in0' },
          },
          {
            id: 'w3',
            from: { componentId: 'b', pinId: 'out' },
            to: { componentId: 'd', pinId: 'in0' },
          },
          {
            id: 'w4',
            from: { componentId: 'c', pinId: 'out' },
            to: { componentId: 'd', pinId: 'in1' },
          },
        ],
      };
      expect(hasFeedbackLoop(circuit)).toBe(false);
    });
  });

  it('never throws on empty circuit or wires pointing to nothing', () => {
    expect(() => generateTruthTable({ components: [], wires: [] })).not.toThrow();
    expect(generateTruthTable({ components: [], wires: [] })).toEqual({
      ok: false,
      reason: 'noInputs',
      message: 'Add at least one Input Switch to generate a truth table.',
    });

    const weirdCircuit: TruthTableCircuit = {
      components: [
        { id: 'sw1', type: 'inputSwitch', params: {} },
        { id: 'led1', type: 'outputLed', params: {} },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'ghost', pinId: 'out' },
          to: { componentId: 'phantom', pinId: 'in' },
        },
      ],
    };
    expect(() => generateTruthTable(weirdCircuit)).not.toThrow();
  });

  it('does not mutate the input circuit', () => {
    const circuit: TruthTableCircuit = {
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: false },
          label: 'In',
        },
        { id: 'led1', type: 'outputLed', position: { x: 100, y: 0 }, params: {}, label: 'Out' },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };

    const before = JSON.stringify(circuit);
    generateTruthTable(circuit);
    const after = JSON.stringify(circuit);

    expect(after).toBe(before);
  });

  it('accepts a model Circuit structurally', () => {
    const modelCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Model Circuit',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 10, y: 20 },
          params: { value: false },
          label: 'A',
        },
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 100, y: 20 },
          params: {},
          label: 'Y',
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

    const res = generateTruthTable(modelCircuit);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.inputs[0]?.name).toBe('A');
    expect(res.outputs[0]?.name).toBe('Y');
    expect(res.rows).toEqual([
      { inputs: [0], outputs: [0] },
      { inputs: [1], outputs: [1] },
    ]);
  });

  it('rejects circuits containing sequential components', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'sw1', type: 'inputSwitch', params: { value: false } },
        { id: 'clk1', type: 'clock', params: { value: false } },
        { id: 'dff1', type: 'dff', params: { asyncControls: false } },
        { id: 'led1', type: 'outputLed', params: {} },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'dff1', pinId: 'd' },
        },
        {
          id: 'w2',
          from: { componentId: 'clk1', pinId: 'out' },
          to: { componentId: 'dff1', pinId: 'clk' },
        },
        {
          id: 'w3',
          from: { componentId: 'dff1', pinId: 'q' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.reason).toBe('notCombinational');
    expect(res.message.toLowerCase()).toContain('sequential');
  });

  it('rejects circuits containing a register', () => {
    const circuit: TruthTableCircuit = {
      components: [
        { id: 'sw1', type: 'inputSwitch', params: { value: false } },
        { id: 'reg1', type: 'register', params: { bits: 4 } },
        { id: 'led1', type: 'outputLed', params: {} },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'reg1', pinId: 'd0' },
        },
        {
          id: 'w2',
          from: { componentId: 'reg1', pinId: 'q0' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };

    const res = generateTruthTable(circuit);
    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.reason).toBe('notCombinational');
  });
});
