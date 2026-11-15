import { useMemo } from 'react';
import type { BackgroundProps } from '../types';
import { mulberry32 } from '../../lib/useCanvasLoop';

/** 產生一道山脊（W=1600, 底部封閉） */
function ridge(seed: number, base: number, amp: number, peaks: number) {
  const rnd = mulberry32(seed);
  const phases = Array.from({ length: 4 }, () => rnd() * Math.PI * 2);
  const pts: string[] = [];
  for (let x = 0; x <= 1600; x += 16) {
    const u = x / 1600;
    let y =
      Math.sin(u * Math.PI * peaks + phases[0]) * 0.55 +
      Math.sin(u * Math.PI * peaks * 2.3 + phases[1]) * 0.25 +
      Math.sin(u * Math.PI * peaks * 5.1 + phases[2]) * 0.12 +
      Math.sin(u * Math.PI * peaks * 11 + phases[3]) * 0.05;
    y = base - Math.max(-0.4, y) * amp;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return { fill: `M0,900 L${pts.join(' L')} L1600,900 Z`, line: `M${pts.join(' L')}` };
}

/** 古典中式「玄漆描金」：漆黑底、層疊水墨遠山、描金山脊、流雲與朱印 */
export default function OrientalBackground({ reducedMotion }: BackgroundProps) {
  const layers = useMemo(
    () => [
      { ...ridge(7, 520, 150, 2.2), fill1: '#221c16', op: 0.9, gold: 0.18 },
      { ...ridge(21, 610, 120, 3.1), fill1: '#1a1510', op: 0.95, gold: 0.28 },
      { ...ridge(42, 720, 90, 4.3), fill1: '#120f0b', op: 1, gold: 0.4 },
    ],
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c0a08]">
      {/* 漆面反光 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(200,168,105,0.13),transparent_55%)]" />
      {/* 金月 */}
      <div className="oriental-moon absolute right-[12%] top-[12%] hidden sm:block h-[22vmin] w-[22vmin] rounded-full" />
      <svg className="absolute inset-x-0 bottom-0 h-[78%] w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <filter id="ink-blur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
          {layers.map((l, i) => (
            <linearGradient key={i} id={`mtn-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={l.fill1} />
              <stop offset="0.65" stopColor="#0c0a08" />
            </linearGradient>
          ))}
          <linearGradient id="gold-line" x1="0" x2="1">
            <stop offset="0" stopColor="#c8a869" stopOpacity="0" />
            <stop offset="0.3" stopColor="#e8c872" />
            <stop offset="0.7" stopColor="#c8a869" />
            <stop offset="1" stopColor="#c8a869" stopOpacity="0" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => (
          <g key={i} className={reducedMotion ? '' : `oriental-drift-${i}`} opacity={l.op}>
            <path d={l.fill} fill={`url(#mtn-${i})`} filter={i === 0 ? 'url(#ink-blur)' : undefined} />
            <path d={l.line} fill="none" stroke="url(#gold-line)" strokeWidth={i === 2 ? 1.4 : 0.9} opacity={l.gold} className="oriental-ridge" />
          </g>
        ))}
      </svg>
      {/* 流雲 */}
      <div className={`oriental-mist absolute left-[-30%] top-[48%] h-[18vh] w-[70%] ${reducedMotion ? '' : 'animate-mist'}`} />
      <div className={`oriental-mist absolute right-[-35%] top-[62%] h-[14vh] w-[60%] opacity-60 ${reducedMotion ? '' : 'animate-mist-rev'}`} />
      {/* 描金框線 */}
      <div className="pointer-events-none absolute inset-3 border border-[#c8a869]/20 sm:inset-6" />
      <div className="pointer-events-none absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-[#e8c872]/70 to-transparent sm:inset-x-6 sm:top-6" />
      <div className="grain absolute inset-0 opacity-60" />
    </div>
  );
}
