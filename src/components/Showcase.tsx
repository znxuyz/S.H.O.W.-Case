import type { CSSProperties, ReactNode } from 'react';
import type { Project } from '../data/projects';
import { mulberry32 } from '../lib/random';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

/** 網址列顯示用：去掉 https:// 與結尾斜線 */
function shortUrl(u?: string) {
  if (!u) return 'localhost';
  return u.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/* ───────── 預覽外框：內容完整顯示，絕不裁切 ───────── */

/** 瀏覽器視窗外框（淺色 / 深色） */
function BrowserFrame({ url, light, children }: { url: string; light?: boolean; children: ReactNode }) {
  return (
    <div className={`browser ${light ? 'browser-light' : 'browser-dark'}`}>
      <div className="browser-bar">
        <span className="browser-dots"><i /><i /><i /></span>
        <span className="browser-url"><svg viewBox="0 0 16 16" width="10" height="10" aria-hidden><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 0 0-4 0v2Z" fill="currentColor" /></svg>{url}</span>
      </div>
      <div className="browser-view">{children}</div>
    </div>
  );
}

/** 卷軸外框（古典中式）：上下軸桿、裱紙與描金邊 */
function ScrollFrame({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-frame">
      <span className="scroll-rod scroll-rod-top" />
      <div className="scroll-paper"><div className="scroll-inner">{children}</div></div>
      <span className="scroll-rod scroll-rod-bottom" />
    </div>
  );
}

/** 手機外框（直式畫面） */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame">
      <span className="phone-notch" />
      <div className="phone-screen">{children}</div>
    </div>
  );
}

/** 全息投影外框（科技風） */
function HoloFrame({ children }: { children: ReactNode }) {
  return (
    <div className="holo-frame">
      <span className="holo-corner tl" /><span className="holo-corner tr" /><span className="holo-corner bl" /><span className="holo-corner br" />
      {children}
      <span className="holo-base" />
    </div>
  );
}

/** L.P.L.C.：成交額熱力圖示意 */
function Heatmap() {
  const rnd = mulberry32(2330);
  const sectors = ['半導體', '電子零組件', '航運', '金融', 'AI 伺服器', '生技', '鋼鐵', '綠能', '塑化'];
  const cells = sectors.map((name, i) => ({ name, span: i === 0 ? 2 : 1, change: (rnd() - 0.42) * 8 }));
  return (
    <div className="hud-frame">
      <div className="hud-bar"><span>HEATMAP · TWSE</span><span className="hud-live">● LIVE</span></div>
      <div className="grid grid-cols-4 grid-rows-3 gap-1 p-2 sm:gap-1.5">
        {cells.map((c, i) => {
          const up = c.change >= 0;
          const k = Math.min(1, Math.abs(c.change) / 5);
          const style = {
            gridColumn: c.span === 2 ? 'span 2' : undefined,
            gridRow: c.span === 2 ? 'span 2' : undefined,
            background: up ? `rgba(255, 61, 110, ${0.18 + k * 0.55})` : `rgba(0, 230, 160, ${0.15 + k * 0.5})`,
            animationDelay: `${i * 0.35}s`,
          } as CSSProperties;
          return (
            <div key={c.name} className="heat-cell" style={style}>
              <span className="text-[0.7rem] opacity-80 sm:text-xs">{c.name}</span>
              <span className="font-mono text-sm font-semibold sm:text-base">{up ? '+' : ''}{c.change.toFixed(2)}%</span>
            </div>
          );
        })}
      </div>
      <div className="hud-bar hud-ticker"><span className="ticker-track">2330 ▲1.85 · 2454 ▲3.20 · 2603 ▼0.95 · 2881 ▲0.42 · 3231 ▲6.10 · 0050 ▲1.12 · 2317 ▼0.38 · 6669 ▲4.75 · </span></div>
    </div>
  );
}

/** 行政追蹤：四階段節點軌道 */
function Stages() {
  const stages = ['計畫', '核定', '執行', '結案'];
  const plans = [
    { name: '校慶運動會', at: 3, tag: '本週待辦' },
    { name: '數位學習精進方案', at: 2, tag: '公文卡關' },
    { name: '午餐評選會議', at: 1, tag: '逾期 2 天' },
  ];
  return (
    <div className="paper-card space-y-4 p-5 sm:p-6">
      <div className="washi" />
      <div className="flex items-center justify-between text-sm font-semibold"><span>處室總覽</span><span className="opacity-60">115 學年度</span></div>
      {plans.map((p, pi) => (
        <div key={p.name} className="rounded-xl border border-black/5 bg-white/70 p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{p.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${p.tag.startsWith('逾期') ? 'bg-red-100 text-red-700' : 'bg-[color-mix(in_srgb,var(--accent)_15%,white)] text-[var(--accent)]'}`}>{p.tag}</span>
          </div>
          <div className="relative flex items-center justify-between">
            <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 bg-black/10" />
            <div className="stage-fill absolute left-2 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--accent)]" style={{ width: `calc(${(p.at / 3) * 100}% - 1rem)`, animationDelay: `${0.8 + pi * 0.2}s` } as CSSProperties} />
            {stages.map((s, i) => (
              <div key={s} className="relative z-10 flex flex-col items-center gap-1">
                <span className={`h-3 w-3 rounded-full border-2 ${i <= p.at ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-black/20 bg-white'}`} />
                <span className="text-[0.65rem] opacity-60">{s}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** H.C.R.S.：借用月曆 */
function Calendar() {
  const booked: Record<number, string> = { 3: '電腦教室', 8: '視聽教室', 9: '自然教室', 15: '電腦教室', 17: '禮堂', 22: '視聽教室', 24: '電腦教室', 29: '自然教室' };
  return (
    <div className="paper-card p-5 sm:p-6">
      <div className="washi" />
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">借用狀況 · 11 月</span>
        <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-white">＋ 申請借用</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] opacity-60">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - 5;
          const valid = day >= 1 && day <= 30;
          const b = valid ? booked[day] : undefined;
          return (
            <div key={i} className={`cal-cell ${valid ? '' : 'opacity-0'} ${b ? 'cal-booked' : ''} ${day === 17 ? 'cal-today' : ''}`} style={{ animationDelay: `${0.6 + i * 0.02}s` } as CSSProperties}>
              <span>{valid ? day : ''}</span>
              {b && <em className="hidden sm:block">{b}</em>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 排課：課表格逐格填入 */
function Timetable() {
  const subj = ['國語', '數學', '英語', '自然', '社會', '體育', '音樂', '美勞'];
  const rnd = mulberry32(502);
  return (
    <div className="bp-frame">
      <div className="bp-titleblock"><span>DWG · TIMETABLE-502</span><span>REV. 0.9</span></div>
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-px bg-[#cfe3ff]/25 p-px text-center text-[0.7rem] sm:text-xs">
        <span className="bp-head" />
        {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((d) => <span key={d} className="bp-head">{d}</span>)}
        {Array.from({ length: 6 }, (_, r) => (
          <FragmentRow key={r} r={r} cells={Array.from({ length: 5 }, () => subj[Math.floor(rnd() * subj.length)])} />
        ))}
      </div>
      <div className="flex justify-between px-3 py-2 font-mono text-[0.65rem] opacity-80"><span>HARD CONFLICTS: 0</span><span>STATUS: OPTIMAL</span></div>
    </div>
  );
}
function FragmentRow({ r, cells }: { r: number; cells: string[] }) {
  return (
    <>
      <span className="bp-head px-2">{r + 1}</span>
      {cells.map((s, c) => (
        <span key={c} className="bp-cell" style={{ animationDelay: `${0.7 + (r * 5 + c) * 0.045}s` } as CSSProperties}>{s}</span>
      ))}
    </>
  );
}

/** 英語護照：護照本與年級印章 */
function Passport() {
  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  return (
    <div className="passport">
      <div className="passport-cover">
        <span className="text-[0.65rem] tracking-[0.35em] opacity-80">ENGLISH LEARNING</span>
        <span className="font-serif text-3xl font-bold tracking-wider sm:text-4xl">PASSPORT</span>
        <svg viewBox="0 0 64 64" className="my-3 h-14 w-14 opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="32" cy="32" r="26" /><ellipse cx="32" cy="32" rx="12" ry="26" /><path d="M6 32h52M10 18h44M10 46h44" />
        </svg>
        <span className="text-xs opacity-80">英語學習護照</span>
      </div>
      <div className="passport-page">
        {grades.map((g, i) => (
          <span key={g} className="stamp" style={{ ['--r' as string]: `${(i % 2 ? 1 : -1) * (6 + i * 3)}deg`, animationDelay: `${0.9 + i * 0.18}s` } as CSSProperties}>
            <b>{i + 1}</b>{g}
          </span>
        ))}
      </div>
    </div>
  );
}

function Pets({ pets }: { pets: string[] }) {
  return (
    <div className="relative mx-auto grid max-w-md grid-cols-3 gap-2 sm:gap-4">
      {pets.map((p, i) => (
        <div key={p} className="pet" style={{ animationDelay: `${i * 0.4}s` } as CSSProperties}>
          <img src={asset(`media/pet-${p}.webp`)} alt="" loading="lazy" draggable={false} />
        </div>
      ))}
      <span className="sr-only">台灣黑熊、石虎、台灣藍鵲、帝雉、穿山甲、山羌等守護獸</span>
    </div>
  );
}

export function Showcase({ project }: { project: Project }) {
  const s = project.showcase;
  if (!s) return null;
  switch (s.kind) {
    case 'image': {
      const img = <img className="shot" src={asset(s.src)} alt={s.alt} width={s.w} height={s.h} loading="lazy" draggable={false} />;
      const url = shortUrl(project.links.demo ?? project.links.repo);
      if (s.shape === 'tall') return <PhoneFrame>{img}</PhoneFrame>;
      if (project.theme === 'oriental') return <ScrollFrame>{img}</ScrollFrame>;
      return <BrowserFrame url={url} light={project.theme === 'campus'}>{img}</BrowserFrame>;
    }
    case 'pets': return <Pets pets={s.pets} />;
    case 'heatmap': return <HoloFrame><Heatmap /></HoloFrame>;
    case 'stages': return <BrowserFrame light url={shortUrl(project.links.demo)}><Stages /></BrowserFrame>;
    case 'calendar': return <BrowserFrame light url={shortUrl(project.links.demo)}><Calendar /></BrowserFrame>;
    case 'timetable': return <Timetable />;
    case 'passport': return <Passport />;
  }
}
