import type { ComponentDefinition, ParamValues, Signal } from './types';

export interface SimPinRef {
  componentId: string;
  pinId: string;
}
export interface SimComponent {
  id: string;
  type: string;
  params: ParamValues;
}
export interface SimWire {
  id: string;
  from: SimPinRef;
  to: SimPinRef;
}
/** Structurally compatible with model Circuit (extra fields are fine). */
export interface SimCircuit {
  components: readonly SimComponent[];
  wires: readonly SimWire[];
}

export type CircuitIssueKind =
  'unknownComponentType' | 'duplicateComponentId' | 'invalidWire' | 'multipleDrivers';
export interface CircuitIssue {
  kind: CircuitIssueKind;
  message: string;
  componentId?: string;
  wireId?: string;
}

export interface CompiledComponent {
  id: string;
  type: string;
  definition: ComponentDefinition;
  params: ParamValues;
  inputPinIds: string[];
  outputPinIds: string[];
}
export interface CompiledCircuit {
  components: CompiledComponent[]; // only valid components, in circuit order
  wires: SimWire[]; // only valid wires that were accepted
  /** key = pinKey(input pin) -> pinKey(output pin that drives it) */
  driverOfInput: ReadonlyMap<string, string>;
  issues: CircuitIssue[];
}

export interface SimState {
  tick: number;
  /** key = pinKey(componentId, pinId), OUTPUT pins only */
  pinValues: Record<string, Signal>;
  componentStates: Record<string, unknown>;
}

export type SettleStatus = 'stable' | 'oscillating' | 'limit';
export interface SettleOptions {
  maxTicks?: number;
} // default 1000
export interface SettleResult {
  state: SimState;
  status: SettleStatus;
  /** number of ticks that changed the state (see settle rules) */
  ticks: number;
  /** only when status === 'oscillating': length of the repeating cycle in ticks */
  period?: number;
}
