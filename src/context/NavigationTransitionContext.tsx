import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useSound } from './SoundContext';
import { AppView } from '../types/ml';

export type ZoomAccent = 'cyan' | 'violet' | 'blue' | 'emerald';

export interface CardOriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
}

export interface CircularTransitionPayload {
  targetView: AppView;
  origin?: CardOriginRect;
  accent?: ZoomAccent;
  title?: string;
}

interface ActiveZoomBurst {
  id: number;
  mode: 'zoom-in' | 'zoom-out';
  origin: CardOriginRect;
  accent: ZoomAccent;
  title?: string;
}

interface NavigationTransitionContextValue {
  activeView: AppView;
  transitionDirection: 'zoom-in' | 'zoom-out' | 'switch';
  navigateToView: (view: AppView) => void;
  navigateWithCircularZoom: (
    targetView: AppView,
    sourceEl?: HTMLElement | null,
    pointer?: { clientX: number; clientY: number },
    options?: { accent?: ZoomAccent; title?: string }
  ) => void;
  zoomOutToDashboard: (sourceEl?: HTMLElement | null) => void;
  activeBurst: ActiveZoomBurst | null;
}

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | null>(null);

function getFallbackOrigin(): CardOriginRect {
  if (typeof window === 'undefined') {
    return { top: 200, left: 300, width: 320, height: 180, originX: 460, originY: 290 };
  }
  const w = Math.min(360, window.innerWidth * 0.45);
  const h = 180;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return {
    top: cy - h / 2,
    left: cx - w / 2,
    width: w,
    height: h,
    originX: cx,
    originY: cy,
  };
}

function getAccentColors(accent: ZoomAccent) {
  switch (accent) {
    case 'violet':
      return {
        ring: 'rgba(167, 139, 250, 0.78)',
        glow: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(34, 211, 238, 0.14) 48%, rgba(5, 11, 28, 0.86) 100%)',
        border: 'rgba(167, 139, 250, 0.7)',
        shards: ['#a78bfa', '#c4b5fd', '#22d3ee', '#60a5fa'],
      };
    case 'blue':
      return {
        ring: 'rgba(96, 165, 250, 0.78)',
        glow: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(34, 211, 238, 0.14) 48%, rgba(5, 11, 28, 0.86) 100%)',
        border: 'rgba(96, 165, 250, 0.7)',
        shards: ['#60a5fa', '#22d3ee', '#93c5fd', '#a78bfa'],
      };
    case 'emerald':
      return {
        ring: 'rgba(52, 211, 153, 0.78)',
        glow: 'radial-gradient(circle, rgba(16, 185, 129, 0.26) 0%, rgba(34, 211, 238, 0.14) 48%, rgba(5, 11, 28, 0.86) 100%)',
        border: 'rgba(52, 211, 153, 0.7)',
        shards: ['#34d399', '#22d3ee', '#6ee7b7', '#60a5fa'],
      };
    case 'cyan':
    default:
      return {
        ring: 'rgba(34, 211, 238, 0.82)',
        glow: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, rgba(139, 92, 246, 0.16) 48%, rgba(5, 11, 28, 0.86) 100%)',
        border: 'rgba(34, 211, 238, 0.75)',
        shards: ['#22d3ee', '#67e8f9', '#a78bfa', '#60a5fa'],
      };
  }
}

export function NavigationTransitionProvider({
  children,
  onViewChanged,
}: {
  children: React.ReactNode;
  onViewChanged?: (view: AppView) => void;
}) {
  const { playCue } = useSound();
  const [activeView, setActiveView] = useState<AppView>('home');
  const [transitionDirection, setTransitionDirection] = useState<
    'zoom-in' | 'zoom-out' | 'switch'
  >('switch');
  const [activeBurst, setActiveBurst] = useState<ActiveZoomBurst | null>(null);

  const rememberedOriginsRef = useRef<Partial<Record<AppView, CardOriginRect>>>({});
  const timersRef = useRef<number[]>([]);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearPendingTimers();
  }, [clearPendingTimers]);

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const navigateToView = useCallback(
    (view: AppView) => {
      if (view === activeView) return;
      clearPendingTimers();
      setActiveBurst(null);
      setTransitionDirection(view === 'home' ? 'zoom-out' : 'switch');
      setActiveView(view);
      onViewChanged?.(view);
      playCue('portal');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    },
    [activeView, clearPendingTimers, onViewChanged, playCue]
  );

  const navigateWithCircularZoom = useCallback(
    (
      targetView: AppView,
      sourceEl?: HTMLElement | null,
      pointer?: { clientX: number; clientY: number },
      options?: { accent?: ZoomAccent; title?: string }
    ) => {
      if (targetView === activeView) return;
      clearPendingTimers();
      playCue('portal');

      const rect = sourceEl?.getBoundingClientRect();
      const origin: CardOriginRect = rect
        ? {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            originX: pointer?.clientX ?? rect.left + rect.width / 2,
            originY: pointer?.clientY ?? rect.top + rect.height / 2,
          }
        : getFallbackOrigin();

      rememberedOriginsRef.current[targetView] = origin;

      if (prefersReducedMotion()) {
        setTransitionDirection('switch');
        setActiveView(targetView);
        onViewChanged?.(targetView);
        return;
      }

      const burstId = Date.now();
      setTransitionDirection('zoom-in');
      setActiveBurst({
        id: burstId,
        mode: 'zoom-in',
        origin,
        accent: options?.accent ?? 'cyan',
        title: options?.title,
      });

      const t1 = window.setTimeout(() => {
        setActiveView(targetView);
        onViewChanged?.(targetView);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 135);

      const t2 = window.setTimeout(() => {
        setActiveBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 680);

      timersRef.current.push(t1, t2);
    },
    [activeView, clearPendingTimers, onViewChanged, playCue]
  );

  const zoomOutToDashboard = useCallback(
    (sourceEl?: HTMLElement | null) => {
      if (activeView === 'home') return;
      clearPendingTimers();
      playCue('portal');

      const remembered = rememberedOriginsRef.current[activeView];
      const fallback = sourceEl?.getBoundingClientRect();
      const origin: CardOriginRect =
        remembered ||
        (fallback
          ? {
              top: fallback.top,
              left: fallback.left,
              width: fallback.width,
              height: fallback.height,
              originX: fallback.left + fallback.width / 2,
              originY: fallback.top + fallback.height / 2,
            }
          : getFallbackOrigin());

      if (prefersReducedMotion()) {
        setTransitionDirection('switch');
        setActiveView('home');
        onViewChanged?.('home');
        return;
      }

      const burstId = Date.now();
      setTransitionDirection('zoom-out');
      setActiveBurst({
        id: burstId,
        mode: 'zoom-out',
        origin,
        accent: 'violet',
      });

      const t1 = window.setTimeout(() => {
        setActiveView('home');
        onViewChanged?.('home');
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 110);

      const t2 = window.setTimeout(() => {
        setActiveBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 580);

      timersRef.current.push(t1, t2);
    },
    [activeView, clearPendingTimers, onViewChanged, playCue]
  );

  const value = useMemo<NavigationTransitionContextValue>(
    () => ({
      activeView,
      transitionDirection,
      navigateToView,
      navigateWithCircularZoom,
      zoomOutToDashboard,
      activeBurst,
    }),
    [
      activeView,
      transitionDirection,
      navigateToView,
      navigateWithCircularZoom,
      zoomOutToDashboard,
      activeBurst,
    ]
  );

  return (
    <NavigationTransitionContext.Provider value={value}>
      <LayoutGroup id="medipredict-shared-layout">
        {children}
        <CircularZoomOverlay burst={activeBurst} />
      </LayoutGroup>
    </NavigationTransitionContext.Provider>
  );
}

function NavigationParticleExplosion({
  originX,
  originY,
  shards,
}: {
  originX: number;
  originY: number;
  shards: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = 48;
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.24;
      const speed = 5.5 + Math.random() * 11;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.8 + (i % 3) * 0.85,
        color: shards[i % shards.length],
        life: 1.0,
      };
    });

    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0.03) continue;
        alive = true;
        // Brief radial explosion with subtle inward vortex curl
        p.vx = p.vx * 0.94 - p.vy * 0.03;
        p.vy = p.vy * 0.94 + p.vx * 0.03;
        p.x += p.vx;
        p.y += p.vy;
        p.life *= 0.93;

        ctx.globalAlpha = p.life;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (alive) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [originX, originY, shards]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 h-full w-full pointer-events-none"
    />
  );
}

function CircularZoomOverlay({ burst }: { burst: ActiveZoomBurst | null }) {
  return (
    <AnimatePresence>
      {burst && (
        <div
          key={burst.id}
          aria-hidden="true"
          style={{ perspective: 1200 }}
          className="fixed inset-0 z-[75] pointer-events-none overflow-hidden"
        >
          {(() => {
            const palette = getAccentColors(burst.accent);
            const ox = `${burst.origin.originX}px`;
            const oy = `${burst.origin.originY}px`;
            const startRadius = Math.max(
              28,
              Math.min(burst.origin.width, burst.origin.height) * 0.35
            );

            if (burst.mode === 'zoom-in') {
              const portalRings = [
                { delay: 0, targetScale: 17, widthPx: startRadius * 2.1, borderWidth: 2 },
                { delay: 0.05, targetScale: 13, widthPx: startRadius * 1.55, borderWidth: 1.5 },
                { delay: 0.1, targetScale: 9.5, widthPx: startRadius * 1.05, borderWidth: 1.5 },
                { delay: 0.14, targetScale: 6.5, widthPx: startRadius * 0.65, borderWidth: 1 },
              ];

              return (
                <>
                  {/* Particle Explosion radiating into destination portal */}
                  <NavigationParticleExplosion
                    originX={burst.origin.originX}
                    originY={burst.origin.originY}
                    shards={palette.shards}
                  />

                  {/* Card Portal Morph from exact bounding box */}
                  <motion.div
                    initial={{
                      top: burst.origin.top,
                      left: burst.origin.left,
                      width: burst.origin.width,
                      height: burst.origin.height,
                      borderRadius: 16,
                      opacity: 0.96,
                    }}
                    animate={{
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      borderRadius: 0,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: 'fixed',
                      border: `1.5px solid ${palette.border}`,
                      background: palette.glow,
                      boxShadow: `0 0 64px ${palette.ring}`,
                    }}
                    className="backdrop-blur-md flex items-center justify-center"
                  >
                    {burst.title && (
                      <motion.span
                        initial={{ opacity: 0.95, scale: 0.92 }}
                        animate={{ opacity: 0, scale: 1.24 }}
                        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                        className="font-display text-lg sm:text-2xl font-bold text-white drop-shadow-[0_0_24px_rgba(34,211,238,0.7)]"
                      >
                        {burst.title}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Circular Radial Clip-Path Depth Sweep */}
                  <motion.div
                    initial={{
                      clipPath: `circle(${startRadius}px at ${ox} ${oy})`,
                      opacity: 0.7,
                    }}
                    animate={{
                      clipPath: `circle(160vmax at ${ox} ${oy})`,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.62,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background:
                        'radial-gradient(circle at center, rgba(34,211,238,0.2), rgba(139,92,246,0.18), rgba(3,7,20,0.6))',
                    }}
                  />

                  {/* Concentric Infinite Zoom Portal Rings */}
                  {portalRings.map((ring, idx) => (
                    <motion.div
                      key={idx}
                      initial={{
                        left: burst.origin.originX,
                        top: burst.origin.originY,
                        width: ring.widthPx,
                        height: ring.widthPx,
                        x: '-50%',
                        y: '-50%',
                        scale: 0.35,
                        opacity: 0.92,
                      }}
                      animate={{
                        scale: ring.targetScale,
                        opacity: 0,
                      }}
                      transition={{
                        delay: ring.delay,
                        duration: 0.56,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        position: 'fixed',
                        borderRadius: '9999px',
                        border: `${ring.borderWidth}px solid ${palette.ring}`,
                        boxShadow: `0 0 28px ${palette.ring}`,
                      }}
                    />
                  ))}
                </>
              );
            }

            // Zoom-out concentric collapse back to dashboard card origin
            return (
              <>
                <motion.div
                  initial={{
                    clipPath: `circle(150vmax at ${ox} ${oy})`,
                    opacity: 0.5,
                  }}
                  animate={{
                    clipPath: `circle(${startRadius}px at ${ox} ${oy})`,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background:
                      'radial-gradient(circle at center, rgba(139,92,246,0.22), rgba(34,211,238,0.16), rgba(3,7,20,0.5))',
                  }}
                />
                <motion.div
                  initial={{
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    borderRadius: 0,
                    opacity: 0.68,
                  }}
                  animate={{
                    top: burst.origin.top,
                    left: burst.origin.left,
                    width: burst.origin.width,
                    height: burst.origin.height,
                    borderRadius: 16,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.48,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: 'fixed',
                    border: `1.5px solid ${palette.border}`,
                    background: palette.glow,
                    boxShadow: `0 0 42px ${palette.ring}`,
                  }}
                />
              </>
            );
          })()}
        </div>
      )}
    </AnimatePresence>
  );
}

export function useNavigationTransition() {
  const ctx = useContext(NavigationTransitionContext);
  if (!ctx) {
    throw new Error('useNavigationTransition must be used inside NavigationTransitionProvider');
  }
  return ctx;
}
