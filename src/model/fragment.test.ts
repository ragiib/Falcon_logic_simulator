import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model/types';
import { extractFragment, instantiateFragment } from '@/model/fragment';

describe('fragment helpers', () => {
  const circuit: Circuit = {
    version: 1,
    name: 'Fragment Test Circuit',
    components: [
      { id: 'c1', type: 'inputSwitch', position: { x: 10, y: 20 }, params: { value: true } },
      { id: 'c2', type: 'and', position: { x: 100, y: 50 }, params: { inputs: 2 } },
      { id: 'c3', type: 'outputLed', position: { x: 200, y: 50 }, params: {} },
    ],
    wires: [
      {
        id: 'w1',
        from: { componentId: 'c1', pinId: 'out' },
        to: { componentId: 'c2', pinId: 'in0' },
      },
      {
        id: 'w2',
        from: { componentId: 'c2', pinId: 'out' },
        to: { componentId: 'c3', pinId: 'in' },
      },
    ],
  };

  describe('extractFragment', () => {
    it('keeps internal wires and drops wires crossing the selection boundary', () => {
      // Selecting c1 and c2: w1 is internal (c1->c2), w2 crosses boundary (c2->c3)
      const fragment = extractFragment(circuit, ['c1', 'c2']);
      expect(fragment.components).toHaveLength(2);
      expect(fragment.components.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(fragment.wires).toHaveLength(1);
      expect(fragment.wires[0]?.id).toBe('w1');
    });

    it('performs a deep copy so mutating fragment does not modify circuit', () => {
      const fragment = extractFragment(circuit, ['c1']);
      expect(fragment.components).toHaveLength(1);

      fragment.components[0]!.position.x = 999;
      fragment.components[0]!.params['value'] = false;

      const originalC1 = circuit.components.find((c) => c.id === 'c1')!;
      expect(originalC1.position.x).toBe(10);
      expect(originalC1.params['value']).toBe(true);
    });
  });

  describe('instantiateFragment', () => {
    it('creates all-new unique ids, remaps wires, applies offset, and does not mutate input', () => {
      let counter = 0;
      const fakeCreateId = (prefix: string) => `${prefix}_${++counter}`;

      const fragment = extractFragment(circuit, ['c1', 'c2']);
      const offset = { x: 32, y: 48 };

      const instantiated = instantiateFragment(fragment, offset, fakeCreateId);

      // Unique ids generated via fakeCreateId
      expect(instantiated.components).toHaveLength(2);
      expect(instantiated.components[0]?.id).toBe('c_1');
      expect(instantiated.components[1]?.id).toBe('c_2');

      // Offset applied
      expect(instantiated.components[0]?.position).toEqual({ x: 10 + 32, y: 20 + 48 });
      expect(instantiated.components[1]?.position).toEqual({ x: 100 + 32, y: 50 + 48 });

      // Wire remapped
      expect(instantiated.wires).toHaveLength(1);
      expect(instantiated.wires[0]?.id).toBe('w_3');
      expect(instantiated.wires[0]?.from).toEqual({ componentId: 'c_1', pinId: 'out' });
      expect(instantiated.wires[0]?.to).toEqual({ componentId: 'c_2', pinId: 'in0' });

      // Input fragment not mutated
      expect(fragment.components[0]?.id).toBe('c1');
      expect(fragment.components[0]?.position).toEqual({ x: 10, y: 20 });
      expect(fragment.wires[0]?.id).toBe('w1');
      expect(fragment.wires[0]?.from.componentId).toBe('c1');
    });
  });
});
