import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export function CinematicSpotlight() {
  const { isDark } = useTheme();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let raf = 0;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.35;

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!raf) {
        raf = window.requestAnimationFrame(() => {
          setPos({ x: targetX, y: targetY });
          raf = 0;
        });
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!isDark) return null;

  const cx = pos ? `${pos.x}px` : '55%';
  const cy = pos ? `${pos.y}px` : '28%';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2] transition-opacity duration-500"
      style={{
        background: `radial-gradient(620px circle at ${cx} ${cy}, rgba(34, 211, 238, 0.085), rgba(139, 92, 246, 0.045) 42%, transparent 72%)`,
      }}
    />
  );
}
