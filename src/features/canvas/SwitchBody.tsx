import { memo } from 'react';

export interface SwitchBodyProps {
  label?: string;
  value: boolean;
  onToggle: () => void;
}

export const SwitchBody = memo(function SwitchBody({ label, value, onToggle }: SwitchBodyProps) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center relative">
      {label && (
        <span
          title={label}
          className="absolute top-1 left-2 text-[10px] text-text-muted truncate max-w-[55px] leading-tight select-none pointer-events-none"
        >
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-pressed={value}
        aria-label="Toggle input switch"
        className="nodrag nopan flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-1"
      >
        <span
          className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
            value ? 'bg-signal-high' : 'bg-signal-low'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full bg-text transition-all duration-150 transform ${
              value ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </span>
        <span
          className={`font-mono text-lg font-bold select-none leading-none ${
            value ? 'text-signal-high' : 'text-text-muted'
          }`}
        >
          {value ? '1' : '0'}
        </span>
      </button>
    </div>
  );
});
