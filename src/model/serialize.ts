import type { Circuit, CircuitComponent, Wire } from './types';
import { CURRENT_SCHEMA_VERSION } from './types';
import { getComponentDefinition, hasComponent } from '@/engine';
import { validateConnection } from './connections';
import { circuitFileSchema } from './schema';
import { migrateData } from './migrations';

export const MAX_COMPONENTS = 2000;
export const MAX_WIRES = 5000;
export const MAX_NAME_LENGTH = 80;
export const MAX_FILE_CHARS = 2_000_000;

export function serializeCircuit(circuit: Circuit): string {
  const payload = {
    app: 'logic-simulator',
    version: circuit.version,
    name: circuit.name,
    components: circuit.components.map((c) => {
      const item: {
        id: string;
        type: string;
        position: { x: number; y: number };
        params: Record<string, number | string | boolean>;
        label?: string;
      } = {
        id: c.id,
        type: c.type,
        position: c.position,
        params: c.params,
      };
      if (c.label !== undefined) {
        item.label = c.label;
      }
      return item;
    }),
    wires: circuit.wires.map((w) => ({
      id: w.id,
      from: {
        componentId: w.from.componentId,
        pinId: w.from.pinId,
      },
      to: {
        componentId: w.to.componentId,
        pinId: w.to.pinId,
      },
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export type DeserializeResult =
  { ok: true; circuit: Circuit; warnings: string[] } | { ok: false; error: string };

export function deserializeCircuit(text: string): DeserializeResult {
  // 1. Length check
  if (text.length > MAX_FILE_CHARS) {
    return { ok: false, error: 'File exceeds maximum allowed size' };
  }

  // 2. Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON' };
  }

  // 3. Plain object check
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'File is not a circuit' };
  }

  // 4. Schema migrations
  const migrateResult = migrateData(raw as Record<string, unknown>);
  if (!migrateResult.ok) {
    return { ok: false, error: migrateResult.error };
  }

  // 5. Structural validation with Zod
  const parseResult = circuitFileSchema.safeParse(migrateResult.data);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const path = firstIssue && firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'root';
    const msg = firstIssue ? firstIssue.message : 'Validation error';
    return { ok: false, error: `Invalid circuit file: ${path}: ${msg}` };
  }

  const parsed = parseResult.data;

  // 6. Count limits
  if (parsed.components.length > MAX_COMPONENTS) {
    return {
      ok: false,
      error: `Circuit exceeds maximum component limit (${MAX_COMPONENTS})`,
    };
  }
  if (parsed.wires.length > MAX_WIRES) {
    return {
      ok: false,
      error: `Circuit exceeds maximum wire limit (${MAX_WIRES})`,
    };
  }

  // 7. Semantic checks
  const compIdSet = new Set<string>();
  for (const c of parsed.components) {
    if (compIdSet.has(c.id)) {
      return { ok: false, error: `Duplicate component id: ${c.id}` };
    }
    compIdSet.add(c.id);

    if (!hasComponent(c.type)) {
      return { ok: false, error: `Unknown component type: ${c.type}` };
    }
  }

  // 8. Normalize circuit and components
  let normalizedName = parsed.name.trim().slice(0, MAX_NAME_LENGTH);
  if (normalizedName.length === 0) {
    normalizedName = 'Untitled circuit';
  }

  const normalizedComponents: CircuitComponent[] = parsed.components.map((c) => {
    const def = getComponentDefinition(c.type)!;
    const normalizedParams: Record<string, number | string | boolean> = {};

    for (const p of def.params) {
      const val = c.params[p.id];
      if (p.type === 'number') {
        if (typeof val === 'number' && Number.isFinite(val)) {
          let num = Math.round(val);
          if (p.min !== undefined && num < p.min) num = p.min;
          if (p.max !== undefined && num > p.max) num = p.max;
          normalizedParams[p.id] = num;
        } else {
          normalizedParams[p.id] = p.default;
        }
      } else if (p.type === 'boolean') {
        if (typeof val === 'boolean') {
          normalizedParams[p.id] = val;
        } else {
          normalizedParams[p.id] = p.default;
        }
      } else if (p.type === 'string') {
        if (typeof val === 'string') {
          normalizedParams[p.id] = val;
        } else {
          normalizedParams[p.id] = p.default;
        }
      }
    }

    const normComp: CircuitComponent = {
      id: c.id,
      type: c.type,
      position: { x: c.position.x, y: c.position.y },
      params: normalizedParams,
    };

    if (c.label !== undefined) {
      const trimmedLabel = c.label.trim().slice(0, 16);
      if (trimmedLabel.length > 0) {
        normComp.label = trimmedLabel;
      }
    }

    return normComp;
  });

  // 9. Rebuild wires in file order with incremental validation
  const warnings: string[] = [];
  const validWires: Wire[] = [];
  const seenWireIds = new Set<string>();

  const runningCircuit: Circuit = {
    version: CURRENT_SCHEMA_VERSION,
    name: normalizedName,
    components: normalizedComponents,
    wires: validWires,
  };

  for (const w of parsed.wires) {
    if (seenWireIds.has(w.id)) {
      warnings.push(`Removed duplicate wire id ${w.id}`);
      continue;
    }

    const check = validateConnection(runningCircuit, w.from, w.to);
    if (!check.ok) {
      warnings.push(`Removed invalid wire ${w.id}: ${check.reason}`);
      continue;
    }

    seenWireIds.add(w.id);
    validWires.push({
      id: w.id,
      from: { componentId: w.from.componentId, pinId: w.from.pinId },
      to: { componentId: w.to.componentId, pinId: w.to.pinId },
    });
  }

  // 10. Return result
  return {
    ok: true,
    circuit: {
      version: CURRENT_SCHEMA_VERSION,
      name: normalizedName,
      components: normalizedComponents,
      wires: validWires,
    },
    warnings,
  };
}
