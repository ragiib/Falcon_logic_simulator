import { useUiStore } from '@/store';
import type { BottomPanelTab } from '@/store';

export function BottomPanel() {
  const bottomPanelTab = useUiStore((state) => state.bottomPanelTab);
  const setBottomPanelTab = useUiStore((state) => state.setBottomPanelTab);

  const tabs: Array<{ id: BottomPanelTab; label: string }> = [
    { id: 'truthTable', label: 'Truth Table' },
    { id: 'timing', label: 'Timing' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface">
      <div className="flex items-center border-b border-border px-3 gap-1 flex-none select-none">
        {tabs.map((tab) => {
          const isActive = bottomPanelTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBottomPanelTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer select-none -mb-px ${
                isActive
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex items-center justify-center">
        {bottomPanelTab === 'truthTable' ? (
          <p className="text-xs text-text-muted select-none">Truth table will appear here</p>
        ) : (
          <p className="text-xs text-text-muted select-none">Timing diagram will appear here</p>
        )}
      </div>
    </div>
  );
}
