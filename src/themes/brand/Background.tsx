import type { BackgroundProps } from '../types';
import { Art, Drift, Stars } from '../sceneKit';

/**
 * 序章／大地圖：墨黑星空、暖金與靛紫的靜態星雲光暈，加上緩慢上升的金色微塵。
 * 全部是靜態漸層＋只動 transform/opacity 的光點，不使用 canvas 每幀重繪或濾鏡。
 */
export default function BrandBackground({ reducedMotion }: BackgroundProps) {
  return (
    <div className="domain domain-brand">
      <Art>
        <defs>
          <radialGradient id="b-a" cx="0.22" cy="0.3" r="0.5">
            <stop offset="0" stopColor="#c8a869" stopOpacity="0.2" />
            <stop offset="1" stopColor="#c8a869" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b-b" cx="0.78" cy="0.7" r="0.5">
            <stop offset="0" stopColor="#7a4628" stopOpacity="0.24" />
            <stop offset="1" stopColor="#7a4628" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b-c" cx="0.62" cy="0.18" r="0.42">
            <stop offset="0" stopColor="#4a3c78" stopOpacity="0.28" />
            <stop offset="1" stopColor="#4a3c78" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b-v" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="#0b0a09" />
        <rect width="1600" height="900" fill="url(#b-a)" />
        <rect width="1600" height="900" fill="url(#b-b)" />
        <rect width="1600" height="900" fill="url(#b-c)" />
        <Stars seed={101} count={160} maxY={900} color="#f3e6c8" />
        <rect width="1600" height="900" fill="url(#b-v)" />
      </Art>
      {!reducedMotion && <Drift count={26} seed={71} className="b-dust" render={() => <i />} minDur={14} maxDur={28} rise />}
    </div>
  );
}
