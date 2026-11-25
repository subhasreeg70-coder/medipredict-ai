import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Sliders } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getFeatureImportanceForDisease } from '../../data/featureImportanceData';
import { DISEASE_LIST, DISEASE_MODULES } from '../../modules/registry';
import { DiseaseId } from '../../types/ml';
import { GlossaryTooltip } from '../common/GlossaryTooltip';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface InteractiveFeatureImportanceProps {
  initialDisease?: DiseaseId;
  onInspectModule?: (diseaseId: DiseaseId, el?: HTMLElement | null) => void;
}

export function InteractiveFeatureImportance({
  initialDisease = 'heart',
  onInspectModule,
}: InteractiveFeatureImportanceProps) {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseId>(initialDisease);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { isDark } = useTheme();

  const entries = useMemo(
    () => getFeatureImportanceForDisease(selectedDisease),
    [selectedDisease]
  );

  const activeEntry =
    entries.find((e) => e.key === selectedFeatureKey) ?? entries[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const topEntries = entries.slice(0, 8);
    const tickYColor = isDark ? '#CBD5E1' : '#334155';
    const tickXColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(34, 211, 238, 0.08)' : 'rgba(148, 163, 184, 0.16)';

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: topEntries.map((e) => e.shortLabel),
        datasets: [
          {
            label: 'Illustrative Formula Sensitivity Weight',
            data: topEntries.map((e) => e.demoWeight),
            backgroundColor: topEntries.map((e) =>
              e.key === activeEntry?.key
                ? isDark
                  ? 'rgba(34, 211, 238, 0.92)'
                  : 'rgba(14, 165, 233, 0.9)'
                : e.direction === 'reducing'
                ? isDark
                  ? 'rgba(59, 130, 246, 0.65)'
                  : 'rgba(37, 99, 235, 0.65)'
                : isDark
                ? 'rgba(139, 92, 246, 0.72)'
                : 'rgba(124, 58, 237, 0.72)'
            ),
            borderColor: topEntries.map((e) =>
              e.key === activeEntry?.key
                ? '#22D3EE'
                : e.direction === 'reducing'
                ? '#60A5FA'
                : '#A78BFA'
            ),
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const clicked = topEntries[idx];
            if (clicked) {
              setSelectedFeatureKey(clicked.key);
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#050B1C',
            borderColor: 'rgba(34, 211, 238, 0.45)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const entry = topEntries[ctx.dataIndex];
                return [
                  `Demo Formula Weight: ${entry.demoWeight.toFixed(2)}`,
                  `Sample Separation (|Δ|/σ): ${entry.separationZ.toFixed(2)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              color: tickXColor,
              font: { family: 'JetBrains Mono, monospace', size: 11 },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: tickYColor,
              font: { family: 'DM Sans, sans-serif', size: 12 },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [entries, activeEntry?.key, isDark]);

  const mod = DISEASE_MODULES[selectedDisease];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Interactive Feature Importance (Demo Sensitivity)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent illustrative weights from the educational formula — click any bar to inspect
            sample class separation
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Select module for feature importance"
          className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1"
        >
          {DISEASE_LIST.map((d) => {
            const active = d.metadata.id === selectedDisease;
            return (
              <button
                key={d.metadata.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedDisease(d.metadata.id);
                  setSelectedFeatureKey('');
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d.metadata.shortTitle}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 relative h-64 w-full">
          <canvas
            ref={canvasRef}
            aria-label="Interactive feature sensitivity bar chart"
            className="cursor-pointer"
          />
        </div>

        {activeEntry && (
          <div className="lg:col-span-5 rounded-xl border border-slate-200/80 dark:border-cyan-500/20 bg-slate-50/80 dark:bg-slate-900/75 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Selected Feature</span>
                <span className="font-mono text-cyan-700 dark:text-cyan-300">
                  Weight {activeEntry.demoWeight.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {activeEntry.label}
                {activeEntry.unit ? ` (${activeEntry.unit})` : ''}
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeEntry.rationale}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-xs">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Class 0 Mean</div>
                <div className="font-mono font-semibold tabular-nums text-blue-700 dark:text-cyan-300">
                  {activeEntry.sampleClass0Mean}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Class 1 Mean</div>
                <div className="font-mono font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                  {activeEntry.sampleClass1Mean}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <GlossaryTooltip termKey="stdDev" placement="top">
                    |Δ| / σ
                  </GlossaryTooltip>
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {activeEntry.separationZ}
                </div>
              </div>
            </div>

            {onInspectModule && (
              <button
                type="button"
                onClick={(e) => onInspectModule(selectedDisease, e.currentTarget)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/70 dark:border-cyan-500/40 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-cyan-950/50 mp-btn-glow"
              >
                <Sliders className="h-3.5 w-3.5" />
                Test {mod.metadata.shortTitle} Inputs
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
