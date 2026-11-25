import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: 'cyan' | 'violet' | 'blue';
}

export function NeuralBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const nodeCount = width < 768 ? 16 : 26;
    const hues: ParticleNode['hue'][] = ['cyan', 'violet', 'blue'];
    const nodes: ParticleNode[] = Array.from({ length: nodeCount }, (_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: 1.4 + (idx % 3) * 0.6,
      hue: hues[idx % hues.length],
    }));

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      const maxDist = 175;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!prefersReducedMotion) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < 0 || a.x > width) a.vx *= -1;
          if (a.y < 0 || a.y > height) a.vy *= -1;
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isDark ? 0.16 : 0.08);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle =
              a.hue === 'violet' || b.hue === 'violet'
                ? `rgba(139, 92, 246, ${alpha})`
                : `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        const dotAlpha = isDark ? 0.42 : 0.22;
        ctx.fillStyle =
          node.hue === 'violet'
            ? `rgba(167, 139, 250, ${dotAlpha})`
            : node.hue === 'blue'
            ? `rgba(96, 165, 250, ${dotAlpha})`
            : `rgba(34, 211, 238, ${dotAlpha})`;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Multi-layered Aurora Gradients */}
      <div className="absolute -top-36 -left-28 h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 dark:bg-cyan-500/16 blur-3xl mp-aurora-glow" />
      <div
        className="absolute top-1/4 -right-32 h-[38rem] w-[38rem] rounded-full bg-violet-500/10 dark:bg-violet-600/18 blur-3xl mp-aurora-glow"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 dark:bg-blue-600/16 blur-3xl mp-aurora-glow"
        style={{ animationDelay: '-12s' }}
      />

      {/* Dynamic Volumetric Light Rays (visible prominently in dark futuristic mode) */}
      <div className="hidden dark:block absolute -top-32 left-1/4 h-[78vh] w-56 bg-gradient-to-b from-cyan-400/14 via-blue-500/6 to-transparent blur-2xl mp-light-ray" />
      <div
        className="hidden dark:block absolute -top-24 right-1/4 h-[72vh] w-64 bg-gradient-to-b from-violet-400/14 via-cyan-400/6 to-transparent blur-2xl mp-light-ray"
        style={{ animationDelay: '-8s' }}
      />

      {/* Morphing Ambient Volumetric Glow Shapes */}
      <div className="hidden dark:block absolute top-[18%] left-[12%] h-72 w-72 border border-cyan-400/10 bg-cyan-500/[0.03] mp-morph-blob" />
      <div
        className="hidden dark:block absolute bottom-[12%] right-[10%] h-80 w-80 border border-violet-400/10 bg-violet-500/[0.03] mp-morph-blob"
        style={{ animationDelay: '-6s' }}
      />

      {/* Floating Neural Network Nodes, Dust & Edges */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
