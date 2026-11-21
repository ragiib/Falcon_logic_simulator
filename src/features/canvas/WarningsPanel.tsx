import { useSimStore, useUiStore } from '@/store';
import { useCircuitWarnings } from './useCircuitWarnings';

export function WarningsPanel() {
  const warningsPanelOpen = useUiStore((s) => s.warningsPanelOpen);
  const closeWarningsPanel = useUiStore((s) => s.closeWarningsPanel);
  const setSelectedIds = useUiStore((s) => s.setSelectedIds);
  const setSelectedWireIds = useUiStore((s) => s.setSelectedWireIds);

  const compiled = useSimStore((s) => s.compiled);
  const { pinWarnings } = useCircuitWarnings();

  if (!warningsPanelOpen) {
    return null;
  }

  const issues = compiled?.issues ?? [];
  const isEmpty = issues.length === 0 && pinWarnings.length === 0;

  return (
    <aside
      aria-label="Circuit Warnings"
      className="absolute bottom-20 left-4 z-20 w-80 max-h-72 flex flex-col bg-surface border border-border rounded-lg shadow-xl overflow-hidden select-none"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-2 flex-none">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Warnings</h3>
        <button
          type="button"
          onClick={closeWarningsPanel}
          aria-label="Close warnings panel"
          className="text-text-muted hover:text-text text-sm leading-none p-1 rounded hover:bg-surface transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
        {isEmpty ? (
          <p className="text-text-muted text-xs">No warnings</p>
        ) : (
          <>
            {issues.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Circuit issues ({issues.length})
                </span>
                <ul className="flex flex-col gap-1">
                  {issues.map((issue, idx) => (
                    <li
                      key={idx}
                      className="p-1.5 rounded bg-surface-2 border border-border text-danger text-[11px]"
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pinWarnings.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Unconnected pins ({pinWarnings.length})
                </span>
                <ul className="flex flex-col gap-1">
                  {pinWarnings.map((w, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds([w.componentId]);
                          setSelectedWireIds([]);
                        }}
                        className="w-full text-left p-1.5 rounded hover:bg-surface-2 transition-colors cursor-pointer text-warning text-[11px] border border-transparent hover:border-border"
                      >
                        {w.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
