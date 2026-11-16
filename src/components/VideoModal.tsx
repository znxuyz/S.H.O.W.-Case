import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';

/** YouTube 網址 → 嵌入網址（含自動播放）；其他回傳 null */
function youtubeEmbed(url: string) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` : null;
}

/** 站內相對路徑（例如 videos/lplc.mp4）補上網站根目錄；外部網址原樣回傳 */
const resolve = (u?: string) => (!u ? undefined : /^https?:\/\//.test(u) ? u : `${import.meta.env.BASE_URL}${u}`);

/**
 * 演示影片燈箱：只有開啟時才掛上 <video>／<iframe>，頁面初始載入完全不下載影片。
 * - 站內託管的是 20 秒精華片段（720p、faststart、無音軌）→ 靜音自動循環播放，點開即播
 * - 第一幀出來前（以及中途緩衝時）顯示讀取動畫與下載進度
 * - 角落提供「在新分頁開啟完整影片」（原始長片，含聲音與字幕）
 * - Esc、點背景或關閉鈕都能關；開啟時把焦點移到關閉鈕
 */
export function VideoModal({ url, poster, fullUrl, title, onClose }: { url: string; poster?: string; fullUrl?: string; title: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = resolve(url)!;
  const yt = youtubeEmbed(src);
  const gif = /\.gif($|[?#])/i.test(src);
  const [state, setState] = useState<'loading' | 'playing' | 'buffering' | 'error'>(yt || gif ? 'playing' : 'loading');
  const [pct, setPct] = useState(0);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const progress = () => {
      if (!v.duration || !v.buffered.length) return;
      setPct(Math.min(100, Math.round((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)));
    };
    const playing = () => setState('playing');
    const waiting = () => setState((s) => (s === 'playing' ? 'buffering' : s));
    const error = () => setState('error');
    v.addEventListener('progress', progress);
    v.addEventListener('playing', playing);
    v.addEventListener('waiting', waiting);
    v.addEventListener('error', error);
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    return () => {
      v.removeEventListener('progress', progress);
      v.removeEventListener('playing', playing);
      v.removeEventListener('waiting', waiting);
      v.removeEventListener('error', error);
      v.pause(); v.removeAttribute('src'); v.load();
    };
  }, []);

  const full = resolve(fullUrl);
  const local = !/^https?:\/\//.test(url);
  // 掛到 body 最上層（頁面內容層有自己的堆疊環境，否則會被導覽外框壓住）
  return createPortal(
    <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${title} 演示影片`} onClick={onClose}>
      <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-head">
          <span>{title}<small> · {local ? '20 秒精華' : '演示影片'}</small></span>
          <div className="video-modal-tools">
            {full && (
              <a href={full} target="_blank" rel="noopener noreferrer" className="video-modal-full">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> 在新分頁開啟完整影片
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
            <video ref={videoRef} src={src} poster={resolve(poster)} controls playsInline muted={local} loop={local} autoPlay preload="auto" />
          )}
          {(state === 'loading' || state === 'buffering') && (
            <div className="video-modal-loading" role="status" aria-live="polite">
              <span className="video-spinner" aria-hidden />
              <span>{state === 'loading' ? '影片載入中' : '緩衝中'}{pct > 0 ? ` · ${pct}%` : '…'}</span>
              <span className="video-loading-bar"><i style={{ transform: `scaleX(${Math.max(0.04, pct / 100)})` }} /></span>
            </div>
          )}
          {state === 'error' && (
            <div className="video-modal-loading" role="alert">
              <span>影片暫時無法播放</span>
              {full && <a href={full} target="_blank" rel="noopener noreferrer" className="video-modal-full">改到新分頁觀看完整影片</a>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
