import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { Art, Drift, Layer, Stars } from '../sceneKit';

/** 祥雲：雲頭帶捲紋 */
function Xiangyun({ x, y, s = 1, flip = false, fill = '#2a1745', stroke = '#ffc76b' }: { x: number; y: number; s?: number; flip?: boolean; fill?: string; stroke?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <path
        d="M0,40 C-10,40 -14,26 -2,22 C-6,6 14,-2 24,8 C30,-10 58,-12 66,6 C76,-4 98,0 98,18 C114,16 122,32 112,40 Z"
        fill={fill} stroke={stroke} strokeWidth={1.6} strokeOpacity={0.85}
      />
      <g fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.8} strokeLinecap="round">
        <path d="M14,26 c0,-8 12,-8 12,0 c0,5 -7,5 -7,1" />
        <path d="M46,18 c0,-9 14,-9 14,0 c0,6 -8,6 -8,1" />
        <path d="M80,24 c0,-7 11,-7 11,0 c0,4 -6,4 -6,1" />
      </g>
      <path d="M112,40 C140,40 170,36 200,40" fill="none" stroke={stroke} strokeWidth={1.2} strokeOpacity={0.6} />
    </g>
  );
}

/** 懸浮仙島：岩底倒錐、頂上樓閣、垂落的瀑布 */
function SkyIsle({ x, y, s = 1, tone = '#2e1a4a', light = '#ffc76b' }: { x: number; y: number; s?: number; tone?: string; light?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-120,0 C-80,-8 80,-8 120,0 C100,30 60,60 30,120 C10,150 -6,170 -10,190 C-20,150 -50,100 -80,60 C-100,30 -116,14 -120,0 Z" fill={tone} />
      <path d="M-120,0 C-80,-8 80,-8 120,0" fill="none" stroke={light} strokeOpacity={0.5} strokeWidth={1.4} />
      <rect x="-60" y="-10" width="3" height="80" fill="url(#m-fall)" />
      <rect x="40" y="-6" width="2" height="60" fill="url(#m-fall)" />
      <rect x="-26" y="-40" width="52" height="32" fill="#1e1032" />
      {[-18, -4, 10].map((dx) => <rect key={dx} x={dx} y="-32" width="7" height="12" fill={light} opacity={0.65} />)}
      <path d="M-46,-38 Q-30,-44 -22,-56 L22,-56 Q30,-44 46,-38 Z" fill="#160b26" stroke={light} strokeOpacity={0.6} />
      <rect x="-14" y="-74" width="28" height="18" fill="#1e1032" />
      <path d="M-30,-72 Q-20,-78 -12,-90 L12,-90 Q20,-78 30,-72 Z" fill="#160b26" stroke={light} strokeOpacity={0.6} />
      <line x1="0" y1="-90" x2="0" y2="-110" stroke={light} strokeWidth="1.5" />
      <circle cx="0" cy="-112" r="3" fill={light} />
    </g>
  );
}

/**
 * 神話神獸「天界神域」：紫金星雲、巨大的光環天門、懸浮仙島與瀑布、
 * 層層祥雲，前景翻湧雲海，並有靈火光點緩緩上升。
 */
export default function MythicBackground({ active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  return (
    <div ref={ref} className="domain domain-mythic">
      <Layer depth={3}>
        <Art>
          <defs>
            <linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a0518" />
              <stop offset="0.55" stopColor="#1d0d3a" />
              <stop offset="1" stopColor="#3a1640" />
            </linearGradient>
            <radialGradient id="m-neb1" cx="0.72" cy="0.3" r="0.45">
              <stop offset="0" stopColor="#8c46ff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#8c46ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="m-neb2" cx="0.2" cy="0.65" r="0.4">
              <stop offset="0" stopColor="#ff5a8a" stopOpacity="0.3" />
              <stop offset="1" stopColor="#ff5a8a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="m-neb3" cx="0.5" cy="0.45" r="0.3">
              <stop offset="0" stopColor="#50c8ff" stopOpacity="0.18" />
              <stop offset="1" stopColor="#50c8ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#m-sky)" />
          <rect width="1600" height="900" fill="url(#m-neb1)" />
          <rect width="1600" height="900" fill="url(#m-neb2)" />
          <rect width="1600" height="900" fill="url(#m-neb3)" />
          <Stars seed={13} count={170} maxY={900} color="#efe2ff" />
        </Art>
      </Layer>

      <Layer depth={6}>
        <Art>
          <defs>
            <radialGradient id="m-gate">
              <stop offset="0" stopColor="#fff3d0" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="#ffc76b" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ffc76b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="m-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* 天門光環 */}
          <circle cx="1150" cy="300" r="250" fill="url(#m-gate)" opacity="0.55" />
          <g fill="none" stroke="#ffc76b">
            <circle cx="1150" cy="300" r="170" strokeOpacity="0.55" strokeWidth="2" />
            <circle cx="1150" cy="300" r="150" strokeOpacity="0.35" strokeDasharray="2 10" />
            <circle cx="1150" cy="300" r="205" strokeOpacity="0.25" strokeDasharray="40 12 4 12" />
          </g>
          <polygon points="1100,300 1200,300 1330,900 970,900" fill="url(#m-beam)" opacity="0.4" />
          <g stroke="#ffc76b" strokeOpacity="0.5">
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <line key={i} x1={1150 + Math.cos(a) * 176} y1={300 + Math.sin(a) * 176} x2={1150 + Math.cos(a) * 192} y2={300 + Math.sin(a) * 192} />;
            })}
          </g>
        </Art>
      </Layer>

      <Layer depth={11}>
        <Art>
          <defs>
            <linearGradient id="m-fall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bff3ff" stopOpacity="0.8" />
              <stop offset="1" stopColor="#bff3ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <SkyIsle x={860} y={180} s={0.55} tone="#2a1745" />
          <SkyIsle x={1450} y={520} s={0.7} tone="#2a1745" />
          <SkyIsle x={620} y={110} s={0.35} tone="#25143d" />
        </Art>
      </Layer>

      <Layer depth={17}>
        <Art>
          <Xiangyun x={720} y={280} s={1.1} />
          <Xiangyun x={1340} y={170} s={0.9} flip />
          <Xiangyun x={980} y={620} s={1.3} />
          <SkyIsle x={1260} y={430} s={1} tone="#341c56" />
        </Art>
      </Layer>

      <Layer depth={28}>
        <Art align="xMidYMax">
          <defs>
            <linearGradient id="m-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a2e7a" stopOpacity="0" />
              <stop offset="0.45" stopColor="#4a2466" stopOpacity="0.85" />
              <stop offset="1" stopColor="#1d0d33" />
            </linearGradient>
          </defs>
          <path d="M-50,900 L-50,760 C80,720 160,770 260,740 C360,710 440,760 560,736 C700,708 800,770 940,744 C1080,718 1180,770 1300,742 C1420,716 1520,750 1650,730 L1650,900 Z" fill="url(#m-sea)" />
          <Xiangyun x={1180} y={760} s={1.6} fill="#2e1650" />
          <Xiangyun x={60} y={800} s={1.4} fill="#2e1650" flip />
        </Art>
      </Layer>

      {!reducedMotion && <Drift count={18} seed={31} className="m-ember" render={(i) => <i data-c={i % 3} />} minDur={9} maxDur={17} rise />}
      <div className="domain-veil" />
    </div>
  );
}
