import { useEffect, useRef } from 'react';

interface NetworkNode {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  phase: number;
  speed: number;
  radius: number;
  hue: 'cyan' | 'violet' | 'blue';
}

interface NetworkEdge {
  from: number;
  to: number;
}

interface DataPulse {
  edgeIdx: number;
  progress: number;
  speed: number;
  color: string;
  glow: string;
}

interface AnimatedNeuralNetworkProps {
  className?: string;
}

const NODE_COLORS = {
  cyan: { core: 'rgba(103, 232, 249, 0.92)', halo: 'rgba(34, 211, 238, 0.24)' },
  violet: { core: 'rgba(196, 181, 253, 0.9)', halo: 'rgba(139, 92, 246, 0.24)' },
  blue: { core: 'rgba(147, 197, 253, 0.9)', halo: 'rgba(59, 130, 246, 0.24)' },
};

export function AnimatedNeuralNetwork({ className = '' }: AnimatedNeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = Math.max(300, parent.clientWidth);
    let height = Math.max(240, parent.clientHeight);
    let frameId = 0;

    const hues: NetworkNode['hue'][] = ['cyan', 'blue', 'violet'];
    let nodes: NetworkNode[] = [];
    let edges: NetworkEdge[] = [];
    let pulses: DataPulse[] = [];

    const buildTopology = () => {
      const cols = width < 640 ? 6 : 9;
      const rows = width < 640 ? 4 : 5;
      nodes = [];
      edges = [];
      pulses = [];

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const jitterX = (((c * 17 + r * 31) % 10) - 4.5) * (width / cols) * 0.065;
          const jitterY = (((c * 23 + r * 13) % 10) - 4.5) * (height / rows) * 0.08;
          const nx = ((c + 0.5) / cols) * width + jitterX;
          const ny = ((r + 0.5) / rows) * height + jitterY;
          const idx = nodes.length;
          nodes.push({
            baseX: nx,
            baseY: ny,
            x: nx,
            y: ny,
            phase: idx * 0.72,
            speed: 0.45 + (idx % 5) * 0.11,
            radius: idx % 4 === 0 ? 3.1 : 2.1,
            hue: hues[idx % hues.length],
          });
        }
      }

      const maxDist = Math.max(135, Math.min(220, width * 0.2));
      for (let i = 0; i < nodes.length; i++) {
        let count = 0;
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].baseX - nodes[j].baseX, nodes[i].baseY - nodes[j].baseY);
          if (dist < maxDist) {
            edges.push({ from: i, to: j });
            count++;
            if (count >= 3) break;
          }
        }
      }

      const pulseCount = Math.min(28, Math.max(12, Math.floor(edges.length * 0.45)));
      for (let p = 0; p < pulseCount; p++) {
        if (edges.length === 0) break;
        const isCyan = p % 2 === 0;
        pulses.push({
          edgeIdx: (p * 3) % edges.length,
          progress: (p * 0.19) % 1,
          speed: 0.0045 + (p % 4) * 0.0014,
          color: isCyan ? '#67e8f9' : '#c4b5fd',
          glow: isCyan ? 'rgba(34, 211, 238, 0.55)' : 'rgba(139, 92, 246, 0.55)',
        });
      }
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(300, rect.width);
      height = Math.max(240, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildTopology();
    };

    resize();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => resize())
        : null;
    observer?.observe(parent);

    let time = 0;

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        time += 0.016;
        for (const node of nodes) {
          node.x = node.baseX + Math.sin(time * node.speed + node.phase) * 7;
          node.y = node.baseY + Math.cos(time * node.speed * 0.85 + node.phase) * 6;
        }
      }

      // Draw interconnected synaptic filaments
      ctx.lineWidth = 1;
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, a.hue === 'violet' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(34, 211, 238, 0.18)');
        grad.addColorStop(1, b.hue === 'violet' ? 'rgba(139, 92, 246, 0.14)' : 'rgba(59, 130, 246, 0.16)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Draw moving data pulses along pathways
      for (const pulse of pulses) {
        const edge = edges[pulse.edgeIdx];
        if (!edge) continue;
        const a = nodes[edge.from];
        const b = nodes[edge.to];

        if (!prefersReducedMotion) {
          pulse.progress += pulse.speed;
          if (pulse.progress >= 1) {
            pulse.progress = 0;
            pulse.edgeIdx = (pulse.edgeIdx + 5) % edges.length;
          }
        }

        const t = pulse.progress;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        const tailT = Math.max(0, t - 0.12);
        const tx = a.x + (b.x - a.x) * tailT;
        const ty = a.y + (b.y - a.y) * tailT;

        // Pulse tail
        ctx.strokeStyle = pulse.glow;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Outer halo
        ctx.fillStyle = pulse.glow;
        ctx.beginPath();
        ctx.arc(px, py, 4.6, 0, Math.PI * 2);
        ctx.fill();

        // Core packet
        ctx.fillStyle = pulse.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw glowing cortical nodes
      for (const node of nodes) {
        const palette = NODE_COLORS[node.hue];
        ctx.fillStyle = palette.halo;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.core;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      observer?.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-75 ${className}`}
    />
  );
}
