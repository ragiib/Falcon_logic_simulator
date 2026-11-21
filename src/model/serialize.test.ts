import { describe, expect, it } from 'vitest';
import type { Circuit } from './types';
import { MAX_COMPONENTS, MAX_FILE_CHARS, deserializeCircuit, serializeCircuit } from './serialize';

describe('model/serialize', () => {
  const createTestCircuit = (): Circuit => ({
    version: 1,
    name: 'Main Circuit',
    components: [
      {
        id: 'sw1',
        type: 'inputSwitch',
        label: 'Switch A',
        position: { x: 10, y: 20 },
        params: { value: true },
      },
      {
        id: 'and1',
        type: 'and',
        label: 'AND Gate',
        position: { x: 100, y: 50 },
        params: { inputs: 3 },
      },
      {
        id: 'led1',
        type: 'outputLed',
        position: { x: 200, y: 50 },
        params: {},
      },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'sw1', pinId: 'out' },
        to: { componentId: 'and1', pinId: 'in0' },
      },
      {
        id: 'w2',
        from: { componentId: 'and1', pinId: 'out' },
        to: { componentId: 'led1', pinId: 'in' },
      },
    ],
  });

  it('performs a lossless round-trip serialization and deserialization', () => {
    const circuit = createTestCircuit();
    const serialized = serializeCircuit(circuit);

    expect(serialized).toContain('"app": "logic-simulator"');
    expect(serialized).toContain('"version": 1');

    const result = deserializeCircuit(serialized);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toEqual([]);
      expect(result.circuit).toEqual(circuit);
    }
  });

  describe('validation errors', () => {
    it('returns error for invalid JSON', () => {
      const res = deserializeCircuit('invalid json {');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe('File is not valid JSON');
    });

    it('returns error for non-object JSON payloads', () => {
      expect(deserializeCircuit('[]')).toEqual({ ok: false, error: 'File is not a circuit' });
      expect(deserializeCircuit('null')).toEqual({ ok: false, error: 'File is not a circuit' });
      expect(deserializeCircuit('')).toEqual({ ok: false, error: 'File is not valid JSON' });
    });

    it('returns error for missing components or wrong version type', () => {
      const missingComponents = JSON.stringify({ version: 1, name: 'No Comps', wires: [] });
      const res1 = deserializeCircuit(missingComponents);
      expect(res1.ok).toBe(false);
      if (!res1.ok) expect(res1.error).toContain('Invalid circuit file');

      const wrongVersion = JSON.stringify({
        version: '1',
        name: 'Test',
        components: [],
        wires: [],
      });
      const res2 = deserializeCircuit(wrongVersion);
      expect(res2.ok).toBe(false);
      if (!res2.ok) expect(res2.error).toBe('Missing or invalid file version');
    });

    it('returns error for non-numeric component coordinates', () => {
      const badPos = JSON.stringify({
        version: 1,
        name: 'Bad Pos',
        components: [
          { id: 'c1', type: 'and', position: { x: 'ten', y: 20 }, params: { inputs: 2 } },
        ],
        wires: [],
      });
      const res = deserializeCircuit(badPos);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain('Invalid circuit file: components.0.position.x');
    });

    it('returns error for newer schema version', () => {
      const newer = JSON.stringify({
        version: 99,
        name: 'Future',
        components: [],
        wires: [],
      });
      const res = deserializeCircuit(newer);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain('file version 99');
    });

    it('returns error for unknown component type', () => {
      const unknownType = JSON.stringify({
        version: 1,
        name: 'Unknown',
        components: [{ id: 'u1', type: 'quantumGate', position: { x: 0, y: 0 }, params: {} }],
        wires: [],
      });
      const res = deserializeCircuit(unknownType);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe('Unknown component type: quantumGate');
    });

    it('returns error for duplicate component IDs', () => {
      const dupIds = JSON.stringify({
        version: 1,
        name: 'Dupes',
        components: [
          { id: 'c1', type: 'and', position: { x: 0, y: 0 }, params: { inputs: 2 } },
          { id: 'c1', type: 'or', position: { x: 50, y: 0 }, params: { inputs: 2 } },
        ],
        wires: [],
      });
      const res = deserializeCircuit(dupIds);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe('Duplicate component id: c1');
    });

    it('returns error when text exceeds MAX_FILE_CHARS', () => {
      const hugeText = ' '.repeat(MAX_FILE_CHARS + 1);
      const res = deserializeCircuit(hugeText);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe('File exceeds maximum allowed size');
    });

    it('returns error when component count exceeds MAX_COMPONENTS', () => {
      const components = Array.from({ length: MAX_COMPONENTS + 1 }, (_, i) => ({
        id: `c_${i}`,
        type: 'and',
        position: { x: 0, y: 0 },
        params: { inputs: 2 },
      }));
      const payload = JSON.stringify({
        version: 1,
        name: 'Too Many',
        components,
        wires: [],
      });
      const res = deserializeCircuit(payload);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain(`maximum component limit (${MAX_COMPONENTS})`);
    });
  });

  describe('repair and normalization', () => {
    it('drops invalid wires, duplicate wire ids, and reports warnings', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Repair Wires',
        components: [
          { id: 'sw', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: false } },
          { id: 'led', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
        ],
        wires: [
          // Valid wire
          {
            id: 'w1',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
          // Duplicate wire id w1
          {
            id: 'w1',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
          // Wire to non-existent pin
          {
            id: 'w2',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'nonExistentPin' },
          },
          // Wire into already-driven input pin (second wire into led.in)
          {
            id: 'w3',
            from: { componentId: 'sw', pinId: 'out' },
            to: { componentId: 'led', pinId: 'in' },
          },
          // Wire from input pin
          {
            id: 'w4',
            from: { componentId: 'led', pinId: 'in' },
            to: { componentId: 'led', pinId: 'in' },
          },
        ],
      });

      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.wires).toHaveLength(1);
        expect(res.circuit.wires[0]?.id).toBe('w1');
        expect(res.warnings).toHaveLength(4);
        expect(res.warnings[0]).toContain('Removed duplicate wire id w1');
        expect(res.warnings[1]).toContain('Removed invalid wire w2');
        expect(res.warnings[2]).toContain('Removed invalid wire w3');
        expect(res.warnings[3]).toContain('Removed invalid wire w4');
      }
    });

    it('normalizes params, removes undeclared params, and clamps out-of-range values', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Param Normalization',
        components: [
          {
            id: 'and1',
            type: 'and',
            position: { x: 0, y: 0 },
            params: {
              inputs: 99, // should clamp to 8
              extraUndeclaredParam: 'ignoreMe',
            },
          },
          {
            id: 'sw1',
            type: 'inputSwitch',
            position: { x: 50, y: 0 },
            params: {
              value: 'notABoolean', // should fallback to default false
            },
          },
        ],
        wires: [],
      });

      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        const andComp = res.circuit.components.find((c) => c.id === 'and1')!;
        expect(andComp.params['inputs']).toBe(8);
        expect('extraUndeclaredParam' in andComp.params).toBe(false);

        const swComp = res.circuit.components.find((c) => c.id === 'sw1')!;
        expect(swComp.params['value']).toBe(false);
      }
    });

    it('truncates labels to 16 characters and removes empty or whitespace labels', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Label Test',
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            label: 'ThisIsAVeryLongLabelThatShouldBeCutOff',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          {
            id: 'sw2',
            type: 'inputSwitch',
            label: '    ',
            position: { x: 50, y: 0 },
            params: { value: false },
          },
        ],
        wires: [],
      });

      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        const sw1 = res.circuit.components.find((c) => c.id === 'sw1')!;
        expect(sw1.label).toBe('ThisIsAVeryLongL');
        expect(sw1.label?.length).toBe(16);

        const sw2 = res.circuit.components.find((c) => c.id === 'sw2')!;
        expect(sw2.label).toBeUndefined();
      }
    });

    it('normalizes circuit name with trim, 80 char truncate, and fallback on empty', () => {
      const emptyNameJson = JSON.stringify({
        version: 1,
        name: '   ',
        components: [],
        wires: [],
      });
      const res1 = deserializeCircuit(emptyNameJson);
      expect(res1.ok).toBe(true);
      if (res1.ok) expect(res1.circuit.name).toBe('Untitled circuit');

      const longName = 'A'.repeat(200);
      const longNameJson = JSON.stringify({
        version: 1,
        name: longName,
        components: [],
        wires: [],
      });
      const res2 = deserializeCircuit(longNameJson);
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.circuit.name).toBe('A'.repeat(80));
        expect(res2.circuit.name.length).toBe(80);
      }
    });
  });

  describe('robustness against unexpected inputs', () => {
    it('round-trips a circuit containing a comparator with bits 4 unchanged', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Comparator Test',
        components: [
          {
            id: 'cmp1',
            type: 'comparator',
            position: { x: 50, y: 50 },
            params: { bits: 4 },
          },
        ],
        wires: [],
      };
      const serialized = serializeCircuit(circuit);
      const deserialized = deserializeCircuit(serialized);
      expect(deserialized.ok).toBe(true);
      if (deserialized.ok) {
        expect(deserialized.circuit.components[0]?.params['bits']).toBe(4);
      }
    });

    it('loads a mux with selectBits 99 clamped to 3 with no error', () => {
      const json = JSON.stringify({
        app: 'logic-simulator',
        version: 1,
        name: 'Mux Clamp Test',
        components: [
          {
            id: 'm1',
            type: 'mux',
            position: { x: 0, y: 0 },
            params: { selectBits: 99 },
          },
        ],
        wires: [],
      });
      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.components[0]?.params['selectBits']).toBe(3);
      }
    });

    it('round-trips a circuit with a clock and dff with asyncControls unchanged', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Sequential Round Trip',
        components: [
          {
            id: 'clk1',
            type: 'clock',
            position: { x: 0, y: 0 },
            params: { value: true },
          },
          {
            id: 'dff1',
            type: 'dff',
            position: { x: 100, y: 0 },
            params: { asyncControls: true },
          },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'clk1', pinId: 'out' },
            to: { componentId: 'dff1', pinId: 'clk' },
          },
        ],
      };

      const serialized = serializeCircuit(circuit);
      const res = deserializeCircuit(serialized);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.components[0]?.params['value']).toBe(true);
        expect(res.circuit.components[1]?.params['asyncControls']).toBe(true);
        expect(res.circuit.wires).toHaveLength(1);
      }
    });

    it('loads a dff with wrong-typed asyncControls as false', () => {
      const json = JSON.stringify({
        app: 'logic-simulator',
        version: 1,
        name: 'DFF Wrong Param Test',
        components: [
          {
            id: 'dff1',
            type: 'dff',
            position: { x: 0, y: 0 },
            params: { asyncControls: 'invalid_string' },
          },
        ],
        wires: [],
      });
      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.components[0]?.params['asyncControls']).toBe(false);
      }
    });

    it('round-trips a circuit with jkff, register, and shiftRegister with wires unchanged', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Sequential Multi-Component Test',
        components: [
          {
            id: 'jk1',
            type: 'jkff',
            position: { x: 0, y: 0 },
            params: { asyncControls: false },
          },
          {
            id: 'reg1',
            type: 'register',
            position: { x: 120, y: 0 },
            params: { bits: 8, loadEnable: true, asyncClear: false },
          },
          {
            id: 'sr1',
            type: 'shiftRegister',
            position: { x: 240, y: 0 },
            params: { bits: 4, asyncClear: true },
          },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'jk1', pinId: 'q' },
            to: { componentId: 'reg1', pinId: 'd0' },
          },
          {
            id: 'w2',
            from: { componentId: 'reg1', pinId: 'q0' },
            to: { componentId: 'sr1', pinId: 'si' },
          },
        ],
      };

      const serialized = serializeCircuit(circuit);
      const res = deserializeCircuit(serialized);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.components).toHaveLength(3);
        expect(res.circuit.wires).toHaveLength(2);
        expect(res.circuit.components[1]?.params['bits']).toBe(8);
        expect(res.circuit.components[1]?.params['loadEnable']).toBe(true);
        expect(res.circuit.components[2]?.params['bits']).toBe(4);
        expect(res.circuit.components[2]?.params['asyncClear']).toBe(true);
      }
    });

    it('clamps register bits to 8 and coerces invalid loadEnable to false', () => {
      const json = JSON.stringify({
        app: 'logic-simulator',
        version: 1,
        name: 'Register Clamping Test',
        components: [
          {
            id: 'reg1',
            type: 'register',
            position: { x: 0, y: 0 },
            params: { bits: 99, loadEnable: 'not_a_boolean' },
          },
        ],
        wires: [],
      });
      const res = deserializeCircuit(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.circuit.components[0]?.params['bits']).toBe(8);
        expect(res.circuit.components[0]?.params['loadEnable']).toBe(false);
      }
    });

    it('never throws for arbitrary inputs', () => {
      const inputs = [
        '{}',
        '[]',
        'true',
        '"x"',
        '{"version":1}',
        'undefined',
        'null',
        '{"version": 1, "components": null}',
      ];
      for (const input of inputs) {
        expect(() => deserializeCircuit(input)).not.toThrow();
      }
    });
  });
});
