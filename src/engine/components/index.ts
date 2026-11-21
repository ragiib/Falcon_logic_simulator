export * from './io';
export * from './gates';
export * from './combinational';
export * from './sequential';
export * from './registers';

import type { ComponentDefinition } from '@/engine/types';
import { inputSwitch, outputLed } from './io';
import { andGate, orGate, notGate, nandGate, norGate, xorGate, xnorGate } from './gates';
import { combinationalDefinitions } from './combinational';
import { sequentialDefinitions } from './sequential';
import { registerDefinitions } from './registers';

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
  ...combinationalDefinitions,
  ...sequentialDefinitions,
  ...registerDefinitions,
];
