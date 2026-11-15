/**
 * 多圖層等距微縮建築。每座建築都是一張「直立看板」SVG：
 * 地面中心點 = SVG 座標 (0, 0)，建築以受光頂面／左側面／背光右側面三種明暗堆疊而成。
 */
import { useId, type ReactNode } from 'react';
import { at, Box, FaceWindows, GableRoof, HipRoof, pts, RingArc, tone } from './iso';

export type BuildingKind = 'tower' | 'altar' | 'pagoda' | 'treehouse' | 'school' | 'hall' | 'library' | 'kiosk' | 'workshop';

export const SPRITE = { W: 170, TOP: 205, BOTTOM: 52 };

function Sprite({ children, id }: { children: ReactNode; id: string }) {
  const { W, TOP, BOTTOM } = SPRITE;
  return (
    <svg className={`bld-svg bld-${id}`} width={W} height={TOP + BOTTOM} viewBox={`${-W / 2} ${-TOP} ${W} ${TOP + BOTTOM}`} overflow="visible" aria-hidden>
      {children}
    </svg>
  );
}

/** 未來科技：發光全息高塔 */
function Tower() {
  const glass = '#0c1f30';
  const lines = [];
  for (let z = 22; z <= 122; z += 10) {
    lines.push(<polyline key={`l${z}`} points={pts([[-18, 18, z], [18, 18, z]])} />);
    lines.push(<polyline key={`r${z}`} points={pts([[18, -18, z], [18, 18, z]])} />);
  }
  const tip = at(0, 0, 178);
  const beamTop = at(0, 0, 205);
  const beamBase = at(0, 0, 140);
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <Sprite id="tower">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#22e4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22e4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Box x={-44} y={-44} z={0} w={88} h={8} d={88} color="#10263a" stroke="#22e4ff55" />
      <polygon className="glow-pulse" fill="none" stroke="#22e4ff" strokeWidth={1} points={pts([[-36, -36, 8], [36, -36, 8], [36, 36, 8], [-36, 36, 8]])} />
      <RingArc r={44} z={70} half="back" className="holo-ring" stroke="#22e4ff" strokeWidth={1.2} strokeDasharray="4 6" />
      <RingArc r={34} z={104} half="back" className="holo-ring rev" stroke="#ff3df2" strokeWidth={1} strokeDasharray="2 5" />
      <Box x={-38} y={6} z={8} w={26} d={26} h={30} color="#0d2233" stroke="#22e4ff33" />
      <Box x={8} y={-38} z={8} w={22} d={22} h={46} color="#0d2233" stroke="#22e4ff33" />
      <Box x={-18} y={-18} z={8} w={36} d={36} h={122} color={glass} faces={{ top: '#1d4a66', left: '#0f2a40', right: '#081622' }} />
      <g stroke="#22e4ff" strokeWidth={0.8} opacity={0.55} className="window-flicker">{lines}</g>
      <polyline points={pts([[18, 18, 8], [18, 18, 130]])} stroke="#9ff7ff" strokeWidth={1.6} />
      <polyline points={pts([[-18, 18, 8], [-18, 18, 130]])} stroke="#22e4ff" strokeWidth={0.8} opacity={0.7} />
      <Box x={-12} y={-12} z={130} w={24} d={24} h={10} color="#123a55" stroke="#22e4ff88" />
      <polygon fill={`url(#${gid})`} points={`${beamBase.x - 10},${beamBase.y} ${beamBase.x + 10},${beamBase.y} ${beamTop.x + 3},${beamTop.y} ${beamTop.x - 3},${beamTop.y}`} className="glow-pulse" />
      <polyline points={pts([[0, 0, 140], [0, 0, 178]])} stroke="#9ff7ff" strokeWidth={1.4} />
      <circle cx={tip.x} cy={tip.y} r={3.4} fill="#ff3df2" className="beacon" />
      <RingArc r={44} z={70} half="front" className="holo-ring" stroke="#22e4ff" strokeWidth={1.4} strokeDasharray="4 6" />
      <RingArc r={34} z={104} half="front" className="holo-ring rev" stroke="#ff3df2" strokeWidth={1.2} strokeDasharray="2 5" />
    </Sprite>
  );
}

/** 神話神獸：懸浮祭壇、靈晶與光環 */
function Altar() {
  const A = at(16, 0, 100), B = at(0, 16, 100), C = at(-16, 0, 100), T = at(0, 0, 132), Bo = at(0, 0, 76);
  const p = (...v: { x: number; y: number }[]) => v.map((q) => `${q.x},${q.y}`).join(' ');
  const glow = at(0, 0, 30);
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <Sprite id="altar">
      <defs>
        <radialGradient id={gid}>
          <stop offset="0" stopColor="#ffc76b" stopOpacity="0.9" />
          <stop offset="1" stopColor="#b98cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Box x={-46} y={-46} z={0} w={92} d={92} h={10} color="#3a2152" />
      <Box x={-36} y={-36} z={10} w={72} d={72} h={10} color="#4b2a6a" />
      <Box x={-25} y={-25} z={20} w={50} d={50} h={10} color="#5e3786" />
      <polygon fill="none" stroke="#ffc76b" strokeWidth={0.9} points={pts([[-46, -46, 10], [46, -46, 10], [46, 46, 10], [-46, 46, 10]])} />
      <polygon fill="none" stroke="#ffc76b" strokeWidth={0.9} points={pts([[-25, -25, 30], [25, -25, 30], [25, 25, 30], [-25, 25, 30]])} />
      {[[-34, -34], [28, -34], [-34, 28]].map(([x, y]) => (
        <Box key={`${x}${y}`} x={x} y={y} z={20} w={6} d={6} h={34} color="#6b44a0" />
      ))}
      <ellipse cx={glow.x} cy={glow.y} rx={40} ry={22} fill={`url(#${gid})`} className="glow-pulse" />
      <RingArc r={34} z={100} half="back" className="holo-ring" stroke="#ffc76b" strokeWidth={1.4} strokeDasharray="10 4 2 4" />
      <g className="float-bob">
        <polygon fill="#bff3ff" points={p(T, C, B)} />
        <polygon fill="#7fd8ff" points={p(T, B, A)} />
        <polygon fill="#a26bff" points={p(Bo, C, B)} />
        <polygon fill="#6a3fd0" points={p(Bo, B, A)} />
        <polyline fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.8} points={p(C, T, A)} />
      </g>
      {[28, 26, 36, 14].map((r, i) => (
        <Box key={i} x={Math.cos(i * 1.7) * r - 3} y={Math.sin(i * 1.7) * r - 3} z={60 + i * 9} w={6} d={6} h={6} color="#ffc76b" />
      ))}
      <Box x={-30} y={-30} z={54} w={6} d={6} h={6} color="#ff8ab3" />
      <Box x={6} y={26} z={78} w={5} d={5} h={5} color="#ffc76b" />
      <Box x={-40} y={0} z={66} w={7} d={7} h={7} color="#ffc76b" />
      <RingArc r={34} z={100} half="front" className="holo-ring" stroke="#ffc76b" strokeWidth={1.6} strokeDasharray="10 4 2 4" />
      <RingArc r={48} z={18} half="front" stroke="#b98cff" strokeWidth={1} opacity={0.6} />
    </Sprite>
  );
}

/** 古典中式：飛簷重樓與燈籠 */
function Pagoda() {
  const lantern = (x: number, y: number, z: number, k: number) => {
    const a = at(x, y, z);
    return (
      <g key={k} className="lantern" style={{ animationDelay: `${k * 0.6}s` }}>
        <line x1={a.x} y1={a.y} x2={a.x} y2={a.y + 7} stroke="#e8c872" strokeWidth={0.6} />
        <ellipse cx={a.x} cy={a.y + 12} rx={4} ry={5.5} fill="#e0442f" />
        <ellipse cx={a.x} cy={a.y + 12} rx={9} ry={9} fill="#ff7a3d" opacity={0.25} />
        <line x1={a.x - 2.5} y1={a.y + 7} x2={a.x + 2.5} y2={a.y + 7} stroke="#e8c872" strokeWidth={1} />
      </g>
    );
  };
  const spire = at(0, 0, 150);
  return (
    <Sprite id="pagoda">
      <Box x={-46} y={-46} z={0} w={92} d={92} h={6} color="#3b3128" />
      <Box x={-40} y={-40} z={6} w={80} d={80} h={4} color="#4a3d31" />
      <Box x={-28} y={-28} z={10} w={56} d={56} h={26} color="#7a2418" faces={{ top: '#5a1a12', left: '#8e2a1c', right: '#561810' }} />
      <FaceWindows face="left" x0={-24} x1={24} fixed={28} z0={14} z1={32} cols={3} rows={1} color="#e8c87266" />
      <FaceWindows face="right" y0={-24} y1={24} fixed={28} z0={14} z1={32} cols={3} rows={1} color="#e8c87244" />
      <HipRoof s={44} z={36} h={14} color="#2c332f" edge="#e8c872" ridge={0.45} flare={7} />
      <Box x={-20} y={-20} z={50} w={40} d={40} h={20} color="#7a2418" faces={{ top: '#5a1a12', left: '#8e2a1c', right: '#561810' }} />
      <FaceWindows face="left" x0={-16} x1={16} fixed={20} z0={53} z1={67} cols={2} rows={1} color="#ffd98a88" />
      <HipRoof s={34} z={70} h={12} color="#2c332f" edge="#e8c872" ridge={0.42} flare={6} />
      <Box x={-13} y={-13} z={82} w={26} d={26} h={16} color="#7a2418" faces={{ top: '#5a1a12', left: '#8e2a1c', right: '#561810' }} />
      <HipRoof s={25} z={98} h={22} color="#2c332f" edge="#e8c872" ridge={0.06} flare={5} />
      <line x1={spire.x} y1={spire.y + 30} x2={spire.x} y2={spire.y} stroke="#e8c872" strokeWidth={1.6} />
      {[0, 8, 16].map((o) => <circle key={o} cx={spire.x} cy={spire.y + 10 + o} r={2.4 - o * 0.06} fill="#e8c872" />)}
      {lantern(44, 44, 36, 0)}
      {lantern(-44, 44, 36, 1)}
      {lantern(44, -44, 36, 2)}
      {lantern(34, 34, 70, 3)}
    </Sprite>
  );
}

/** 守護獸森林：巨木樹屋與螢火 */
function Treehouse() {
  const c = (x: number, y: number, z: number, r: number, fill: string, k: string) => {
    const q = at(x, y, z);
    return <circle key={k} cx={q.x} cy={q.y} r={r} fill={fill} />;
  };
  const flies = [[-40, 10, 70], [30, -30, 120], [40, 30, 60], [-20, -40, 140], [10, 40, 100]];
  return (
    <Sprite id="treehouse">
      <ellipse cx={0} cy={4} rx={58} ry={30} fill="#1f6b45" />
      <ellipse cx={0} cy={2} rx={46} ry={22} fill="#2f8f5b" />
      {c(-20, -24, 110, 30, '#1b5e3d', 'b1')}
      {c(24, -18, 118, 28, '#1f6b45', 'b2')}
      {c(0, -30, 140, 26, '#1b5e3d', 'b3')}
      <Box x={-7} y={-7} z={0} w={14} d={14} h={86} color="#6b4423" />
      <polygon fill="#5a3a1e" points={pts([[-7, 7, 0], [-18, 16, 0], [-7, 7, 14]])} />
      <polygon fill="#4a2f17" points={pts([[7, -7, 0], [18, -16, 0], [7, -7, 14]])} />
      <Box x={-26} y={-4} z={52} w={36} d={30} h={4} color="#8a5a2e" />
      <Box x={-22} y={-2} z={56} w={28} d={24} h={18} color="#d39a5a" />
      <FaceWindows face="left" x0={-18} x1={2} fixed={22} z0={60} z1={70} cols={2} rows={1} color="#fff3b0" />
      <GableRoof x0={-24} x1={8} d={14} z={74} h={11} color="#e0544b" wall="#d39a5a" />
      {c(-30, 10, 108, 24, '#2f8f5b', 'f1')}
      {c(28, 18, 102, 22, '#3fb36f', 'f2')}
      {c(4, 4, 132, 26, '#3fb36f', 'f3')}
      {c(-8, 22, 118, 16, '#5fd08a', 'f4')}
      {c(20, -6, 140, 14, '#5fd08a', 'f5')}
      {flies.map(([x, y, z], i) => {
        const q = at(x, y, z);
        return <circle key={i} cx={q.x} cy={q.y} r={2} fill="#eaff9a" className="firefly" style={{ animationDelay: `${i * 0.7}s` }} />;
      })}
    </Sprite>
  );
}

/** 校園：鐘樓學校 */
function School({ accent }: { accent: string }) {
  const wall = '#f4efe6';
  const clock = at(0, 9, 64);
  const flag0 = at(0, 0, 100);
  return (
    <Sprite id="school">
      <Box x={-50} y={-34} z={0} w={100} d={68} h={4} color="#d9d0bd" />
      <Box x={-42} y={-22} z={4} w={84} d={44} h={34} color={wall} />
      <FaceWindows face="left" x0={-40} x1={40} fixed={22} z0={8} z1={36} cols={6} rows={2} color="#86acd6" />
      <FaceWindows face="right" y0={-20} y1={20} fixed={42} z0={8} z1={36} cols={3} rows={2} color="#6f93bb" />
      <GableRoof x0={-44} x1={44} d={25} z={38} h={14} color={accent} wall={wall} />
      <Box x={-9} y={-9} z={46} w={18} d={18} h={26} color={wall} />
      <circle cx={clock.x} cy={clock.y} r={5} fill="#fff" stroke={tone(accent, -0.3)} strokeWidth={1.2} />
      <path d={`M${clock.x},${clock.y} v-3.5 M${clock.x},${clock.y} h2.5`} stroke="#1f2430" strokeWidth={0.8} />
      <HipRoof s={12} z={72} h={14} color={accent} ridge={0.02} />
      <line x1={flag0.x} y1={flag0.y + 14} x2={flag0.x} y2={flag0.y - 8} stroke="#8a8f99" strokeWidth={1} />
      <path className="flag" d={`M${flag0.x},${flag0.y - 8} q8,2 14,-1 v8 q-7,3 -14,1z`} fill={accent} />
    </Sprite>
  );
}

/** 校園：列柱行政大樓 */
function Hall({ accent }: { accent: string }) {
  const wall = '#efe8dc';
  return (
    <Sprite id="hall">
      <Box x={-50} y={-38} z={0} w={100} d={76} h={4} color="#d4cab6" />
      <Box x={-46} y={-34} z={4} w={92} d={68} h={4} color="#e0d7c4" />
      <Box x={-38} y={-26} z={8} w={76} d={46} h={52} color={wall} />
      <FaceWindows face="right" y0={-24} y1={18} fixed={38} z0={14} z1={56} cols={3} rows={3} color="#86acd6" />
      <FaceWindows face="left" x0={-36} x1={36} fixed={20} z0={34} z1={56} cols={5} rows={1} color="#86acd6" />
      {[-34, -20, -6, 8, 22].map((x) => (
        <Box key={x} x={x} y={24} z={8} w={6} d={6} h={26} color="#fbf8f2" />
      ))}
      <polygon fill={tone(accent, 0.1)} points={pts([[-38, 30, 34], [34, 30, 34], [-2, 30, 46]])} />
      <Box x={-42} y={-30} z={60} w={84} d={60} h={5} color={tone(accent, -0.1)} />
      <Box x={-12} y={-12} z={65} w={24} d={24} h={12} color={wall} />
      <HipRoof s={15} z={77} h={9} color={accent} ridge={0.02} />
    </Sprite>
  );
}

/** 校園：圓頂圖書館 */
function Library({ accent }: { accent: string }) {
  const wall = '#f1ebe0';
  const c = at(0, 0, 36);
  const rx = 28 * 1.2247;
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <Sprite id="library">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" stopColor={tone(accent, 0.35)} />
          <stop offset="0.55" stopColor={accent} />
          <stop offset="1" stopColor={tone(accent, -0.4)} />
        </linearGradient>
      </defs>
      <Box x={-44} y={-44} z={0} w={88} d={88} h={4} color="#d9d0bd" />
      <Box x={-34} y={-34} z={4} w={68} d={68} h={30} color={wall} />
      <FaceWindows face="left" x0={-32} x1={32} fixed={34} z0={8} z1={30} cols={4} rows={1} color="#86acd6" />
      <FaceWindows face="right" y0={-32} y1={32} fixed={34} z0={8} z1={30} cols={4} rows={1} color="#6f93bb" />
      <Box x={-36} y={-36} z={34} w={72} d={72} h={3} color={tone(wall, -0.08)} />
      <path d={`M${c.x - rx},${c.y} A${rx},${rx * 0.95} 0 0 1 ${c.x + rx},${c.y} A${rx},${28 * 0.7071} 0 0 1 ${c.x - rx},${c.y}z`} fill={`url(#${gid})`} />
      <path d={`M${c.x - rx * 0.35},${c.y - rx * 0.9} A${rx},${rx} 0 0 0 ${c.x - rx * 0.7},${c.y - 4}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={2} fill="none" />
      <Box x={-4} y={-4} z={68} w={8} d={8} h={10} color={wall} />
      <HipRoof s={6} z={78} h={6} color={accent} ridge={0.02} />
    </Sprite>
  );
}

/** 校園：旅行護照郵亭（地球儀） */
function Kiosk({ accent }: { accent: string }) {
  const wall = '#fff7ec';
  const g = at(26, -24, 62);
  return (
    <Sprite id="kiosk">
      <Box x={-40} y={-40} z={0} w={80} d={80} h={4} color="#d9d0bd" />
      <Box x={-28} y={-20} z={4} w={44} d={44} h={28} color={wall} />
      <FaceWindows face="left" x0={-24} x1={12} fixed={24} z0={8} z1={26} cols={2} rows={1} color="#86acd6" />
      <polygon fill={tone(accent, 0.15)} points={pts([[-30, 26, 26], [18, 26, 26], [18, 34, 22], [-30, 34, 22]])} />
      <HipRoof s={26} z={32} h={18} color={accent} ridge={0.05} />
      <line x1={g.x} y1={g.y} x2={at(26, -24, 4).x} y2={at(26, -24, 4).y} stroke="#8a8f99" strokeWidth={1.6} />
      <g className="globe-spin" style={{ transformOrigin: `${g.x}px ${g.y - 13}px` }}>
        <circle cx={g.x} cy={g.y - 13} r={13} fill={tone(accent, 0.55)} stroke={accent} strokeWidth={1.4} />
        <ellipse cx={g.x} cy={g.y - 13} rx={6} ry={13} fill="none" stroke={accent} strokeWidth={1} />
        <line x1={g.x - 13} y1={g.y - 13} x2={g.x + 13} y2={g.y - 13} stroke={accent} strokeWidth={1} />
      </g>
    </Sprite>
  );
}

/** 工程藍圖：施工中的線框建築與塔吊 */
function Workshop() {
  const line = '#cfe3ff';
  const mast = (z: number) => at(30, -34, z);
  return (
    <Sprite id="workshop">
      <Box x={-46} y={-40} z={0} w={92} d={80} h={4} color="#123c72" stroke="#cfe3ff55" />
      <Box x={-34} y={-26} z={4} w={60} d={52} h={22} color="#1a4f8f" stroke={line} />
      <Box x={-34} y={-26} z={26} w={60} d={52} h={44} color="#cfe3ff" opacity={0.08} stroke={line} strokeWidth={0.8} />
      <g stroke={line} strokeWidth={0.6} strokeDasharray="3 3" opacity={0.8}>
        <polyline fill="none" points={pts([[-34, 26, 48], [26, 26, 48], [26, -26, 48]])} />
        <polyline fill="none" points={pts([[-4, 26, 26], [-4, 26, 70]])} />
        <polyline fill="none" points={pts([[26, 0, 26], [26, 0, 70]])} />
      </g>
      <g stroke="#ffd166" strokeWidth={1.6} fill="none">
        <polyline points={`${mast(0).x},${mast(0).y} ${mast(130).x},${mast(130).y}`} />
        <polyline points={pts([[-46, -34, 126], [44, -34, 126]])} />
        <polyline strokeWidth={0.8} points={`${mast(130).x},${mast(130).y} ${at(-30, -34, 126).x},${at(-30, -34, 126).y}`} />
        <polyline strokeWidth={0.8} points={`${mast(130).x},${mast(130).y} ${at(44, -34, 126).x},${at(44, -34, 126).y}`} />
      </g>
      <g className="crane-hook">
        <line x1={at(-24, -34, 126).x} y1={at(-24, -34, 126).y} x2={at(-24, -34, 86).x} y2={at(-24, -34, 86).y} stroke="#ffd166" strokeWidth={0.7} />
        <Box x={-30} y={-40} z={78} w={12} d={12} h={8} color="#ffd166" />
      </g>
      <Box x={38} y={-38} z={120} w={10} d={8} h={8} color="#ffd166" />
    </Sprite>
  );
}

export function Building({ kind, accent }: { kind: BuildingKind; accent: string }) {
  switch (kind) {
    case 'tower': return <Tower />;
    case 'altar': return <Altar />;
    case 'pagoda': return <Pagoda />;
    case 'treehouse': return <Treehouse />;
    case 'school': return <School accent={accent} />;
    case 'hall': return <Hall accent={accent} />;
    case 'library': return <Library accent={accent} />;
    case 'kiosk': return <Kiosk accent={accent} />;
    case 'workshop': return <Workshop />;
  }
}

/* ───────── 地景小物（直立看板） ───────── */
export type PropKind = 'pine' | 'tree' | 'spire' | 'crystal' | 'lantern' | 'lamp' | 'rock' | 'bush';

export function Prop({ kind }: { kind: PropKind }) {
  let body: ReactNode;
  switch (kind) {
    case 'pine':
      body = (
        <g>
          <rect x={-1.5} y={-8} width={3} height={8} fill="#4a3220" />
          <polygon points="0,-40 -11,-12 11,-12" fill="#1f5a3c" />
          <polygon points="0,-40 0,-12 11,-12" fill="#174a31" />
          <polygon points="0,-30 -13,-6 13,-6" fill="#2a6e4a" />
          <polygon points="0,-30 0,-6 13,-6" fill="#1f5a3c" />
        </g>
      );
      break;
    case 'tree':
      body = (
        <g>
          <rect x={-2} y={-12} width={4} height={12} fill="#6b4423" />
          <circle cx={0} cy={-22} r={13} fill="#3fae6a" />
          <circle cx={5} cy={-18} r={9} fill="#2f8f5b" />
          <circle cx={-4} cy={-27} r={6} fill="#6fd492" />
        </g>
      );
      break;
    case 'bush':
      body = (
        <g>
          <ellipse cx={0} cy={-5} rx={10} ry={6} fill="#7fb35f" />
          <ellipse cx={3} cy={-4} rx={6} ry={4} fill="#5f9a46" />
        </g>
      );
      break;
    case 'spire':
      body = (
        <g className="glow-pulse">
          <polygon points="0,-44 -4,0 0,3 4,0" fill="#0f2a40" stroke="#22e4ff" strokeWidth={0.8} />
          <line x1={0} y1={-44} x2={0} y2={3} stroke="#9ff7ff" strokeWidth={0.8} />
          <circle cx={0} cy={-46} r={2} fill="#22e4ff" />
        </g>
      );
      break;
    case 'crystal':
      body = (
        <g className="glow-pulse">
          <polygon points="0,-30 -7,-8 0,0 7,-8" fill="#9f7aff" />
          <polygon points="0,-30 0,0 7,-8" fill="#6a3fd0" />
          <polygon points="9,-18 5,-6 9,-2 13,-6" fill="#7fd8ff" />
        </g>
      );
      break;
    case 'lantern':
      body = (
        <g>
          <rect x={-1} y={-30} width={2} height={30} fill="#3b3128" />
          <rect x={-6} y={-38} width={12} height={10} rx={2} fill="#e0442f" className="lantern-glow" />
          <rect x={-7} y={-40} width={14} height={2.5} fill="#e8c872" />
          <circle cx={0} cy={-33} r={12} fill="#ff7a3d" opacity={0.2} />
        </g>
      );
      break;
    case 'lamp':
      body = (
        <g>
          <rect x={-1} y={-30} width={2} height={30} fill="#5c6270" />
          <circle cx={0} cy={-32} r={3.5} fill="#fff4c2" />
          <circle cx={0} cy={-32} r={9} fill="#ffe28a" opacity={0.3} />
        </g>
      );
      break;
    case 'rock':
      body = <polygon points="-10,0 -7,-8 1,-12 9,-6 11,0" fill="#6b625a" />;
      break;
  }
  return (
    <svg className="prop-svg" width={36} height={58} viewBox="-18 -52 36 58" overflow="visible" aria-hidden>
      {body}
    </svg>
  );
}
