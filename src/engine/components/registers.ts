import type { ComponentDefinition, PinDefinition, Signal } from '@/engine/types';
import { readBooleanParam, readNumberParam } from '@/engine/params';
import { isRisingEdge } from './sequential';

export interface RegisterState {
  bits: Signal[];
  prevClk: Signal;
}

export const registerDefinition: ComponentDefinition<RegisterState> = {
  type: 'register',
  label: 'Register',
  category: 'sequential',
  params: [
    {
      id: 'bits',
      label: 'Bits',
      type: 'number',
      default: 4,
      min: 1,
      max: 8,
    },
    {
      id: 'loadEnable',
      label: 'Load enable',
      type: 'boolean',
      default: false,
    },
    {
      id: 'asyncClear',
      label: 'Async clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const n = readNumberParam(params, 'bits', 4, 1, 8);
    const loadEnable = readBooleanParam(params, 'loadEnable', false);
    const asyncClear = readBooleanParam(params, 'asyncClear', false);

    const pins: PinDefinition[] = [];
    for (let i = 0; i < n; i++) {
      pins.push({ id: `d${i}`, label: `D${i}`, direction: 'input' });
    }
    pins.push({ id: 'clk', label: 'CLK', direction: 'input' });
    if (loadEnable) {
      pins.push({ id: 'load', label: 'LOAD', direction: 'input' });
    }
    if (asyncClear) {
      pins.push({ id: 'clr', label: 'CLR', direction: 'input' });
    }
    for (let i = 0; i < n; i++) {
      pins.push({ id: `q${i}`, label: `Q${i}`, direction: 'output' });
    }
    return pins;
  },
  initState: (params) => {
    const n = readNumberParam(params, 'bits', 4, 1, 8);
    return {
      bits: Array.from({ length: n }, () => 0 as Signal),
      prevClk: 0,
    };
  },
  evaluate: (ctx) => {
    const n = readNumberParam(ctx.params, 'bits', 4, 1, 8);
    const loadEnable = readBooleanParam(ctx.params, 'loadEnable', false);
    const asyncClear = readBooleanParam(ctx.params, 'asyncClear', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const prevClk = typeof ctx.state?.prevClk === 'number' ? ctx.state.prevClk : 0;

    const rawBits = Array.isArray(ctx.state?.bits) ? ctx.state.bits : [];
    let bits: Signal[] = Array.from({ length: n }, (_, i) => (rawBits[i] === 1 ? 1 : 0));

    if (asyncClear && (ctx.inputs['clr'] ?? 0) === 1) {
      bits = Array.from({ length: n }, () => 0 as Signal);
    } else if (isRisingEdge(prevClk, clk) && (!loadEnable || (ctx.inputs['load'] ?? 0) === 1)) {
      bits = Array.from({ length: n }, (_, i) => ((ctx.inputs[`d${i}`] ?? 0) === 1 ? 1 : 0));
    }

    const outputs: Record<string, Signal> = {};
    for (let i = 0; i < n; i++) {
      outputs[`q${i}`] = bits[i] ?? 0;
    }

    return {
      outputs,
      nextState: {
        bits,
        prevClk: clk,
      },
    };
  },
};

export const shiftRegisterDefinition: ComponentDefinition<RegisterState> = {
  type: 'shiftRegister',
  label: 'Shift Register',
  category: 'sequential',
  params: [
    {
      id: 'bits',
      label: 'Bits',
      type: 'number',
      default: 4,
      min: 2,
      max: 8,
    },
    {
      id: 'asyncClear',
      label: 'Async clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const n = readNumberParam(params, 'bits', 4, 2, 8);
    const asyncClear = readBooleanParam(params, 'asyncClear', false);

    const pins: PinDefinition[] = [
      { id: 'si', label: 'SI', direction: 'input' },
      { id: 'clk', label: 'CLK', direction: 'input' },
    ];
    if (asyncClear) {
      pins.push({ id: 'clr', label: 'CLR', direction: 'input' });
    }
    for (let i = 0; i < n; i++) {
      pins.push({ id: `q${i}`, label: `Q${i}`, direction: 'output' });
    }
    return pins;
  },
  initState: (params) => {
    const n = readNumberParam(params, 'bits', 4, 2, 8);
    return {
      bits: Array.from({ length: n }, () => 0 as Signal),
      prevClk: 0,
    };
  },
  evaluate: (ctx) => {
    const n = readNumberParam(ctx.params, 'bits', 4, 2, 8);
    const asyncClear = readBooleanParam(ctx.params, 'asyncClear', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const prevClk = typeof ctx.state?.prevClk === 'number' ? ctx.state.prevClk : 0;

    const rawBits = Array.isArray(ctx.state?.bits) ? ctx.state.bits : [];
    let bits: Signal[] = Array.from({ length: n }, (_, i) => (rawBits[i] === 1 ? 1 : 0));

    if (asyncClear && (ctx.inputs['clr'] ?? 0) === 1) {
      bits = Array.from({ length: n }, () => 0 as Signal);
    } else if (isRisingEdge(prevClk, clk)) {
      const si = ((ctx.inputs['si'] ?? 0) === 1 ? 1 : 0) as Signal;
      const newBits: Signal[] = [si];
      for (let i = 1; i < n; i++) {
        newBits.push(bits[i - 1] ?? 0);
      }
      bits = newBits;
    }

    const outputs: Record<string, Signal> = {};
    for (let i = 0; i < n; i++) {
      outputs[`q${i}`] = bits[i] ?? 0;
    }

    return {
      outputs,
      nextState: {
        bits,
        prevClk: clk,
      },
    };
  },
};

export const registerDefinitions = [registerDefinition, shiftRegisterDefinition];
