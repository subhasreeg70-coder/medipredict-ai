import { ReactNode, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

interface CinematicSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  parallaxOffset?: number;
}

export function CinematicSection({
  children,
  className = '',
  delay = 0,
  parallaxOffset = 18,
}: CinematicSectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const yParallax = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [parallaxOffset, 0, -parallaxOffset * 0.55]
  );

  // 3D Depth Scroll perspective tilt & scale
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [4.5, 0, -2.5]);
  const depthScale = useTransform(scrollYProgress, [0, 0.42, 1], [0.965, 1, 0.985]);

  if (prefersReducedMotion) {
    return (
      <div ref={sectionRef} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ perspective: 1200 }} className="relative">
      <motion.div
        ref={sectionRef}
        style={{
          y: yParallax,
          rotateX,
          scale: depthScale,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{
          duration: 0.58,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`relative ${className}`}
      >
        {/* Dramatic Top Spotlight Illumination Rim on scroll-in */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scaleX: 0.4 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -top-px left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/75 to-transparent blur-[0.5px] z-20"
        />
        {children}
      </motion.div>
    </div>
  );
}
