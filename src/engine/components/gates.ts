import type { ComponentDefinition, ParamValues, PinDefinition, Signal } from '@/engine/types';
import { readNumberParam } from '@/engine/params';

type GateType = 'and' | 'or' | 'not' | 'nand' | 'nor' | 'xor' | 'xnor';
type GateLabel = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';

interface GateConfig {
  type: GateType;
  label: GateLabel;
  isNot?: boolean;
  compute: (inputs: Signal[]) => Signal;
}

function createGateDefinition({
  type,
  label,
  isNot = false,
  compute,
}: GateConfig): ComponentDefinition<null> {
  const params = isNot
    ? []
    : [
        {
          id: 'inputs',
          label: 'Inputs',
          type: 'number' as const,
          default: 2,
          min: 2,
          max: 8,
        },
      ];

  const getPinCount = (paramValues: Readonly<ParamValues>) =>
    isNot ? 1 : readNumberParam(paramValues, 'inputs', 2, 2, 8);

  const getPins = (paramValues: Readonly<ParamValues>): PinDefinition[] => {
    const count = getPinCount(paramValues);
    const pins: PinDefinition[] = [];
    for (let i = 0; i < count; i++) {
      pins.push({
        id: `in${i}`,
        label: String.fromCharCode(65 + i),
        direction: 'input',
      });
    }
    pins.push({
      id: 'out',
      label: 'Out',
      direction: 'output',
    });
    return pins;
  };

  return {
    type,
    label,
    category: 'gate',
    params,
    getPins,
    initState: () => null,
    evaluate: (ctx) => {
      const count = getPinCount(ctx.params);
      const inputs: Signal[] = [];
      for (let i = 0; i < count; i++) {
        inputs.push(ctx.inputs[`in${i}`] ?? 0);
      }
      const out = compute(inputs);
      return {
        outputs: { out },
        nextState: null,
      };
    },
  };
}

export const andGate = createGateDefinition({
  type: 'and',
  label: 'AND',
  compute: (inputs) => (inputs.every((s) => s === 1) ? 1 : 0),
});

export const orGate = createGateDefinition({
  type: 'or',
  label: 'OR',
  compute: (inputs) => (inputs.some((s) => s === 1) ? 1 : 0),
});

export const notGate = createGateDefinition({
  type: 'not',
  label: 'NOT',
  isNot: true,
  compute: (inputs) => (inputs[0] === 1 ? 0 : 1),
});

export const nandGate = createGateDefinition({
  type: 'nand',
  label: 'NAND',
  compute: (inputs) => (inputs.every((s) => s === 1) ? 0 : 1),
});

export const norGate = createGateDefinition({
  type: 'nor',
  label: 'NOR',
  compute: (inputs) => (inputs.some((s) => s === 1) ? 0 : 1),
});

export const xorGate = createGateDefinition({
  type: 'xor',
  label: 'XOR',
  compute: (inputs) => (inputs.filter((s) => s === 1).length % 2 === 1 ? 1 : 0),
});

export const xnorGate = createGateDefinition({
  type: 'xnor',
  label: 'XNOR',
  compute: (inputs) => (inputs.filter((s) => s === 1).length % 2 === 0 ? 1 : 0),
});

export const gateDefinitions: ComponentDefinition<null>[] = [
  andGate,
  orGate,
  notGate,
  nandGate,
  norGate,
  xorGate,
  xnorGate,
];
