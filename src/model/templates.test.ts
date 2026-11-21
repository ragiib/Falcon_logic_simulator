import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  fragmentOrigin,
  getTemplate,
  templateOffsetFor,
  templates,
  validateConnection,
  type Circuit,
  type CircuitFragment,
} from '@/model';
import { generateTruthTable, hasComponent } from '@/engine';

describe('templates', () => {
  it('has exactly 2 entries with ids halfAdder and fullAdder', () => {
    expect(templates).toHaveLength(2);
    expect(templates[0]?.id).toBe('halfAdder');
    expect(templates[1]?.id).toBe('fullAdder');
  });

  it('retrieves templates by id and returns undefined for unknown id', () => {
    const halfAdder = getTemplate('halfAdder');
    expect(halfAdder).toBeDefined();
    expect(halfAdder?.name).toBe('Half Adder');

    const fullAdder = getTemplate('fullAdder');
    expect(fullAdder).toBeDefined();
    expect(fullAdder?.name).toBe('Full Adder');

    expect(getTemplate('unknown')).toBeUndefined();
    expect(getTemplate('')).toBeUndefined();
  });

  describe('structural integrity of each template', () => {
    it.each(templates)('verifies $id has valid components and wires', (tpl) => {
      const compIds = tpl.fragment.components.map((c) => c.id);
      expect(new Set(compIds).size).toBe(compIds.length);

      const wireIds = tpl.fragment.wires.map((w) => w.id);
      expect(new Set(wireIds).size).toBe(wireIds.length);

      for (const comp of tpl.fragment.components) {
        expect(hasComponent(comp.type)).toBe(true);
        expect(comp.position.x % 16).toBe(0);
        expect(comp.position.y % 16).toBe(0);
      }

      // Replay wires incrementally against a Circuit with all components
      let testCircuit: Circuit = {
        version: CURRENT_SCHEMA_VERSION,
        name: 'Test Circuit',
        components: [...tpl.fragment.components],
        wires: [],
      };

      for (const wire of tpl.fragment.wires) {
        const check = validateConnection(testCircuit, wire.from, wire.to);
        expect(check.ok).toBe(true);
        testCircuit = {
          ...testCircuit,
          wires: [...testCircuit.wires, wire],
        };
      }

      expect(testCircuit.wires).toHaveLength(tpl.fragment.wires.length);
    });
  });

  describe('truth table verification', () => {
    it('verifies Half Adder truth table', () => {
      const tpl = getTemplate('halfAdder')!;
      const result = generateTruthTable({
        components: tpl.fragment.components,
        wires: tpl.fragment.wires,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.inputs.map((i) => i.name)).toEqual(['A', 'B']);
      expect(result.outputs.map((o) => o.name)).toEqual(['Sum', 'Carry']);
      expect(result.rows).toHaveLength(4);

      // (0,0) -> (0,0)
      expect(result.rows[0]?.inputs).toEqual([0, 0]);
      expect(result.rows[0]?.outputs).toEqual([0, 0]);

      // (0,1) -> (1,0)
      expect(result.rows[1]?.inputs).toEqual([0, 1]);
      expect(result.rows[1]?.outputs).toEqual([1, 0]);

      // (1,0) -> (1,0)
      expect(result.rows[2]?.inputs).toEqual([1, 0]);
      expect(result.rows[2]?.outputs).toEqual([1, 0]);

      // (1,1) -> (0,1)
      expect(result.rows[3]?.inputs).toEqual([1, 1]);
      expect(result.rows[3]?.outputs).toEqual([0, 1]);
    });

    it('verifies Full Adder truth table across all 8 rows', () => {
      const tpl = getTemplate('fullAdder')!;
      const result = generateTruthTable({
        components: tpl.fragment.components,
        wires: tpl.fragment.wires,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.inputs.map((i) => i.name)).toEqual(['A', 'B', 'Cin']);
      expect(result.outputs.map((o) => o.name)).toEqual(['Sum', 'Cout']);
      expect(result.rows).toHaveLength(8);

      for (const row of result.rows) {
        const [a, b, cin] = row.inputs;
        const [sum, cout] = row.outputs;

        const expectedSum = ((a ?? 0) + (b ?? 0) + (cin ?? 0)) % 2 === 1 ? 1 : 0;
        const expectedCout = (a ?? 0) + (b ?? 0) + (cin ?? 0) >= 2 ? 1 : 0;

        expect(sum).toBe(expectedSum);
        expect(cout).toBe(expectedCout);
      }
    });
  });

  describe('fragmentOrigin and templateOffsetFor', () => {
    it('returns min x and min y for templates', () => {
      const halfAdder = getTemplate('halfAdder')!;
      expect(fragmentOrigin(halfAdder.fragment)).toEqual({ x: 0, y: 0 });

      const fullAdder = getTemplate('fullAdder')!;
      expect(fragmentOrigin(fullAdder.fragment)).toEqual({ x: 0, y: 0 });
    });

    it('returns (0,0) for empty fragment', () => {
      expect(fragmentOrigin({ components: [], wires: [] })).toEqual({ x: 0, y: 0 });
    });

    it('computes correct origin for custom fragment with offset positions', () => {
      const customFragment: CircuitFragment = {
        components: [
          {
            id: 'c1',
            type: 'and',
            position: { x: 50, y: 120 },
            params: { inputs: 2 },
          },
          {
            id: 'c2',
            type: 'or',
            position: { x: 80, y: 40 },
            params: { inputs: 2 },
          },
        ],
        wires: [],
      };

      expect(fragmentOrigin(customFragment)).toEqual({ x: 50, y: 40 });
    });

    it('calculates correct templateOffsetFor shifting target minus origin', () => {
      const halfAdder = getTemplate('halfAdder')!;
      const offset = templateOffsetFor(halfAdder.fragment, { x: 160, y: 96 });
      expect(offset).toEqual({ x: 160, y: 96 });

      const customFragment: CircuitFragment = {
        components: [
          {
            id: 'c1',
            type: 'and',
            position: { x: 50, y: 40 },
            params: { inputs: 2 },
          },
        ],
        wires: [],
      };
      const customOffset = templateOffsetFor(customFragment, { x: 160, y: 96 });
      expect(customOffset).toEqual({ x: 110, y: 56 });
    });
  });
});
