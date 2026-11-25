interface HolographicHudOverlayProps {
  activeModeLabel?: string;
}

export function HolographicHudOverlay({
  activeModeLabel = 'FULL',
}: HolographicHudOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {/* Top-right rotating concentric circular technical HUD */}
      <svg
        viewBox="0 0 180 180"
        className="absolute -top-6 -right-6 h-32 w-32 sm:h-40 sm:w-40 opacity-55"
      >
        <g className="mp-hud-spin-slow" style={{ transformOrigin: '90px 90px' }}>
          <circle
            cx="90"
            cy="90"
            r="72"
            fill="none"
            stroke="rgba(34, 211, 238, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="10 6 3 6"
          />
          <circle cx="162" cy="90" r="2.8" fill="#22d3ee" />
          <circle cx="18" cy="90" r="2.2" fill="#a78bfa" />
        </g>

        <g className="mp-hud-spin-reverse" style={{ transformOrigin: '90px 90px' }}>
          <circle
            cx="90"
            cy="90"
            r="52"
            fill="none"
            stroke="rgba(167, 139, 250, 0.42)"
            strokeWidth="1.4"
            strokeDasharray="24 12"
          />
          <circle cx="90" cy="38" r="2.5" fill="#67e8f9" />
        </g>

        <circle
          cx="90"
          cy="90"
          r="30"
          fill="none"
          stroke="rgba(56, 189, 248, 0.32)"
          strokeWidth="1"
        />
      </svg>

      {/* Bottom-left scanner grid calibration & pulsing lock nodes */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-300/80">
          SCAN // {activeModeLabel}
        </span>
      </div>

      {/* Animated Medical Scanner Sweep Beam & Grid Line over viewport edge */}
      <div className="absolute inset-x-0 top-0 h-full mp-scanner-grid opacity-30" />
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/85 to-transparent shadow-[0_0_16px_2px_rgba(34,211,238,0.65)] mp-scanner-sweep" />
    </div>
  );
}
