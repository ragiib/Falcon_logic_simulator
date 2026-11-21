/**
 * Synchronous unit-delay simulation core.
 *
 * Every tick: all components evaluate concurrently using only the previous tick's
 * output pin values and previous component states; all outputs and nextStates
 * commit together. Evaluation order never matters. Pin values are stored only
 * for OUTPUT pins. The value seen by an input pin equals the previous-tick
 * value of the driving output pin via a wire, or 0 if unconnected.
 * Initial state: every output pin = 0, component state = definition.initState(params), tick = 0.
 */

import type { Signal } from './types';
import { getComponentDefinition } from './registry';
import type {
  CircuitIssue,
  CompiledCircuit,
  CompiledComponent,
  SettleOptions,
  SettleResult,
  SimCircuit,
  SimState,
  SimWire,
} from './simTypes';

/**
 * Generates a unique key for a component's pin.
 */
export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}:${pinId}`;
}

/**
 * Compiles a raw circuit into a verified, executable representation.
 * Never throws an error; records issues in `CompiledCircuit.issues`.
 */
export function compileCircuit(circuit: SimCircuit): CompiledCircuit {
  const issues: CircuitIssue[] = [];
  const validComponents: CompiledComponent[] = [];
  const compMap = new Map<
    string,
    {
      comp: CompiledComponent;
      inputPins: Set<string>;
      outputPins: Set<string>;
    }
  >();

  for (const c of circuit.components) {
    if (compMap.has(c.id)) {
      issues.push({
        kind: 'duplicateComponentId',
        message: `Duplicate component id "${c.id}" ignored`,
        componentId: c.id,
      });
      continue;
    }

    const definition = getComponentDefinition(c.type);
    if (!definition) {
      issues.push({
        kind: 'unknownComponentType',
        message: `Unknown component type "${c.type}"`,
        componentId: c.id,
      });
      continue;
    }

    const pins = definition.getPins(c.params);
    const inputPinIds: string[] = [];
    const outputPinIds: string[] = [];
    const inputPins = new Set<string>();
    const outputPins = new Set<string>();

    for (const p of pins) {
      if (p.direction === 'input') {
        inputPinIds.push(p.id);
        inputPins.add(p.id);
      } else {
        outputPinIds.push(p.id);
        outputPins.add(p.id);
      }
    }

    const compiledComp: CompiledComponent = {
      id: c.id,
      type: c.type,
      definition,
      params: c.params,
      inputPinIds,
      outputPinIds,
    };

    validComponents.push(compiledComp);
    compMap.set(c.id, {
      comp: compiledComp,
      inputPins,
      outputPins,
    });
  }

  const acceptedWires: SimWire[] = [];
  const driverOfInput = new Map<string, string>();

  for (const wire of circuit.wires) {
    const fromComp = compMap.get(wire.from.componentId);
    if (!fromComp) {
      issues.push({
        kind: 'invalidWire',
        message: `Source component "${wire.from.componentId}" does not exist`,
        wireId: wire.id,
      });
      continue;
    }
    if (!fromComp.outputPins.has(wire.from.pinId)) {
      issues.push({
        kind: 'invalidWire',
        message: `Pin "${wire.from.pinId}" on source component "${wire.from.componentId}" is not a valid output pin`,
        wireId: wire.id,
        componentId: wire.from.componentId,
      });
      continue;
    }

    const toComp = compMap.get(wire.to.componentId);
    if (!toComp) {
      issues.push({
        kind: 'invalidWire',
        message: `Target component "${wire.to.componentId}" does not exist`,
        wireId: wire.id,
      });
      continue;
    }
    if (!toComp.inputPins.has(wire.to.pinId)) {
      issues.push({
        kind: 'invalidWire',
        message: `Pin "${wire.to.pinId}" on target component "${wire.to.componentId}" is not a valid input pin`,
        wireId: wire.id,
        componentId: wire.to.componentId,
      });
      continue;
    }

    const targetInputKey = pinKey(wire.to.componentId, wire.to.pinId);
    if (driverOfInput.has(targetInputKey)) {
      issues.push({
        kind: 'multipleDrivers',
        message: `Input pin "${wire.to.pinId}" on component "${wire.to.componentId}" already has a driver`,
        wireId: wire.id,
        componentId: wire.to.componentId,
      });
      continue;
    }

    const sourceOutputKey = pinKey(wire.from.componentId, wire.from.pinId);
    driverOfInput.set(targetInputKey, sourceOutputKey);
    acceptedWires.push(wire);
  }

  return {
    components: validComponents,
    wires: acceptedWires,
    driverOfInput,
    issues,
  };
}

/**
 * Creates the initial simulation state where all output pins are 0 and
 * component states are initialized via definition.initState.
 */
export function createInitialState(compiled: CompiledCircuit): SimState {
  const pinValues: Record<string, Signal> = {};
  const componentStates: Record<string, unknown> = {};

  for (const comp of compiled.components) {
    for (const pinId of comp.outputPinIds) {
      pinValues[pinKey(comp.id, pinId)] = 0;
    }
    componentStates[comp.id] = comp.definition.initState(comp.params);
  }

  return {
    tick: 0,
    pinValues,
    componentStates,
  };
}

/**
 * Performs one synchronous simulation step across all components.
 */
export function tick(compiled: CompiledCircuit, state: SimState): SimState {
  const newPinValues: Record<string, Signal> = {};
  const newComponentStates: Record<string, unknown> = {};

  for (const comp of compiled.components) {
    const inputs: Record<string, Signal> = {};
    for (const pinId of comp.inputPinIds) {
      const inKey = pinKey(comp.id, pinId);
      const driverKey = compiled.driverOfInput.get(inKey);
      inputs[pinId] = driverKey !== undefined ? (state.pinValues[driverKey] ?? 0) : 0;
    }

    const currentCompState = state.componentStates[comp.id];
    const result = comp.definition.evaluate({
      inputs,
      state: currentCompState,
      params: comp.params,
    });

    for (const pinId of comp.outputPinIds) {
      newPinValues[pinKey(comp.id, pinId)] = result.outputs[pinId] ?? 0;
    }
    newComponentStates[comp.id] = result.nextState;
  }

  return {
    tick: state.tick + 1,
    pinValues: newPinValues,
    componentStates: newComponentStates,
  };
}

/**
 * Deterministic string representation of output pins and internal states.
 * Excludes tick counter; used for cycle and stability detection.
 */
export function stateSignature(compiled: CompiledCircuit, state: SimState): string {
  let sig = '';
  for (const comp of compiled.components) {
    sig += `${comp.id}:`;
    for (const pinId of comp.outputPinIds) {
      const val = state.pinValues[pinKey(comp.id, pinId)] ?? 0;
      sig += `${pinId}=${val};`;
    }
    const cState = state.componentStates[comp.id];
    sig += `s=${JSON.stringify(cState) ?? 'undefined'}|`;
  }
  return sig;
}

/**
 * Repeatedly ticks until the circuit reaches a steady state, enters an oscillation cycle,
 * or reaches maxTicks limit.
 */
export function settle(
  compiled: CompiledCircuit,
  state: SimState,
  options?: SettleOptions,
): SettleResult {
  const maxTicks = options?.maxTicks ?? 1000;
  const seen = new Map<string, number>();
  const initialSig = stateSignature(compiled, state);
  seen.set(initialSig, 0);

  let prevSig = initialSig;
  let currentState = state;

  for (let i = 1; i <= maxTicks; i++) {
    const next = tick(compiled, currentState);
    const sig = stateSignature(compiled, next);

    if (sig === prevSig) {
      return {
        state: next,
        status: 'stable',
        ticks: i - 1,
      };
    }

    const prevIndex = seen.get(sig);
    if (prevIndex !== undefined) {
      return {
        state: next,
        status: 'oscillating',
        ticks: i,
        period: i - prevIndex,
      };
    }

    seen.set(sig, i);
    prevSig = sig;
    currentState = next;
  }

  return {
    state: currentState,
    status: 'limit',
    ticks: maxTicks,
  };
}

/**
 * Retrieves the signal value of a specific component's output pin.
 */
export function getOutputPinValue(state: SimState, componentId: string, pinId: string): Signal {
  return state.pinValues[pinKey(componentId, pinId)] ?? 0;
}

/**
 * Retrieves the signal value arriving at a specific component's input pin.
 */
export function getInputPinValue(
  compiled: CompiledCircuit,
  state: SimState,
  componentId: string,
  pinId: string,
): Signal {
  const driverKey = compiled.driverOfInput.get(pinKey(componentId, pinId));
  return driverKey !== undefined ? (state.pinValues[driverKey] ?? 0) : 0;
}

/**
 * Retrieves the signal value currently travelling through a wire.
 */
export function getWireValue(state: SimState, wire: SimWire): Signal {
  return state.pinValues[pinKey(wire.from.componentId, wire.from.pinId)] ?? 0;
}

/**
 * Carries over component state and output pin values across circuit recompilations
 * for surviving components of the same type.
 */
export function carryOverState(
  previousCompiled: CompiledCircuit,
  previousState: SimState,
  nextCompiled: CompiledCircuit,
): SimState {
  const nextState = createInitialState(nextCompiled);

  const prevCompMap = new Map<string, CompiledComponent>();
  for (const comp of previousCompiled.components) {
    prevCompMap.set(comp.id, comp);
  }

  for (const nextComp of nextCompiled.components) {
    const prevComp = prevCompMap.get(nextComp.id);
    if (prevComp && prevComp.type === nextComp.type) {
      nextState.componentStates[nextComp.id] = previousState.componentStates[nextComp.id];

      const prevOutputPins = new Set(prevComp.outputPinIds);
      for (const pinId of nextComp.outputPinIds) {
        if (prevOutputPins.has(pinId)) {
          const key = pinKey(nextComp.id, pinId);
          nextState.pinValues[key] = previousState.pinValues[key] ?? 0;
        }
      }
    }
  }

  nextState.tick = previousState.tick;
  return nextState;
}
