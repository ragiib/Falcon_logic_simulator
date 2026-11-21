import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type Circuit } from '@/model';
import { circuitSimKey, selectInputValue, useCircuitStore, useSimStore } from '@/store';
import { syncIfNeeded } from '@/features/canvas/useSimulationSync';

describe('simSync (simulation synchronization logic)', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
    useSimStore.getState().resetSimulation(useCircuitStore.getState().circuit);
  });

  it('switch(true) -> LED: after syncIfNeeded the LED input is 1; then with switch false syncIfNeeded makes it 0 without calling setMode', () => {
    const circuitOn: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Switch LED Test',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: true },
        },
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 100, y: 0 },
          params: {},
        },
      ],
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };

    useCircuitStore.getState().replaceCircuit(circuitOn);
    const synced1 = syncIfNeeded(circuitOn);
    expect(synced1).toBe(true);

    // Verify LED input is 1
    const ledVal1 = selectInputValue('led1', 'in')(useSimStore.getState());
    expect(ledVal1).toBe(1);

    // Toggle switch to false
    const circuitOff: Circuit = {
      ...circuitOn,
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: false },
        },
        circuitOn.components[1]!,
      ],
    };

    useCircuitStore.getState().replaceCircuit(circuitOff);
    const synced2 = syncIfNeeded(circuitOff);
    expect(synced2).toBe(true);

    // Verify LED input is now 0 WITHOUT calling setMode
    const ledVal2 = selectInputValue('led1', 'in')(useSimStore.getState());
    expect(ledVal2).toBe(0);
  });

  it('a position-only change returns false and does not resync', () => {
    const circuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Position Test',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: false },
        },
      ],
      wires: [],
    };

    syncIfNeeded(circuit);

    const movedCircuit: Circuit = {
      ...circuit,
      components: [
        {
          ...circuit.components[0]!,
          position: { x: 200, y: 300 },
        },
      ],
    };

    const synced = syncIfNeeded(movedCircuit);
    expect(synced).toBe(false);
  });

  it('adding a wire or changing params returns true', () => {
    const circuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Wire and Param Test',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: false },
        },
        {
          id: 'led1',
          type: 'outputLed',
          position: { x: 100, y: 0 },
          params: {},
        },
      ],
      wires: [],
    };

    syncIfNeeded(circuit);

    // Changing param
    const paramChanged: Circuit = {
      ...circuit,
      components: [
        {
          ...circuit.components[0]!,
          params: { value: true },
        },
        circuit.components[1]!,
      ],
    };
    expect(syncIfNeeded(paramChanged)).toBe(true);

    // Adding wire
    const wireAdded: Circuit = {
      ...paramChanged,
      wires: [
        {
          id: 'w1',
          from: { componentId: 'sw1', pinId: 'out' },
          to: { componentId: 'led1', pinId: 'in' },
        },
      ],
    };
    expect(syncIfNeeded(wireAdded)).toBe(true);
  });

  it('after replaceCircuit + resetSimulation, lastSyncedKey equals key of new circuit and syncIfNeeded returns false', () => {
    const newCircuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Reset Test',
      components: [
        {
          id: 'and1',
          type: 'and',
          position: { x: 50, y: 50 },
          params: { inputs: 2 },
        },
      ],
      wires: [],
    };

    useCircuitStore.getState().replaceCircuit(newCircuit);
    useSimStore.getState().resetSimulation(newCircuit);

    const expectedKey = circuitSimKey(newCircuit);
    expect(useSimStore.getState().lastSyncedKey).toBe(expectedKey);

    // syncIfNeeded returns false because resetSimulation already synced and recorded lastSyncedKey
    expect(syncIfNeeded(newCircuit)).toBe(false);
  });

  it('in step mode with running = true, stepOnce called repeatedly advances simState.tick', () => {
    const circuit: Circuit = {
      version: CURRENT_SCHEMA_VERSION,
      name: 'Step Running Test',
      components: [
        {
          id: 'sw1',
          type: 'inputSwitch',
          position: { x: 0, y: 0 },
          params: { value: true },
        },
      ],
      wires: [],
    };

    useSimStore.getState().setMode('step', circuit);
    useSimStore.getState().setRunning(true);

    const initialTick = useSimStore.getState().simState?.tick ?? 0;

    useSimStore.getState().stepOnce();
    expect(useSimStore.getState().simState?.tick).toBe(initialTick + 1);

    useSimStore.getState().stepOnce();
    expect(useSimStore.getState().simState?.tick).toBe(initialTick + 2);
  });
});
