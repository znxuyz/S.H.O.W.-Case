import { useCallback, useEffect, useRef, useState } from 'react';

const LOCK_MS = 1050;
const WHEEL_THRESHOLD = 40;
const SWIPE_THRESHOLD = 50;

/** true when `el` (or an ancestor marked data-scroll) can still scroll in direction `dir` */
function canScroll(target: EventTarget | null, dir: 1 | -1) {
  let el = target instanceof Element ? target.closest<HTMLElement>('[data-scroll]') : null;
  if (!el || el.scrollHeight <= el.clientHeight + 2) return false;
  return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2;
}

/**
 * Full-screen scene navigation: wheel, keyboard, touch swipe and URL hash (#/id).
 * Each scene is one "page"; transitions are locked for LOCK_MS so one gesture = one step.
 */
export function useSceneNav(ids: string[], { enabled }: { enabled: boolean }) {
  const fromHash = () => {
    const id = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
    const i = ids.indexOf(id);
    return i >= 0 ? i : 0;
  };
  const [index, setIndex] = useState(fromHash);
  const [dir, setDir] = useState<1 | -1>(1);
  const lockedUntil = useRef(0);
  const indexRef = useRef(index);
  indexRef.current = index;

  const go = useCallback(
    (next: number, force = false) => {
      const cur = indexRef.current;
      const clamped = Math.max(0, Math.min(ids.length - 1, next));
      if (clamped === cur) return;
      const now = performance.now();
      if (!force && now < lockedUntil.current) return;
      lockedUntil.current = now + LOCK_MS;
      setDir(clamped > cur ? 1 : -1);
      setIndex(clamped);
      const hash = clamped === 0 ? ' ' : `#/${ids[clamped]}`;
      history.replaceState(null, '', hash === ' ' ? window.location.pathname + window.location.search : hash);
    },
    [ids],
  );

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  useEffect(() => {
    if (!enabled) return;
    let acc = 0;
    let accTimer = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const sign = (d > 0 ? 1 : -1) as 1 | -1;
      if (canScroll(e.target, sign)) return;
      e.preventDefault();
      acc += d;
      window.clearTimeout(accTimer);
      accTimer = window.setTimeout(() => (acc = 0), 180);
      if (Math.abs(acc) > WHEEL_THRESHOLD) {
        acc = 0;
        if (sign > 0) next();
        else prev();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      switch (e.key) {
        case 'ArrowDown': case 'PageDown': case 'j':
          e.preventDefault(); next(); break;
        case 'ArrowUp': case 'PageUp': case 'k':
          e.preventDefault(); prev(); break;
        case ' ':
          if (t.closest('button, a')) return;
          e.preventDefault(); if (e.shiftKey) prev(); else next(); break;
        case 'Home': e.preventDefault(); go(0, true); break;
        case 'End': e.preventDefault(); go(ids.length - 1, true); break;
      }
    };
    let sx = 0, sy = 0, st = 0, startTarget: EventTarget | null = null;
    const onTouchStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = performance.now(); startTarget = e.target;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (performance.now() - st > 800 || Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      const sign = (dy < 0 ? 1 : -1) as 1 | -1;
      if (canScroll(startTarget, sign)) return;
      if (sign > 0) next(); else prev();
    };
    const onHash = () => go(fromHash(), true);

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('hashchange', onHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, go, next, prev, ids]);

  return { index, dir, go, next, prev };
}
