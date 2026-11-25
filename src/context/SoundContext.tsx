import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type SoundCue = 'click' | 'portal' | 'scan' | 'hover' | 'success';

interface SoundContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
  playCue: (cue: SoundCue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const STORAGE_KEY = 'medipredict_ui_sound_enabled';

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // Default MUST be muted
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastHoverRef = useRef<number>(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [soundEnabled]);

  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playCue = useCallback(
    (cue: SoundCue) => {
      if (!soundEnabled) return;
      const ctx = getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      if (cue === 'hover') {
        if (now - lastHoverRef.current < 0.09) return;
        lastHoverRef.current = now;
      }

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (cue === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(640, now);
          osc.frequency.exponentialRampToValueAtTime(980, now + 0.065);
          gain.gain.setValueAtTime(0.032, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (cue === 'hover') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(510, now + 0.045);
          gain.gain.setValueAtTime(0.012, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.055);
        } else if (cue === 'portal') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(760, now + 0.24);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.27);
          osc.start(now);
          osc.stop(now + 0.28);
        } else if (cue === 'scan') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(1120, now + 0.12);
          gain.gain.setValueAtTime(0.028, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.15);
        } else {
          // success chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.setValueAtTime(880, now + 0.07);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.24);
        }
      } catch {
        // Ignore transient audio scheduling errors
      }
    },
    [getContext, soundEnabled]
  );

  // Global delegated subtle click cue when unmuted
  useEffect(() => {
    if (!soundEnabled) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('button, a, [role="tab"]')) {
        playCue('click');
      }
    };
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [playCue, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        const ctx = getContext();
        if (ctx) {
          try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(840, now + 0.1);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.13);
          } catch {
            // Ignore audio unlock error
          }
        }
      }
      return next;
    });
  }, [getContext]);

  const value = useMemo<SoundContextValue>(
    () => ({ soundEnabled, toggleSound, playCue }),
    [soundEnabled, toggleSound, playCue]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSound must be used inside SoundProvider');
  }
  return ctx;
}
