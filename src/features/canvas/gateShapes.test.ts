import { describe, expect, it } from 'vitest';
import { isGateType, pinY, getGateGeometry } from './gateShapes';
import type { GateType } from './gateShapes';
import { getNodeSize } from './nodeGeometry';

describe('gateShapes and nodeGeometry', () => {
  describe('isGateType', () => {
    it('returns true for all 7 gate types', () => {
      const types = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'] as const;
      for (const t of types) {
        expect(isGateType(t)).toBe(true);
      }
    });

    it('returns false for non-gate types', () => {
      expect(isGateType('inputSwitch')).toBe(false);
      expect(isGateType('')).toBe(false);
      expect(isGateType('AND')).toBe(false);
      expect(isGateType('customGate')).toBe(false);
    });
  });

  describe('pinY', () => {
    it('calculates pinY correctly for simple cases', () => {
      expect(pinY(0, 1, 56)).toBe(28);
      expect(pinY(0, 2, 100)).toBeCloseTo(33.33, 1);
      expect(pinY(1, 2, 100)).toBeCloseTo(66.67, 1);
    });

    it('calculates strictly increasing, equally-spaced values inside (0, height) for count 8', () => {
      const count = 8;
      const height = 208;
      const values: number[] = [];
      for (let i = 0; i < count; i++) {
        values.push(pinY(i, count, height));
      }

      expect(values).toHaveLength(8);

      for (let i = 0; i < values.length; i++) {
        const val = values[i]!;
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThan(height);
        if (i > 0) {
          expect(val).toBeGreaterThan(values[i - 1]!);
        }
      }

      const step = values[1]! - values[0]!;
      for (let i = 1; i < values.length - 1; i++) {
        expect(values[i + 1]! - values[i]!).toBeCloseTo(step, 5);
      }
    });
  });

  describe('getGateGeometry', () => {
    const gateTypes: GateType[] = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'];
    const testSizes = [
      { w: 96, h: 56 },
      { w: 96, h: 208 },
    ];

    it.each(gateTypes)(
      'produces finite numeric fields and valid paths for %s at tested sizes',
      (type) => {
        for (const { w, h } of testSizes) {
          const geom = getGateGeometry(type, w, h);

          expect(Number.isFinite(geom.bodyLeft)).toBe(true);
          expect(Number.isFinite(geom.bodyRight)).toBe(true);
          expect(Number.isFinite(geom.leadEndX)).toBe(true);
          expect(Number.isFinite(geom.outputStartX)).toBe(true);
          expect(Number.isFinite(geom.midY)).toBe(true);
          expect(Number.isFinite(geom.labelX)).toBe(true);

          expect(geom.midY).toBe(h / 2);
          expect(geom.bodyPath.length).toBeGreaterThan(0);
          expect(geom.bodyPath.startsWith('M')).toBe(true);
          expect(geom.bodyPath.endsWith('Z')).toBe(true);
        }
      },
    );

    it('has non-null bubble exactly for inverted gates', () => {
      const inverted: GateType[] = ['nand', 'nor', 'xnor', 'not'];
      const nonInverted: GateType[] = ['and', 'or', 'xor'];

      for (const t of inverted) {
        const geom = getGateGeometry(t, 96, 64);
        expect(geom.bubble).not.toBeNull();
        expect(Number.isFinite(geom.bubble!.cx)).toBe(true);
        expect(Number.isFinite(geom.bubble!.cy)).toBe(true);
        expect(Number.isFinite(geom.bubble!.r)).toBe(true);
      }

      for (const t of nonInverted) {
        const geom = getGateGeometry(t, 96, 64);
        expect(geom.bubble).toBeNull();
      }
    });

    it('has non-null backCurvePath exactly for xor and xnor', () => {
      const withBackCurve: GateType[] = ['xor', 'xnor'];
      const withoutBackCurve: GateType[] = ['and', 'nand', 'or', 'nor', 'not'];

      for (const t of withBackCurve) {
        const geom = getGateGeometry(t, 96, 64);
        expect(geom.backCurvePath).not.toBeNull();
        expect(geom.backCurvePath!.startsWith('M')).toBe(true);
      }

      for (const t of withoutBackCurve) {
        const geom = getGateGeometry(t, 96, 64);
        expect(geom.backCurvePath).toBeNull();
      }
    });

    it('ensures outputStartX === width - width * 0.125 for all types and checks bubble bodyRight relationship', () => {
      const width = 96;
      const expectedOutputStartX = width - width * 0.125;

      for (const t of gateTypes) {
        const geom = getGateGeometry(t, width, 64);
        expect(geom.outputStartX).toBeCloseTo(expectedOutputStartX, 5);

        if (geom.bubble !== null) {
          expect(geom.bodyRight).toBeLessThan(geom.outputStartX);
          expect(geom.bubble.cx + geom.bubble.r).toBeCloseTo(geom.outputStartX, 5);
        } else {
          expect(geom.bodyRight).toBeCloseTo(geom.outputStartX, 5);
        }
      }
    });

    it('satisfies leadEndX > 0 and leadEndX < bodyRight for every type', () => {
      for (const t of gateTypes) {
        const geom = getGateGeometry(t, 96, 64);
        expect(geom.leadEndX).toBeGreaterThan(0);
        expect(geom.leadEndX).toBeLessThan(geom.bodyRight);
      }
    });

    it('ensures bodyLeft for xor/xnor is greater than that for and/or', () => {
      const andGeom = getGateGeometry('and', 96, 64);
      const xorGeom = getGateGeometry('xor', 96, 64);
      const xnorGeom = getGateGeometry('xnor', 96, 64);

      expect(xorGeom.bodyLeft).toBeGreaterThan(andGeom.bodyLeft);
      expect(xnorGeom.bodyLeft).toBeGreaterThan(andGeom.bodyLeft);
    });

    it('scales proportionally with width = 44', () => {
      const width = 44;
      const expectedOutputStartX = width - width * 0.125;
      for (const t of gateTypes) {
        const geom = getGateGeometry(t, width, 26);
        expect(geom.outputStartX).toBeCloseTo(expectedOutputStartX, 5);
      }
    });
  });

  describe('getNodeSize', () => {
    it('returns correct dimensions for gates', () => {
      expect(getNodeSize('and', 2, 1)).toEqual({ width: 96, height: 64 });
      expect(getNodeSize('or', 8, 1)).toEqual({ width: 96, height: 208 });
      expect(getNodeSize('not', 1, 1)).toEqual({ width: 96, height: 56 });
    });

    it('returns correct dimensions for inputSwitch and outputLed', () => {
      expect(getNodeSize('inputSwitch', 0, 1)).toEqual({ width: 96, height: 56 });
      expect(getNodeSize('outputLed', 1, 0)).toEqual({ width: 80, height: 64 });
    });

    it('falls back to generic rule for unknown types', () => {
      const unknownSize = getNodeSize('customBlock', 3, 2);
      expect(unknownSize).toEqual({
        width: 96,
        height: Math.max(56, 28 * 3 + 16),
      });
    });
  });
});
