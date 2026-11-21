import { type ReactNode, useEffect } from 'react';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-surface border border-border rounded shadow-xl w-full max-w-[32rem] max-h-[80vh] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border select-none flex-none">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded hover:bg-surface-2 transition-colors cursor-pointer text-sm leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
