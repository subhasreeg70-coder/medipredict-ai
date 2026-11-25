import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const dims =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`relative inline-flex items-center justify-center ${dims}`}>
        <span className="absolute inset-0 rounded-full border-2 border-cyan-500/25 dark:border-cyan-400/20" />
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-violet-500 dark:border-t-cyan-400 dark:border-r-violet-400"
        />
      </span>
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </span>
  );
}

export function LoadingRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 py-2" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-slate-800 mp-skeleton-shimmer"
        />
      ))}
    </div>
  );
}
