import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from '@/store/circuitStore';
import { useUiStore } from '@/store/uiStore';
import { getTemplate, type Circuit, type CircuitFragment, type Wire } from '@/model';

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

  it('adds combinational components with correct default parameters', () => {
    const pos = { x: 50, y: 50 };
    const muxId = useCircuitStore.getState().addComponent('mux', pos);
    const cmpId = useCircuitStore.getState().addComponent('comparator', pos);

    const circuit = useCircuitStore.getState().circuit;
    const mux = circuit.components.find((c) => c.id === muxId);
    const cmp = circuit.components.find((c) => c.id === cmpId);

    expect(mux?.params['selectBits']).toBe(1);
    expect(cmp?.params['bits']).toBe(1);
  });

  it('adds sequential components with correct default parameters', () => {
    const pos = { x: 50, y: 50 };
    const clkId = useCircuitStore.getState().addComponent('clock', pos);
    const dffId = useCircuitStore.getState().addComponent('dff', pos);
    const jkffId = useCircuitStore.getState().addComponent('jkff', pos);
    const tffId = useCircuitStore.getState().addComponent('tff', pos);
    const regId = useCircuitStore.getState().addComponent('register', pos);

    const circuit = useCircuitStore.getState().circuit;
    const clk = circuit.components.find((c) => c.id === clkId);
    const dff = circuit.components.find((c) => c.id === dffId);
    const jkff = circuit.components.find((c) => c.id === jkffId);
    const tff = circuit.components.find((c) => c.id === tffId);
    const reg = circuit.components.find((c) => c.id === regId);

    expect(clk?.params['value']).toBe(false);
    expect(dff?.params['asyncControls']).toBe(false);
    expect(jkff?.params['asyncControls']).toBe(false);
    expect(tff?.params['asyncControls']).toBe(false);
    expect(reg?.params['bits']).toBe(4);
    expect(reg?.params['loadEnable']).toBe(false);
    expect(reg?.params['asyncClear']).toBe(false);
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

  describe('toggleClock', () => {
    it('toggles value parameter from false to true to false', () => {
      const clk = useCircuitStore.getState().addComponent('clock', { x: 0, y: 0 })!;

      let comp = useCircuitStore.getState().circuit.components.find((c) => c.id === clk);
      expect(comp?.params['value']).toBe(false);

      useCircuitStore.getState().toggleClock(clk);
      comp = useCircuitStore.getState().circuit.components.find((c) => c.id === clk);
      expect(comp?.params['value']).toBe(true);

      useCircuitStore.getState().toggleClock(clk);
      comp = useCircuitStore.getState().circuit.components.find((c) => c.id === clk);
      expect(comp?.params['value']).toBe(false);
    });

    it('does nothing when called on a non-clock component', () => {
      const and = useCircuitStore.getState().addComponent('and', { x: 0, y: 0 })!;
      useCircuitStore.getState().toggleClock(and);

      const comp = useCircuitStore.getState().circuit.components.find((c) => c.id === and);
      expect(comp?.params['value']).toBeUndefined();
    });
  });

  describe('toggleAllClocks', () => {
    it('toggles all clock components simultaneously and leaves others unchanged', () => {
      const clk1 = useCircuitStore.getState().addComponent('clock', { x: 0, y: 0 })!;
      const clk2 = useCircuitStore.getState().addComponent('clock', { x: 50, y: 0 })!;
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 100, y: 0 })!;

      // Invert clk2 first so they have different values
      useCircuitStore.getState().toggleClock(clk2);

      let c1 = useCircuitStore.getState().circuit.components.find((c) => c.id === clk1);
      let c2 = useCircuitStore.getState().circuit.components.find((c) => c.id === clk2);
      let s = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(c1?.params['value']).toBe(false);
      expect(c2?.params['value']).toBe(true);
      expect(s?.params['value']).toBe(false);

      useCircuitStore.getState().toggleAllClocks();

      c1 = useCircuitStore.getState().circuit.components.find((c) => c.id === clk1);
      c2 = useCircuitStore.getState().circuit.components.find((c) => c.id === clk2);
      s = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(c1?.params['value']).toBe(true);
      expect(c2?.params['value']).toBe(false);
      expect(s?.params['value']).toBe(false);
    });

    it('leaves circuit unchanged if there are no clock components', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      const prevCircuit = useCircuitStore.getState().circuit;

      useCircuitStore.getState().toggleAllClocks();
      expect(useCircuitStore.getState().circuit).toBe(prevCircuit);

      const comp = useCircuitStore.getState().circuit.components.find((c) => c.id === sw);
      expect(comp?.params['value']).toBe(false);
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

  describe('replaceCircuit', () => {
    it('replaces circuit and clears selections in uiStore', () => {
      const sw = useCircuitStore.getState().addComponent('inputSwitch', { x: 0, y: 0 })!;
      useUiStore.setState({
        selectedIds: [sw],
        selectedWireIds: ['some-wire-id'],
      });

      const newCircuit: Circuit = {
        version: 1,
        name: 'Loaded Circuit',
        components: [
          {
            id: 'led-new',
            type: 'outputLed',
            position: { x: 50, y: 50 },
            params: {},
          },
        ],
        wires: [],
      };

      useCircuitStore.getState().replaceCircuit(newCircuit);

      const state = useCircuitStore.getState().circuit;
      expect(state.name).toBe('Loaded Circuit');
      expect(state.components).toHaveLength(1);
      expect(state.components[0]?.id).toBe('led-new');

      // Selections must be cleared
      expect(useUiStore.getState().selectedIds).toEqual([]);
      expect(useUiStore.getState().selectedWireIds).toEqual([]);
    });
  });

  describe('setCircuitName', () => {
    it('trims whitespace and clamps name to MAX_NAME_LENGTH', () => {
      useCircuitStore.getState().setCircuitName('   My Logic Circuit   ');
      expect(useCircuitStore.getState().circuit.name).toBe('My Logic Circuit');

      const longName = 'A'.repeat(120);
      useCircuitStore.getState().setCircuitName(longName);
      expect(useCircuitStore.getState().circuit.name).toBe('A'.repeat(80));
    });

    it('falls back to Untitled circuit when given an empty or whitespace string', () => {
      useCircuitStore.getState().setCircuitName('   ');
      expect(useCircuitStore.getState().circuit.name).toBe('Untitled circuit');

      useCircuitStore.getState().setCircuitName('');
      expect(useCircuitStore.getState().circuit.name).toBe('Untitled circuit');
    });
  });

  describe('insertTemplate', () => {
    it('inserts a half adder template with fresh IDs and shifts to target position', () => {
      const templateBefore = JSON.stringify(getTemplate('halfAdder'));
      const target = { x: 160, y: 96 };

      const ids = useCircuitStore.getState().insertTemplate('halfAdder', target);
      expect(ids).toHaveLength(6);

      const circuit = useCircuitStore.getState().circuit;
      expect(circuit.components).toHaveLength(6);
      expect(circuit.wires).toHaveLength(6);

      // Minimum component x and y equals target
      const minX = Math.min(...circuit.components.map((c) => c.position.x));
      const minY = Math.min(...circuit.components.map((c) => c.position.y));
      expect(minX).toBe(160);
      expect(minY).toBe(96);

      // IDs are new (not original local template ids)
      const templateLocalIds = ['sw_a', 'sw_b', 'xor', 'and', 'led_sum', 'led_carry'];
      for (const id of ids) {
        expect(templateLocalIds).not.toContain(id);
      }

      // Wires reference the new component IDs
      const newIdSet = new Set(ids);
      for (const wire of circuit.wires) {
        expect(newIdSet.has(wire.from.componentId)).toBe(true);
        expect(newIdSet.has(wire.to.componentId)).toBe(true);
      }

      // Template must not be mutated
      const templateAfter = JSON.stringify(getTemplate('halfAdder'));
      expect(templateAfter).toBe(templateBefore);
    });

    it('yields 12 components with all-unique IDs when inserting twice', () => {
      const ids1 = useCircuitStore.getState().insertTemplate('halfAdder', { x: 0, y: 0 });
      const ids2 = useCircuitStore.getState().insertTemplate('halfAdder', { x: 160, y: 160 });

      expect(ids1).toHaveLength(6);
      expect(ids2).toHaveLength(6);

      const circuit = useCircuitStore.getState().circuit;
      expect(circuit.components).toHaveLength(12);
      expect(circuit.wires).toHaveLength(12);

      const allCompIds = circuit.components.map((c) => c.id);
      expect(new Set(allCompIds).size).toBe(12);

      const allWireIds = circuit.wires.map((w) => w.id);
      expect(new Set(allWireIds).size).toBe(12);
    });

    it('returns empty array and leaves circuit unchanged for unknown template id', () => {
      const ids = useCircuitStore.getState().insertTemplate('nope', { x: 100, y: 100 });
      expect(ids).toEqual([]);
      expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
      expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
    });
  });
});
