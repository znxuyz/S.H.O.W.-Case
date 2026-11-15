/**
 * 品牌字標：上方大字 S.H.O.W. Case，中間菱形分隔線，下方小字全名（縮寫字母以強調色點亮）。
 * 顏色取自 currentColor 與 --wm-accent，因此能自動融入每個主題。
 */
export function Wordmark({ size = 'hero', className = '' }: { size?: 'hero' | 'nav'; className?: string }) {
  const hero = size === 'hero';
  return (
    <div className={`wordmark ${hero ? 'wordmark-hero' : 'wordmark-nav'} ${className}`} aria-label="S.H.O.W. Case — Selected Hub Of Works" role="img">
      <div className="wm-title" aria-hidden>
        {'S.H.O.W.'.split('').map((c, i) => (
          <span key={i} className={c === '.' ? 'wm-dot' : 'wm-letter'}>{c}</span>
        ))}
        <span className="wm-case">Case</span>
      </div>
      <div className="wm-rule" aria-hidden>
        <span className="wm-rule-line" />
        <span className="wm-diamond" />
        <span className="wm-rule-line" />
      </div>
      <div className="wm-sub" aria-hidden>
        <span><b>S</b>elected</span> <span><b>H</b>ub</span> <span><b>O</b>f</span> <span><b>W</b>orks</span>
      </div>
    </div>
  );
}
