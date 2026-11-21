import { describe, expect, it } from 'vitest';
import { generateTruthTable } from '@/engine';
import { CircuitBuilder } from '@/engine/testing/builder';

describe('combinational components integration', () => {
  it('generates correct truth table for 2:1 mux circuit', () => {
    const circuit = new CircuitBuilder()
      .add('d0', 'inputSwitch', { value: false })
      .add('d1', 'inputSwitch', { value: false })
      .add('s0', 'inputSwitch', { value: false })
      .add('m', 'mux', { selectBits: 1 })
      .add('led', 'outputLed', {})
      .connect('d0.out', 'm.d0')
      .connect('d1.out', 'm.d1')
      .connect('s0.out', 'm.s0')
      .connect('m.y', 'led.in')
      .build();

    // Assign positions so inputs and outputs sort predictably (top to bottom)
    const comps = circuit.components.map((c, i) => ({
      ...c,
      position: { x: 0, y: i * 50 },
    }));

    const result = generateTruthTable({
      components: comps,
      wires: circuit.wires,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(8);
    for (const row of result.rows) {
      const [d0, d1, s0] = row.inputs;
      const [y] = row.outputs;
      const expected = s0 === 1 ? d1 : d0;
      expect(y).toBe(expected);
    }
  });

  it('generates correct truth table for 2:4 decoder circuit', () => {
    const circuit = new CircuitBuilder()
      .add('a0', 'inputSwitch', { value: false })
      .add('a1', 'inputSwitch', { value: false })
      .add('dec', 'decoder', { bits: 2 })
      .add('led0', 'outputLed', {})
      .add('led1', 'outputLed', {})
      .add('led2', 'outputLed', {})
      .add('led3', 'outputLed', {})
      .connect('a0.out', 'dec.a0')
      .connect('a1.out', 'dec.a1')
      .connect('dec.y0', 'led0.in')
      .connect('dec.y1', 'led1.in')
      .connect('dec.y2', 'led2.in')
      .connect('dec.y3', 'led3.in')
      .build();

    const comps = circuit.components.map((c, i) => ({
      ...c,
      position: { x: 0, y: i * 50 },
    }));

    const result = generateTruthTable({
      components: comps,
      wires: circuit.wires,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(4);
    for (const row of result.rows) {
      const [a0, a1] = row.inputs;
      const addr = (a0 ?? 0) | ((a1 ?? 0) << 1);
      for (let i = 0; i < 4; i++) {
        expect(row.outputs[i]).toBe(i === addr ? 1 : 0);
      }
    }
  });

  it('generates correct truth table for 1-bit comparator circuit', () => {
    const circuit = new CircuitBuilder()
      .add('a0', 'inputSwitch', { value: false })
      .add('b0', 'inputSwitch', { value: false })
      .add('cmp', 'comparator', { bits: 1 })
      .add('led_gt', 'outputLed', {})
      .add('led_eq', 'outputLed', {})
      .add('led_lt', 'outputLed', {})
      .connect('a0.out', 'cmp.a0')
      .connect('b0.out', 'cmp.b0')
      .connect('cmp.gt', 'led_gt.in')
      .connect('cmp.eq', 'led_eq.in')
      .connect('cmp.lt', 'led_lt.in')
      .build();

    const comps = circuit.components.map((c, i) => ({
      ...c,
      position: { x: 0, y: i * 50 },
    }));

    const result = generateTruthTable({
      components: comps,
      wires: circuit.wires,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(4);
    for (const row of result.rows) {
      const [a0, b0] = row.inputs;
      const [gt, eq, lt] = row.outputs;

      expect(gt).toBe((a0 ?? 0) > (b0 ?? 0) ? 1 : 0);
      expect(eq).toBe((a0 ?? 0) === (b0 ?? 0) ? 1 : 0);
      expect(lt).toBe((a0 ?? 0) < (b0 ?? 0) ? 1 : 0);
    }
  });
});
