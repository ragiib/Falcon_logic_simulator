import { describe, expect, it } from 'vitest';
import { inputSwitch, outputLed } from '@/engine/components/io';

describe('I/O components', () => {
  describe('inputSwitch', () => {
    it('outputs 1 when value is true', () => {
      const res = inputSwitch.evaluate({
        inputs: {},
        state: null,
        params: { value: true },
      });
      expect(res.outputs).toEqual({ out: 1 });
      expect(res.nextState).toBeNull();
    });

    it('outputs 0 when value is false', () => {
      const res = inputSwitch.evaluate({
        inputs: {},
        state: null,
        params: { value: false },
      });
      expect(res.outputs).toEqual({ out: 0 });
      expect(res.nextState).toBeNull();
    });

    it('outputs 0 when value is missing or invalid', () => {
      const resMissing = inputSwitch.evaluate({
        inputs: {},
        state: null,
        params: {},
      });
      expect(resMissing.outputs).toEqual({ out: 0 });

      const resInvalid = inputSwitch.evaluate({
        inputs: {},
        state: null,
        params: { value: 'true' },
      });
      expect(resInvalid.outputs).toEqual({ out: 0 });
    });

    it('defines one output pin and zero input pins', () => {
      const pins = inputSwitch.getPins({});
      expect(pins).toEqual([{ id: 'out', label: 'Out', direction: 'output' }]);
    });
  });

  describe('outputLed', () => {
    it('defines one input pin and zero output pins', () => {
      const pins = outputLed.getPins({});
      expect(pins).toEqual([{ id: 'in', label: 'In', direction: 'input' }]);
    });

    it('returns empty outputs on evaluate', () => {
      const res = outputLed.evaluate({
        inputs: { in: 1 },
        state: null,
        params: {},
      });
      expect(res.outputs).toEqual({});
      expect(res.nextState).toBeNull();
    });
  });
});
