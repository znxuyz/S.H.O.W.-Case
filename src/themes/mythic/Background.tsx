import { useRef } from 'react';
import type { BackgroundProps } from '../types';
import { useCanvasLoop } from '../../lib/useCanvasLoop';

interface Star { x: number; y: number; r: number; p: number }
interface Ember { x: number; y: number; r: number; vy: number; drift: number; life: number; hue: number }

/** 神話神獸：星雲、閃爍星辰與自地面升起的靈火餘燼 */
export default function MythicBackground({ active, reducedMotion }: BackgroundProps) {
  const stars = useRef<Star[]>([]);
  const embers = useRef<Ember[]>([]);
  const spawn = (w: number, h: number, anywhere = false): Ember => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: 0.8 + Math.random() * 2.2,
    vy: 18 + Math.random() * 40,
    drift: Math.random() * Math.PI * 2,
    life: 0,
    hue: Math.random() < 0.7 ? 35 + Math.random() * 15 : 190 + Math.random() * 20,
  });

  const canvas = useCanvasLoop(
    ({ ctx, w, h, t, dt }) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars.current) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.8 + s.p));
        ctx.fillStyle = `rgba(230,220,255,${a * 0.7})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < embers.current.length; i++) {
        const e = embers.current[i];
        e.life += dt;
        e.y -= e.vy * dt;
        e.x += Math.sin(t * 1.2 + e.drift) * 12 * dt;
        if (e.y < -20) embers.current[i] = spawn(w, h);
        const fade = Math.min(1, e.y / (h * 0.9));
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        g.addColorStop(0, `hsla(${e.hue},100%,75%,${0.9 * fade})`);
        g.addColorStop(1, `hsla(${e.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    {
      active, reducedMotion,
      init: (w, h) => {
        stars.current = Array.from({ length: Math.round((w * h) / 5000) }, () => ({
          x: Math.random() * w, y: Math.random() * h * 0.8, r: Math.random() < 0.9 ? 1 : 2, p: Math.random() * 10,
        }));
        embers.current = Array.from({ length: Math.round(Math.min(90, w / 14)) }, () => spawn(w, h, true));
      },
    },
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0d0718]">
      <div className="mythic-nebula absolute -inset-[15%]" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2a0d1c]/70 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,2,10,0.8)_100%)]" />
    </div>
  );
}
