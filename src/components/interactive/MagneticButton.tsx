import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface MagneticButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  strength?: number;
  children: React.ReactNode;
}

export function MagneticButton({
  strength = 6,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, { stiffness: 320, damping: 20, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 320, damping: 20, mass: 0.4 });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || prefersReducedMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2 || 1);
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2 || 1);
    rawX.set(relX * strength);
    rawY.set(relY * strength);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={!disabled && !prefersReducedMotion ? { scale: 0.955 } : undefined}
      style={prefersReducedMotion ? undefined : { x, y }}
      className={`mp-btn-glow ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
