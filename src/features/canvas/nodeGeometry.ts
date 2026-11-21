import { isGateType } from './gateShapes';

export function getNodeSize(
  type: string,
  inputCount: number,
  outputCount: number,
): { width: number; height: number } {
  if (isGateType(type)) {
    return {
      width: 96,
      height: Math.max(56, 24 * inputCount + 16),
    };
  }
  if (type === 'inputSwitch') {
    return { width: 96, height: 56 };
  }
  if (type === 'outputLed') {
    return { width: 80, height: 64 };
  }
  return {
    width: 96,
    height: Math.max(56, 28 * Math.max(inputCount, outputCount) + 16),
  };
}
