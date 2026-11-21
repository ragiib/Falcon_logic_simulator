import { useCircuitStore, useSimStore } from '@/store';
import { ToolbarButton } from './ToolbarButton';

export function SimulationControls() {
  const circuit = useCircuitStore((s) => s.circuit);
  const mode = useSimStore((s) => s.mode);
  const running = useSimStore((s) => s.running);
  const speedMs = useSimStore((s) => s.speedMs);
  const clockRunning = useSimStore((s) => s.clockRunning);
  const clockHalfPeriodMs = useSimStore((s) => s.clockHalfPeriodMs);
  const status = useSimStore((s) => s.status);
  const period = useSimStore((s) => s.period);
  const simState = useSimStore((s) => s.simState);

  const hasClock = useCircuitStore((s) => s.circuit.components.some((c) => c.type === 'clock'));

  const setMode = useSimStore((s) => s.setMode);
  const stepOnce = useSimStore((s) => s.stepOnce);
  const setRunning = useSimStore((s) => s.setRunning);
  const setSpeedMs = useSimStore((s) => s.setSpeedMs);
  const setClockRunning = useSimStore((s) => s.setClockRunning);
  const setClockHalfPeriodMs = useSimStore((s) => s.setClockHalfPeriodMs);
  const resetSimulation = useSimStore((s) => s.resetSimulation);

  const tickCount = simState?.tick ?? 0;
  let statusText = 'Ready';
  if (mode === 'instant') {
    if (status === 'stable') statusText = 'Stable';
    else if (status === 'oscillating') statusText = `Oscillating (period ${period ?? 0})`;
    else if (status === 'limit') statusText = 'Did not settle';
  } else {
    if (running) statusText = 'Running';
    else if (status === 'stable') statusText = 'Stable';
    else statusText = 'Ready';
  }

  return (
    <div className="flex items-center gap-2">
      {/* Segmented Mode Toggle */}
      <div className="flex items-center rounded border border-border p-0.5 bg-surface-2">
        <button
          type="button"
          onClick={() => setMode('instant', circuit)}
          aria-pressed={mode === 'instant'}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
            mode === 'instant'
              ? 'bg-surface text-accent shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Instant
        </button>
        <button
          type="button"
          onClick={() => setMode('step', circuit)}
          aria-pressed={mode === 'step'}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
            mode === 'step' ? 'bg-surface text-accent shadow-xs' : 'text-text-muted hover:text-text'
          }`}
        >
          Step
        </button>
      </div>

      {/* Mode-specific actions */}
      {mode === 'step' ? (
        <div className="flex items-center gap-1.5">
          <ToolbarButton
            onClick={() => stepOnce()}
            disabled={running}
            aria-label="Step simulation once"
            title="Step simulation forward one tick"
          >
            Step
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setRunning(!running)}
            active={running}
            aria-label={running ? 'Pause simulation' : 'Play simulation'}
            title={running ? 'Pause simulation' : 'Run simulation automatically'}
          >
            {running ? 'Pause' : 'Play'}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => resetSimulation(circuit)}
            aria-label="Reset simulation"
            title="Reset simulation to initial state"
          >
            Reset
          </ToolbarButton>

          {/* Speed slider with inverted value: higher slider = faster (lower speedMs) */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-border text-[10px] text-text-muted">
            <span>Slow</span>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={2100 - speedMs}
              onChange={(e) => setSpeedMs(2100 - Number(e.target.value))}
              aria-label="Simulation speed"
              title={`Step interval: ${speedMs}ms`}
              className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span>Fast</span>
          </div>
        </div>
      ) : (
        <ToolbarButton
          onClick={() => resetSimulation(circuit)}
          aria-label="Reset simulation"
          title="Reset simulation to initial state"
        >
          Reset
        </ToolbarButton>
      )}

      {/* Clock Controls (visible only when circuit has a clock) */}
      {hasClock && (
        <div className="flex items-center gap-1.5 pl-1 border-l border-border/60">
          <ToolbarButton
            onClick={() => setClockRunning(!clockRunning)}
            active={clockRunning}
            aria-pressed={clockRunning}
            aria-label={clockRunning ? 'Stop auto clock' : 'Start auto clock'}
            title="Toggle automatic clock ticking"
          >
            Auto clock
          </ToolbarButton>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-border text-[10px] text-text-muted">
            <span>Slow</span>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={2100 - clockHalfPeriodMs}
              onChange={(e) => setClockHalfPeriodMs(2100 - Number(e.target.value))}
              aria-label="Clock speed"
              title={`Clock half-period: ${clockHalfPeriodMs}ms`}
              className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span>Fast</span>
          </div>
        </div>
      )}

      {/* Tick & Status Badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border text-[11px] font-mono select-none">
        <span className="text-text-muted">T:{tickCount}</span>
        <span className="text-border">|</span>
        <span
          className={
            status === 'oscillating'
              ? 'text-warning'
              : status === 'limit'
                ? 'text-danger'
                : 'text-text'
          }
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}
