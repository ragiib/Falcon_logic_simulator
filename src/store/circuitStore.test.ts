import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from '@/store/circuitStore';
import { useUiStore } from '@/store/uiStore';
import type { CircuitFragment, Wire } from '@/model';

describe('circuitStore', () => {
  beforeEach(() => {
    useCircuitStore.getState().resetCircuit();
    useUiStore.setState({
      selectedIds: [],
      selectedWireIds: [],
      clipboard: null,
    });
  });

  it('adds an AND gate with default params (inputs=2) and position', () => {
    const pos = { x: 100, y: 200 };
    const id = useCircuitStore.getState().addComponent('and', pos);

    expect(id).toBeTruthy();
    const circuit = useCircuitStore.getState().circuit;
    expect(circuit.components).toHaveLength(1);

    const comp = circuit.components[0]!;
    expect(comp.id).toBe(id);
    expect(comp.type).toBe('and');
    expect(comp.position).toEqual(pos);
    expect(comp.params['inputs']).toBe(2);
  });

  it('adds an inputSwitch with default params (value=false)', () => {
    const pos = { x: 50, y: 80 };
    const id = useCircuitStore.getState().addComponent('inputSwitch', pos);

    expect(id).toBeTruthy();
    const circuit = useCircuitStore.getState().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    expect(comp).toBeDefined();
    expect(comp?.params['value']).toBe(false);
  });

  it('returns null and leaves circuit unchanged for non-existent component type', () => {
    const id = useCircuitStore.getState().addComponent('doesNotExist', { x: 0, y: 0 });

    expect(id).toBeNull();
    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
  });

  it('generates unique ids across multiple additions', () => {
    const id1 = useCircuitStore.getState().addComponent('and', { x: 0, y: 0 });
    const id2 = useCircuitStore.getState().addComponent('and', { x: 10, y: 10 });
    const id3 = useCircuitStore.getState().addComponent('or', { x: 20, y: 20 });

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('updates position of known component and ignores unknown id', () => {
    const id = useCircuitStore.getState().addComponent('and', { x: 10, y: 20 });
    expect(id).toBeTruthy();

    useCircuitStore.getState().setPositions({
      [id!]: { x: 99, y: 88 },
      nonExistentId: { x: 500, y: 500 },
    });

    const comp = useCircuitStore.getState().circuit.components.find((c) => c.id === id);
    expect(comp?.position).toEqual({ x: 99, y: 88 });
    expect(useCircuitStore.getState().circuit.components).toHaveLength(1);
  });

  it('removes components and all wires touching them while preserving unrelated wires', () => {
    const c1 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
    const c2 = useCircuitStore.getState().addComponent('and', { x: 100, y: 0 })!;
    const c3 = useCircuitStore.getState().addComponent('outputLed', { x: 200, y: 0 })!;

    const wires: Wire[] = [
      {
        id: 'w1',
        from: { componentId: c1, pinId: 'out' },
        to: { componentId: c2, pinId: 'in0' },
      },
      {
        id: 'w2',
        from: { componentId: c2, pinId: 'out' },
        to: { componentId: c3, pinId: 'in' },
      },
    ];

    useCircuitStore.setState((state) => ({
      circuit: { ...state.circuit, wires },
    }));

    // Remove middle component c2
    useCircuitStore.getState().removeComponents([c2]);

    const circuit = useCircuitStore.getState().circuit;
    const remainingIds = circuit.components.map((c) => c.id);
    expect(remainingIds).toEqual([c1, c3]);
    // Both w1 (to c2) and w2 (from c2) should be removed
    expect(circuit.wires).toHaveLength(0);
  });

  it('empties the circuit on resetCircuit', () => {
    useCircuitStore.getState().addComponent('and', { x: 0, y: 0 });
    useCircuitStore.getState().addComponent('or', { x: 10, y: 10 });
    expect(useCircuitStore.getState().circuit.components).toHaveLength(2);

    useCircuitStore.getState().resetCircuit();
    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  describe('addWire', () => {
    it('successfully connects valid output to input', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const led = useCircuitStore.getState().addComponent('outputLed', { x: 100, y: 0 })!;

      const result = useCircuitStore
        .getState()
        .addWire({ componentId: sw, pinId: 'out' }, { componentId: led, pinId: 'in' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.wireId.startsWith('w_')).toBe(true);
      }
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);
    });

    it('rejects wire with unknown pin', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const led = useCircuitStore.getState().addComponent('outputLed', { x: 100, y: 0 })!;

      const result = useCircuitStore
        .getState()
        .addWire({ componentId: sw, pinId: 'badPin' }, { componentId: led, pinId: 'in' });

      expect(result.ok).toBe(false);
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
    });

    it('rejects self-connection', () => {
      const and = useCircuitStore.getState().addComponent('and', { x: 0, y: 0 })!;

      const result = useCircuitStore
        .getState()
        .addWire({ componentId: and, pinId: 'out' }, { componentId: and, pinId: 'in0' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('A component cannot connect to itself');
      }
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
    });

    it('rejects second wire into already driven input pin', () => {
      const sw1 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const sw2 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 50 })!;
      const led = useCircuitStore.getState().addComponent('outputLed', { x: 100, y: 0 })!;

      const firstResult = useCircuitStore
        .getState()
        .addWire({ componentId: sw1, pinId: 'out' }, { componentId: led, pinId: 'in' });
      expect(firstResult.ok).toBe(true);

      const secondResult = useCircuitStore
        .getState()
        .addWire({ componentId: sw2, pinId: 'out' }, { componentId: led, pinId: 'in' });
      expect(secondResult.ok).toBe(false);
      if (!secondResult.ok) {
        expect(secondResult.reason).toBe('This input already has a wire');
      }
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);
    });
  });

  describe('removeWires', () => {
    it('removes only given wire ids and ignores unknown wire ids', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const and = useCircuitStore.getState().addComponent('and', { x: 100, y: 0 })!;

      const w1 = useCircuitStore
        .getState()
        .addWire({ componentId: sw, pinId: 'out' }, { componentId: and, pinId: 'in0' });
      const w2 = useCircuitStore
        .getState()
        .addWire({ componentId: sw, pinId: 'out' }, { componentId: and, pinId: 'in1' });

      expect(w1.ok).toBe(true);
      expect(w2.ok).toBe(true);
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(2);

      const wire1Id = (w1 as { ok: true; wireId: string }).wireId;
      useCircuitStore.getState().removeWires([wire1Id, 'nonExistentWireId']);

      const remainingWires = useCircuitStore.getState().circuit.wires;
      expect(remainingWires).toHaveLength(1);
      expect(remainingWires[0]?.id).toBe((w2 as { ok: true; wireId: string }).wireId);
    });
  });

  describe('setComponentParam', () => {
    it('updates parameter value in store', () => {
      const and = useCircuitStore.getState().addComponent('and', { x: 0, y: 0 })!;
      useCircuitStore.getState().setComponentParam(and, 'inputs', 4);

      const comp = useCircuitStore.getState().circuit.components.find((c) => c.id === and);
      expect(comp?.params['inputs']).toBe(4);
    });

    it('prunes dangling wires and updates selectedWireIds in uiStore', () => {
      const sw1 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const sw2 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 50 })!;
      const sw3 = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 100 })!;
      const and = useCircuitStore.getState().addComponent('and', { x: 100, y: 0 })!;

      // Change and to 3 inputs
      useCircuitStore.getState().setComponentParam(and, 'inputs', 3);

      const w1 = useCircuitStore
        .getState()
        .addWire({ componentId: sw1, pinId: 'out' }, { componentId: and, pinId: 'in0' });
      const w2 = useCircuitStore
        .getState()
        .addWire({ componentId: sw2, pinId: 'out' }, { componentId: and, pinId: 'in1' });
      const w3 = useCircuitStore
        .getState()
        .addWire({ componentId: sw3, pinId: 'out' }, { componentId: and, pinId: 'in2' });

      expect(w1.ok && w2.ok && w3.ok).toBe(true);
      const wire3Id = (w3 as { ok: true; wireId: string }).wireId;
      const wire1Id = (w1 as { ok: true; wireId: string }).wireId;

      // Select wire 1 and wire 3
      useUiStore.getState().setSelectedWireIds([wire1Id, wire3Id]);

      // Reduce and gate inputs from 3 to 2 -> pin in2 is removed, wire 3 is removed
      useCircuitStore.getState().setComponentParam(and, 'inputs', 2);

      expect(useCircuitStore.getState().circuit.wires).toHaveLength(2);
      expect(
        useCircuitStore.getState().circuit.wires.find((w) => w.id === wire3Id),
      ).toBeUndefined();
      // selectedWireIds in uiStore must be pruned
      expect(useUiStore.getState().selectedWireIds).toEqual([wire1Id]);
    });
  });

  describe('setComponentLabel', () => {
    it('sets and removes component label', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;

      useCircuitStore.getState().setComponentLabel(sw, 'Clock In');
      let comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.label).toBe('Clock In');

      useCircuitStore.getState().setComponentLabel(sw, '');
      comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.label).toBeUndefined();
    });
  });

  describe('toggleInputSwitch', () => {
    it('toggles value parameter from false to true to false', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;

      let comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.params['value']).toBe(false);

      useCircuitStore.getState().toggleInputSwitch(sw);
      comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.params['value']).toBe(true);

      useCircuitStore.getState().toggleInputSwitch(sw);
      comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.params['value']).toBe(false);
    });

    it('does nothing when called on a non-inputSwitch component', () => {
      const and = useCircuitStore.getState().addComponent('and', { x: 0, y: 0 })!;
      useCircuitStore.getState().toggleInputSwitch(and);

      const comp = useCircuitStore.getState().circuit.components.find((c) => c.id === and);
      expect(comp?.params['value']).toBeUndefined();
    });
  });

  describe('insertFragment', () => {
    it('adds components and wires with new ids and returns new component ids', () => {
      const fragment: CircuitFragment = {
        components: [
          {
            id: 'old_c1',
            type: 'inputSwitch',
            position: { x: 10, y: 20 },
            params: { value: true },
          },
          {
            id: 'old_c2',
            type: 'outputLed',
            position: { x: 100, y: 20 },
            params: {},
          },
        ],
        wires: [
          {
            id: 'old_w1',
            from: { componentId: 'old_c1', pinId: 'out' },
            to: { componentId: 'old_c2', pinId: 'in' },
          },
        ],
      };

      const newIds = useCircuitStore.getState().insertFragment(fragment, { x: 50, y: 50 });
      expect(newIds).toHaveLength(2);
      expect(newIds).not.toContain('old_c1');
      expect(newIds).not.toContain('old_c2');

      const circuit = useCircuitStore.getState().circuit;
      expect(circuit.components).toHaveLength(2);
      expect(circuit.wires).toHaveLength(1);
      expect(circuit.components[0]?.position).toEqual({ x: 60, y: 70 });
      expect(circuit.wires[0]?.from.componentId).toBe(newIds[0]);
      expect(circuit.wires[0]?.to.componentId).toBe(newIds[1]);
    });
  });

  describe('duplicateComponents', () => {
    it('copies selected components and internal wires offset by (32, 32) leaving originals untouched', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 10, y: 10 })!;
      const led = useCircuitStore.getState().addComponent('outputLed', { x: 100, y: 10 })!;
      const wire = useCircuitStore
        .getState()
        .addWire({ componentId: sw, pinId: 'out' }, { componentId: led, pinId: 'in' });
      expect(wire.ok).toBe(true);

      const newIds = useCircuitStore.getState().duplicateComponents([sw, led]);
      expect(newIds).toHaveLength(2);
      expect(newIds).not.toContain(sw);
      expect(newIds).not.toContain(led);

      const circuit = useCircuitStore.getState().circuit;
      expect(circuit.components).toHaveLength(4);
      expect(circuit.wires).toHaveLength(2);

      const duplicatedSw = circuit.components.find((c) => c.id === newIds[0])!;
      expect(duplicatedSw.position).toEqual({ x: 10 + 32, y: 10 + 32 });

      const originalSw = circuit.components.find((c) => c.id === sw)!;
      expect(originalSw.position).toEqual({ x: 10, y: 10 });
    });

    it('changes nothing and returns empty array when ids list is empty', () => {
      useCircuitStore.getState().addComponent('and', { x: 0, y: 0 });
      const newIds = useCircuitStore.getState().duplicateComponents([]);
      expect(newIds).toEqual([]);
      expect(useCircuitStore.getState().circuit.components).toHaveLength(1);
    });
  });
});
