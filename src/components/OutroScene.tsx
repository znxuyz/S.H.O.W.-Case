import { useMemo, useState } from 'react';
import { ArrowUp, Check, Copy, Eye, Heart, LayoutGrid } from 'lucide-react';
import type { Project } from '../data/projects';
import { Wordmark } from './Wordmark';
import { GitHubIcon } from './icons';
import { useVisited } from '../lib/footprint';
import { fmtCount, like as sendLike, liked as hasLiked, useCount } from '../lib/counter';
import { play } from '../lib/sound';

/** 創作者名片內容（只放公開資訊；聯絡方式用 GitHub 個人頁，不公開電子郵件） */
const PROFILE = {
  name: 'znxuyz',
  role: '教育現場 × 全端開發 × 3D 互動',
  bio: '把校園裡、生活中遇到的小麻煩，做成真的有人每天在用的工具；也喜歡把作品做成一座座能走進去逛的世界。',
  contact: 'https://github.com/znxuyz',
  contactLabel: 'github.com/znxuyz',
};

export function OutroScene({ projects, onTop, onIndex }: { projects: Project[]; onTop: () => void; onIndex: () => void }) {
  const count = projects.length;
  const [copied, setCopied] = useState(false);
  const likes = useCount('appreciation');
  const views = useCount('site-views');
  const [liked, setLiked] = useState(() => hasLiked('appreciation'));
  const visitedIds = useVisited();
  const seen = useMemo(() => { const ids = new Set(projects.map((p) => p.id)); return visitedIds.filter((id) => ids.has(id)).length; }, [projects, visitedIds]);
  const tech = useMemo(() => {
    const n = new Map<string, number>();
    projects.forEach((p) => p.tech.forEach((t) => n.set(t, (n.get(t) ?? 0) + 1)));
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [projects]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.contact);
    } catch {
      const t = document.createElement('textarea');
      t.value = PROFILE.contact; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* 不支援時至少有連結可點 */ }
      t.remove();
    }
    play('select', 'brand');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const like = () => {
    if (liked) return;
    setLiked(true);
    play('theme', 'brand');
    sendLike('appreciation');
  };

  return (
    <div className="hero outro" data-scroll>
      <p className="hero-eyebrow">Fin.</p>
      <h2 className="outro-title">感謝觀賞</h2>
      <p className="hero-lede">以上是 {count} 件精選作品。<br />新的世界，仍在持續建造中。</p>

      <div className="outro-grid">
        <article className="outro-card" aria-label="創作者名片">
          <div className="outro-card-head">
            <span className="outro-avatar" aria-hidden>Z</span>
            <div>
              <p className="outro-name">{PROFILE.name}</p>
              <p className="outro-role">{PROFILE.role}</p>
            </div>
          </div>
          <p className="outro-bio">{PROFILE.bio}</p>
          <ul className="outro-tags" aria-label="常用技術">{tech.map((t) => <li key={t}>{t}</li>)}</ul>
          <div className="outro-contact">
            <a href={PROFILE.contact} target="_blank" rel="noopener noreferrer"><GitHubIcon /> {PROFILE.contactLabel}</a>
            <button onClick={copy} aria-live="polite" className={copied ? 'is-done' : ''}>
              {copied ? <><Check className="h-3.5 w-3.5" aria-hidden /> 已複製</> : <><Copy className="h-3.5 w-3.5" aria-hidden /> 複製聯絡方式</>}
            </button>
          </div>
        </article>

        <article className="outro-card outro-foot" aria-label="探索足跡">
          <p className="outro-k">你的探索足跡</p>
          <p className="outro-big">{seen}<small> / {count} 座島嶼</small></p>
          <span className="outro-bar" aria-hidden><i style={{ transform: `scaleX(${count ? seen / count : 0})` }} /></span>
          <p className="outro-k mt-5">全站累計讚賞</p>
          <button className={`outro-like ${liked ? 'is-on' : ''}`} onClick={like} disabled={liked} aria-pressed={liked}>
            <Heart className="h-4 w-4" aria-hidden fill={liked ? 'currentColor' : 'none'} />
            <span>{liked ? '已留下足跡' : '留下讚賞'}</span>
            {typeof likes === 'number' && <b>{fmtCount(likes)}</b>}
          </button>
          {typeof views === 'number' && views > 0 && (
            <p className="outro-views"><Eye className="h-3.5 w-3.5" aria-hidden /> 全站累計探索 <b>{fmtCount(views)}</b> 人次</p>
          )}
          <p className="outro-note">{liked ? '謝謝你走過這片群島 ✦' : '逛完群島，按一下讓創作者知道你來過'}</p>
        </article>
      </div>

      <div className="hero-actions">
        <button className="hero-btn" onClick={onIndex}><LayoutGrid className="h-4 w-4" aria-hidden /> 作品目錄</button>
        <button className="hero-btn" onClick={onTop}><ArrowUp className="h-4 w-4" aria-hidden /> 返回大地圖</button>
      </div>
      <Wordmark size="nav" className="mt-10 opacity-70" />
      <p className="mt-4 text-xs tracking-[0.2em] opacity-40">© {new Date().getFullYear()} S.H.O.W. Case</p>
    </div>
  );
}
