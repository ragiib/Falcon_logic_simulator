import { create } from 'zustand';
import { createId } from '@/lib';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

export interface ToastState {
  toasts: ToastItem[];
  pushToast: (kind: ToastKind, message: string) => string;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (kind, message) => {
    const id = createId('t');
    set((state) => {
      const next = [...state.toasts, { id, kind, message }];
      if (next.length > 4) {
        return { toasts: next.slice(next.length - 4) };
      }
      return { toasts: next };
    });
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
