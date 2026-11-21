import { useEffect } from 'react';
import { type ToastItem, useToastStore } from '@/store';

function ToastItemView({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    if (toast.kind === 'error') return;
    const delay = toast.kind === 'warning' ? 5000 : 4000;
    const timer = setTimeout(() => {
      dismissToast(toast.id);
    }, delay);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, dismissToast]);

  const borderClass =
    toast.kind === 'success'
      ? 'border-signal-high'
      : toast.kind === 'warning'
        ? 'border-warning'
        : toast.kind === 'error'
          ? 'border-danger'
          : 'border-accent';

  return (
    <div
      className={`pointer-events-auto bg-surface border ${borderClass} rounded shadow-lg px-3 py-2 flex items-start justify-between gap-3 text-xs text-text min-w-[200px]`}
    >
      <span className="leading-snug break-words flex-1">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismissToast(toast.id)}
        className="text-text-muted hover:text-text cursor-pointer -mr-0.5 -mt-0.5 p-0.5 font-bold leading-none"
      >
        ✕
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useToastStore((state) => state.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItemView key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
