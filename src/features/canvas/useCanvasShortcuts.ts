import { useEffect } from 'react';
import { useCircuitStore, useUiStore } from '@/store';
import { extractFragment } from '@/model';
import { isEditableTarget, matchShortcut } from './shortcutMatch';

/**
 * Registers keyboard shortcuts for canvas manipulation:
 * - Mod+C: Copy selected components and internal wires to clipboard
 * - Mod+V: Paste clipboard contents with progressive offset
 * - Mod+D: Duplicate selected components immediately with offset
 */
export function useCanvasShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = matchShortcut(event);
      if (!action) return;

      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        return;
      }

      if (action === 'duplicate') {
        event.preventDefault();
        if (event.repeat) return;
        const selectedIds = useUiStore.getState().selectedIds;
        if (selectedIds.length > 0) {
          const newIds = useCircuitStore.getState().duplicateComponents(selectedIds);
          if (newIds.length > 0) {
            useUiStore.getState().setSelectedIds(newIds);
            useUiStore.getState().setSelectedWireIds([]);
          }
        }
        return;
      }

      if (action === 'copy') {
        const selectedIds = useUiStore.getState().selectedIds;
        if (selectedIds.length > 0) {
          event.preventDefault();
          const circuit = useCircuitStore.getState().circuit;
          const fragment = extractFragment(circuit, selectedIds);
          useUiStore.getState().setClipboard(fragment);
        }
        return;
      }

      if (action === 'paste') {
        const clipboard = useUiStore.getState().clipboard;
        if (clipboard) {
          event.preventDefault();
          if (event.repeat) return;
          useUiStore.getState().incrementPasteCount();
          const updatedClipboard = useUiStore.getState().clipboard;
          const n = updatedClipboard?.pasteCount ?? 1;
          const newIds = useCircuitStore.getState().insertFragment(clipboard.fragment, {
            x: 32 * n,
            y: 32 * n,
          });
          useUiStore.getState().setSelectedIds(newIds);
          useUiStore.getState().setSelectedWireIds([]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
