import { describe, expect, it } from 'vitest';
import {
  getComponentDefinition,
  hasComponent,
  listComponentDefinitions,
  registerComponent,
  requireComponentDefinition,
} from '@/engine/registry';
import { andGate } from '@/engine/components/gates';

describe('component registry', () => {
  it('registers all 9 built-in types in the specified order', () => {
    const list = listComponentDefinitions();
    const types = list.map((def) => def.type);
    expect(types).toEqual([
      'inputSwitch',
      'outputLed',
      'and',
      'or',
      'not',
      'nand',
      'nor',
      'xor',
      'xnor',
    ]);
  });

  it('retrieves definition with getComponentDefinition', () => {
    expect(hasComponent('and')).toBe(true);
    const def = getComponentDefinition('and');
    expect(def).toBeDefined();
    expect(def?.type).toBe('and');
    expect(def?.label).toBe('AND');
  });

  it('returns undefined for unknown component type in getComponentDefinition', () => {
    expect(hasComponent('unknown_gate')).toBe(false);
    expect(getComponentDefinition('unknown_gate')).toBeUndefined();
  });

  it('throws on unknown component in requireComponentDefinition', () => {
    expect(() => requireComponentDefinition('unknown_gate')).toThrow(
      'Unknown component type: unknown_gate',
    );
  });

  it('throws when registering a duplicate component type', () => {
    expect(() => registerComponent(andGate)).toThrow('Component type already registered: and');
  });

  it('filters definitions by category correctly', () => {
    const gateDefs = listComponentDefinitions('gate');
    expect(gateDefs).toHaveLength(7);
    for (const def of gateDefs) {
      expect(def.category).toBe('gate');
    }

    const ioDefs = listComponentDefinitions('io');
    expect(ioDefs).toHaveLength(2);
    for (const def of ioDefs) {
      expect(def.category).toBe('io');
    }
  });

  it('ensures all registered type strings are unique', () => {
    const types = listComponentDefinitions().map((def) => def.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});
