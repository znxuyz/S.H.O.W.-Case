/**
 * 領域場景插畫的共用零件：視差圖層、飄落物、光點、山巒/建築群產生器。
 * 所有持續動畫只動 transform / opacity；沒有任何 filter。
 */
import type { CSSProperties, ReactNode } from 'react';
import { mulberry32 } from '../lib/useCanvasLoop';

/** 全螢幕視差圖層（比畫面略大，位移時不露邊） */
export function Layer({ depth, children, className = '', style }: { depth: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div data-depth={depth} className={`plx-layer ${className}`} style={style}>
      {children}
    </div>
  );
}

/** 1600×900 的全螢幕 SVG 畫布（slice 填滿） */
export function Art({ children, align = 'xMidYMid', className = '' }: { children: ReactNode; align?: string; className?: string }) {
  return (
    <svg className={`plx-art ${className}`} viewBox="0 0 1600 900" preserveAspectRatio={`${align} slice`} aria-hidden>
      {children}
    </svg>
  );
}

/** 飄落 / 飄升的小物（銀杏、花瓣、光點……）：純 CSS transform 動畫 */
export function Drift({
  count, seed, render, className, minDur = 9, maxDur = 18, rise = false,
}: {
  count: number; seed: number; render: (i: number) => ReactNode; className: string; minDur?: number; maxDur?: number; rise?: boolean;
}) {
  const rnd = mulberry32(seed);
  return (
    <div className="drift-field" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const style = {
          left: `${(rnd() * 100).toFixed(1)}%`,
          animationDuration: `${(minDur + rnd() * (maxDur - minDur)).toFixed(1)}s`,
          animationDelay: `${(-rnd() * maxDur).toFixed(1)}s`,
          ['--sway' as string]: `${(40 + rnd() * 120).toFixed(0)}px`,
          ['--spin' as string]: `${(rnd() > 0.5 ? 1 : -1) * (180 + rnd() * 540)}deg`,
          ['--s' as string]: (0.6 + rnd() * 0.8).toFixed(2),
        } as CSSProperties;
        return (
          <span key={i} className={`drift ${rise ? 'drift-rise' : 'drift-fall'} ${className}`} style={style}>
            {render(i)}
          </span>
        );
      })}
    </div>
  );
}

/** 水墨喀斯特山峰：圓潤高聳的峰群 */
export function karst(seed: number, base: number, count: number, minH: number, maxH: number, x0 = -100, x1 = 1700) {
  const rnd = mulberry32(seed);
  let d = '';
  const step = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const cx = x0 + step * (i + 0.5) + (rnd() - 0.5) * step * 0.6;
    const w = step * (0.55 + rnd() * 0.6);
    const h = minH + rnd() * (maxH - minH);
    const top = base - h;
    const lean = (rnd() - 0.5) * w * 0.25;
    d += `M${cx - w},${base} C${cx - w * 0.75},${base - h * 0.55} ${cx - w * 0.42 + lean},${top} ${cx + lean},${top} ` +
      `C${cx + w * 0.42 + lean},${top} ${cx + w * 0.7},${base - h * 0.5} ${cx + w},${base} Z `;
  }
  return d;
}

/** 起伏山脊（封閉到畫面底部） */
export function ridge(seed: number, base: number, amp: number, freq: number) {
  const rnd = mulberry32(seed);
  const p = [rnd() * 6, rnd() * 6, rnd() * 6];
  let d = `M-50,900 L-50,${base}`;
  for (let x = -50; x <= 1650; x += 25) {
    const u = x / 1600;
    const y = base - (Math.sin(u * Math.PI * freq + p[0]) * 0.5 + Math.sin(u * Math.PI * freq * 2.7 + p[1]) * 0.3 + Math.sin(u * Math.PI * freq * 6.1 + p[2]) * 0.12) * amp;
    d += ` L${x},${y.toFixed(1)}`;
  }
  return `${d} L1650,900 Z`;
}

/** 隨機星點 */
export function Stars({ seed, count, maxY = 600, color = '#fff' }: { seed: number; count: number; maxY?: number; color?: string }) {
  const rnd = mulberry32(seed);
  return (
    <g fill={color}>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={rnd() * 1600} cy={rnd() * maxY} r={rnd() < 0.85 ? 0.8 : 1.6} opacity={0.25 + rnd() * 0.7} />
      ))}
    </g>
  );
}
