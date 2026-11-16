import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Volume2, X } from 'lucide-react';

/** YouTube 網址 → 嵌入網址（含自動播放）；其他回傳 null */
function youtubeEmbed(url: string) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` : null;
}

/** 站內相對路徑（例如 videos/lplc-full.mp4）補上網站根目錄；外部網址原樣回傳 */
const resolve = (u?: string) => (!u ? undefined : /^https?:\/\//.test(u) ? u : `${import.meta.env.BASE_URL}${u}`);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Mode = 'full' | 'highlight';

/**
 * 演示影片燈箱：只有開啟時才掛上 <video>／<iframe>，頁面初始載入完全不下載影片。
 * - 預設播「完整介紹」（本站託管、720p、有聲、faststart：下載幾百 KB 就開始播，其餘邊播邊載），可切換「20 秒精華」
 * - 第一幀出來前（以及中途緩衝時）顯示讀取動畫與已緩衝進度
 * - 瀏覽器擋下有聲自動播放時改為靜音播放，並顯示「開啟聲音」按鈕
 * - 角落提供原始檔連結（最高畫質）；Esc、點背景或關閉鈕都能關
 */
export function VideoModal({ url, highlightUrl, poster, originalUrl, title, onClose }: {
  url: string; highlightUrl?: string; poster?: string; originalUrl?: string; title: string; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('full');
  const src = resolve(mode === 'highlight' && highlightUrl ? highlightUrl : url)!;
  const yt = youtubeEmbed(src);
  const gif = /\.gif($|[?#])/i.test(src);
  const [state, setState] = useState<'loading' | 'playing' | 'buffering' | 'error'>('loading');
  const [pct, setPct] = useState(0);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // 每次切換影片來源：重設狀態、接上事件、嘗試有聲播放（精華片段本身無聲、循環）
  useEffect(() => {
    const v = videoRef.current;
    if (!v) { setState('playing'); return; }
    setState('loading'); setPct(0); setDuration(0);
    const progress = () => {
      if (!v.duration || !v.buffered.length) return;
      setPct(Math.min(100, Math.round((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)));
    };
    const meta = () => setDuration(v.duration || 0);
    const playing = () => setState('playing');
    const waiting = () => setState((s) => (s === 'playing' ? 'buffering' : s));
    const error = () => setState('error');
    v.addEventListener('progress', progress);
    v.addEventListener('loadedmetadata', meta);
    v.addEventListener('playing', playing);
    v.addEventListener('waiting', waiting);
    v.addEventListener('error', error);
    v.muted = mode === 'highlight';
    v.play().then(() => setMuted(v.muted)).catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); });
    return () => {
      v.removeEventListener('progress', progress);
      v.removeEventListener('loadedmetadata', meta);
      v.removeEventListener('playing', playing);
      v.removeEventListener('waiting', waiting);
      v.removeEventListener('error', error);
      v.pause();
    };
  }, [src, mode]);

  useEffect(() => () => { const v = videoRef.current; if (v) { v.removeAttribute('src'); v.load(); } }, []);

  const unmute = () => { const v = videoRef.current; if (v) { v.muted = false; setMuted(false); v.play().catch(() => {}); } };
  const original = resolve(originalUrl);

  // 掛到 body 最上層（頁面內容層有自己的堆疊環境，否則會被導覽外框壓住）
  return createPortal(
    <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${title} 演示影片`} onClick={onClose}>
      <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-head">
          <span className="video-modal-title">{title}</span>
          {highlightUrl && (
            <div className="video-modal-tabs" role="tablist" aria-label="影片版本">
              <button role="tab" aria-selected={mode === 'full'} className={mode === 'full' ? 'is-on' : ''} onClick={() => setMode('full')}>
                完整介紹{mode === 'full' && duration ? ` · ${fmt(duration)}` : ''}
              </button>
              <button role="tab" aria-selected={mode === 'highlight'} className={mode === 'highlight' ? 'is-on' : ''} onClick={() => setMode('highlight')}>20 秒精華</button>
            </div>
          )}
          <div className="video-modal-tools">
            {original && (
              <a href={original} target="_blank" rel="noopener noreferrer" className="video-modal-full" title="在新分頁開啟原始檔（最高畫質）">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> 原始畫質
              </a>
            )}
            <button ref={closeRef} onClick={onClose} aria-label="關閉影片"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="video-modal-frame">
          {yt ? (
            <iframe src={yt} title={`${title} 演示影片`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : gif ? (
            <img src={src} alt={`${title} 操作示意`} />
          ) : (
            <video key={src} ref={videoRef} src={src} poster={resolve(poster)} controls playsInline loop={mode === 'highlight'} preload="auto" />
          )}
          {(state === 'loading' || state === 'buffering') && !yt && !gif && (
            <div className="video-modal-loading" role="status" aria-live="polite">
              <span className="video-spinner" aria-hidden />
              <span>{state === 'loading' ? '影片載入中' : '緩衝中'}{pct > 0 ? ` · ${pct}%` : '…'}</span>
              <span className="video-loading-bar"><i style={{ transform: `scaleX(${Math.max(0.04, pct / 100)})` }} /></span>
            </div>
          )}
          {state === 'error' && (
            <div className="video-modal-loading" role="alert">
              <span>影片暫時無法播放</span>
              {original && <a href={original} target="_blank" rel="noopener noreferrer" className="video-modal-full">改到新分頁觀看原始影片</a>}
            </div>
          )}
          {muted && mode === 'full' && state === 'playing' && (
            <button className="video-unmute" onClick={unmute}><Volume2 className="h-4 w-4" aria-hidden /> 開啟聲音</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
