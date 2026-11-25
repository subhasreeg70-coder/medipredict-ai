import { useEffect } from 'react';

/**
 * Global delegated pointerdown handler that creates a visible circular
 * cyan/purple ripple/bubble whenever users click buttons, interactive cards,
 * navigation links, tabs, or interactive controls.
 */
export function RippleManager() {
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, a, [role="tab"], [data-ripple="true"], summary'
      ) as HTMLElement | null;

      if (!interactive) return;
      if ((interactive as HTMLButtonElement).disabled) return;
      if (interactive.getAttribute('aria-disabled') === 'true') return;

      const rect = interactive.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const clientX = event.clientX || rect.left + rect.width / 2;
      const clientY = event.clientY || rect.top + rect.height / 2;

      // Click-triggered radial particle burst
      const particleColors = ['#22d3ee', '#a78bfa', '#60a5fa', '#67e8f9'];
      const particleCount = 7;
      for (let i = 0; i < particleCount; i++) {
        const dot = document.createElement('span');
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.45;
        const dist = 24 + Math.random() * 26;
        dot.className = 'mp-click-particle';
        dot.style.left = `${clientX}px`;
        dot.style.top = `${clientY}px`;
        dot.style.backgroundColor = particleColors[i % particleColors.length];
        dot.style.boxShadow = `0 0 8px ${particleColors[i % particleColors.length]}`;
        dot.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
        dot.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
        document.body.appendChild(dot);
        window.setTimeout(() => dot.remove(), 560);
      }

      // Tooltip triggers or elements marked data-floating-ripple should not get overflow-hidden
      const useFloatingRipple =
        interactive.hasAttribute('data-floating-ripple') ||
        Boolean(interactive.closest('[data-floating-ripple="true"]'));

      if (useFloatingRipple) {
        const bubble = document.createElement('span');
        const size = Math.max(48, Math.min(72, Math.max(rect.width, rect.height) * 1.4));
        bubble.className = 'mp-ripple-floating';
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${clientX}px`;
        bubble.style.top = `${clientY}px`;
        document.body.appendChild(bubble);
        window.setTimeout(() => bubble.remove(), 520);
        return;
      }

      // Compute farthest corner distance so the circular ripple covers the target
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const maxX = Math.max(relX, rect.width - relX);
      const maxY = Math.max(relY, rect.height - relY);
      const diameter = Math.max(56, Math.ceil(Math.hypot(maxX, maxY) * 2.1));

      const computedStyle = window.getComputedStyle(interactive);
      const prevPosition = interactive.style.position;
      const prevOverflow = interactive.style.overflow;

      if (computedStyle.position === 'static') {
        interactive.style.position = 'relative';
      }
      if (computedStyle.overflow !== 'hidden') {
        interactive.style.overflow = 'hidden';
      }

      const ripple = document.createElement('span');
      ripple.className = 'mp-ripple-circle';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${relX}px`;
      ripple.style.top = `${relY}px`;

      interactive.appendChild(ripple);

      window.setTimeout(() => {
        ripple.remove();
        if (!interactive.querySelector('.mp-ripple-circle')) {
          interactive.style.position = prevPosition;
          interactive.style.overflow = prevOverflow;
        }
      }, 580);
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return null;
}
