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

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function DatasetComparisonChart() {
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
    const tickXColor = isDark ? '#E2E8F0' : '#334155';
    const tickYColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.16)';

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: DISEASE_LIST.map((d) => d.metadata.shortTitle),
        datasets: [
          {
            label: 'Class 0 (Negative / Benign Reference)',
            data: DISEASE_LIST.map((d) => d.metadata.benchmarkNegativeCount),
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.85)' : 'rgba(37, 99, 235, 0.82)',
            borderColor: isDark ? '#60A5FA' : '#1D4ED8',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Class 1 (Positive / Malignant Reference)',
            data: DISEASE_LIST.map((d) => d.metadata.benchmarkPositiveCount),
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.82)' : 'rgba(124, 58, 237, 0.78)',
            borderColor: isDark ? '#A78BFA' : '#6D28D9',
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
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              color: labelColor,
              font: { family: 'DM Sans, sans-serif', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
            bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: tickXColor,
              font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Reference Records (Benchmark Count)',
              color: tickYColor,
              font: { family: 'DM Sans, sans-serif', size: 11 },
            },
            grid: { color: gridColor },
            ticks: {
              color: tickYColor,
              font: { family: 'JetBrains Mono, monospace', size: 11 },
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
  }, [isDark]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} aria-label="Reference dataset class balance chart" />
    </div>
  );
}
