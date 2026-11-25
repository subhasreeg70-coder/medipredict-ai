import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { BoxAndWiskers, BoxPlotController } from '@sgratzl/chartjs-chart-boxplot';
import { useTheme } from '../../context/ThemeContext';
import { DatasetMetadata, FeatureDefinition, SampleRecord } from '../../types/ml';

Chart.register(
  BarController,
  BarElement,
  ScatterController,
  PointElement,
  BoxPlotController,
  BoxAndWiskers,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export type ExplorerChartType = 'histogram' | 'scatter' | 'boxplot';

interface ExplorerChartCanvasProps {
  chartType: ExplorerChartType;
  metadata: DatasetMetadata;
  records: SampleRecord[];
  xFeature: FeatureDefinition;
  yFeature: FeatureDefinition;
  binCount: number;
}

export function ExplorerChartCanvas({
  chartType,
  metadata,
  records,
  xFeature,
  yFeature,
  binCount,
}: ExplorerChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const legendColor = isDark ? '#E2E8F0' : '#334155';
    const axisTitleColor = isDark ? '#CBD5E1' : '#475569';
    const tickColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.18)';

    const class0Records = records.filter((r) => r.target === 0);
    const class1Records = records.filter((r) => r.target === 1);

    if (chartType === 'histogram') {
      const allValues = records.map((r) => r.features[xFeature.key] ?? 0);
      const minVal = Math.min(...allValues);
      const maxVal = Math.max(...allValues);
      const safeSpan = maxVal === minVal ? 1 : maxVal - minVal;
      const step = safeSpan / binCount;

      const labels: string[] = [];
      const class0Counts = new Array<number>(binCount).fill(0);
      const class1Counts = new Array<number>(binCount).fill(0);

      for (let i = 0; i < binCount; i++) {
        const start = minVal + i * step;
        const end = start + step;
        const decimals = step < 0.2 ? 3 : step < 2 ? 1 : 0;
        labels.push(`${start.toFixed(decimals)}–${end.toFixed(decimals)}`);
      }

      records.forEach((rec) => {
        const v = rec.features[xFeature.key] ?? 0;
        let idx = Math.floor((v - minVal) / step);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        if (rec.target === 0) class0Counts[idx] += 1;
        else class1Counts[idx] += 1;
      });

      chartRef.current = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: metadata.negativeClassLabel,
              data: class0Counts,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.85)' : 'rgba(37, 99, 235, 0.78)',
              borderColor: isDark ? '#60A5FA' : '#1D4ED8',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: metadata.positiveClassLabel,
              data: class1Counts,
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.82)' : 'rgba(124, 58, 237, 0.76)',
              borderColor: isDark ? '#A78BFA' : '#6D28D9',
              borderWidth: 1,
              borderRadius: 4,
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
              labels: {
                usePointStyle: true,
                pointStyle: 'rectRounded',
                color: legendColor,
                font: { family: 'DM Sans, sans-serif', size: 12 },
              },
            },
            tooltip: {
              backgroundColor: '#0F172A',
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: `${xFeature.label}${xFeature.unit ? ` (${xFeature.unit})` : ''} Bins`,
                color: axisTitleColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
              grid: { display: false },
              ticks: {
                color: tickColor,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Synthetic Sample Count',
                color: axisTitleColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
              grid: { color: gridColor },
              ticks: {
                stepSize: 1,
                color: tickColor,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
          },
        },
      });
    } else if (chartType === 'scatter') {
      const points0 = class0Records.map((r) => ({
        x: r.features[xFeature.key] ?? 0,
        y: r.features[yFeature.key] ?? 0,
        sampleId: r.id,
      }));
      const points1 = class1Records.map((r) => ({
        x: r.features[xFeature.key] ?? 0,
        y: r.features[yFeature.key] ?? 0,
        sampleId: r.id,
      }));

      chartRef.current = new Chart(canvas, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: metadata.negativeClassLabel,
              data: points0,
              backgroundColor: isDark ? 'rgba(96, 165, 250, 0.85)' : 'rgba(37, 99, 235, 0.82)',
              borderColor: isDark ? '#93C5FD' : '#1E40AF',
              borderWidth: 1.5,
              pointRadius: 6,
              pointHoverRadius: 8,
            },
            {
              label: metadata.positiveClassLabel,
              data: points1,
              backgroundColor: isDark ? 'rgba(167, 139, 250, 0.85)' : 'rgba(124, 58, 237, 0.82)',
              borderColor: isDark ? '#C4B5FD' : '#5B21B6',
              borderWidth: 1.5,
              pointRadius: 6,
              pointHoverRadius: 8,
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
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                color: legendColor,
                font: { family: 'DM Sans, sans-serif', size: 12 },
              },
            },
            tooltip: {
              backgroundColor: '#0F172A',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const raw = ctx.raw as { x: number; y: number; sampleId?: string };
                  return `${raw.sampleId || 'Sample'} · ${xFeature.shortLabel}: ${raw.x} · ${yFeature.shortLabel}: ${raw.y}`;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: `${xFeature.label}${xFeature.unit ? ` (${xFeature.unit})` : ''}`,
                color: axisTitleColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
            y: {
              title: {
                display: true,
                text: `${yFeature.label}${yFeature.unit ? ` (${yFeature.unit})` : ''}`,
                color: axisTitleColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { family: 'JetBrains Mono, monospace', size: 11 },
              },
            },
          },
        },
      });
    } else {
      const vals0 = class0Records.map((r) => r.features[xFeature.key] ?? 0);
      const vals1 = class1Records.map((r) => r.features[xFeature.key] ?? 0);

      chartRef.current = new Chart(canvas, {
        type: 'boxplot',
        data: {
          labels: [metadata.negativeClassLabel, metadata.positiveClassLabel],
          datasets: [
            {
              label: `${xFeature.label} Distribution`,
              data: [vals0, vals1],
              backgroundColor: isDark
                ? ['rgba(59, 130, 246, 0.35)', 'rgba(139, 92, 246, 0.35)']
                : ['rgba(37, 99, 235, 0.25)', 'rgba(124, 58, 237, 0.25)'],
              borderColor: isDark ? ['#60A5FA', '#A78BFA'] : ['#2563EB', '#7C3AED'],
              borderWidth: 2,
              medianColor: isDark ? '#F8FAFC' : '#0F172A',
              outlierBackgroundColor: isDark ? '#CBD5E1' : '#475569',
              itemRadius: 3,
            } as unknown as never,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: '#0F172A',
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: legendColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
            },
            y: {
              title: {
                display: true,
                text: `${xFeature.label}${xFeature.unit ? ` (${xFeature.unit})` : ''}`,
                color: axisTitleColor,
                font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
              },
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
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
  }, [chartType, metadata, records, xFeature, yFeature, binCount, isDark]);

  return (
    <div className="relative h-80 w-full">
      <canvas
        ref={canvasRef}
        aria-label={`${metadata.shortTitle} ${chartType} visualization`}
      />
    </div>
  );
}
