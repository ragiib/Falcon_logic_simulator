import { memo } from 'react';

export interface ClockBodyProps {
  label?: string;
  value: boolean;
  onToggle: () => void;
}

export const ClockBody = memo(function ClockBody({ label, value, onToggle }: ClockBodyProps) {
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
        aria-label="Toggle clock level"
        className="nodrag nopan flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-1"
      >
        <svg
          width={24}
          height={16}
          viewBox="0 0 24 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-muted select-none pointer-events-none"
          aria-hidden="true"
        >
          <path d="M 2 13 H 7 V 3 H 13 V 13 H 18 V 3 H 22" />
        </svg>
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
