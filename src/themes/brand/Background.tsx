import { useRef } from 'react';
import type { BackgroundProps } from '../types';
import { useCanvasLoop } from '../../lib/useCanvasLoop';

interface Dust { x: number; y: number; r: number; vy: number; vx: number; phase: number }

/** 序章：墨黑底、緩慢流動的暖金極光與上升的金色微塵 */
export default function BrandBackground({ active, reducedMotion }: BackgroundProps) {
  const dust = useRef<Dust[]>([]);
  const canvas = useCanvasLoop(
    ({ ctx, w, h, t, dt }) => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dust.current) {
        d.y -= d.vy * dt;
        d.x += Math.sin(t * 0.3 + d.phase) * d.vx * dt;
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.phase * 7));
        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 214, 160, ${a * (d.r / 1.8)})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      active, reducedMotion,
      init: (w, h) => {
        const n = Math.round(Math.min(110, (w * h) / 14000));
        dust.current = Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h, r: 0.4 + Math.random() * 1.4,
          vy: 6 + Math.random() * 16, vx: 4 + Math.random() * 10, phase: Math.random() * 10,
        }));
      },
    },
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0a09]">
      <div className="bg-aurora absolute -inset-[20%]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.75)_100%)]" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
