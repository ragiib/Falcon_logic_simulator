import { create } from 'zustand';
import type { CircuitFragment } from '@/model';

export type Theme = 'dark' | 'light';
export type BottomPanelTab = 'truthTable' | 'timing';

export interface UiState {
  theme: Theme;
  paletteOpen: boolean;
  inspectorOpen: boolean;
  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;
  selectedIds: string[];
  selectedWireIds: string[];
  clipboard: { fragment: CircuitFragment; pasteCount: number } | null;
  toggleTheme: () => void;
  togglePalette: () => void;
  toggleInspector: () => void;
  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setSelectedIds: (selectedIds: string[]) => void;
  setSelectedWireIds: (selectedWireIds: string[]) => void;
  setClipboard: (fragment: CircuitFragment | null) => void;
  incrementPasteCount: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  paletteOpen: true,
  inspectorOpen: true,
  bottomPanelOpen: true,
  bottomPanelTab: 'truthTable',
  selectedIds: [],
  selectedWireIds: [],
  clipboard: null,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setSelectedWireIds: (selectedWireIds) => set({ selectedWireIds }),
  setClipboard: (fragment) => set({ clipboard: fragment ? { fragment, pasteCount: 0 } : null }),
  incrementPasteCount: () =>
    set((state) => ({
      clipboard: state.clipboard
        ? { ...state.clipboard, pasteCount: state.clipboard.pasteCount + 1 }
        : null,
    })),
}));
