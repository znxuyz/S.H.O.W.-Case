export interface NavItem { id: string; label: string; group?: string }

/** 側邊懸浮導覽圓點：目前項目拉長為膠囊，滑過顯示名稱 */
export function DotNav({ items, index, onGo }: { items: NavItem[]; index: number; onGo: (i: number) => void }) {
  return (
    <nav className="dotnav" aria-label="作品導覽">
      <ol>
        {items.map((it, i) => {
          const groupStart = i > 0 && it.group && it.group !== items[i - 1].group;
          return (
            <li key={it.id} className={groupStart ? 'dotnav-gap' : undefined}>
              <button
                onClick={() => onGo(i)}
                className={`dotnav-dot ${i === index ? 'is-active' : ''}`}
                aria-label={it.label}
                aria-current={i === index ? 'true' : undefined}
              >
                <span className="dotnav-label">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
