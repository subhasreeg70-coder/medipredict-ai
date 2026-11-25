import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface GravityParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  prevX: number;
  prevY: number;
  size: number;
  color: string;
}

export function GravityCursorField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let frameId = 0;

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

    const palette = isDark
      ? ['rgba(34, 211, 238, 0.72)', 'rgba(167, 139, 250, 0.68)', 'rgba(96, 165, 250, 0.7)']
      : ['rgba(14, 116, 144, 0.34)', 'rgba(109, 40, 217, 0.3)', 'rgba(37, 99, 235, 0.32)'];

    const count = width < 768 ? 20 : 38;
    const particles: GravityParticle[] = Array.from({ length: count }, (_, idx) => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        prevX: x,
        prevY: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1.5 + (idx % 3) * 0.65,
        color: palette[idx % palette.length],
      };
    });

    const cursor = { x: -9999, y: -9999, active: false, pulse: 0 };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.active = true;
    };
    const onPointerLeave = () => {
      cursor.active = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.pulse = 1.0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      if (cursor.pulse > 0.02) {
        cursor.pulse *= 0.88;
      } else {
        cursor.pulse = 0;
      }

      const attractRadius = 210;
      const repelRadius = 46;

      for (const p of particles) {
        p.prevX = p.x;
        p.prevY = p.y;

        if (cursor.active) {
          const dx = cursor.x - p.x;
          const dy = cursor.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 1 && dist < attractRadius) {
            const nx = dx / dist;
            const ny = dy / dist;

            if (cursor.pulse > 0.08 && dist < 170) {
              // Click shockwave repulsion
              const burst = ((170 - dist) / 170) * 2.2 * cursor.pulse;
              p.vx -= nx * burst;
              p.vy -= ny * burst;
            } else if (dist < repelRadius) {
              // Core repulsion + tangential swirl
              const push = ((repelRadius - dist) / repelRadius) * 0.42;
              p.vx -= nx * push - ny * 0.14;
              p.vy -= ny * push + nx * 0.14;
            } else {
              // Smooth gravitational attraction + orbital curve
              const pull = ((attractRadius - dist) / attractRadius) * 0.11;
              p.vx += nx * pull - ny * 0.035;
              p.vy += ny * pull + nx * 0.035;
            }
          }
        }

        // Gentle drag & ambient drift
        p.vx *= 0.965;
        p.vy *= 0.965;
        if (Math.hypot(p.vx, p.vy) < 0.18) {
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vy += (Math.random() - 0.5) * 0.04;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Draw smooth motion trail
        const trailX = p.x - p.vx * 3.8;
        const trailY = p.y - p.vy * 3.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.85;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Draw particle core
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] h-full w-full"
    />
  );
}
