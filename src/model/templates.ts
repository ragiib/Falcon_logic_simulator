import type { Wire } from './types';
import type { CircuitFragment } from './fragment';

export interface TemplateDefinition {
  id: string; // stable, e.g. 'halfAdder'
  name: string; // e.g. 'Half Adder'
  description: string; // one sentence
  fragment: CircuitFragment; // local ids, positions relative to (0,0)
}

function makeWire(id: string, from: `${string}.${string}`, to: `${string}.${string}`): Wire {
  const [fromComp, fromPin] = from.split('.') as [string, string];
  const [toComp, toPin] = to.split('.') as [string, string];
  return {
    id,
    from: { componentId: fromComp, pinId: fromPin },
    to: { componentId: toComp, pinId: toPin },
  };
}

const halfAdderFragment: CircuitFragment = {
  components: [
    {
      id: 'sw_a',
      type: 'inputSwitch',
      label: 'A',
      position: { x: 0, y: 0 },
      params: { value: false },
    },
    {
      id: 'sw_b',
      type: 'inputSwitch',
      label: 'B',
      position: { x: 0, y: 112 },
      params: { value: false },
    },
    {
      id: 'xor',
      type: 'xor',
      position: { x: 192, y: 0 },
      params: { inputs: 2 },
    },
    {
      id: 'and',
      type: 'and',
      position: { x: 192, y: 112 },
      params: { inputs: 2 },
    },
    {
      id: 'led_sum',
      type: 'outputLed',
      label: 'Sum',
      position: { x: 368, y: 0 },
      params: {},
    },
    {
      id: 'led_carry',
      type: 'outputLed',
      label: 'Carry',
      position: { x: 368, y: 112 },
      params: {},
    },
  ],
  wires: [
    makeWire('w1', 'sw_a.out', 'xor.in0'),
    makeWire('w2', 'sw_b.out', 'xor.in1'),
    makeWire('w3', 'sw_a.out', 'and.in0'),
    makeWire('w4', 'sw_b.out', 'and.in1'),
    makeWire('w5', 'xor.out', 'led_sum.in'),
    makeWire('w6', 'and.out', 'led_carry.in'),
  ],
};

const fullAdderFragment: CircuitFragment = {
  components: [
    {
      id: 'sw_a',
      type: 'inputSwitch',
      label: 'A',
      position: { x: 0, y: 0 },
      params: { value: false },
    },
    {
      id: 'sw_b',
      type: 'inputSwitch',
      label: 'B',
      position: { x: 0, y: 96 },
      params: { value: false },
    },
    {
      id: 'sw_cin',
      type: 'inputSwitch',
      label: 'Cin',
      position: { x: 0, y: 224 },
      params: { value: false },
    },
    {
      id: 'xor1',
      type: 'xor',
      position: { x: 192, y: 32 },
      params: { inputs: 2 },
    },
    {
      id: 'and1',
      type: 'and',
      position: { x: 192, y: 144 },
      params: { inputs: 2 },
    },
    {
      id: 'xor2',
      type: 'xor',
      position: { x: 368, y: 64 },
      params: { inputs: 2 },
    },
    {
      id: 'and2',
      type: 'and',
      position: { x: 368, y: 192 },
      params: { inputs: 2 },
    },
    {
      id: 'or1',
      type: 'or',
      position: { x: 544, y: 160 },
      params: { inputs: 2 },
    },
    {
      id: 'led_sum',
      type: 'outputLed',
      label: 'Sum',
      position: { x: 704, y: 64 },
      params: {},
    },
    {
      id: 'led_cout',
      type: 'outputLed',
      label: 'Cout',
      position: { x: 704, y: 160 },
      params: {},
    },
  ],
  wires: [
    makeWire('w1', 'sw_a.out', 'xor1.in0'),
    makeWire('w2', 'sw_b.out', 'xor1.in1'),
    makeWire('w3', 'sw_a.out', 'and1.in0'),
    makeWire('w4', 'sw_b.out', 'and1.in1'),
    makeWire('w5', 'xor1.out', 'xor2.in0'),
    makeWire('w6', 'sw_cin.out', 'xor2.in1'),
    makeWire('w7', 'xor1.out', 'and2.in0'),
    makeWire('w8', 'sw_cin.out', 'and2.in1'),
    makeWire('w9', 'and1.out', 'or1.in0'),
    makeWire('w10', 'and2.out', 'or1.in1'),
    makeWire('w11', 'xor2.out', 'led_sum.in'),
    makeWire('w12', 'or1.out', 'led_cout.in'),
  ],
};

export const templates: readonly TemplateDefinition[] = [
  {
    id: 'halfAdder',
    name: 'Half Adder',
    description: 'Adds two bits: Sum = A XOR B, Carry = A AND B.',
    fragment: halfAdderFragment,
  },
  {
    id: 'fullAdder',
    name: 'Full Adder',
    description: 'Adds three bits (A, B, carry-in): Sum = A XOR B XOR Cin, Cout = majority.',
    fragment: fullAdderFragment,
  },
];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates.find((t) => t.id === id);
}

export function fragmentOrigin(fragment: CircuitFragment): { x: number; y: number } {
  if (fragment.components.length === 0) {
    return { x: 0, y: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  for (const c of fragment.components) {
    if (c.position.x < minX) minX = c.position.x;
    if (c.position.y < minY) minY = c.position.y;
  }
  return { x: minX, y: minY };
}

export function templateOffsetFor(
  fragment: CircuitFragment,
  target: { x: number; y: number },
): { x: number; y: number } {
  const origin = fragmentOrigin(fragment);
  return {
    x: target.x - origin.x,
    y: target.y - origin.y,
  };
}
