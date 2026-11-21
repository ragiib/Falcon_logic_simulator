import type { Circuit } from './types';

/**
 * Deterministic string covering everything that can change the generated truth table
 * EXCEPT input switch values (which represent runtime inputs).
 */
export function truthTableKey(circuit: Circuit): string {
  const compPart = circuit.components
    .map((c) => {
      let params = c.params;
      if (c.type === 'inputSwitch' && 'value' in params) {
        const { value: _v, ...rest } = params;
        params = rest;
      }
      return `${c.id}|${c.type}|${c.label ?? ''}|${c.position.x}|${c.position.y}|${JSON.stringify(params)}`;
    })
    .join(';');

  const wirePart = circuit.wires
    .map((w) => `${w.id}|${w.from.componentId}.${w.from.pinId}>${w.to.componentId}.${w.to.pinId}`)
    .join(';');

  return `${compPart}#${wirePart}`;
}
