import { ConfusionMatrixCounts } from '../../types/ml';
import { GlossaryTooltip } from '../common/GlossaryTooltip';

interface ConfusionMatrixGridProps {
  matrix: ConfusionMatrixCounts | null;
  positiveLabel?: string;
  negativeLabel?: string;
  isSandbox?: boolean;
}

export function ConfusionMatrixGrid({
  matrix,
  positiveLabel = 'Positive (1)',
  negativeLabel = 'Negative (0)',
  isSandbox = false,
}: ConfusionMatrixGridProps) {
  const tn = matrix ? matrix.trueNegative : null;
  const fp = matrix ? matrix.falsePositive : null;
  const fn = matrix ? matrix.falseNegative : null;
  const tp = matrix ? matrix.truePositive : null;

  return (
    <div className="overflow-x-auto md:overflow-visible">
      <div className="min-w-[440px]">
        <div className="mb-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          Predicted Classification
        </div>
        <div className="grid grid-cols-[120px_1fr_1fr] gap-2 items-stretch">
          <div />
          <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
            Pred: {negativeLabel}
          </div>
          <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800 px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
            Pred: {positiveLabel}
          </div>

          <div className="flex items-center justify-end rounded-lg bg-slate-100/80 dark:bg-slate-800 px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            Actual: {negativeLabel}
          </div>
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 p-4 text-center">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 flex justify-center">
              <GlossaryTooltip termKey="trueNegative" align="center" placement="bottom">
                True Negative (TN)
              </GlossaryTooltip>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {tn !== null ? tn : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {tn !== null ? (isSandbox ? 'Sandbox count' : 'Correct negative') : 'Awaiting training'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4 text-center">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex justify-center">
              <GlossaryTooltip termKey="falsePositive" align="right" placement="bottom">
                False Positive (FP)
              </GlossaryTooltip>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fp !== null ? fp : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {fp !== null ? 'Type I error' : 'Awaiting training'}
            </div>
          </div>

          <div className="flex items-center justify-end rounded-lg bg-slate-100/80 dark:bg-slate-800 px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            Actual: {positiveLabel}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4 text-center">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex justify-center">
              <GlossaryTooltip termKey="falseNegative" align="center" placement="top">
                False Negative (FN)
              </GlossaryTooltip>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fn !== null ? fn : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {fn !== null ? 'Type II error' : 'Awaiting training'}
            </div>
          </div>
          <div className="rounded-xl border border-violet-200 dark:border-violet-800/70 bg-violet-50/70 dark:bg-violet-950/40 p-4 text-center">
            <div className="text-xs font-medium text-violet-700 dark:text-violet-300 flex justify-center">
              <GlossaryTooltip termKey="truePositive" align="right" placement="top">
                True Positive (TP)
              </GlossaryTooltip>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {tp !== null ? tp : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {tp !== null ? (isSandbox ? 'Sandbox count' : 'Correct positive') : 'Awaiting training'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
