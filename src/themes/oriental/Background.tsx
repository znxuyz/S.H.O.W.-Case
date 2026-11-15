import { useMemo } from 'react';
import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { Art, Drift, karst, Layer, ridge, Stars } from '../sceneKit';

/** 飛簷屋頂（正視圖），兩端翹角 */
function eave(cx: number, y: number, w: number, h: number) {
  return `M${cx - w - 10},${y - 12} Q${cx - w + 2},${y + 3} ${cx - w + 22},${y} L${cx + w - 22},${y} Q${cx + w - 2},${y + 3} ${cx + w + 10},${y - 12} L${cx + w * 0.5},${y - h} L${cx - w * 0.5},${y - h} Z`;
}

function Lantern({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y + r * 1.6} r={r * 5} fill="url(#o-lglow)" />
      <line x1={x} y1={y} x2={x} y2={y + r * 0.6} stroke="#e8c872" strokeWidth={1} />
      <ellipse cx={x} cy={y + r * 1.6} rx={r} ry={r * 1.25} fill="#e0442f" />
      <rect x={x - r * 0.55} y={y + r * 0.45} width={r * 1.1} height={2} fill="#e8c872" />
      <rect x={x - r * 0.55} y={y + r * 2.6} width={r * 1.1} height={2} fill="#e8c872" />
    </g>
  );
}

/** 懸崖上的重簷亭台 */
function Pavilion({ cx, base }: { cx: number; base: number }) {
  return (
    <g>
      <rect x={cx - 78} y={base - 14} width={156} height={14} fill="#2b231b" />
      <line x1={cx - 78} y1={base - 14} x2={cx + 78} y2={base - 14} stroke="#e8c872" strokeOpacity={0.6} />
      <rect x={cx - 90} y={base - 4} width={180} height={8} fill="#1d1813" />
      {[-56, -20, 20, 56].map((dx) => <rect key={dx} x={cx + dx - 3.5} y={base - 76} width={7} height={62} fill="#8e2a1c" />)}
      <rect x={cx - 62} y={base - 34} width={124} height={3} fill="#5a1a12" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={cx - 60 + i * 10.5} y={base - 34} width={1.6} height={20} fill="#5a1a12" />)}
      <rect x={cx - 52} y={base - 70} width={104} height={44} fill="#ffcf7a" opacity={0.12} />
      <path d={eave(cx, base - 76, 104, 30)} fill="#1c1f1b" />
      <path d={`M${cx - 114},${base - 88} Q${cx - 102},${base - 73} ${cx - 82},${base - 76} L${cx + 82},${base - 76} Q${cx + 102},${base - 73} ${cx + 114},${base - 88}`} fill="none" stroke="#e8c872" strokeWidth={1.6} />
      <rect x={cx - 38} y={base - 126} width={76} height={22} fill="#7a2418" />
      {[-30, 0, 30].map((dx) => <rect key={dx} x={cx + dx - 6} y={base - 122} width={12} height={14} fill="#ffcf7a" opacity={0.55} />)}
      <path d={eave(cx, base - 126, 66, 34)} fill="#1c1f1b" />
      <path d={`M${cx - 76},${base - 138} Q${cx - 66},${base - 123} ${cx - 46},${base - 126} L${cx + 46},${base - 126} Q${cx + 66},${base - 123} ${cx + 76},${base - 138}`} fill="none" stroke="#e8c872" strokeWidth={1.4} />
      <line x1={cx} y1={base - 160} x2={cx} y2={base - 190} stroke="#e8c872" strokeWidth={2} />
      <circle cx={cx} cy={base - 172} r={4} fill="#e8c872" />
      <circle cx={cx} cy={base - 184} r={3} fill="#e8c872" />
      <Lantern x={cx - 104} y={base - 86} />
      <Lantern x={cx + 104} y={base - 86} />
      <Lantern x={cx - 68} y={base - 136} r={5.5} />
      <Lantern x={cx + 68} y={base - 136} r={5.5} />
    </g>
  );
}

/** 迎客松：彎曲樹幹 + 分層松針 */
function Pine({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  const pads = [[-10, -120, 70, 16], [40, -150, 85, 18], [100, -132, 70, 15], [150, -165, 60, 14], [10, -185, 55, 13], [70, -205, 50, 12]];
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <path d="M0,0 C10,-40 -10,-80 20,-120 C40,-145 80,-150 120,-150 C140,-150 150,-160 158,-168" fill="none" stroke="#2a1f17" strokeWidth={12} strokeLinecap="round" />
      <path d="M20,-120 C30,-150 20,-175 30,-200 C40,-215 60,-210 70,-208" fill="none" stroke="#2a1f17" strokeWidth={7} strokeLinecap="round" />
      {pads.map(([px, py, w, h], i) => (
        <g key={i}>
          <ellipse cx={px} cy={py} rx={w / 2} ry={h / 2} fill="#1a2a20" />
          <ellipse cx={px - 6} cy={py - 4} rx={w / 2.4} ry={h / 2.6} fill="#253a2c" />
          <path d={`M${px - w / 2},${py} Q${px},${py - h} ${px + w / 2},${py}`} fill="none" stroke="#e8c872" strokeOpacity={0.18} />
        </g>
      ))}
    </g>
  );
}

function Ginkgo() {
  return (
    <svg viewBox="-12 -12 24 24" width="22" height="22">
      <path d="M0,10 L0,2 C-9,2 -11,-6 -8,-10 C-4,-7 4,-7 8,-10 C11,-6 9,2 0,2" fill="#e8b94a" />
      <path d="M0,2 L0,-8" stroke="#b9862c" strokeWidth={0.8} />
    </svg>
  );
}

/**
 * 古典中式「天幕垂落」：暮色玄漆天幕、金月與歸鳥、層巒疊嶂的水墨群峰、
 * 雲霧、懸崖上的重簷亭台與迎客松、湖面月影，前景松枝與飄落銀杏。
 */
export default function OrientalBackground({ active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  const paths = useMemo(() => ({
    far: karst(7, 690, 10, 170, 340),
    farther: karst(3, 640, 13, 90, 200),
    mid: karst(21, 770, 7, 150, 290, -60, 1300),
    near: ridge(42, 830, 40, 2.2),
  }), []);

  return (
    <div ref={ref} className="domain domain-oriental">
      <Layer depth={4}>
        <Art>
          <defs>
            <linearGradient id="o-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b0a09" />
              <stop offset="0.55" stopColor="#1b1712" />
              <stop offset="0.78" stopColor="#3b2c19" />
              <stop offset="1" stopColor="#1a1510" />
            </linearGradient>
            <radialGradient id="o-moon" cx="0.4" cy="0.38">
              <stop offset="0" stopColor="#fff6dc" />
              <stop offset="0.6" stopColor="#f0d48a" />
              <stop offset="1" stopColor="#c99e4f" />
            </radialGradient>
            <radialGradient id="o-halo">
              <stop offset="0" stopColor="#e8c872" stopOpacity="0.35" />
              <stop offset="1" stopColor="#e8c872" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#o-sky)" />
          <Stars seed={5} count={70} maxY={420} color="#f5e6c4" />
          <circle cx="1170" cy="200" r="300" fill="url(#o-halo)" />
          <circle cx="1170" cy="200" r="86" fill="url(#o-moon)" />
          <linearGradient id="o-wisp" x1="0" x2="1">
            <stop offset="0" stopColor="#14110d" stopOpacity="0" />
            <stop offset="0.5" stopColor="#14110d" stopOpacity="0.75" />
            <stop offset="1" stopColor="#14110d" stopOpacity="0" />
          </linearGradient>
          <ellipse cx="1190" cy="228" rx="200" ry="9" fill="url(#o-wisp)" />
          <ellipse cx="1130" cy="244" rx="150" ry="5" fill="url(#o-wisp)" />
          <ellipse cx="1080" cy="168" rx="120" ry="5" fill="url(#o-wisp)" opacity="0.7" />
          <g stroke="#14110d" strokeWidth="2.2" fill="none" strokeLinecap="round">
            {[[1090, 150, 1], [1120, 168, 0.8], [1146, 140, 0.9], [1180, 160, 0.7], [1210, 132, 0.6], [1060, 178, 0.7]].map(([x, y, s], i) => (
              <path key={i} d={`M${x - 12 * s},${y - 4 * s} Q${x - 5 * s},${y - 8 * s} ${x},${y} Q${x + 5 * s},${y - 8 * s} ${x + 12 * s},${y - 4 * s}`} />
            ))}
          </g>
        </Art>
      </Layer>

      <Layer depth={9}>
        <Art>
          <defs>
            <linearGradient id="o-far" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b5546" stopOpacity="0.9" />
              <stop offset="0.75" stopColor="#3a352b" stopOpacity="0.35" />
              <stop offset="1" stopColor="#3a352b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="o-farther" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6f6655" stopOpacity="0.55" />
              <stop offset="1" stopColor="#6f6655" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={paths.farther} fill="url(#o-farther)" />
          <path d={paths.far} fill="url(#o-far)" />
        </Art>
      </Layer>

      <div className="o-mist o-mist-a" />

      <Layer depth={15}>
        <Art>
          <defs>
            <linearGradient id="o-mid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2e2b24" />
              <stop offset="0.7" stopColor="#1e1b16" stopOpacity="0.85" />
              <stop offset="1" stopColor="#1e1b16" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="o-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a2318" />
              <stop offset="1" stopColor="#0e0c0a" />
            </linearGradient>
          </defs>
          <rect x="0" y="770" width="1600" height="130" fill="url(#o-water)" />
          <g stroke="#e8c872" strokeLinecap="round">
            {[[1170, 790, 70], [1150, 806, 110], [1180, 822, 80], [1160, 840, 140], [1175, 858, 60], [1140, 874, 120]].map(([x, y, w], i) => (
              <line key={i} x1={x - w / 2} y1={y} x2={x + w / 2} y2={y} strokeOpacity={0.45 - i * 0.05} strokeWidth={2} />
            ))}
          </g>
          <path d={paths.mid} fill="url(#o-mid)" />
        </Art>
      </Layer>

      <div className="o-mist o-mist-b" />

      <Layer depth={24}>
        <Art align="xMaxYMax">
          <defs>
            <radialGradient id="o-lglow">
              <stop offset="0" stopColor="#ff9a4d" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ff9a4d" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="o-cliff" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1f1b16" />
              <stop offset="1" stopColor="#0f0d0b" />
            </linearGradient>
          </defs>
          <path d={paths.near} fill="#13110e" />
          <path d="M1010,900 C1030,860 1060,820 1110,800 L1600,780 L1600,900 Z" fill="url(#o-cliff)" />
          <path d="M1110,800 L1600,780" stroke="#e8c872" strokeOpacity="0.35" />
          <g stroke="#2e2820" strokeWidth="2" fill="none" opacity="0.9">
            <path d="M1090,830 C1110,850 1100,880 1120,900" />
            <path d="M1180,812 C1195,840 1185,870 1205,900" />
          </g>
          <Pavilion cx={1290} base={796} />
          <Pine x={1120} y={804} s={0.75} />
        </Art>
      </Layer>

      <Layer depth={36} className="o-front">
        <Art align="xMaxYMin">
          <Pine x={1650} y={250} s={1.1} flip />
        </Art>
      </Layer>

      {!reducedMotion && (
        <>
          <Drift count={14} seed={9} className="o-leaf" render={() => <Ginkgo />} minDur={11} maxDur={20} />
          <Drift count={12} seed={19} className="o-mote" render={() => <i />} minDur={10} maxDur={18} rise />
        </>
      )}

      <div className="domain-frame" />
      <div className="domain-veil" />
    </div>
  );
}
