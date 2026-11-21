import { create } from 'zustand';
import type { Circuit, CircuitComponent, CircuitFragment, PinRef } from '@/model';
import {
  CURRENT_SCHEMA_VERSION,
  extractFragment,
  instantiateFragment,
  setComponentLabel as setModelLabel,
  setComponentParam as setModelParam,
  validateConnection,
} from '@/model';
import type { ParamValue } from '@/engine';
import { getDefaultParams, getComponentDefinition, hasComponent } from '@/engine';
import { createId } from '@/lib';
import { useUiStore } from './uiStore';

export interface CircuitState {
  circuit: Circuit;
  addComponent: (type: string, position: { x: number; y: number }) => string | null;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  removeComponents: (ids: readonly string[]) => void;
  addWire: (
    from: PinRef,
    to: PinRef,
  ) => { ok: true; wireId: string } | { ok: false; reason: string };
  removeWires: (ids: readonly string[]) => void;
  setComponentParam: (componentId: string, paramId: string, value: ParamValue) => void;
  setComponentLabel: (componentId: string, label: string) => void;
  toggleInputSwitch: (componentId: string) => void;
  insertFragment: (fragment: CircuitFragment, offset: { x: number; y: number }) => string[];
  duplicateComponents: (ids: readonly string[]) => string[];
  resetCircuit: () => void;
}

const initialCircuit: Circuit = {
  version: CURRENT_SCHEMA_VERSION,
  name: 'Untitled circuit',
  components: [],
  wires: [],
};

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: initialCircuit,

  addComponent: (type, position) => {
    if (!hasComponent(type)) {
      return null;
    }
    const definition = getComponentDefinition(type);
    if (!definition) {
      return null;
    }
    const id = createId('c');
    const newComponent: CircuitComponent = {
      id,
      type,
      position,
      params: getDefaultParams(definition),
    };
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: [...state.circuit.components, newComponent],
      },
    }));
    return id;
  },

  setPositions: (positions) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((comp) => {
          const newPos = positions[comp.id];
          if (newPos) {
            return { ...comp, position: newPos };
          }
          return comp;
        }),
      },
    }));
  },

  removeComponents: (ids) => {
    const removeSet = new Set(ids);
    if (removeSet.size === 0) return;
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.filter((comp) => !removeSet.has(comp.id)),
        wires: state.circuit.wires.filter(
          (w) => !removeSet.has(w.from.componentId) && !removeSet.has(w.to.componentId),
        ),
      },
    }));

    // Clean up any selected wires that are no longer present
    const remainingWires = new Set(get().circuit.wires.map((w) => w.id));
    const currentSelectedWires = useUiStore.getState().selectedWireIds;
    const prunedWires = currentSelectedWires.filter((id) => remainingWires.has(id));
    if (prunedWires.length !== currentSelectedWires.length) {
      useUiStore.getState().setSelectedWireIds(prunedWires);
    }
  },

  addWire: (from, to) => {
    const currentCircuit = get().circuit;
    const check = validateConnection(currentCircuit, from, to);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }
    const wireId = createId('w');
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: [...state.circuit.wires, { id: wireId, from, to }],
      },
    }));
    return { ok: true, wireId };
  },

  removeWires: (ids) => {
    const removeSet = new Set(ids);
    if (removeSet.size === 0) return;
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.filter((w) => !removeSet.has(w.id)),
      },
    }));
    const currentSelected = useUiStore.getState().selectedWireIds;
    const pruned = currentSelected.filter((id) => !removeSet.has(id));
    if (pruned.length !== currentSelected.length) {
      useUiStore.getState().setSelectedWireIds(pruned);
    }
  },

  setComponentParam: (componentId, paramId, value) => {
    const prevWires = get().circuit.wires;
    const nextCircuit = setModelParam(get().circuit, componentId, paramId, value);
    if (nextCircuit === get().circuit) return;

    set({ circuit: nextCircuit });

    if (nextCircuit.wires.length !== prevWires.length) {
      const remainingWireIds = new Set(nextCircuit.wires.map((w) => w.id));
      const currentSelected = useUiStore.getState().selectedWireIds;
      const pruned = currentSelected.filter((id) => remainingWireIds.has(id));
      if (pruned.length !== currentSelected.length) {
        useUiStore.getState().setSelectedWireIds(pruned);
      }
    }
  },

  setComponentLabel: (componentId, label) => {
    const nextCircuit = setModelLabel(get().circuit, componentId, label);
    if (nextCircuit !== get().circuit) {
      set({ circuit: nextCircuit });
    }
  },

  toggleInputSwitch: (componentId) => {
    const comp = get().circuit.components.find((c) => c.id === componentId);
    if (!comp || comp.type !== 'inputSwitch') return;
    const currentVal = comp.params['value'] === true;
    get().setComponentParam(componentId, 'value', !currentVal);
  },

  insertFragment: (fragment, offset) => {
    const instantiated = instantiateFragment(fragment, offset, createId);
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: [...state.circuit.components, ...instantiated.components],
        wires: [...state.circuit.wires, ...instantiated.wires],
      },
    }));
    return instantiated.components.map((c) => c.id);
  },

  duplicateComponents: (ids) => {
    if (ids.length === 0) return [];
    const currentCircuit = get().circuit;
    const fragment = extractFragment(currentCircuit, ids);
    if (fragment.components.length === 0) return [];
    return get().insertFragment(fragment, { x: 32, y: 32 });
  },

  resetCircuit: () => {
    set({
      circuit: {
        version: CURRENT_SCHEMA_VERSION,
        name: 'Untitled circuit',
        components: [],
        wires: [],
      },
    });
  },
}));
