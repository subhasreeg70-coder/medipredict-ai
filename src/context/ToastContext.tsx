import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastVariant = 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const Icon =
              toast.variant === 'success'
                ? CheckCircle2
                : toast.variant === 'warning'
                ? AlertTriangle
                : Info;

            const accentClass =
              toast.variant === 'success'
                ? 'border-cyan-200 dark:border-cyan-500/40 shadow-[0_10px_28px_-6px_rgba(34,211,238,0.28)]'
                : toast.variant === 'warning'
                ? 'border-amber-200 dark:border-amber-500/40 shadow-[0_10px_28px_-6px_rgba(245,158,11,0.24)]'
                : 'border-violet-200 dark:border-violet-500/40 shadow-[0_10px_28px_-6px_rgba(139,92,246,0.28)]';

            const iconColor =
              toast.variant === 'success'
                ? 'text-cyan-600 dark:text-cyan-400'
                : toast.variant === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-violet-600 dark:text-violet-400';

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 dark:bg-slate-900/95 p-3.5 backdrop-blur-md ${accentClass}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {toast.title}
                  </div>
                  {toast.description && (
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {toast.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}
