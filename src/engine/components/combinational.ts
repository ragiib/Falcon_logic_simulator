import type { ComponentDefinition, PinDefinition, Signal } from '@/engine/types';
import { readNumberParam } from '@/engine/params';

function makePins(
  prefix: string,
  count: number,
  labelPrefix: string,
  direction: 'input' | 'output',
): PinDefinition[] {
  const pins: PinDefinition[] = [];
  for (let i = 0; i < count; i++) {
    pins.push({
      id: `${prefix}${i}`,
      label: `${labelPrefix}${i}`,
      direction,
    });
  }
  return pins;
}

function readIndex(
  inputs: Readonly<Record<string, Signal>>,
  prefix: string,
  count: number,
): number {
  let index = 0;
  for (let j = 0; j < count; j++) {
    if ((inputs[`${prefix}${j}`] ?? 0) === 1) {
      index |= 1 << j;
    }
  }
  return index;
}

export const muxDefinition: ComponentDefinition<null> = {
  type: 'mux',
  label: 'Multiplexer',
  category: 'combinational',
  params: [
    {
      id: 'selectBits',
      label: 'Select bits',
      type: 'number',
      default: 1,
      min: 1,
      max: 3,
    },
  ],
  getPins: (params) => {
    const k = readNumberParam(params, 'selectBits', 1, 1, 3);
    const n = 1 << k;
    return [
      ...makePins('d', n, 'D', 'input'),
      ...makePins('s', k, 'S', 'input'),
      { id: 'y', label: 'Y', direction: 'output' },
    ];
  },
  initState: () => null,
  evaluate: (ctx) => {
    const k = readNumberParam(ctx.params, 'selectBits', 1, 1, 3);
    const index = readIndex(ctx.inputs, 's', k);
    const y = (ctx.inputs[`d${index}`] ?? 0) as Signal;
    return {
      outputs: { y },
      nextState: null,
    };
  },
};

export const demuxDefinition: ComponentDefinition<null> = {
  type: 'demux',
  label: 'Demultiplexer',
  category: 'combinational',
  params: [
    {
      id: 'selectBits',
      label: 'Select bits',
      type: 'number',
      default: 1,
      min: 1,
      max: 3,
    },
  ],
  getPins: (params) => {
    const k = readNumberParam(params, 'selectBits', 1, 1, 3);
    const n = 1 << k;
    return [
      { id: 'd', label: 'D', direction: 'input' },
      ...makePins('s', k, 'S', 'input'),
      ...makePins('y', n, 'Y', 'output'),
    ];
  },
  initState: () => null,
  evaluate: (ctx) => {
    const k = readNumberParam(ctx.params, 'selectBits', 1, 1, 3);
    const n = 1 << k;
    const index = readIndex(ctx.inputs, 's', k);
    const dVal = (ctx.inputs['d'] ?? 0) as Signal;
    const outputs: Record<string, Signal> = {};
    for (let i = 0; i < n; i++) {
      outputs[`y${i}`] = i === index ? dVal : 0;
    }
    return { outputs, nextState: null };
  },
};

export const decoderDefinition: ComponentDefinition<null> = {
  type: 'decoder',
  label: 'Decoder',
  category: 'combinational',
  params: [
    {
      id: 'bits',
      label: 'Address bits',
      type: 'number',
      default: 2,
      min: 2,
      max: 3,
    },
  ],
  getPins: (params) => {
    const k = readNumberParam(params, 'bits', 2, 2, 3);
    const n = 1 << k;
    return [...makePins('a', k, 'A', 'input'), ...makePins('y', n, 'Y', 'output')];
  },
  initState: () => null,
  evaluate: (ctx) => {
    const k = readNumberParam(ctx.params, 'bits', 2, 2, 3);
    const n = 1 << k;
    const index = readIndex(ctx.inputs, 'a', k);
    const outputs: Record<string, Signal> = {};
    for (let i = 0; i < n; i++) {
      outputs[`y${i}`] = i === index ? 1 : 0;
    }
    return { outputs, nextState: null };
  },
};

export const priorityEncoderDefinition: ComponentDefinition<null> = {
  type: 'priorityEncoder',
  label: 'Priority Encoder',
  category: 'combinational',
  params: [
    {
      id: 'bits',
      label: 'Output bits',
      type: 'number',
      default: 2,
      min: 2,
      max: 3,
    },
  ],
  getPins: (params) => {
    const k = readNumberParam(params, 'bits', 2, 2, 3);
    const n = 1 << k;
    return [
      ...makePins('i', n, 'I', 'input'),
      ...makePins('a', k, 'A', 'output'),
      { id: 'v', label: 'V', direction: 'output' },
    ];
  },
  initState: () => null,
  evaluate: (ctx) => {
    const k = readNumberParam(ctx.params, 'bits', 2, 2, 3);
    const n = 1 << k;
    let h = -1;
    for (let i = n - 1; i >= 0; i--) {
      if ((ctx.inputs[`i${i}`] ?? 0) === 1) {
        h = i;
        break;
      }
    }
    const outputs: Record<string, Signal> = {};
    if (h === -1) {
      for (let j = 0; j < k; j++) {
        outputs[`a${j}`] = 0;
      }
      outputs['v'] = 0;
    } else {
      for (let j = 0; j < k; j++) {
        outputs[`a${j}`] = ((h >> j) & 1) as Signal;
      }
      outputs['v'] = 1;
    }
    return { outputs, nextState: null };
  },
};

export const comparatorDefinition: ComponentDefinition<null> = {
  type: 'comparator',
  label: 'Comparator',
  category: 'combinational',
  params: [
    {
      id: 'bits',
      label: 'Bits',
      type: 'number',
      default: 1,
      min: 1,
      max: 4,
    },
  ],
  getPins: (params) => {
    const n = readNumberParam(params, 'bits', 1, 1, 4);
    return [
      ...makePins('a', n, 'A', 'input'),
      ...makePins('b', n, 'B', 'input'),
      { id: 'gt', label: 'A>B', direction: 'output' },
      { id: 'eq', label: 'A=B', direction: 'output' },
      { id: 'lt', label: 'A<B', direction: 'output' },
    ];
  },
  initState: () => null,
  evaluate: (ctx) => {
    const n = readNumberParam(ctx.params, 'bits', 1, 1, 4);
    const aVal = readIndex(ctx.inputs, 'a', n);
    const bVal = readIndex(ctx.inputs, 'b', n);
    const outputs: Record<string, Signal> = {
      gt: aVal > bVal ? 1 : 0,
      eq: aVal === bVal ? 1 : 0,
      lt: aVal < bVal ? 1 : 0,
    };
    return { outputs, nextState: null };
  },
};

export const combinationalDefinitions = [
  muxDefinition,
  demuxDefinition,
  decoderDefinition,
  priorityEncoderDefinition,
  comparatorDefinition,
];
