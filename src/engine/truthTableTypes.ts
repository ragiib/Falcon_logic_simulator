import type { Signal } from './types';

export const MAX_TRUTH_TABLE_INPUTS = 10;

export interface TruthTableColumn {
  componentId: string;
  /** Display name, unique within its group (inputs or outputs). */
  name: string;
}

export interface TruthTableRow {
  /** Input values in the order of `inputs`. */
  inputs: Signal[];
  /** Output values in the order of `outputs`. */
  outputs: Signal[];
}

export type TruthTableFailureReason =
  'noInputs' | 'noOutputs' | 'tooManyInputs' | 'notCombinational' | 'circuitIssues';

export type TruthTableResult =
  | { ok: true; inputs: TruthTableColumn[]; outputs: TruthTableColumn[]; rows: TruthTableRow[] }
  | { ok: false; reason: TruthTableFailureReason; message: string };
