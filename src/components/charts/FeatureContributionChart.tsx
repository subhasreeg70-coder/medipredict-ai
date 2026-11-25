import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import { FeatureContribution } from '../../types/ml';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export function FeatureContributionChart({
  contributions,
}: {
  contributions: FeatureContribution[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const sorted = [...contributions].slice(0, 7);
    const tickYColor = isDark ? '#CBD5E1' : '#334155';
    const tickXColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.16)';

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map((c) => `${c.label} (${c.value})`),
        datasets: [
          {
            label: 'Relative Demo Weight Impact',
            data: sorted.map((c) => c.impact),
            backgroundColor: sorted.map((c) =>
              c.impact >= 0
                ? isDark
                  ? 'rgba(139, 92, 246, 0.85)'
                  : 'rgba(124, 58, 237, 0.8)'
                : isDark
                ? 'rgba(59, 130, 246, 0.85)'
                : 'rgba(37, 99, 235, 0.78)'
            ),
            borderColor: sorted.map((c) =>
              c.impact >= 0
                ? isDark
                  ? '#A78BFA'
                  : '#6D28D9'
                : isDark
                ? '#60A5FA'
                : '#1D4ED8'
            ),
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 9,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const val = Number(ctx.raw);
                return val >= 0
                  ? `Elevating factor: +${val.toFixed(3)}`
                  : `Reducing factor: ${val.toFixed(3)}`;
              },
            },
          },
        },
        scales: {
          x: {
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
  }, [contributions, isDark]);

  return (
    <div className="relative h-56 w-full">
      <canvas ref={canvasRef} aria-label="Feature contribution chart" />
    </div>
  );
}
