import type { ParamValues } from '@/engine/types';

export const CURRENT_SCHEMA_VERSION = 1;

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface CircuitComponent {
  id: string;
  /** Matches a ComponentDefinition.type in the engine registry. */
  type: string;
  position: { x: number; y: number };
  params: ParamValues;
  /** Optional user-visible label (e.g. an input switch named "A"). */
  label?: string;
}

/** A wire always goes from an output pin to an input pin. An input pin accepts at most one wire. */
export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
}

export interface Circuit {
  version: number;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
}
