import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import { DISEASE_LIST } from '../../modules/registry';
import { DiseaseId, ModelEvaluationState } from '../../types/ml';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface ModelComparisonChartProps {
  mode: 'dataset_structure' | 'live_metrics';
  evaluations: Partial<Record<DiseaseId, ModelEvaluationState>>;
  sandboxMetrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  } | null;
  activeDisease: DiseaseId;
}

export function ModelComparisonChart({
  mode,
  evaluations,
  sandboxMetrics,
  activeDisease,
}: ModelComparisonChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labelColor = isDark ? '#CBD5E1' : '#475569';
    const tickColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(34, 211, 238, 0.08)' : 'rgba(148, 163, 184, 0.16)';

    if (mode === 'dataset_structure') {
      chartRef.current = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: DISEASE_LIST.map((d) => d.metadata.shortTitle),
          datasets: [
            {
              label: 'Positive Class Share (%)',
              data: DISEASE_LIST.map((d) =>
                Number(
                  (
                    (d.metadata.benchmarkPositiveCount / d.metadata.benchmarkRowCount) *
                    100
                  ).toFixed(1)
                )
              ),
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.8)' : 'rgba(124, 58, 237, 0.78)',
              borderColor: '#A78BFA',
              borderWidth: 1,
              borderRadius: 6,
            },
            {
              label: 'Negative Class Share (%)',
              data: DISEASE_LIST.map((d) =>
                Number(
                  (
                    (d.metadata.benchmarkNegativeCount / d.metadata.benchmarkRowCount) *
                    100
                  ).toFixed(1)
                )
              ),
              backgroundColor: isDark ? 'rgba(34, 211, 238, 0.75)' : 'rgba(37, 99, 235, 0.78)',
              borderColor: '#22D3EE',
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: { color: labelColor, boxWidth: 12, font: { size: 11 } },
            },
            tooltip: {
              backgroundColor: '#050B1C',
              borderColor: 'rgba(34, 211, 238, 0.45)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: labelColor, font: { weight: 600, size: 12 } },
            },
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                callback: (v) => `${v}%`,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
          },
        },
      });
    } else {
      const metricNames = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC'];
      const datasets = DISEASE_LIST.map((d, idx) => {
        const ev = evaluations[d.metadata.id];
        const useSandbox = sandboxMetrics && d.metadata.id === activeDisease;
        const vals = useSandbox
          ? [
              sandboxMetrics.accuracy * 100,
              sandboxMetrics.precision * 100,
              sandboxMetrics.recall * 100,
              sandboxMetrics.f1Score * 100,
              0,
            ]
          : ev?.status === 'connected_sklearn'
          ? [
              (ev.accuracy ?? 0) * 100,
              (ev.precision ?? 0) * 100,
              (ev.recall ?? 0) * 100,
              (ev.f1Score ?? 0) * 100,
              (ev.rocAuc ?? 0) * 100,
            ]
          : [0, 0, 0, 0, 0];

        const colors = [
          { bg: 'rgba(34, 211, 238, 0.82)', border: '#22D3EE' },
          { bg: 'rgba(139, 92, 246, 0.82)', border: '#A78BFA' },
          { bg: 'rgba(59, 130, 246, 0.82)', border: '#60A5FA' },
        ];
        const palette = colors[idx % colors.length];

        return {
          label: useSandbox
            ? `${d.metadata.shortTitle} (Sandbox)`
            : ev?.status === 'connected_sklearn'
            ? `${d.metadata.shortTitle} (Scikit-learn)`
            : `${d.metadata.shortTitle} (Pending)`,
          data: vals.map((v) => Number(v.toFixed(1))),
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 6,
        };
      });

      chartRef.current = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: metricNames,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: { color: labelColor, boxWidth: 12, font: { size: 11 } },
            },
            tooltip: {
              backgroundColor: '#050B1C',
              borderColor: 'rgba(34, 211, 238, 0.45)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: labelColor, font: { weight: 600, size: 12 } },
            },
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                callback: (v) => `${v}%`,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
          },
        },
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mode, evaluations, sandboxMetrics, activeDisease, isDark]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} aria-label="Cross-module model and dataset comparison chart" />
    </div>
  );
}
