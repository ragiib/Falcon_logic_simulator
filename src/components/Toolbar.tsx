import { useUiStore } from '@/store';
import { ToolbarButton } from './ToolbarButton';
import { SimulationControls } from './SimulationControls';

export function Toolbar() {
  const theme = useUiStore((state) => state.theme);
  const paletteOpen = useUiStore((state) => state.paletteOpen);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const bottomPanelOpen = useUiStore((state) => state.bottomPanelOpen);

  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const togglePalette = useUiStore((state) => state.togglePalette);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const toggleBottomPanel = useUiStore((state) => state.toggleBottomPanel);

  return (
    <header className="h-12 w-full border-b border-border bg-surface flex items-center justify-between px-4 flex-none select-none">
      <div className="flex items-center gap-2.5">
        <svg
          className="w-5 h-5 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 5h6a7 7 0 0 1 0 14H4V5z" />
          <line x1="2" y1="8" x2="4" y2="8" />
          <line x1="2" y1="16" x2="4" y2="16" />
          <line x1="17" y1="12" x2="22" y2="12" />
        </svg>
        <span className="text-sm font-semibold tracking-tight text-text">Logic Simulator</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <ToolbarButton disabled title="Coming soon">
            New
          </ToolbarButton>
          <ToolbarButton disabled title="Coming soon">
            Save
          </ToolbarButton>
          <ToolbarButton disabled title="Coming soon">
            Load
          </ToolbarButton>
        </div>

        <div className="h-4 w-px bg-border" />

        <SimulationControls />
      </div>

      <div className="flex items-center gap-1.5">
        <ToolbarButton
          active={paletteOpen}
          onClick={togglePalette}
          aria-label="Toggle components palette"
          aria-pressed={paletteOpen}
        >
          Palette
        </ToolbarButton>
        <ToolbarButton
          active={bottomPanelOpen}
          onClick={toggleBottomPanel}
          aria-label="Toggle bottom panel"
          aria-pressed={bottomPanelOpen}
        >
          Bottom panel
        </ToolbarButton>
        <ToolbarButton
          active={inspectorOpen}
          onClick={toggleInspector}
          aria-label="Toggle inspector"
          aria-pressed={inspectorOpen}
        >
          Inspector
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </ToolbarButton>
      </div>
    </header>
  );
}
