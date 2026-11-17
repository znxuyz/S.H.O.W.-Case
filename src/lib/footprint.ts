/**
 * 探索足跡
 * - 本機：記錄訪客走訪過哪些島嶼（localStorage，只存作品 id）
 * - 全站：累計「讚賞」次數，使用免費、免金鑰、支援 CORS 的計數服務 Abacus（只送出固定的計數名稱，不含任何個人資料）
 *   服務連不上時安靜降級為只顯示本機狀態；每位訪客（同一瀏覽器）只會累計一次
 */
const VISITED = 'show-visited';
const LIKED = 'show-liked';
const COUNTER = 'https://abacus.jasoncameron.dev';
const NS = 'znxuyz-show-case';
const KEY = 'appreciation';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 無痕模式 */ } };

export function visited(): string[] {
  try { return JSON.parse(read(VISITED) ?? '[]') as string[]; } catch { return []; }
}
export function markVisited(id: string) {
  const v = visited();
  if (!v.includes(id)) write(VISITED, JSON.stringify([...v, id]));
}

export const hasLiked = () => read(LIKED) === '1';

async function call(path: string): Promise<number | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(`${COUNTER}/${path}/${NS}/${KEY}`, { signal: ctl.signal });
    if (r.status === 404) return 0; // 尚未有人讚賞
    if (!r.ok) return null;
    const j = (await r.json()) as { value?: number };
    return typeof j.value === 'number' ? j.value : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 讀取全站累計讚賞（失敗回傳 null） */
export const getAppreciation = () => call('get');

/** 送出一次讚賞（同一瀏覽器只計一次），回傳最新總數 */
export async function appreciate(): Promise<number | null> {
  if (hasLiked()) return getAppreciation();
  write(LIKED, '1');
  return call('hit');
}
