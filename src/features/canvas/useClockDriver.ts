import { useEffect } from 'react';
import { useCircuitStore, useSimStore } from '@/store';

export function useClockDriver(): void {
  const clockRunning = useSimStore((s) => s.clockRunning);
  const clockHalfPeriodMs = useSimStore((s) => s.clockHalfPeriodMs);

  useEffect(() => {
    if (!clockRunning) return;
    const interval = setInterval(() => {
      useCircuitStore.getState().toggleAllClocks();
    }, clockHalfPeriodMs);
    return () => clearInterval(interval);
  }, [clockRunning, clockHalfPeriodMs]);
}
