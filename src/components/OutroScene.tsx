import { ArrowUp, LayoutGrid } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { GitHubIcon } from './icons';

export function OutroScene({ count, onTop, onIndex }: { count: number; onTop: () => void; onIndex: () => void }) {
  return (
    <div className="hero outro">
      <p className="hero-eyebrow">Fin.</p>
      <h2 className="outro-title">感謝觀賞</h2>
      <p className="hero-lede">以上是 {count} 件精選作品。<br />新的世界，仍在持續建造中。</p>
      <div className="hero-actions">
        <a className="hero-btn hero-btn-primary" href="https://github.com/znxuyz" target="_blank" rel="noopener noreferrer">
          <GitHubIcon /> GitHub @znxuyz
        </a>
        <button className="hero-btn" onClick={onIndex}><LayoutGrid className="h-4 w-4" aria-hidden /> 作品目錄</button>
        <button className="hero-btn" onClick={onTop}><ArrowUp className="h-4 w-4" aria-hidden /> 回到序章</button>
      </div>
      <Wordmark size="nav" className="mt-14 opacity-70" />
      <p className="mt-4 text-xs tracking-[0.2em] opacity-40">© {new Date().getFullYear()} S.H.O.W. Case</p>
    </div>
  );
}
