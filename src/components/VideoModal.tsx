import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** YouTube 網址 → 嵌入網址（含自動播放）；其他回傳 null */
function youtubeEmbed(url: string) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` : null;
}

/**
 * 演示影片燈箱：只有開啟時才掛上 <video>／<iframe>，所以頁面初始載入完全不會下載影片。
 * - mp4：原生播放器、自動播放（瀏覽器擋有聲自動播放時退回靜音再播）
 * - YouTube：nocookie 嵌入；GIF：直接顯示
 * - Esc、點背景或關閉鈕都能關；開啟時把焦點移到關閉鈕
 */
export function VideoModal({ url, poster, title, onClose }: { url: string; poster?: string; title: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const yt = youtubeEmbed(url);
  const gif = /\.gif($|[?#])/i.test(url);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    return () => { v.pause(); v.removeAttribute('src'); v.load(); };
  }, []);

  // 掛到 body 最上層（頁面內容層有自己的堆疊環境，否則會被導覽外框壓住）
  return createPortal(
    <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${title} 演示影片`} onClick={onClose}>
      <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-head">
          <span>{title}<small> · 演示影片</small></span>
          <button ref={closeRef} onClick={onClose} aria-label="關閉影片"><X className="h-4 w-4" /></button>
        </div>
        <div className="video-modal-frame">
          {yt ? (
            <iframe src={yt} title={`${title} 演示影片`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : gif ? (
            <img src={url} alt={`${title} 操作示意`} />
          ) : (
            <video ref={videoRef} src={url} poster={poster} controls playsInline preload="auto" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
