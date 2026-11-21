import type { ComponentCategory, ComponentDefinition } from './types';
import { builtInComponents } from './components';

export function defineComponent<S>(def: ComponentDefinition<S>): ComponentDefinition {
  return def as unknown as ComponentDefinition;
}

const registry = new Map<string, ComponentDefinition>();

// Initialize registry with built-in components
for (const def of builtInComponents) {
  registry.set(def.type, def);
}

export function registerComponent(def: ComponentDefinition): void {
  if (registry.has(def.type)) {
    throw new Error(`Component type already registered: ${def.type}`);
  }
  registry.set(def.type, def);
}

export function hasComponent(type: string): boolean {
  return registry.has(type);
}

export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return registry.get(type);
}

export function requireComponentDefinition(type: string): ComponentDefinition {
  const def = registry.get(type);
  if (!def) {
    throw new Error(`Unknown component type: ${type}`);
  }
  return def;
}

export function listComponentDefinitions(category?: ComponentCategory): ComponentDefinition[] {
  const all = Array.from(registry.values());
  if (category !== undefined) {
    return all.filter((def) => def.category === category);
  }
  return all;
}
