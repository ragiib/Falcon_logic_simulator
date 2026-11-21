import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function ToolbarButton({
  active = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={props['aria-pressed'] ?? (active !== undefined ? active : undefined)}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-border text-text-muted bg-transparent'
          : active
            ? 'border-accent bg-surface-2 text-accent cursor-pointer'
            : 'border-border bg-surface text-text hover:bg-surface-2 hover:border-border cursor-pointer'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
