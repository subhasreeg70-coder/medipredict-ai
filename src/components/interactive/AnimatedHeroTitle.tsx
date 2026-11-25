import { motion, useReducedMotion } from 'motion/react';

interface AnimatedHeroTitleProps {
  primaryText?: string;
  accentText?: string;
  className?: string;
}

export function AnimatedHeroTitle({
  primaryText = 'MEDIPREDICT',
  accentText = 'AI',
  className = '',
}: AnimatedHeroTitleProps) {
  const prefersReducedMotion = useReducedMotion();
  const primaryLetters = Array.from(primaryText);
  const accentLetters = Array.from(accentText);

  if (prefersReducedMotion) {
    return (
      <h1
        aria-label={`${primaryText} ${accentText}`}
        className={`font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight leading-[1.05] text-slate-900 dark:text-white ${className}`}
      >
        <span>{primaryText} </span>
        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(34,211,238,0.45)]">
          {accentText}
        </span>
      </h1>
    );
  }

  return (
    <h1
      aria-label={`${primaryText} ${accentText}`}
      className={`font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight leading-[1.05] text-slate-900 dark:text-white ${className}`}
    >
      <span className="inline-flex flex-wrap items-baseline">
        {primaryLetters.map((char, idx) => (
          <motion.span
            key={`p-${idx}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              delay: idx * 0.032,
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block dark:drop-shadow-[0_0_14px_rgba(56,189,248,0.28)]"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
        <span className="inline-block w-2.5 sm:w-3.5" aria-hidden="true" />
        {accentLetters.map((char, idx) => (
          <motion.span
            key={`a-${idx}`}
            aria-hidden="true"
            initial={{ opacity: 0, y: 20, scale: 0.85, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{
              delay: (primaryLetters.length + idx) * 0.035 + 0.06,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(34,211,238,0.55)]"
          >
            {char}
          </motion.span>
        ))}
      </span>
    </h1>
  );
}
