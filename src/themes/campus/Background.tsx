import type { CSSProperties } from 'react';
import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { Art, Drift, Layer, ridge } from '../sceneKit';

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="70" ry="22" />
      <circle cx="-26" cy="-14" r="24" />
      <circle cx="12" cy="-24" r="30" />
      <circle cx="44" cy="-8" r="20" />
    </g>
  );
}

function RoundTree({ x, y, s = 1, c = '#7cc36b' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="-4" y="-34" width="8" height="34" fill="#8a6446" />
      <circle cx="0" cy="-52" r="28" fill={c} />
      <circle cx="-14" cy="-44" r="18" fill={c} />
      <circle cx="10" cy="-62" r="14" fill="#a3dc8b" />
    </g>
  );
}

/** 校舍立面插畫（屋頂、旗幟取專案強調色） */
function School({ x, y }: { x: number; y: number }) {
  const winRow = (yy: number, n: number, x0: number) =>
    Array.from({ length: n }, (_, i) => <rect key={`${yy}-${i}`} x={x0 + i * 34} y={yy} width="20" height="26" rx="2" fill="#a9cdf0" stroke="#ffffff" strokeWidth="2" />);
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-300" y="-150" width="600" height="150" fill="#fbf6ec" />
      <rect x="-300" y="-150" width="600" height="10" style={{ fill: 'var(--accent)' }} opacity="0.85" />
      {winRow(-125, 8, -280)}
      {winRow(-75, 8, -280)}
      {winRow(-125, 6, 80)}
      {winRow(-75, 6, 80)}
      <rect x="-60" y="-230" width="120" height="230" fill="#fffaf1" />
      <path d="M-74,-230 L0,-290 L74,-230 Z" style={{ fill: 'var(--accent)' }} />
      <circle cx="0" cy="-192" r="24" fill="#ffffff" style={{ stroke: 'var(--accent)' }} strokeWidth="4" />
      <path d="M0,-192 v-14 M0,-192 h10" stroke="#1f2430" strokeWidth="3" strokeLinecap="round" />
      <rect x="-26" y="-60" width="52" height="60" rx="26" fill="#6c8fb6" />
      <line x1="0" y1="-290" x2="0" y2="-340" stroke="#8a8f99" strokeWidth="3" />
      <path className="flag-wave" d="M0,-340 q22,6 40,-2 v22 q-20,8 -40,2 z" style={{ fill: 'var(--accent)' }} />
      <path d="M-320,-150 L-300,-170 L300,-170 L320,-150 Z" style={{ fill: 'color-mix(in srgb, var(--accent) 75%, black)' }} />
    </g>
  );
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 40 24" width="40" height="24">
      <path d="M0,12 L40,0 L16,24 L14,15 Z" fill="#ffffff" stroke="#c9d3e3" />
      <path d="M14,15 L40,0" stroke="#c9d3e3" />
    </svg>
  );
}

function Petal() {
  return (
    <svg viewBox="-8 -8 16 16" width="14" height="14">
      <path d="M0,-7 C5,-6 7,0 0,7 C-7,0 -5,-6 0,-7 Z" fill="#ffb7cf" />
    </svg>
  );
}

/**
 * 校園「晴空學園」：晴朗天空與白雲、綠色丘陵、鐘樓校舍（屋頂與旗幟隨作品強調色變化）、
 * 操場跑道與行道樹，右上角櫻花枝，花瓣與紙飛機在空中飄過。
 */
export default function CampusBackground({ accent = '#3563e9', active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  return (
    <div ref={ref} className="domain domain-campus" style={{ ['--accent' as string]: accent } as CSSProperties}>
      <Layer depth={3}>
        <Art>
          <defs>
            <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#cfe6ff" />
              <stop offset="0.65" stopColor="#f3f7fb" />
              <stop offset="1" stopColor="#fdf6ea" />
            </linearGradient>
            <radialGradient id="k-sun">
              <stop offset="0" stopColor="#fff6d6" />
              <stop offset="0.3" stopColor="#ffe9a8" stopOpacity="0.8" />
              <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#k-sky)" />
          <circle cx="1320" cy="140" r="200" fill="url(#k-sun)" />
        </Art>
      </Layer>

      <Layer depth={6} className="k-clouds">
        <Art>
          <Cloud x={980} y={140} s={1.2} />
          <Cloud x={1450} y={300} s={0.8} />
          <Cloud x={700} y={240} s={0.7} />
        </Art>
      </Layer>

      <Layer depth={10}>
        <Art align="xMidYMax">
          <path d={ridge(5, 640, 50, 1.6)} fill="#bfe0a6" />
          <path d={ridge(9, 690, 36, 2.4)} fill="#a7d58c" />
        </Art>
      </Layer>

      <Layer depth={16}>
        <Art align="xMaxYMax">
          <rect x="0" y="730" width="1600" height="170" fill="#9fd07f" />
          <ellipse cx="420" cy="830" rx="380" ry="60" fill="#e48b62" />
          <ellipse cx="420" cy="830" rx="330" ry="40" fill="#8fc86f" />
          <ellipse cx="420" cy="830" rx="356" ry="50" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 10" />
          <School x={1180} y={760} />
          {[820, 880, 1520, 1580].map((x, i) => <RoundTree key={x} x={x} y={770} s={i % 2 ? 0.9 : 1.1} c={i % 2 ? '#6fb85e' : '#7cc36b'} />)}
          <rect x="0" y="770" width="1600" height="6" fill="#d9cdb4" />
        </Art>
      </Layer>

      <Layer depth={28}>
        <Art align="xMaxYMin">
          <path d="M1650,40 C1560,60 1480,90 1400,150 M1520,80 C1500,120 1470,150 1440,170" stroke="#7a5640" strokeWidth="9" fill="none" strokeLinecap="round" />
          {[[1600, 50], [1560, 70], [1520, 82], [1480, 110], [1440, 140], [1410, 160], [1500, 120], [1460, 165], [1540, 100], [1430, 120]].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={16} fill={i % 3 ? '#ffc2d6' : '#ffd8e5'} />
              <circle cx={cx} cy={cy} r={4} fill="#ff8fb1" />
            </g>
          ))}
        </Art>
      </Layer>

      {!reducedMotion && (
        <>
          <Drift count={16} seed={51} className="k-petal" render={() => <Petal />} minDur={12} maxDur={22} />
          <div className="k-plane k-plane-a"><PaperPlane /></div>
          <div className="k-plane k-plane-b"><PaperPlane /></div>
        </>
      )}
      <div className="domain-veil" />
    </div>
  );
}
