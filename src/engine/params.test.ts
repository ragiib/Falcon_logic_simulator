import { describe, expect, it } from 'vitest';
import { getDefaultParams, readBooleanParam, readNumberParam } from '@/engine/params';
import { andGate } from '@/engine/components/gates';

describe('params helpers', () => {
  describe('readNumberParam', () => {
    it('returns valid number rounded to integer', () => {
      expect(readNumberParam({ val: 5 }, 'val', 0)).toBe(5);
      expect(readNumberParam({ val: 4.6 }, 'val', 0)).toBe(5);
      expect(readNumberParam({ val: 4.2 }, 'val', 0)).toBe(4);
      expect(readNumberParam({ val: -2.7 }, 'val', 0)).toBe(-3);
    });

    it('clamps to min and max', () => {
      expect(readNumberParam({ val: 1 }, 'val', 2, 2, 8)).toBe(2);
      expect(readNumberParam({ val: 10 }, 'val', 2, 2, 8)).toBe(8);
      expect(readNumberParam({ val: 5 }, 'val', 2, 2, 8)).toBe(5);
    });

    it('falls back on non-number or missing key', () => {
      expect(readNumberParam({ val: '5' as unknown as number }, 'val', 2)).toBe(2);
      expect(readNumberParam({}, 'val', 3)).toBe(3);
      expect(readNumberParam({ val: null as unknown as number }, 'val', 4)).toBe(4);
      expect(readNumberParam({ val: undefined as unknown as number }, 'val', 5)).toBe(5);
      expect(readNumberParam({ val: true as unknown as number }, 'val', 6)).toBe(6);
    });

    it('falls back on NaN and Infinity', () => {
      expect(readNumberParam({ val: NaN }, 'val', 2)).toBe(2);
      expect(readNumberParam({ val: Infinity }, 'val', 2)).toBe(2);
      expect(readNumberParam({ val: -Infinity }, 'val', 2)).toBe(2);
    });
  });

  describe('readBooleanParam', () => {
    it('returns boolean if present', () => {
      expect(readBooleanParam({ flag: true }, 'flag', false)).toBe(true);
      expect(readBooleanParam({ flag: false }, 'flag', true)).toBe(false);
    });

    it('falls back on non-boolean or missing key', () => {
      expect(readBooleanParam({}, 'flag', true)).toBe(true);
      expect(readBooleanParam({ flag: 1 as unknown as boolean }, 'flag', false)).toBe(false);
      expect(readBooleanParam({ flag: 'true' as unknown as boolean }, 'flag', false)).toBe(false);
      expect(readBooleanParam({ flag: null as unknown as boolean }, 'flag', true)).toBe(true);
    });
  });

  describe('getDefaultParams', () => {
    it('returns default params for AND gate', () => {
      const defaults = getDefaultParams(andGate);
      expect(defaults).toEqual({ inputs: 2 });
    });
  });
});
