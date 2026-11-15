import { useRef } from 'react';
import type { BackgroundProps } from '../types';
import { useCanvasLoop } from '../../lib/useCanvasLoop';

interface Fly { x: number; y: number; vx: number; vy: number; p: number; r: number }

const LEAF = 'M0,0 C30,-40 90,-50 130,-10 C90,10 40,30 0,0 Z';

function Foliage({ className, flip }: { className: string; flip?: boolean }) {
  const leaves = [
    [0, 0, -20, 1.4], [20, -60, -45, 1.1], [60, 10, 10, 1.2], [-10, -120, -70, 0.9],
    [70, -100, -30, 1], [120, -20, 5, 0.8], [30, -170, -85, 0.8], [140, -80, -15, 0.7],
  ];
  return (
    <svg className={className} viewBox="-60 -260 320 300" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {leaves.map(([x, y, r, s], i) => (
        <path key={i} d={LEAF} transform={`translate(${x},${y}) rotate(${r}) scale(${s})`} fill={i % 2 ? '#0a3a30' : '#0d4a3b'} opacity={0.9} />
      ))}
    </svg>
  );
}

/** 守護獸森林：夜色森林、天光與四處遊走的螢火蟲 */
export default function GuardianBackground({ active, reducedMotion }: BackgroundProps) {
  const flies = useRef<Fly[]>([]);
  const canvas = useCanvasLoop(
    ({ ctx, w, h, t, dt }) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flies.current) {
        f.vx += (Math.random() - 0.5) * 30 * dt;
        f.vy += (Math.random() - 0.5) * 30 * dt;
        f.vx *= 0.985; f.vy *= 0.985;
        f.x = (f.x + f.vx * dt + w) % w;
        f.y = (f.y + f.vy * dt + h) % h;
        const a = Math.max(0, Math.sin(t * 1.6 + f.p));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
        g.addColorStop(0, `rgba(230,255,150,${0.95 * a})`);
        g.addColorStop(0.3, `rgba(170,255,120,${0.35 * a})`);
        g.addColorStop(1, 'rgba(120,255,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    {
      active, reducedMotion,
      init: (w, h) => {
        flies.current = Array.from({ length: Math.round(Math.min(60, w / 22)) }, () => ({
          x: Math.random() * w, y: h * 0.25 + Math.random() * h * 0.75,
          vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, p: Math.random() * 10, r: 1 + Math.random() * 1.8,
        }));
      },
    },
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#04161a] via-[#07261f] to-[#0b3428]">
      <div className="guardian-rays absolute -top-1/4 left-1/2 h-[130%] w-[160%] -translate-x-1/2" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(70,200,140,0.22),transparent_70%)]" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <Foliage className="guardian-sway absolute -bottom-6 -left-10 w-[38vmin] min-w-48" />
      <Foliage className="guardian-sway-rev absolute -bottom-6 -right-10 w-[44vmin] min-w-52" flip />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(2,12,10,0.7)_100%)]" />
    </div>
  );
}
