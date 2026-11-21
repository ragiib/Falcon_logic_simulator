import { useSimStore } from '@/store';

export function SimStatusBanner() {
  const mode = useSimStore((s) => s.mode);
  const status = useSimStore((s) => s.status);
  const period = useSimStore((s) => s.period);
  const compiled = useSimStore((s) => s.compiled);

  const issues = compiled?.issues ?? [];

  // Priority 1: Compile issues
  if (issues.length > 0) {
    const firstMsg = issues[0]?.message ?? '';
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-danger text-danger text-xs font-medium shadow-md">
          <span className="font-bold">⚠</span>
          <span>
            Circuit has {issues.length} issue(s): {firstMsg}
          </span>
        </div>
      </div>
    );
  }

  // In step mode, do not show oscillation / limit banners
  if (mode === 'step') {
    return null;
  }

  // Priority 2: Oscillating in instant mode
  if (status === 'oscillating') {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-warning text-warning text-xs font-medium shadow-md">
          <span className="font-bold">⚠</span>
          <span>Circuit is oscillating (period {period ?? 0}). Signals never settle.</span>
        </div>
      </div>
    );
  }

  // Priority 3: Limit reached in instant mode
  if (status === 'limit') {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-warning text-warning text-xs font-medium shadow-md">
          <span className="font-bold">⚠</span>
          <span>Circuit did not settle within the tick limit.</span>
        </div>
      </div>
    );
  }

  return null;
}
