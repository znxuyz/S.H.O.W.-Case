/**
 * 雲端計數（免註冊、免金鑰的公開計數端點）
 * - 主要：abacus.jasoncameron.dev；連不上時本次造訪自動改用備援 countapi.mileshilliard.com
 *   （兩者皆以 GitHub Actions 實測可連線且允許跨網域；原本的 api.counterapi.dev v1 已停用，回傳 410）
 * - 計數名稱空間 znxuyz-show-case；只送出計數名稱，不含任何個人資料
 *     site-views        全站總瀏覽（每次造訪 sessionStorage 只計一次）
 *     island-<id>       單島探索次數（同一次造訪每座島只計一次）
 *     like-<id>         單島 ❤ 喜歡（localStorage：同一瀏覽器每島只能按一次）
 *     appreciation      終章「全站讚賞」
 * - 容錯：所有請求延後到頁面閒置才送（不和 3D 載入搶頻寬）、5 秒逾時、失敗一律回傳 null，
 *   UI 收到 null 就隱藏數字標籤；不丟例外、不影響任何場景
 */
import { useEffect, useSyncExternalStore } from 'react';

const NS = 'znxuyz-show-case';

interface Provider { name: string; get: (k: string) => string; up: (k: string) => string; read: (j: unknown) => number | null }
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const PROVIDERS: Provider[] = [
  {
    name: 'abacus',
    get: (k) => `https://abacus.jasoncameron.dev/get/${NS}/${k}`,
    up: (k) => `https://abacus.jasoncameron.dev/hit/${NS}/${k}`,
    read: (j) => num((j as { value?: unknown })?.value),
  },
  {
    name: 'countapi-mileshilliard',
    get: (k) => `https://countapi.mileshilliard.com/api/v1/get/${NS}-${k}`,
    up: (k) => `https://countapi.mileshilliard.com/api/v1/hit/${NS}-${k}`,
    read: (j) => num((j as { value?: unknown })?.value),
  },
];

const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* 無痕模式 */ } },
};
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 無痕模式 */ } },
};

/** 本次造訪改用第幾個端點（主端點失敗後記在 sessionStorage，不再反覆嘗試） */
let pi = Number(ss.get('show-counter-p2') ?? 0) || 0;

/** 頁面閒置後才發送（首屏與 3D 預熱優先） */
let idle: Promise<void> | null = null;
function whenIdle() {
  if (!idle) {
    idle = new Promise((res) => {
      const go = () => {
        const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
        if (ric) ric(() => res(), { timeout: 3000 }); else setTimeout(res, 800);
      };
      if (document.readyState === 'complete') setTimeout(go, 1500);
      else window.addEventListener('load', () => setTimeout(go, 1500), { once: true });
    });
  }
  return idle;
}

async function request(kind: 'get' | 'up', key: string): Promise<number | null> {
  await whenIdle();
  while (pi < PROVIDERS.length) {
    const used = pi;
    const p = PROVIDERS[used];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(kind === 'get' ? p.get(key) : p.up(key), { signal: ctl.signal, cache: 'no-store' });
      if (kind === 'get' && (r.status === 404 || r.status === 400)) return 0; // 尚未建立的計數
      if (r.ok) {
        const v = p.read(await r.json().catch(() => null));
        if (v !== null) return v;
      } else if (r.status === 429) {
        return null; // 太頻繁：這次先不顯示，不換端點
      }
    } catch {
      /* 網路／CORS／逾時：換下一個端點 */
    } finally {
      clearTimeout(timer);
    }
    // 同時失敗的多個請求只往下換一次端點
    if (pi === used) { pi += 1; ss.set('show-counter-p2', String(pi)); }
  }
  return null;
}

/* ───────── 響應式快取：undefined 載入中、null 無法連線（隱藏）、數字 ───────── */
const values = new Map<string, number | null>();
const pending = new Map<string, Promise<number | null>>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
function settle(key: string, job: Promise<number | null>) {
  pending.set(key, job);
  job.then((v) => { if (pending.get(key) === job) { values.set(key, v); pending.delete(key); emit(); } });
  return job;
}

/** 讀取（同一個 key 只送一次） */
export function load(key: string) {
  if (values.has(key) || pending.has(key)) return;
  settle(key, request('get', key));
}

/** 本次造訪第一次看到 → +1，其後只讀取 */
const visited = new Set<string>();
export function visit(key: string) {
  if (visited.has(key)) return;
  visited.add(key);
  const flag = `show-seen-${key}`;
  if (ss.get(flag)) { load(key); return; }
  // 若其他元件已先送出「讀取」，等它回來再 +1（不能因為已有請求就略過計數）；
  // 成功送達才記下「本次造訪已計」，失敗的話重新整理還會再試
  const prev = pending.get(key) ?? Promise.resolve(null);
  settle(key, prev.then(() => request('up', key)).then((v) => { if (v !== null) ss.set(flag, '1'); return v; }));
}

export const liked = (key: string) => ls.get(`show-liked-${key}`) === '1' || (key === 'appreciation' && ls.get('show-liked') === '1');

/** ❤：每個瀏覽器每個 key 只能一次；先樂觀 +1，回應後校正 */
export async function like(key: string) {
  if (liked(key)) return values.get(key) ?? null;
  ls.set(`show-liked-${key}`, '1');
  const cur = values.get(key);
  if (typeof cur === 'number') { values.set(key, cur + 1); emit(); }
  const v = await request('up', key);
  if (v !== null) values.set(key, v);
  else {
    // 沒送出去：撤回樂觀 +1 與按讚紀錄，下次造訪可以再按
    try { localStorage.removeItem(`show-liked-${key}`); } catch { /* 無痕模式 */ }
    values.set(key, typeof cur === 'number' ? cur : null);
  }
  emit();
  return v;
}

export function useCount(key: string | null, mode: 'load' | 'visit' = 'load') {
  useEffect(() => { if (key) (mode === 'visit' ? visit : load)(key); }, [key, mode]);
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => (key ? values.get(key) : undefined),
    () => undefined,
  );
}

/** 數字格式：1,234 */
export const fmtCount = (n: number) => n.toLocaleString('zh-TW');
