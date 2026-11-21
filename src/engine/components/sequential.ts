import type { ComponentDefinition, PinDefinition, Signal } from '@/engine/types';
import { readBooleanParam } from '@/engine/params';

export function isRisingEdge(previous: Signal, current: Signal): boolean {
  return previous === 0 && current === 1;
}

export interface FlipFlopState {
  q: Signal;
  prevClk: Signal;
}

function getFlipFlopPins(inputs: PinDefinition[], asyncControls: boolean): PinDefinition[] {
  const pins: PinDefinition[] = [...inputs];
  if (asyncControls) {
    pins.push(
      { id: 'pre', label: 'PRE', direction: 'input' },
      { id: 'clr', label: 'CLR', direction: 'input' },
    );
  }
  pins.push(
    { id: 'q', label: 'Q', direction: 'output' },
    { id: 'qn', label: '/Q', direction: 'output' },
  );
  return pins;
}

export const clockDefinition: ComponentDefinition<null> = {
  type: 'clock',
  label: 'Clock',
  category: 'sequential',
  params: [
    {
      id: 'value',
      label: 'Level',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: () => [{ id: 'out', label: 'Out', direction: 'output' }],
  initState: () => null,
  evaluate: (ctx) => {
    const value = readBooleanParam(ctx.params, 'value', false);
    return {
      outputs: { out: value ? 1 : 0 },
      nextState: null,
    };
  },
};

export const dffDefinition: ComponentDefinition<FlipFlopState> = {
  type: 'dff',
  label: 'D Flip-Flop',
  category: 'sequential',
  params: [
    {
      id: 'asyncControls',
      label: 'Async preset/clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const asyncControls = readBooleanParam(params, 'asyncControls', false);
    return getFlipFlopPins(
      [
        { id: 'd', label: 'D', direction: 'input' },
        { id: 'clk', label: 'CLK', direction: 'input' },
      ],
      asyncControls,
    );
  },
  initState: () => ({ q: 0, prevClk: 0 }),
  evaluate: (ctx) => {
    const asyncControls = readBooleanParam(ctx.params, 'asyncControls', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const d = (ctx.inputs['d'] ?? 0) as Signal;
    let q = ctx.state.q;

    if (asyncControls) {
      const clr = (ctx.inputs['clr'] ?? 0) as Signal;
      const pre = (ctx.inputs['pre'] ?? 0) as Signal;
      if (clr === 1) {
        q = 0;
      } else if (pre === 1) {
        q = 1;
      } else if (isRisingEdge(ctx.state.prevClk, clk)) {
        q = d;
      }
    } else {
      if (isRisingEdge(ctx.state.prevClk, clk)) {
        q = d;
      }
    }

    return {
      outputs: {
        q,
        qn: q === 1 ? 0 : 1,
      },
      nextState: {
        q,
        prevClk: clk,
      },
    };
  },
};

export const srffDefinition: ComponentDefinition<FlipFlopState> = {
  type: 'srff',
  label: 'SR Flip-Flop',
  category: 'sequential',
  params: [
    {
      id: 'asyncControls',
      label: 'Async preset/clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const asyncControls = readBooleanParam(params, 'asyncControls', false);
    return getFlipFlopPins(
      [
        { id: 's', label: 'S', direction: 'input' },
        { id: 'r', label: 'R', direction: 'input' },
        { id: 'clk', label: 'CLK', direction: 'input' },
      ],
      asyncControls,
    );
  },
  initState: () => ({ q: 0, prevClk: 0 }),
  evaluate: (ctx) => {
    const asyncControls = readBooleanParam(ctx.params, 'asyncControls', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const s = (ctx.inputs['s'] ?? 0) as Signal;
    const r = (ctx.inputs['r'] ?? 0) as Signal;
    let q = ctx.state.q;

    if (asyncControls) {
      const clr = (ctx.inputs['clr'] ?? 0) as Signal;
      const pre = (ctx.inputs['pre'] ?? 0) as Signal;
      if (clr === 1) {
        q = 0;
      } else if (pre === 1) {
        q = 1;
      } else if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (s === 1 && r === 0) {
          q = 1;
        } else if (s === 0 && r === 1) {
          q = 0;
        }
        // S=0,R=0: hold previous q.
        // S=1,R=1: invalid input combination in SR flip-flop; q is left unchanged.
      }
    } else {
      if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (s === 1 && r === 0) {
          q = 1;
        } else if (s === 0 && r === 1) {
          q = 0;
        }
        // S=0,R=0: hold previous q.
        // S=1,R=1: invalid input combination in SR flip-flop; q is left unchanged.
      }
    }

    return {
      outputs: {
        q,
        qn: q === 1 ? 0 : 1,
      },
      nextState: {
        q,
        prevClk: clk,
      },
    };
  },
};

export const jkffDefinition: ComponentDefinition<FlipFlopState> = {
  type: 'jkff',
  label: 'JK Flip-Flop',
  category: 'sequential',
  params: [
    {
      id: 'asyncControls',
      label: 'Async preset/clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const asyncControls = readBooleanParam(params, 'asyncControls', false);
    return getFlipFlopPins(
      [
        { id: 'j', label: 'J', direction: 'input' },
        { id: 'k', label: 'K', direction: 'input' },
        { id: 'clk', label: 'CLK', direction: 'input' },
      ],
      asyncControls,
    );
  },
  initState: () => ({ q: 0, prevClk: 0 }),
  evaluate: (ctx) => {
    const asyncControls = readBooleanParam(ctx.params, 'asyncControls', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const j = (ctx.inputs['j'] ?? 0) as Signal;
    const k = (ctx.inputs['k'] ?? 0) as Signal;
    let q = ctx.state.q;

    if (asyncControls) {
      const clr = (ctx.inputs['clr'] ?? 0) as Signal;
      const pre = (ctx.inputs['pre'] ?? 0) as Signal;
      if (clr === 1) {
        q = 0;
      } else if (pre === 1) {
        q = 1;
      } else if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (j === 0 && k === 0) {
          // hold
        } else if (j === 1 && k === 0) {
          q = 1;
        } else if (j === 0 && k === 1) {
          q = 0;
        } else if (j === 1 && k === 1) {
          q = q === 1 ? 0 : 1;
        }
      }
    } else {
      if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (j === 0 && k === 0) {
          // hold
        } else if (j === 1 && k === 0) {
          q = 1;
        } else if (j === 0 && k === 1) {
          q = 0;
        } else if (j === 1 && k === 1) {
          q = q === 1 ? 0 : 1;
        }
      }
    }

    return {
      outputs: {
        q,
        qn: q === 1 ? 0 : 1,
      },
      nextState: {
        q,
        prevClk: clk,
      },
    };
  },
};

export const tffDefinition: ComponentDefinition<FlipFlopState> = {
  type: 'tff',
  label: 'T Flip-Flop',
  category: 'sequential',
  params: [
    {
      id: 'asyncControls',
      label: 'Async preset/clear',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: (params) => {
    const asyncControls = readBooleanParam(params, 'asyncControls', false);
    return getFlipFlopPins(
      [
        { id: 't', label: 'T', direction: 'input' },
        { id: 'clk', label: 'CLK', direction: 'input' },
      ],
      asyncControls,
    );
  },
  initState: () => ({ q: 0, prevClk: 0 }),
  evaluate: (ctx) => {
    const asyncControls = readBooleanParam(ctx.params, 'asyncControls', false);
    const clk = (ctx.inputs['clk'] ?? 0) as Signal;
    const t = (ctx.inputs['t'] ?? 0) as Signal;
    let q = ctx.state.q;

    if (asyncControls) {
      const clr = (ctx.inputs['clr'] ?? 0) as Signal;
      const pre = (ctx.inputs['pre'] ?? 0) as Signal;
      if (clr === 1) {
        q = 0;
      } else if (pre === 1) {
        q = 1;
      } else if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (t === 1) {
          q = q === 1 ? 0 : 1;
        }
      }
    } else {
      if (isRisingEdge(ctx.state.prevClk, clk)) {
        if (t === 1) {
          q = q === 1 ? 0 : 1;
        }
      }
    }

    return {
      outputs: {
        q,
        qn: q === 1 ? 0 : 1,
      },
      nextState: {
        q,
        prevClk: clk,
      },
    };
  },
};

export const sequentialDefinitions = [
  clockDefinition,
  dffDefinition,
  srffDefinition,
  jkffDefinition,
  tffDefinition,
];
