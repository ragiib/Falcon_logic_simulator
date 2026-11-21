import { describe, expect, it } from 'vitest';
import type { Circuit } from './types';
import { findUnconnectedPins, groupWarningsByComponent } from './analysis';

describe('model/analysis', () => {
  describe('findUnconnectedPins', () => {
    it('returns 2 unconnected inputs and 1 unconnected output in pin order for a lone AND gate', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Lone AND',
        components: [
          {
            id: 'and1',
            type: 'and',
            position: { x: 0, y: 0 },
            params: { inputs: 2 },
          },
        ],
        wires: [],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toHaveLength(3);

      expect(warnings[0]).toEqual({
        componentId: 'and1',
        pinId: 'in0',
        kind: 'unconnectedInput',
        message: 'AND input A is not connected (reads 0)',
      });

      expect(warnings[1]).toEqual({
        componentId: 'and1',
        pinId: 'in1',
        kind: 'unconnectedInput',
        message: 'AND input B is not connected (reads 0)',
      });

      expect(warnings[2]).toEqual({
        componentId: 'and1',
        pinId: 'out',
        kind: 'unconnectedOutput',
        message: 'AND output is not connected',
      });
    });

    it('returns zero warnings for fully wired switch -> AND(both inputs) -> LED', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Fully Wired',
        components: [
          { id: 'sw1', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: false } },
          { id: 'sw2', type: 'inputSwitch', position: { x: 0, y: 50 }, params: { value: false } },
          { id: 'and1', type: 'and', position: { x: 100, y: 25 }, params: { inputs: 2 } },
          { id: 'led1', type: 'outputLed', position: { x: 200, y: 25 }, params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw1', pinId: 'out' },
            to: { componentId: 'and1', pinId: 'in0' },
          },
          {
            id: 'w2',
            from: { componentId: 'sw2', pinId: 'out' },
            to: { componentId: 'and1', pinId: 'in1' },
          },
          {
            id: 'w3',
            from: { componentId: 'and1', pinId: 'out' },
            to: { componentId: 'led1', pinId: 'in' },
          },
        ],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toEqual([]);
    });

    it('returns exactly one unconnectedOutput for an unconnected Input Switch', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Lone Switch',
        components: [
          { id: 'sw1', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: false } },
        ],
        wires: [],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        componentId: 'sw1',
        pinId: 'out',
        kind: 'unconnectedOutput',
        message: 'Input Switch output is not connected',
      });
    });

    it('returns exactly one unconnectedInput and never an unconnectedOutput for an unconnected LED', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Lone LED',
        components: [{ id: 'led1', type: 'outputLed', position: { x: 0, y: 0 }, params: {} }],
        wires: [],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        componentId: 'led1',
        pinId: 'in',
        kind: 'unconnectedInput',
        message: 'Output LED input In is not connected (reads 0)',
      });
      expect(warnings.some((w) => w.kind === 'unconnectedOutput')).toBe(false);
    });

    it('skips components with unknown types without throwing', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Unknown Comp',
        components: [
          { id: 'u1', type: 'unknownComponentType', position: { x: 0, y: 0 }, params: {} },
          { id: 'led1', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
        ],
        wires: [],
      };

      expect(() => findUnconnectedPins(circuit)).not.toThrow();
      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.componentId).toBe('led1');
    });

    it('yields 4 input pins to check when gate input count is 4', () => {
      const circuit: Circuit = {
        version: 1,
        name: '4-input AND',
        components: [{ id: 'and1', type: 'and', position: { x: 0, y: 0 }, params: { inputs: 4 } }],
        wires: [],
      };

      const warnings = findUnconnectedPins(circuit);
      const inputs = warnings.filter((w) => w.kind === 'unconnectedInput');
      expect(inputs).toHaveLength(4);
      expect(inputs.map((w) => w.pinId)).toEqual(['in0', 'in1', 'in2', 'in3']);
    });

    it('does not report an output warning when an output has fan-out (2 or more wires)', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Fan-out',
        components: [
          { id: 'sw1', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: true } },
          { id: 'led1', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
          { id: 'led2', type: 'outputLed', position: { x: 100, y: 50 }, params: {} },
        ],
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw1', pinId: 'out' },
            to: { componentId: 'led1', pinId: 'in' },
          },
          {
            id: 'w2',
            from: { componentId: 'sw1', pinId: 'out' },
            to: { componentId: 'led2', pinId: 'in' },
          },
        ],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings).toHaveLength(0);
    });

    it('uses the user label in warning messages when present', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Labeled Components',
        components: [
          {
            id: 'sw1',
            type: 'inputSwitch',
            label: 'Clock',
            position: { x: 0, y: 0 },
            params: { value: false },
          },
          {
            id: 'and1',
            type: 'and',
            label: 'Gate1',
            position: { x: 100, y: 0 },
            params: { inputs: 2 },
          },
        ],
        wires: [],
      };

      const warnings = findUnconnectedPins(circuit);
      expect(warnings[0]?.message).toBe('Clock output is not connected');
      expect(warnings[1]?.message).toBe('Gate1 input A is not connected (reads 0)');
      expect(warnings[2]?.message).toBe('Gate1 input B is not connected (reads 0)');
      expect(warnings[3]?.message).toBe('Gate1 output is not connected');
    });
  });

  describe('groupWarningsByComponent', () => {
    it('groups warnings correctly by componentId and omits clean components', () => {
      const circuit: Circuit = {
        version: 1,
        name: 'Group Test',
        components: [
          { id: 'sw1', type: 'inputSwitch', position: { x: 0, y: 0 }, params: { value: false } },
          { id: 'sw2', type: 'inputSwitch', position: { x: 0, y: 50 }, params: { value: false } },
          { id: 'led1', type: 'outputLed', position: { x: 100, y: 0 }, params: {} },
        ],
        // sw1 is connected to led1; sw2 is unconnected
        wires: [
          {
            id: 'w1',
            from: { componentId: 'sw1', pinId: 'out' },
            to: { componentId: 'led1', pinId: 'in' },
          },
        ],
      };

      const warnings = findUnconnectedPins(circuit);
      const grouped = groupWarningsByComponent(warnings);

      // Only sw2 should be in grouped because sw1 and led1 are fully connected
      expect(Object.keys(grouped)).toEqual(['sw2']);
      expect(grouped['sw2']).toHaveLength(1);
      expect(grouped['sw2']?.[0]?.kind).toBe('unconnectedOutput');
      expect(grouped['sw1']).toBeUndefined();
      expect(grouped['led1']).toBeUndefined();
    });
  });
});
