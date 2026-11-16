/**
 * 終章背景：墨黑星空、暖金與靛紫的靜態星雲光暈，加上緩慢上升的金色微塵。
 * 全部是靜態 SVG 漸層＋只動 transform/opacity 的光點，不使用 canvas 每幀重繪或濾鏡。
 * （大地圖與作品頁的背景都在 3D 舞台裡，2D 插畫只剩這一張。）
 */
import type { CSSProperties } from 'react';
import { mulberry32 } from '../lib/random';

function Stars({ seed, count }: { seed: number; count: number }) {
  const rnd = mulberry32(seed);
  return (
    <g fill="#f3e6c8">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={rnd() * 1600} cy={rnd() * 900} r={rnd() < 0.85 ? 0.8 : 1.6} opacity={0.25 + rnd() * 0.7} />
      ))}
    </g>
  );
}

function Dust({ count, seed }: { count: number; seed: number }) {
  const rnd = mulberry32(seed);
  return (
    <div className="drift-field" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const style = {
          left: `${(rnd() * 100).toFixed(1)}%`,
          animationDuration: `${(14 + rnd() * 14).toFixed(1)}s`,
          animationDelay: `${(-rnd() * 28).toFixed(1)}s`,
          ['--sway' as string]: `${(40 + rnd() * 120).toFixed(0)}px`,
          ['--s' as string]: (0.6 + rnd() * 0.8).toFixed(2),
        } as CSSProperties;
        return <span key={i} className="drift drift-rise b-dust" style={style}><i /></span>;
      })}
    </div>
  );
}

export default function OutroBackground({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="outro-bg">
      <svg className="outro-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="b-a" cx="0.22" cy="0.3" r="0.5"><stop offset="0" stopColor="#c8a869" stopOpacity="0.2" /><stop offset="1" stopColor="#c8a869" stopOpacity="0" /></radialGradient>
          <radialGradient id="b-b" cx="0.78" cy="0.7" r="0.5"><stop offset="0" stopColor="#7a4628" stopOpacity="0.24" /><stop offset="1" stopColor="#7a4628" stopOpacity="0" /></radialGradient>
          <radialGradient id="b-c" cx="0.62" cy="0.18" r="0.42"><stop offset="0" stopColor="#4a3c78" stopOpacity="0.28" /><stop offset="1" stopColor="#4a3c78" stopOpacity="0" /></radialGradient>
          <radialGradient id="b-v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.7" /></radialGradient>
        </defs>
        <rect width="1600" height="900" fill="#0b0a09" />
        <rect width="1600" height="900" fill="url(#b-a)" />
        <rect width="1600" height="900" fill="url(#b-b)" />
        <rect width="1600" height="900" fill="url(#b-c)" />
        <Stars seed={101} count={160} />
        <rect width="1600" height="900" fill="url(#b-v)" />
      </svg>
      {!reducedMotion && <Dust count={26} seed={71} />}
    </div>
  );
}
