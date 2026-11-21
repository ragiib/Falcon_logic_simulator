import type { ComponentDefinition, Signal } from '@/engine/types';
import { readBooleanParam } from '@/engine/params';

export const inputSwitch: ComponentDefinition<null> = {
  type: 'inputSwitch',
  label: 'Input Switch',
  category: 'io',
  params: [
    {
      id: 'value',
      label: 'Value',
      type: 'boolean',
      default: false,
    },
  ],
  getPins: () => [
    {
      id: 'out',
      label: 'Out',
      direction: 'output',
    },
  ],
  initState: () => null,
  evaluate: ({ params }) => {
    const isHigh = readBooleanParam(params, 'value', false);
    const out: Signal = isHigh ? 1 : 0;
    return {
      outputs: { out },
      nextState: null,
    };
  },
};

export const outputLed: ComponentDefinition<null> = {
  type: 'outputLed',
  label: 'Output LED',
  category: 'io',
  params: [],
  getPins: () => [
    {
      id: 'in',
      label: 'In',
      direction: 'input',
    },
  ],
  initState: () => null,
  evaluate: () => ({
    outputs: {},
    nextState: null,
  }),
};
