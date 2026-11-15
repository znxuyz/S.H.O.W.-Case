import { useMemo } from 'react';
import type { BackgroundProps } from '../types';
import { useParallax } from '../../lib/useParallax';
import { mulberry32 } from '../../lib/useCanvasLoop';
import { Art, Layer, Stars } from '../sceneKit';

interface Bldg { x: number; w: number; h: number; holo: boolean; antenna: boolean }

function skyline(seed: number, count: number, minH: number, maxH: number, holoRate: number): Bldg[] {
  const rnd = mulberry32(seed);
  const out: Bldg[] = [];
  let x = -40;
  for (let i = 0; i < count && x < 1640; i++) {
    const w = 40 + rnd() * 70;
    out.push({ x, w, h: minH + rnd() ** 1.6 * (maxH - minH), holo: rnd() < holoRate, antenna: rnd() < 0.3 });
    x += w + 4 + rnd() * 16;
  }
  return out;
}

function City({ list, base, fill, edge, win, seed }: { list: Bldg[]; base: number; fill: string; edge: string; win: string; seed: number }) {
  const rnd = mulberry32(seed);
  return (
    <g>
      {list.map((b, i) => {
        const top = base - b.h;
        const windows = [];
        for (let y = top + 10; y < base - 8; y += 12) {
          for (let x = b.x + 6; x < b.x + b.w - 8; x += 10) {
            if (rnd() < 0.32) windows.push(<rect key={`${x}-${y}`} x={x} y={y} width={5} height={3} fill={rnd() < 0.15 ? '#ff3df2' : win} opacity={0.35 + rnd() * 0.6} />);
          }
        }
        return (
          <g key={i}>
            {b.holo ? (
              <>
                <rect x={b.x} y={top} width={b.w} height={b.h} fill="url(#c-holo)" />
                <rect x={b.x} y={top} width={b.w} height={b.h} fill="none" stroke={edge} strokeOpacity={0.8} />
                {Array.from({ length: Math.floor(b.h / 18) }, (_, k) => (
                  <line key={k} x1={b.x} x2={b.x + b.w} y1={top + 9 + k * 18} y2={top + 9 + k * 18} stroke={edge} strokeOpacity={0.28} />
                ))}
              </>
            ) : (
              <>
                <rect x={b.x} y={top} width={b.w} height={b.h} fill={fill} />
                <line x1={b.x} x2={b.x + b.w} y1={top} y2={top} stroke={edge} strokeOpacity={0.6} />
                {windows}
              </>
            )}
            {b.antenna && (
              <>
                <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={top} y2={top - 40} stroke={edge} strokeOpacity={0.7} />
                <circle cx={b.x + b.w / 2} cy={top - 40} r={2.6} fill="#ff3df2" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 透視網格地面（消失點在地平線中央） */
function GridFloor() {
  const vx = 800, vy = 620;
  const h: number[] = [];
  for (let i = 1; i < 16; i++) h.push(vy + (900 - vy) * (i / 15) ** 2.1);
  const v: number[] = [];
  for (let i = -24; i <= 24; i++) v.push(i * 90);
  return (
    <g stroke="#22e4ff" fill="none">
      {h.map((y, i) => <line key={`h${i}`} x1={0} x2={1600} y1={y} y2={y} strokeOpacity={0.08 + (i / 15) * 0.35} />)}
      {v.map((dx, i) => <line key={`v${i}`} x1={vx + dx * 0.04} y1={vy} x2={vx + dx} y2={900} strokeOpacity={0.25} />)}
    </g>
  );
}

/** 全息 K 線圖面板 */
function HoloChart({ x, y }: { x: number; y: number }) {
  const rnd = mulberry32(2330);
  let v = 60;
  const candles = Array.from({ length: 18 }, (_, i) => {
    const o = v; v += (rnd() - 0.42) * 16; const c = v;
    const hi = Math.max(o, c) + rnd() * 8, lo = Math.min(o, c) - rnd() * 8;
    return { i, o, c, hi, lo };
  });
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width="260" height="150" rx="4" fill="rgba(34,228,255,0.05)" stroke="#22e4ff" strokeOpacity="0.5" />
      <path d="M0,22 H260" stroke="#22e4ff" strokeOpacity="0.3" />
      <text x="10" y="15" fill="#9ff3ff" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="2">TAIEX · 5m</text>
      <text x="200" y="15" fill="#ff3d6e" fontSize="10" fontFamily="JetBrains Mono, monospace">● LIVE</text>
      {candles.map((k) => {
        const cx = 16 + k.i * 13.5;
        const up = k.c >= k.o;
        const col = up ? '#ff3d6e' : '#00e6a0';
        const Y = (n: number) => 140 - (n - 20) * 1.1;
        return (
          <g key={k.i}>
            <line x1={cx} x2={cx} y1={Y(k.hi)} y2={Y(k.lo)} stroke={col} strokeOpacity="0.8" />
            <rect x={cx - 3.5} y={Y(Math.max(k.o, k.c))} width="7" height={Math.max(2, Math.abs(k.c - k.o) * 1.1)} fill={col} fillOpacity="0.75" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * 未來科技「資料之城」：深夜天際的霓虹地平光、三層全息城市天際線、
 * 透視網格地面、漂浮的全息 K 線面板，以及垂直流動的數據流。
 */
export default function CyberBackground({ active, reducedMotion }: BackgroundProps) {
  const ref = useParallax<HTMLDivElement>(active, reducedMotion);
  const city = useMemo(() => ({
    far: skyline(11, 40, 60, 230, 0.15),
    mid: skyline(23, 30, 120, 360, 0.3),
    near: skyline(37, 18, 200, 470, 0.2),
  }), []);
  const streams = useMemo(() => {
    const rnd = mulberry32(77);
    return Array.from({ length: 16 }, (_, i) => ({
      left: `${(i / 16) * 100 + rnd() * 5}%`,
      dur: `${7 + rnd() * 9}s`,
      delay: `${-rnd() * 12}s`,
      text: Array.from({ length: 22 }, () => (rnd() < 0.5 ? Math.floor(rnd() * 10) : '01▲▼.%'[Math.floor(rnd() * 6)])).join(''),
    }));
  }, []);

  return (
    <div ref={ref} className="domain domain-cyber">
      <Layer depth={3}>
        <Art>
          <defs>
            <linearGradient id="c-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#02040a" />
              <stop offset="0.6" stopColor="#061827" />
              <stop offset="0.69" stopColor="#0d2f45" />
              <stop offset="1" stopColor="#02060c" />
            </linearGradient>
            <radialGradient id="c-horizon" cx="0.5" cy="0.69" r="0.6">
              <stop offset="0" stopColor="#ff3df2" stopOpacity="0.32" />
              <stop offset="0.35" stopColor="#22e4ff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#22e4ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#c-sky)" />
          <rect width="1600" height="900" fill="url(#c-horizon)" />
          <Stars seed={3} count={90} maxY={420} color="#9ff3ff" />
        </Art>
      </Layer>

      <Layer depth={7}>
        <Art align="xMidYMax">
          <defs>
            <linearGradient id="c-holo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#22e4ff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#22e4ff" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <City list={city.far} base={625} fill="#0a1d2c" edge="#22e4ff" win="#5fd8f0" seed={1} />
        </Art>
      </Layer>

      <Layer depth={12}>
        <Art align="xMidYMax">
          <City list={city.mid} base={630} fill="#071521" edge="#22e4ff" win="#9ff3ff" seed={2} />
          <rect x="0" y="600" width="1600" height="40" fill="url(#c-horizon)" opacity="0.6" />
        </Art>
      </Layer>

      <Layer depth={18}>
        <Art align="xMidYMax">
          <rect x="0" y="620" width="1600" height="280" fill="#02070d" />
          <GridFloor />
        </Art>
      </Layer>

      <Layer depth={24}>
        <Art align="xMidYMax">
          <City list={city.near.filter((b) => b.x > 1180 || b.x < 40)} base={900} fill="#040d16" edge="#22e4ff" win="#22e4ff" seed={3} />
        </Art>
      </Layer>

      <Layer depth={30}>
        <Art align="xMaxYMin">
          <HoloChart x={1240} y={120} />
        </Art>
      </Layer>

      {!reducedMotion && (
        <div className="c-streams" aria-hidden>
          {streams.map((s, i) => (
            <span key={i} style={{ left: s.left, animationDuration: s.dur, animationDelay: s.delay }}>{s.text}</span>
          ))}
        </div>
      )}
      <div className="c-sweep" />
      <div className="c-scan" />
      <div className="domain-veil" />
    </div>
  );
}
