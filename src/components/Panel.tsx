import type { ReactNode } from 'react';

export interface PanelProps {
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
  className?: string;
}

export function Panel({ title, children, headerRight, className = '' }: PanelProps) {
  return (
    <div className={`flex flex-col h-full min-h-0 bg-surface ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border select-none flex-none">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h2>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">{children}</div>
    </div>
  );
}
