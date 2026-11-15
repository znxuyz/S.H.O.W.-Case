import type { BackgroundProps } from '../types';

/** 工程藍圖：藍晒紙、雙層格線、旋轉量角器與連接中的約束線 */
export default function BlueprintBackground({ reducedMotion }: BackgroundProps) {
  const anim = reducedMotion ? '' : 'bp-draw';
  return (
    <div className="blueprint-paper absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#cfe3ff">
        <g opacity="0.35" strokeWidth="1">
          <circle className={reducedMotion ? '' : 'bp-spin'} cx="1280" cy="200" r="150" strokeDasharray="2 8" />
          <circle cx="1280" cy="200" r="110" />
          <path d="M1130 200 H1430 M1280 50 V350" strokeDasharray="6 6" />
        </g>
        <g opacity="0.5" strokeWidth="1.2">
          <path className={anim} d="M560 850 L780 790 L1000 835 L1220 770 L1440 815" strokeDasharray="1200" />
          {[[560, 850], [780, 790], [1000, 835], [1220, 770], [1440, 815]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="7" fill="#0b2a55" />
              <circle cx={x} cy={y} r="14" opacity="0.4" />
            </g>
          ))}
        </g>
        <g opacity="0.45" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#cfe3ff" stroke="none">
          <text x="790" y="770">Σ conflicts = 0</text>
          <text x="1230" y="750">OPTIMAL · 31.7s</text>
          <text x="1160" y="388">Ø 300</text>
        </g>
        <g opacity="0.35" strokeWidth="1">
          <path d="M80 120 H520" /><path d="M80 112 V128 M520 112 V128" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,15,35,0.7)_100%)]" />
    </div>
  );
}
