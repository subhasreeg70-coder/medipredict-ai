import React, { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { GlossaryKey, ML_GLOSSARY } from '../../data/mlGlossary';

interface GlossaryTooltipProps {
  termKey: GlossaryKey;
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  placement?: 'top' | 'bottom';
  showIcon?: boolean;
}

export function GlossaryTooltip({
  termKey,
  children,
  align = 'left',
  placement = 'top',
  showIcon = true,
}: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const entry = ML_GLOSSARY[termKey];

  const alignClasses =
    align === 'right'
      ? 'right-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0';

  const placementClasses =
    placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';

  return (
    <span
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-floating-ripple="true"
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 text-left underline decoration-dotted decoration-slate-400 dark:decoration-slate-500 underline-offset-4 hover:decoration-blue-600 dark:hover:decoration-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm cursor-help"
      >
        <span>{children ?? entry.term}</span>
        {showIcon && (
          <HelpCircle
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          />
        )}
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-72 max-w-[80vw] rounded-xl border border-slate-700/80 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 p-3.5 text-left shadow-xl ${placementClasses} ${alignClasses}`}
        >
          <span className="block font-display text-xs font-semibold text-blue-300">
            {entry.shortTitle}
          </span>
          <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-200 whitespace-normal">
            {entry.definition}
          </span>
          {'formula' in entry && entry.formula && (
            <span className="mt-2 block rounded-md border border-slate-800 bg-slate-800/90 px-2.5 py-1 font-mono text-[11px] text-violet-300 whitespace-normal">
              Formula: {entry.formula}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
