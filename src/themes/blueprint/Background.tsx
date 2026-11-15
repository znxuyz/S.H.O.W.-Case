import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { Art, Layer } from '../sceneKit';

const LINE = '#cfe3ff';

function Gear({ r, teeth }: { r: number; teeth: number }) {
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / teeth / 2;
    const p = (a: number, rr: number) => `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
    d += `${i ? 'L' : 'M'}${p(a0, r)} L${p(a0 + 0.05, r + 9)} L${p(a1 - 0.05, r + 9)} L${p(a1, r)} `;
  }
  return (
    <svg viewBox={`${-r - 12} ${-r - 12} ${(r + 12) * 2} ${(r + 12) * 2}`} width={(r + 12) * 2} height={(r + 12) * 2}>
      <path d={`${d}Z`} fill="none" stroke={LINE} strokeOpacity="0.55" strokeWidth="1.5" />
      <circle r={r * 0.35} fill="none" stroke={LINE} strokeOpacity="0.55" strokeWidth="1.5" />
      <circle r={r * 0.65} fill="none" stroke={LINE} strokeOpacity="0.25" strokeDasharray="3 5" />
    </svg>
  );
}

function Dim({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const horizontal = y1 === y2;
  return (
    <g stroke={LINE} strokeOpacity="0.55" fill={LINE}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {horizontal ? (
        <>
          <path d={`M${x1},${y1} l10,-4 v8 z M${x2},${y2} l-10,-4 v8 z`} stroke="none" fillOpacity="0.7" />
          <line x1={x1} y1={y1 - 10} x2={x1} y2={y1 + 10} /><line x1={x2} y1={y2 - 10} x2={x2} y2={y2 + 10} />
        </>
      ) : (
        <>
          <path d={`M${x1},${y1} l-4,10 h8 z M${x2},${y2} l-4,-10 h8 z`} stroke="none" fillOpacity="0.7" />
          <line x1={x1 - 10} y1={y1} x2={x1 + 10} y2={y1} /><line x1={x2 - 10} y1={y2} x2={x2 + 10} y2={y2} />
        </>
      )}
      <text x={(x1 + x2) / 2 + (horizontal ? 0 : 14)} y={(y1 + y2) / 2 - (horizontal ? 8 : 0)} fontSize="13" fontFamily="JetBrains Mono, monospace" stroke="none" fillOpacity="0.8" textAnchor={horizontal ? 'middle' : 'start'}>{label}</text>
    </g>
  );
}

/** 校舍立面工程圖 */
function Elevation({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} fill="none" stroke={LINE}>
      <rect x="-330" y="-180" width="660" height="180" strokeOpacity="0.7" strokeWidth="1.6" />
      <rect x="-70" y="-270" width="140" height="270" strokeOpacity="0.7" strokeWidth="1.6" />
      <path d="M-86,-270 L0,-336 L86,-270" strokeOpacity="0.7" strokeWidth="1.6" />
      <circle cx="0" cy="-222" r="28" strokeOpacity="0.6" />
      <circle cx="0" cy="-222" r="3" fill={LINE} fillOpacity="0.6" />
      {Array.from({ length: 2 }, (_, row) => Array.from({ length: 16 }, (_, i) => {
        const wx = -310 + i * 40 + (i >= 8 ? 120 : 0);
        if (wx > 300) return null;
        return <rect key={`${row}-${i}`} x={wx} y={-150 + row * 64} width="24" height="34" strokeOpacity="0.45" />;
      }))}
      <path d="M-30,0 v-60 a30,30 0 0 1 60,0 v60" strokeOpacity="0.6" />
      <path d="M-330,-180 L-350,-200 L350,-200 L330,-180" strokeOpacity="0.6" />
      <line x1="-400" y1="0" x2="400" y2="0" strokeOpacity="0.8" strokeWidth="2" />
      <g strokeOpacity="0.2">
        {Array.from({ length: 20 }, (_, i) => <line key={i} x1={-400 + i * 40} y1="0" x2={-380 + i * 40} y2="18" />)}
      </g>
      <Dim x1={-330} y1={40} x2={330} y2={40} label="66 000" />
      <Dim x1={370} y1={-336} x2={370} y2={0} label="33 600" />
      <text x="-330" y="-350" fill={LINE} stroke="none" fillOpacity="0.7" fontSize="14" fontFamily="JetBrains Mono, monospace" letterSpacing="3">FRONT ELEVATION · 1:200</text>
    </g>
  );
}

/** 塔吊線稿 */
function Crane({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} fill="none" stroke="#ffd166" strokeOpacity="0.75">
      <path d="M-8,0 V-420 M8,0 V-420" />
      {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M-8,${-i * 30} L8,${-i * 30 - 30}`} strokeOpacity="0.5" />)}
      <path d="M-260,-420 H120 M-260,-420 L0,-470 L120,-420" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${-250 + i * 30},-420 l15,-12`} strokeOpacity="0.4" />)}
      <path d="M-200,-420 V-300" strokeDasharray="4 4" />
      <rect x="-216" y="-300" width="32" height="20" />
      <rect x="80" y="-412" width="36" height="24" fill="#ffd166" fillOpacity="0.2" />
    </g>
  );
}

/**
 * 工程藍圖「繪圖桌」：藍晒圖紙上的校舍立面圖與尺寸標註、施工塔吊線稿、
 * 緩慢轉動的齒輪與量角器、底部連接中的約束圖節點。
 */
export default function BlueprintBackground({ active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  return (
    <div ref={ref} className="domain domain-blueprint">
      <div className="bp-sheet" />
      <Layer depth={5}>
        <Art align="xMaxYMid">
          <g fill="none" stroke={LINE} strokeOpacity="0.25">
            <circle cx="1380" cy="180" r="140" strokeDasharray="2 8" />
            <circle cx="1380" cy="180" r="100" />
            <path d="M1220,180 H1540 M1380,20 V340" strokeDasharray="6 6" />
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i / 36) * Math.PI * 2;
              return <line key={i} x1={1380 + Math.cos(a) * 100} y1={180 + Math.sin(a) * 100} x2={1380 + Math.cos(a) * (i % 3 ? 108 : 116)} y2={180 + Math.sin(a) * (i % 3 ? 108 : 116)} />;
            })}
          </g>
        </Art>
      </Layer>

      <Layer depth={10}>
        <Art align="xMaxYMax">
          <Elevation x={1130} y={820} />
        </Art>
      </Layer>

      <Layer depth={16}>
        <Art align="xMaxYMax">
          <Crane x={1530} y={830} />
          <g fill="#0b2a55" stroke={LINE} strokeOpacity="0.6">
            {[[560, 870], [700, 840], [840, 868]].map(([x, y], i, arr) => (
              <g key={i}>
                {i < arr.length - 1 && <line x1={x} y1={y} x2={arr[i + 1][0]} y2={arr[i + 1][1]} strokeDasharray="5 5" />}
                <circle cx={x} cy={y} r="7" />
              </g>
            ))}
          </g>
        </Art>
      </Layer>

      <div className={`bp-gear bp-gear-a ${reducedMotion ? '' : 'spin-slow'}`}><Gear r={70} teeth={18} /></div>
      <div className={`bp-gear bp-gear-b ${reducedMotion ? '' : 'spin-slow-rev'}`}><Gear r={40} teeth={12} /></div>
      <div className="domain-veil" />
    </div>
  );
}
