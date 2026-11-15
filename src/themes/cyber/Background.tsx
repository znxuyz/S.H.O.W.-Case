import type { BackgroundProps } from '../types';
import { useCanvasLoop } from '../../lib/useCanvasLoop';

const COLS = 120;
const ROWS = 64;
const SPACING = 0.42;
const FOCAL = 520;

/**
 * 未來科技：以 2D Canvas 手動透視投影的「資料地形」點陣曲面
 * （不使用 WebGL / Three.js），搭配掃描線與 HUD 準星。
 */
export default function CyberBackground({ active, reducedMotion }: BackgroundProps) {
  const canvas = useCanvasLoop(
    ({ ctx, w, h, t }) => {
      ctx.clearRect(0, 0, w, h);
      const time = reducedMotion ? 2 : t;
      const camY = 1.3;
      const horizon = h * 0.42;
      const scale = Math.max(w / 1440, 0.6);
      ctx.globalCompositeOperation = 'lighter';
      for (let r = ROWS - 1; r >= 0; r--) {
        const zWorld = 2 + r * SPACING;
        const zScroll = r * SPACING + time * 1.4;
        const persp = (FOCAL * scale) / zWorld;
        const fade = 1 - r / ROWS;
        for (let c = 0; c < COLS; c++) {
          const x = (c - COLS / 2) * SPACING;
          const y =
            Math.sin(x * 0.35 + time * 0.6) * 0.55 +
            Math.cos(zScroll * 0.28) * 0.75 +
            Math.sin((x - zScroll) * 0.12 + time * 0.3) * 1.1;
          const sx = w / 2 + x * persp;
          if (sx < -4 || sx > w + 4) continue;
          const sy = horizon + (camY + 1.6 - y) * persp * 0.55;
          const k = Math.min(1, Math.max(0, (y + 1.6) / 3.6));
          const rr = Math.round(34 + (255 - 34) * k * k);
          const gg = Math.round(228 + (61 - 228) * k * k);
          const bb = Math.round(255 + (242 - 255) * k * k);
          const size = Math.max(0.6, persp * 0.012);
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${0.85 * fade})`;
          ctx.fillRect(sx, sy, size, size);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    { active, reducedMotion },
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03060d]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(34,228,255,0.16),transparent_60%)]" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="cyber-scanlines absolute inset-0" />
      <div className="cyber-sweep absolute inset-x-0 h-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.85)_100%)]" />
      <svg className="cyber-reticle absolute left-1/2 top-1/2 h-[min(80vh,80vw)] w-[min(80vh,80vw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" viewBox="0 0 200 200" fill="none" stroke="#22e4ff">
        <circle cx="100" cy="100" r="96" strokeWidth="0.3" strokeDasharray="1 3" />
        <circle cx="100" cy="100" r="70" strokeWidth="0.25" />
        <path d="M100 0v18M100 182v18M0 100h18M182 100h18" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
