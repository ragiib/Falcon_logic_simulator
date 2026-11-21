import type { ComponentDefinition, ParamValues } from './types';

/**
 * Returns default param values defined by a component definition.
 */
export function getDefaultParams(def: ComponentDefinition): ParamValues {
  const result: ParamValues = {};
  for (const param of def.params) {
    result[param.id] = param.default;
  }
  return result;
}

/**
 * Reads a number param from params, rounding to integer, falling back if non-number or not finite,
 * and clamping to [min, max] when given.
 */
export function readNumberParam(
  params: Readonly<ParamValues>,
  id: string,
  fallback: number,
  min?: number,
  max?: number,
): number {
  const val = params[id];
  let num = typeof val === 'number' && Number.isFinite(val) ? Math.round(val) : fallback;
  if (min !== undefined && num < min) {
    num = min;
  }
  if (max !== undefined && num > max) {
    num = max;
  }
  return num;
}

/**
 * Reads a boolean param from params, falling back if not boolean.
 */
export function readBooleanParam(
  params: Readonly<ParamValues>,
  id: string,
  fallback: boolean,
): boolean {
  const val = params[id];
  return typeof val === 'boolean' ? val : fallback;
}
