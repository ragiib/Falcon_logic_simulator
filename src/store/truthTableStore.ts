import { create } from 'zustand';
import type { Circuit } from '@/model';
import { truthTableKey } from '@/model';
import { generateTruthTable, type TruthTableResult } from '@/engine';

export interface TruthTableState {
  result: TruthTableResult | null;
  generatedKey: string | null;
  generatedAt: number | null;

  generate: (circuit: Circuit) => void;
  clear: () => void;
}

export const useTruthTableStore = create<TruthTableState>((set) => ({
  result: null,
  generatedKey: null,
  generatedAt: null,

  generate: (circuit: Circuit) => {
    const result = generateTruthTable(circuit);
    const key = truthTableKey(circuit);
    set({
      result,
      generatedKey: key,
      generatedAt: Date.now(),
    });
  },

  clear: () => {
    set({
      result: null,
      generatedKey: null,
      generatedAt: null,
    });
  },
}));
