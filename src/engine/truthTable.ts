import type { ParamValues, Signal } from './types';
import type { SimCircuit, SimWire } from './simTypes';
import { compileCircuit, createInitialState, getInputPinValue, settle } from './simulator';
import { getComponentDefinition } from './registry';
import {
  MAX_TRUTH_TABLE_INPUTS,
  type TruthTableColumn,
  type TruthTableResult,
  type TruthTableRow,
} from './truthTableTypes';

export interface TruthTableComponent {
  id: string;
  type: string;
  params: ParamValues;
  position?: { x: number; y: number };
  label?: string;
}

export interface TruthTableCircuit {
  components: readonly TruthTableComponent[];
  wires: readonly SimWire[];
}

/**
 * Detects whether there is a directed feedback cycle among the components.
 * Handles self-loops and safely ignores wires that reference missing components.
 */
export function hasFeedbackLoop(circuit: {
  components: readonly { id: string }[];
  wires: readonly SimWire[];
}): boolean {
  const componentIds = new Set(circuit.components.map((c) => c.id));
  const adj = new Map<string, string[]>();

  for (const c of circuit.components) {
    adj.set(c.id, []);
  }

  for (const wire of circuit.wires) {
    const fromId = wire.from.componentId;
    const toId = wire.to.componentId;

    if (!componentIds.has(fromId) || !componentIds.has(toId)) {
      continue;
    }

    if (fromId === toId) {
      return true;
    }

    adj.get(fromId)?.push(toId);
  }

  // 0 = unvisited, 1 = visiting (on current stack), 2 = visited
  const state = new Map<string, number>();
  for (const c of circuit.components) {
    state.set(c.id, 0);
  }

  function dfs(u: string): boolean {
    state.set(u, 1);
    const neighbors = adj.get(u) ?? [];
    for (const v of neighbors) {
      const vState = state.get(v) ?? 0;
      if (vState === 1) {
        return true;
      }
      if (vState === 0) {
        if (dfs(v)) {
          return true;
        }
      }
    }
    state.set(u, 2);
    return false;
  }

  for (const c of circuit.components) {
    if (state.get(c.id) === 0) {
      if (dfs(c.id)) {
        return true;
      }
    }
  }

  return false;
}

interface ComponentWithIndex {
  component: TruthTableComponent;
  index: number;
}

function sortComponents(
  components: readonly TruthTableComponent[],
  allComponents: readonly TruthTableComponent[],
): TruthTableComponent[] {
  const indexMap = new Map<string, number>();
  allComponents.forEach((c, idx) => {
    indexMap.set(c.id, idx);
  });

  const wrapped: ComponentWithIndex[] = components.map((c) => ({
    component: c,
    index: indexMap.get(c.id) ?? 0,
  }));

  wrapped.sort((a, b) => {
    const posA = a.component.position;
    const posB = b.component.position;

    if (posA && !posB) return -1;
    if (!posA && posB) return 1;
    if (!posA && !posB) return a.index - b.index;

    if (posA!.y !== posB!.y) {
      return posA!.y - posB!.y;
    }
    if (posA!.x !== posB!.x) {
      return posA!.x - posB!.x;
    }
    return a.index - b.index;
  });

  return wrapped.map((w) => w.component);
}

function assignColumnNames(
  components: readonly TruthTableComponent[],
  defaultPrefix: 'IN' | 'OUT',
): TruthTableColumn[] {
  const initialNames: string[] = components.map((comp, idx) => {
    const trimmed = comp.label?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : `${defaultPrefix}${idx + 1}`;
  });

  const used = new Set<string>();
  const columns: TruthTableColumn[] = [];

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]!;
    const baseName = initialNames[i]!;

    if (!used.has(baseName)) {
      used.add(baseName);
      columns.push({ componentId: comp.id, name: baseName });
    } else {
      let counter = 2;
      let candidate = `${baseName} (${counter})`;
      while (used.has(candidate)) {
        counter++;
        candidate = `${baseName} (${counter})`;
      }
      used.add(candidate);
      columns.push({ componentId: comp.id, name: candidate });
    }
  }

  return columns;
}

/**
 * Headless, pure truth table generator.
 * Never throws an error; returns a structured result or failure reason.
 */
export function generateTruthTable(circuit: TruthTableCircuit): TruthTableResult {
  const rawInputs = circuit.components.filter((c) => c.type === 'inputSwitch');
  const rawOutputs = circuit.components.filter((c) => c.type === 'outputLed');

  const sortedInputs = sortComponents(rawInputs, circuit.components);
  const sortedOutputs = sortComponents(rawOutputs, circuit.components);

  if (sortedInputs.length === 0) {
    return {
      ok: false,
      reason: 'noInputs',
      message: 'Add at least one Input Switch to generate a truth table.',
    };
  }

  if (sortedOutputs.length === 0) {
    return {
      ok: false,
      reason: 'noOutputs',
      message: 'Add at least one Output LED to generate a truth table.',
    };
  }

  if (sortedInputs.length > MAX_TRUTH_TABLE_INPUTS) {
    return {
      ok: false,
      reason: 'tooManyInputs',
      message: `Truth tables support up to ${MAX_TRUTH_TABLE_INPUTS} inputs (this circuit has ${sortedInputs.length}).`,
    };
  }

  const compiled = compileCircuit(circuit);
  if (compiled.issues.length > 0) {
    const firstMsg = compiled.issues[0]?.message ?? 'Invalid circuit configuration';
    return {
      ok: false,
      reason: 'circuitIssues',
      message: `Fix the circuit issues first: ${firstMsg}`,
    };
  }

  const hasSequential = circuit.components.some(
    (c) => getComponentDefinition(c.type)?.category === 'sequential',
  );
  if (hasSequential) {
    return {
      ok: false,
      reason: 'notCombinational',
      message:
        'This circuit contains sequential components (a clock or flip-flops), so its outputs depend on history. Truth tables are only generated for combinational circuits.',
    };
  }

  if (hasFeedbackLoop(circuit)) {
    return {
      ok: false,
      reason: 'notCombinational',
      message:
        'This circuit contains a feedback loop, so its output may depend on history. Truth tables are only generated for combinational circuits.',
    };
  }

  const inputColumns = assignColumnNames(sortedInputs, 'IN');
  const outputColumns = assignColumnNames(sortedOutputs, 'OUT');

  const n = sortedInputs.length;
  const rowCount = 1 << n;
  const rows: TruthTableRow[] = [];

  for (let r = 0; r < rowCount; r++) {
    const rowInputs: Signal[] = [];
    const rowSwitchValues = new Map<string, boolean>();

    for (let i = 0; i < n; i++) {
      const bit = (r >> (n - 1 - i)) & 1;
      rowInputs.push(bit as Signal);
      rowSwitchValues.set(sortedInputs[i]!.id, bit === 1);
    }

    const rowCircuit: SimCircuit = {
      components: circuit.components.map((c) => {
        if (rowSwitchValues.has(c.id)) {
          return {
            ...c,
            params: {
              ...c.params,
              value: rowSwitchValues.get(c.id)!,
            },
          };
        }
        return c;
      }),
      wires: circuit.wires,
    };

    const rowCompiled = compileCircuit(rowCircuit);
    const initialState = createInitialState(rowCompiled);
    const settleResult = settle(rowCompiled, initialState);

    if (settleResult.status !== 'stable') {
      return {
        ok: false,
        reason: 'notCombinational',
        message:
          'This circuit has feedback or memory (it oscillates or does not settle), so a truth table cannot be generated.',
      };
    }

    const rowOutputs: Signal[] = [];
    for (const led of sortedOutputs) {
      const val = getInputPinValue(rowCompiled, settleResult.state, led.id, 'in');
      rowOutputs.push(val);
    }

    rows.push({
      inputs: rowInputs,
      outputs: rowOutputs,
    });
  }

  return {
    ok: true,
    inputs: inputColumns,
    outputs: outputColumns,
    rows,
  };
}
