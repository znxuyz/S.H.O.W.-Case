/**
 * 個人探索護照（純前端）：localStorage 記錄訪客走訪過哪些島嶼（只存作品 id），
 * 首頁角落、目錄與終章顯示「已探索 x / N 座領域」，首頁已逛過的島上方有小星標。
 */
import { useSyncExternalStore } from 'react';

const KEY = 'show-visited';
const subs = new Set<() => void>();

function read(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
let cache = read();

export const visited = () => cache;
export function markVisited(id: string) {
  if (cache.includes(id)) return;
  cache = [...cache, id];
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 無痕模式：只記在本次 */ }
  subs.forEach((f) => f());
}
export function useVisited() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cache, () => cache);
}
