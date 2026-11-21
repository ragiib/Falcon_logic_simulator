import { create } from 'zustand';
import type { Circuit } from '@/model';
import type { CompiledCircuit, SettleStatus, Signal, SimState } from '@/engine';
import {
  carryOverState,
  compileCircuit,
  createInitialState,
  pinKey,
  settle,
  stateSignature,
  tick,
} from '@/engine';

export interface SimStoreState {
  compiled: CompiledCircuit | null;
  simState: SimState | null;
  mode: 'instant' | 'step';
  running: boolean;
  speedMs: number;
  status: SettleStatus | 'idle';
  settleTicks: number;
  period: number | null;
  lastSyncedKey: string | null;

  syncWithCircuit: (circuit: Circuit) => void;
  stepOnce: () => void;
  setMode: (mode: 'instant' | 'step', circuit: Circuit) => void;
  setRunning: (running: boolean) => void;
  setSpeedMs: (ms: number) => void;
  resetSimulation: (circuit: Circuit) => void;
}

/**
 * Computes a cheap signature of circuit components and wires to determine
 * whether a simulation resync is necessary. Position changes do not alter this key.
 */
export function circuitSimKey(circuit: Circuit): string {
  const compPart = circuit.components
    .map((c) => `${c.id}|${c.type}|${JSON.stringify(c.params)}`)
    .join(';');
  const wirePart = circuit.wires
    .map((w) => `${w.id}|${w.from.componentId}:${w.from.pinId}|${w.to.componentId}:${w.to.pinId}`)
    .join(';');
  return `${compPart}#${wirePart}`;
}

export const useSimStore = create<SimStoreState>((set, get) => ({
  compiled: null,
  simState: null,
  mode: 'instant',
  running: false,
  speedMs: 500,
  status: 'idle',
  settleTicks: 0,
  period: null,
  lastSyncedKey: null,

  syncWithCircuit: (circuit: Circuit) => {
    const prevCompiled = get().compiled;
    const prevSimState = get().simState;
    const newCompiled = compileCircuit(circuit);
    const key = circuitSimKey(circuit);

    const baseState =
      prevCompiled && prevSimState
        ? carryOverState(prevCompiled, prevSimState, newCompiled)
        : createInitialState(newCompiled);

    if (get().mode === 'instant') {
      const result = settle(newCompiled, baseState);
      set({
        compiled: newCompiled,
        simState: result.state,
        status: result.status,
        settleTicks: result.ticks,
        period: result.period ?? null,
        lastSyncedKey: key,
      });
    } else {
      set({
        compiled: newCompiled,
        simState: baseState,
        status: 'idle',
        settleTicks: 0,
        period: null,
        lastSyncedKey: key,
      });
    }
  },

  stepOnce: () => {
    const { compiled, simState } = get();
    if (!compiled || !simState) return;

    const nextState = tick(compiled, simState);
    const prevSig = stateSignature(compiled, simState);
    const nextSig = stateSignature(compiled, nextState);

    set({
      simState: nextState,
      status: nextSig === prevSig ? 'stable' : 'idle',
    });
  },

  setMode: (mode: 'instant' | 'step', circuit: Circuit) => {
    if (mode === 'instant') {
      set({ mode: 'instant', running: false });
      get().syncWithCircuit(circuit);
    } else {
      set({ mode: 'step' });
    }
  },

  setRunning: (running: boolean) => {
    set({ running });
  },

  setSpeedMs: (ms: number) => {
    const clamped = Math.min(2000, Math.max(100, Math.round(ms)));
    set({ speedMs: clamped });
  },

  resetSimulation: (circuit: Circuit) => {
    const newCompiled = compileCircuit(circuit);
    const baseState = createInitialState(newCompiled);
    const key = circuitSimKey(circuit);

    if (get().mode === 'instant') {
      const result = settle(newCompiled, baseState);
      set({
        compiled: newCompiled,
        simState: result.state,
        running: false,
        status: result.status,
        settleTicks: result.ticks,
        period: result.period ?? null,
        lastSyncedKey: key,
      });
    } else {
      set({
        compiled: newCompiled,
        simState: baseState,
        running: false,
        status: 'idle',
        settleTicks: 0,
        period: null,
        lastSyncedKey: key,
      });
    }
  },
}));

export function selectPinValue(componentId: string, pinId: string) {
  const key = pinKey(componentId, pinId);
  return (s: SimStoreState): Signal => s.simState?.pinValues[key] ?? 0;
}

export function selectInputValue(componentId: string, pinId: string) {
  const inKey = pinKey(componentId, pinId);
  return (s: SimStoreState): Signal => {
    if (!s.compiled || !s.simState) return 0;
    const driverKey = s.compiled.driverOfInput.get(inKey);
    return driverKey !== undefined ? (s.simState.pinValues[driverKey] ?? 0) : 0;
  };
}

export function selectWireValue(wireId: string) {
  return (s: SimStoreState): Signal => {
    if (!s.compiled || !s.simState) return 0;
    const wire = s.compiled.wires.find((w) => w.id === wireId);
    if (!wire) return 0;
    const fromKey = pinKey(wire.from.componentId, wire.from.pinId);
    return s.simState.pinValues[fromKey] ?? 0;
  };
}
