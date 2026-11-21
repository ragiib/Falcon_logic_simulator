/** A digital signal value. Kept as an alias so an "unknown" state could be added later. */
export type Signal = 0 | 1;

export type PinDirection = 'input' | 'output';

export interface PinDefinition {
  /** Unique within its component, e.g. "in0", "out". */
  id: string;
  label: string;
  direction: PinDirection;
}

export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

export interface ParamDefinition {
  id: string;
  label: string;
  type: 'number' | 'string' | 'boolean';
  default: ParamValue;
  min?: number;
  max?: number;
}

export type ComponentCategory = 'io' | 'gate' | 'combinational' | 'sequential' | 'custom';

export interface EvaluateContext<S = unknown> {
  /** Current value of each input pin, keyed by pin id. Unconnected inputs are 0. */
  inputs: Readonly<Record<string, Signal>>;
  state: S;
  params: Readonly<ParamValues>;
}

export interface EvaluateResult<S = unknown> {
  /** Value of each output pin, keyed by pin id. */
  outputs: Record<string, Signal>;
  nextState: S;
}

/**
 * A registry entry describing one kind of component.
 * evaluate() MUST be pure: no side effects, no randomness, no time access.
 */
export interface ComponentDefinition<S = unknown> {
  type: string;
  label: string;
  category: ComponentCategory;
  params: ParamDefinition[];
  /** Pins can depend on params (e.g. a gate's number of inputs). */
  getPins(params: Readonly<ParamValues>): PinDefinition[];
  initState(params: Readonly<ParamValues>): S;
  evaluate(ctx: EvaluateContext<S>): EvaluateResult<S>;
}
