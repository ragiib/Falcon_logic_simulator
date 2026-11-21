import { useUiStore } from '@/store';
import { Toolbar } from './Toolbar';
import { BottomPanel } from './BottomPanel';
import { Palette } from '@/features/palette';
import { CanvasArea } from '@/features/canvas';
import { Inspector } from '@/features/inspector';

export function AppShell() {
  const paletteOpen = useUiStore((state) => state.paletteOpen);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const bottomPanelOpen = useUiStore((state) => state.bottomPanelOpen);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-text select-none">
      <Toolbar />
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {paletteOpen && (
          <aside
            aria-label="Components Palette"
            className="w-60 flex-none h-full border-r border-border bg-surface min-h-0 overflow-hidden"
          >
            <Palette />
          </aside>
        )}
        <main className="flex flex-col flex-1 min-h-0 min-w-0 h-full overflow-hidden">
          <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
            <CanvasArea />
          </div>
          {bottomPanelOpen && (
            <section
              aria-label="Bottom Panel"
              className="h-56 flex-none border-t border-border bg-surface min-h-0 overflow-hidden"
            >
              <BottomPanel />
            </section>
          )}
        </main>
        {inspectorOpen && (
          <aside
            aria-label="Inspector"
            className="w-72 flex-none h-full border-l border-border bg-surface min-h-0 overflow-hidden"
          >
            <Inspector />
          </aside>
        )}
      </div>
    </div>
  );
}
