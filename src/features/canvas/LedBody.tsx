import { memo } from 'react';

export interface LedBodyProps {
  lit: boolean;
  label?: string;
}

export const LedBody = memo(function LedBody({ lit, label }: LedBodyProps) {
  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Short horizontal lead from left edge to bulb */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-6 h-0.5 transition-colors ${
          lit ? 'bg-signal-high' : 'bg-text-muted'
        }`}
      />

      {/* Round bulb */}
      <div
        className={`w-8 h-8 rounded-full border-2 transition-all ${
          lit
            ? 'bg-signal-high border-signal-high shadow-[0_0_14px_var(--color-signal-high)]'
            : 'bg-signal-low border-border'
        }`}
      />

      {/* User label below bulb */}
      {label && (
        <span
          title={label}
          className="absolute bottom-1 inset-x-1 text-center text-[10px] text-text-muted truncate pointer-events-none select-none leading-tight"
        >
          {label}
        </span>
      )}
    </div>
  );
});
