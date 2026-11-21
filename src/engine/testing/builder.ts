import type { ParamValues } from '@/engine/types';
import type {
  CompiledCircuit,
  SettleOptions,
  SettleResult,
  SimCircuit,
  SimComponent,
  SimWire,
} from '@/engine/simTypes';
import { compileCircuit, createInitialState, settle } from '@/engine/simulator';

export class CircuitBuilder {
  private components: SimComponent[] = [];
  private wires: SimWire[] = [];
  private wireCounter = 1;

  add(id: string, type: string, params: ParamValues = {}): this {
    this.components.push({ id, type, params });
    return this;
  }

  connect(from: string, to: string): this {
    const [fromComp, fromPin] = this.splitPinRef(from);
    const [toComp, toPin] = this.splitPinRef(to);
    this.wires.push({
      id: `w${this.wireCounter++}`,
      from: { componentId: fromComp, pinId: fromPin },
      to: { componentId: toComp, pinId: toPin },
    });
    return this;
  }

  build(): SimCircuit {
    return {
      components: [...this.components],
      wires: [...this.wires],
    };
  }

  private splitPinRef(ref: string): [string, string] {
    const dotIdx = ref.indexOf('.');
    if (dotIdx === -1) {
      throw new Error(`Invalid pin ref: "${ref}". Expected "componentId.pinId".`);
    }
    const comp = ref.slice(0, dotIdx);
    const pin = ref.slice(dotIdx + 1);
    return [comp, pin];
  }
}

export function settleCircuit(
  circuit: SimCircuit,
  options?: SettleOptions,
): { compiled: CompiledCircuit; result: SettleResult } {
  const compiled = compileCircuit(circuit);
  const state = createInitialState(compiled);
  const result = settle(compiled, state, options);
  return { compiled, result };
}
