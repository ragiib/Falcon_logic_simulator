export * from './io';
export * from './gates';

import type { ComponentDefinition } from '@/engine/types';
import { inputSwitch, outputLed } from './io';
import { andGate, orGate, notGate, nandGate, norGate, xorGate, xnorGate } from './gates';

export const builtInComponents: ComponentDefinition[] = [
  inputSwitch,
  outputLed,
  andGate,
  orGate,
  notGate,
  nandGate,
  norGate,
  xorGate,
  xnorGate,
];
