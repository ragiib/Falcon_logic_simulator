import { describe, expect, it } from 'vitest';
import type { Circuit } from '@/model';
import { CURRENT_SCHEMA_VERSION } from '@/model';
import { truthTableKey } from './truthTableKey';

function makeBaseCircuit(): Circuit {
  return {
    version: CURRENT_SCHEMA_VERSION,
    name: 'Base Circuit',
    components: [
      {
        id: 'sw1',
        type: 'inputSwitch',
        position: { x: 10, y: 20 },
        params: { value: false },
        label: 'A',
      },
      {
        id: 'and1',
        type: 'and',
        position: { x: 100, y: 20 },
        params: { inputs: 2 },
      },
      {
        id: 'led1',
        type: 'outputLed',
        position: { x: 200, y: 20 },
        params: {},
        label: 'Y',
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
  };
}

describe('truthTableKey', () => {
  it('toggling an input switch value does NOT change the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [
        { ...c1.components[0]!, params: { value: true } },
        c1.components[1]!,
        c1.components[2]!,
      ],
    };

    expect(truthTableKey(c1)).toBe(truthTableKey(c2));
  });

  it('renaming the circuit does NOT change the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      name: 'Completely Different Name',
    };

    expect(truthTableKey(c1)).toBe(truthTableKey(c2));
  });

  it('changing a label changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [
        { ...c1.components[0]!, label: 'New Label' },
        c1.components[1]!,
        c1.components[2]!,
      ],
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });

  it('changing a gate inputs param changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [
        c1.components[0]!,
        { ...c1.components[1]!, params: { inputs: 3 } },
        c1.components[2]!,
      ],
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });

  it('changing a component position changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [
        { ...c1.components[0]!, position: { x: 50, y: 50 } },
        c1.components[1]!,
        c1.components[2]!,
      ],
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });

  it('adding or removing a wire changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      wires: c1.wires.slice(0, 1),
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });

  it('adding a component changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [
        ...c1.components,
        { id: 'not1', type: 'not', position: { x: 300, y: 20 }, params: {} },
      ],
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });

  it('changing a component type changes the key', () => {
    const c1 = makeBaseCircuit();
    const c2: Circuit = {
      ...c1,
      components: [c1.components[0]!, { ...c1.components[1]!, type: 'nand' }, c1.components[2]!],
    };

    expect(truthTableKey(c1)).not.toBe(truthTableKey(c2));
  });
});
