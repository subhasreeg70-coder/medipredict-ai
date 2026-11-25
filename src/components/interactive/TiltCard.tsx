import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  layoutId?: string;
  maxTilt?: number;
  neonBorder?: boolean;
  ripple?: boolean;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
}

export function TiltCard({
  children,
  className = '',
  layoutId,
  maxTilt = 6,
  neonBorder = true,
  ripple = true,
  interactive = false,
  onClick,
  ariaLabel,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const rotateX = useSpring(rawRotateX, { stiffness: 280, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rawRotateY, { stiffness: 280, damping: 24, mass: 0.5 });

  const spotlightBg = useMotionTemplate`radial-gradient(380px circle at ${mouseX}% ${mouseY}%, rgba(34, 211, 238, 0.16), rgba(139, 92, 246, 0.09) 42%, transparent 74%)`;
  const liquidRefractionBg = useMotionTemplate`linear-gradient(115deg, transparent 22%, rgba(255, 255, 255, 0.11) calc(${mouseX}% - 8%), rgba(103, 232, 249, 0.16) ${mouseX}%, rgba(167, 139, 250, 0.12) calc(${mouseX}% + 8%), transparent 78%)`;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    mouseX.set(px * 100);
    mouseY.set(py * 100);
    rawRotateY.set((px - 0.5) * (maxTilt * 2));
    rawRotateX.set((0.5 - py) * (maxTilt * 2));
  };

  const handleMouseLeave = () => {
    setHovered(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        ref={cardRef}
        layoutId={layoutId}
        data-ripple={ripple ? 'true' : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={
          interactive && onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileTap={interactive && !prefersReducedMotion ? { scale: 0.975 } : undefined}
        style={
          prefersReducedMotion
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }
        }
        className={`relative h-full mp-glass-panel mp-glow-hover ${
          neonBorder ? 'mp-neon-border' : ''
        } ${interactive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400' : ''} ${className}`}
      >
        {/* Dynamic Cursor Spotlight & Liquid Glass Refraction Sheen */}
        {!prefersReducedMotion && (
          <>
            <motion.div
              aria-hidden="true"
              style={{ background: spotlightBg }}
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] z-0"
            />
            <motion.div
              aria-hidden="true"
              style={{ background: liquidRefractionBg }}
              animate={{ opacity: hovered ? 0.9 : 0 }}
              transition={{ duration: 0.28 }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] z-0 mix-blend-screen"
            />
          </>
        )}
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}
