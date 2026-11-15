import { useMemo } from 'react';
import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { mulberry32 } from '../../lib/useCanvasLoop';
import { Art, Drift, Layer, Stars } from '../sceneKit';

/** 一排圓冠樹林剪影 */
function Canopy({ seed, base, minR, maxR, color, highlight }: { seed: number; base: number; minR: number; maxR: number; color: string; highlight?: string }) {
  const trees = useMemo(() => {
    const rnd = mulberry32(seed);
    const out: { x: number; r: number; h: number }[] = [];
    let x = -40;
    while (x < 1660) {
      const r = minR + rnd() * (maxR - minR);
      out.push({ x, r, h: r * (1.2 + rnd() * 0.8) });
      x += r * (1.1 + rnd() * 0.5);
    }
    return out;
  }, [seed, minR, maxR]);
  return (
    <g>
      <rect x="-50" y={base} width="1700" height={900 - base} fill={color} />
      {trees.map((t, i) => (
        <g key={i}>
          <rect x={t.x - t.r * 0.08} y={base - t.h} width={t.r * 0.16} height={t.h} fill={color} />
          <circle cx={t.x} cy={base - t.h} r={t.r} fill={color} />
          <circle cx={t.x - t.r * 0.55} cy={base - t.h + t.r * 0.45} r={t.r * 0.7} fill={color} />
          <circle cx={t.x + t.r * 0.6} cy={base - t.h + t.r * 0.4} r={t.r * 0.65} fill={color} />
          {highlight && <circle cx={t.x - t.r * 0.3} cy={base - t.h - t.r * 0.35} r={t.r * 0.45} fill={highlight} />}
        </g>
      ))}
    </g>
  );
}

/** 千年巨木與樹屋學園 */
function GreatTree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-70,0 C-40,-40 -40,-160 -30,-260 L30,-260 C40,-160 40,-40 80,0 Z" fill="#3a2a1d" />
      <path d="M-30,-200 C-80,-230 -130,-240 -170,-280 M30,-210 C80,-240 140,-250 180,-300" stroke="#3a2a1d" strokeWidth="14" fill="none" strokeLinecap="round" />
      {[[-150, -330, 90], [0, -380, 130], [150, -340, 100], [-80, -420, 90], [90, -430, 95], [0, -490, 85], [-200, -280, 60], [210, -290, 70]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? '#0f4a3a' : '#135541'} />
      ))}
      {[[-120, -360, 40], [30, -430, 50], [140, -370, 38], [-40, -500, 30]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#1d6e52" opacity="0.9" />
      ))}
      {/* 樹屋 */}
      <rect x="-60" y="-236" width="120" height="8" fill="#5a3d24" />
      <rect x="-50" y="-280" width="100" height="44" fill="#c98a4b" />
      <path d="M-62,-280 L0,-318 L62,-280 Z" fill="#d1584f" />
      {[-34, -6, 22].map((dx) => <rect key={dx} x={dx} y="-268" width="16" height="16" rx="3" fill="#ffe7a0" />)}
      <circle cx="0" cy="-260" r="70" fill="url(#g-warm)" />
      {/* 燈籠串 */}
      <path d="M-170,-280 Q-110,-240 -60,-250" fill="none" stroke="#5a3d24" />
      <path d="M60,-250 Q120,-240 180,-300" fill="none" stroke="#5a3d24" />
      {[[-140, -262], [-100, -248], [100, -252], [140, -268]].map(([cx, cy], i) => (
        <g key={i}><circle cx={cx} cy={cy} r="14" fill="url(#g-warm)" /><circle cx={cx} cy={cy} r="4" fill="#ffd35a" /></g>
      ))}
    </g>
  );
}

function Mushroom({ x, y, s = 1, cap }: { x: number; y: number; s?: number; cap: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <circle cx="0" cy="-18" r="30" fill={cap} opacity="0.18" />
      <rect x="-3" y="-14" width="6" height="14" rx="2" fill="#e9f2e6" />
      <path d="M-14,-14 C-14,-30 14,-30 14,-14 Z" fill={cap} />
      <circle cx="-5" cy="-21" r="2" fill="#fff" opacity="0.8" />
      <circle cx="5" cy="-18" r="1.5" fill="#fff" opacity="0.7" />
    </g>
  );
}

function Fern({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  const leaves = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <path d="M0,0 C30,-80 90,-140 170,-170" fill="none" stroke="#0b3328" strokeWidth="6" strokeLinecap="round" />
      {leaves.map((i) => {
        const t = i / 9;
        const px = t * 165, py = -t * 165 + Math.sin(t * 3) * 12;
        return (
          <g key={i}>
            <path d={`M${px},${py} q-20,-30 -6,-58 q14,24 6,58`} fill="#0d3d30" />
            <path d={`M${px},${py} q30,-8 50,10 q-26,6 -50,-10`} fill="#0f4636" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * 守護獸森林「月光學園」：月光與天光光束、遠近三層森林、
 * 掛滿燈籠的千年巨木樹屋、發光蘑菇與前景蕨葉，螢火蟲在林間飄升。
 */
export default function GuardianBackground({ active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  return (
    <div ref={ref} className="domain domain-guardian">
      <Layer depth={3}>
        <Art>
          <defs>
            <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#041a20" />
              <stop offset="0.6" stopColor="#0b3b3a" />
              <stop offset="1" stopColor="#12524a" />
            </linearGradient>
            <radialGradient id="g-moon">
              <stop offset="0" stopColor="#f2fff6" />
              <stop offset="0.7" stopColor="#cdeedd" />
              <stop offset="1" stopColor="#9fd8bd" />
            </radialGradient>
            <radialGradient id="g-halo">
              <stop offset="0" stopColor="#cdeedd" stopOpacity="0.35" />
              <stop offset="1" stopColor="#cdeedd" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#g-sky)" />
          <Stars seed={21} count={80} maxY={380} color="#e8fff2" />
          <circle cx="1240" cy="150" r="230" fill="url(#g-halo)" />
          <circle cx="1240" cy="150" r="58" fill="url(#g-moon)" />
        </Art>
      </Layer>

      <Layer depth={6}>
        <Art align="xMidYMax">
          <Canopy seed={4} base={640} minR={30} maxR={55} color="#0f4842" highlight="#14584f" />
        </Art>
      </Layer>

      <div className="g-rays" />

      <Layer depth={11}>
        <Art align="xMidYMax">
          <defs>
            <radialGradient id="g-warm">
              <stop offset="0" stopColor="#ffd35a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffd35a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <Canopy seed={9} base={720} minR={40} maxR={75} color="#0a3530" />
          <GreatTree x={1180} y={760} />
        </Art>
      </Layer>

      <Layer depth={18}>
        <Art align="xMidYMax">
          <Canopy seed={15} base={810} minR={50} maxR={90} color="#06241f" />
          <path d="M600,900 C700,860 820,840 960,850 C1100,860 1180,880 1240,900 Z" fill="#0b2f28" />
          <Mushroom x={760} y={860} cap="#5ef0ff" />
          <Mushroom x={790} y={866} s={0.7} cap="#ff8ad8" />
          <Mushroom x={1380} y={868} s={1.2} cap="#ffd35a" />
        </Art>
      </Layer>

      <Layer depth={30}>
        <Art align="xMidYMax">
          <Fern x={-20} y={920} s={1.4} />
          <Fern x={1620} y={920} s={1.5} flip />
          <Fern x={1500} y={930} s={1.1} flip />
          <Mushroom x={1520} y={890} s={1.6} cap="#5ef0ff" />
        </Art>
      </Layer>

      {!reducedMotion && <Drift count={22} seed={41} className="g-fly" render={() => <i />} minDur={10} maxDur={20} rise />}
      <div className="domain-veil" />
    </div>
  );
}
