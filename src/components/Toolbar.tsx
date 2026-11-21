import { useMemo, useRef, useState } from 'react';
import { serializeCircuit } from '@/model';
import { useCircuitStore, usePersistenceStore, useSimStore, useUiStore } from '@/store';
import { useCircuitWarnings } from '@/features/canvas';
import { usePersistenceActions } from '@/features/library';
import { ToolbarButton } from './ToolbarButton';
import { SimulationControls } from './SimulationControls';

export function Toolbar() {
  const theme = useUiStore((state) => state.theme);
  const paletteOpen = useUiStore((state) => state.paletteOpen);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const bottomPanelOpen = useUiStore((state) => state.bottomPanelOpen);
  const warningsPanelOpen = useUiStore((state) => state.warningsPanelOpen);

  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const togglePalette = useUiStore((state) => state.togglePalette);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const toggleBottomPanel = useUiStore((state) => state.toggleBottomPanel);
  const toggleWarningsPanel = useUiStore((state) => state.toggleWarningsPanel);

  const circuit = useCircuitStore((state) => state.circuit);
  const setCircuitName = useCircuitStore((state) => state.setCircuitName);
  const savedSnapshot = usePersistenceStore((state) => state.savedSnapshot);

  const { newCircuit, save, openLibrary, importFile, exportCircuit } = usePersistenceActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prevCircuitName, setPrevCircuitName] = useState(circuit.name);
  const [nameDraft, setNameDraft] = useState(circuit.name);
  if (circuit.name !== prevCircuitName) {
    setPrevCircuitName(circuit.name);
    setNameDraft(circuit.name);
  }

  const isDirty = useMemo(() => {
    return savedSnapshot === null
      ? circuit.components.length > 0
      : serializeCircuit(circuit) !== savedSnapshot;
  }, [circuit, savedSnapshot]);

  const { pinWarnings } = useCircuitWarnings();
  const compiled = useSimStore((state) => state.compiled);
  const totalWarnings = pinWarnings.length + (compiled?.issues.length ?? 0);

  return (
    <header className="h-12 w-full border-b border-border bg-surface flex items-center justify-between px-4 flex-none select-none gap-3">
      <div className="flex items-center gap-2.5 flex-none">
        <svg
          className="w-5 h-5 text-accent flex-none"
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
        <span className="text-sm font-semibold tracking-tight text-text hidden sm:inline">
          Logic Simulator
        </span>

        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="text"
            aria-label="Circuit name"
            maxLength={80}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => setCircuitName(nameDraft)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="bg-surface-2 border border-border focus:border-accent rounded px-2 py-0.5 text-xs text-text focus:outline-none w-32 sm:w-44 truncate"
          />
          {isDirty && (
            <span
              className="text-accent text-sm font-bold leading-none select-none cursor-default"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            >
              •
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto min-w-0 max-h-12 py-1">
        <div className="flex items-center gap-1.5 flex-none">
          <ToolbarButton onClick={newCircuit} title="New circuit">
            New
          </ToolbarButton>
          <ToolbarButton onClick={save} title="Save to browser library (Ctrl+S)">
            Save
          </ToolbarButton>
          <ToolbarButton onClick={openLibrary} title="Open saved circuits">
            Load
          </ToolbarButton>
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Import circuit from JSON file"
          >
            Import
          </ToolbarButton>
          <ToolbarButton onClick={exportCircuit} title="Export circuit to JSON file">
            Export
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void importFile(file);
              }
              e.target.value = '';
            }}
          />
        </div>

        <div className="h-4 w-px bg-border flex-none" />

        <div className="flex-none">
          <SimulationControls />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-none">
        <ToolbarButton
          active={warningsPanelOpen}
          onClick={toggleWarningsPanel}
          aria-label="Toggle warnings panel"
          aria-pressed={warningsPanelOpen}
        >
          <span className="flex items-center gap-1.5">
            <span>Warnings</span>
            {totalWarnings > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/40 leading-tight">
                {totalWarnings}
              </span>
            )}
          </span>
        </ToolbarButton>
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
