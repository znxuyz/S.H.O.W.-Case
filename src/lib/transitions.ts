import type { TargetAndTransition, Variants } from 'motion/react';
import type { EnterFx } from '../themes/types';

const ease = [0.22, 1, 0.36, 1] as const;

/** AnimatePresence custom：方向、來源與目的場景 */
export interface NavCustom {
  dir: number;
  /** 從大地圖俯衝進來 */
  fromMap: boolean;
  /** 鏡頭焦點（0–1，相對視窗） */
  origin: { originX: number; originY: number };
}

/** Background layer: the incoming theme decides how its world is revealed over the old one. */
export function backgroundVariants(fx: EnterFx, reduced: boolean): Variants {
  const hold = { zIndex: 0, opacity: 0, transition: { opacity: { delay: reduced ? 0.4 : 1.25, duration: 0.01 } } };
  if (reduced) {
    return {
      initial: { opacity: 0, zIndex: 1 },
      animate: { opacity: 1, zIndex: 1, transition: { duration: 0.4 } },
      exit: hold,
    };
  }
  const base = { zIndex: 1 };
  switch (fx) {
    case 'ink':
      return {
        initial: { ...base, clipPath: 'circle(0% at 50% 55%)', filter: 'blur(14px)' },
        animate: { ...base, clipPath: 'circle(145% at 50% 55%)', filter: 'blur(0px)', transition: { duration: 1.2, ease: [0.65, 0, 0.35, 1] } },
        exit: hold,
      };
    case 'glitch':
      return {
        initial: { ...base, clipPath: 'inset(50% 0% 50% 0%)', filter: 'hue-rotate(90deg) brightness(2)' },
        animate: {
          ...base,
          clipPath: ['inset(50% 0% 50% 0%)', 'inset(20% 0% 70% 0%)', 'inset(55% 0% 10% 0%)', 'inset(5% 0% 30% 0%)', 'inset(0% 0% 0% 0%)'],
          filter: ['hue-rotate(90deg) brightness(2)', 'hue-rotate(-40deg) brightness(1.4)', 'hue-rotate(0deg) brightness(1)'],
          transition: { duration: 0.75, ease: 'linear' },
        },
        exit: hold,
      };
    case 'wipe':
      return {
        initial: ({ dir }: NavCustom) => ({ ...base, clipPath: dir > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)' }),
        animate: { ...base, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1, ease: [0.77, 0, 0.18, 1] } },
        exit: hold,
      };
    case 'paper':
      return {
        initial: ({ dir }: NavCustom) => ({ ...base, y: dir > 0 ? '100%' : '-100%', rotate: dir > 0 ? 2 : -2 }),
        animate: { ...base, y: '0%', rotate: 0, transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } },
        exit: hold,
      };
    case 'nebula':
      return {
        initial: { ...base, opacity: 0, scale: 1.25, filter: 'blur(24px) saturate(2)' },
        animate: { ...base, opacity: 1, scale: 1, filter: 'blur(0px) saturate(1)', transition: { duration: 1.3, ease } },
        exit: hold,
      };
    case 'bounce':
      return {
        initial: { ...base, clipPath: 'circle(0% at 50% 100%)' },
        animate: { ...base, clipPath: 'circle(150% at 50% 100%)', transition: { duration: 1.1, ease: [0.34, 1.2, 0.64, 1] } },
        exit: hold,
      };
    default:
      return {
        initial: { ...base, opacity: 0 },
        animate: { ...base, opacity: 1, transition: { duration: 1.1, ease } },
        exit: hold,
      };
  }
}

/** Content layer: leaves quickly, the new content enters after the background reveal has started. */
export function contentVariants(fx: EnterFx, reduced: boolean): Variants {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.35, delay: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.2 } },
    };
  }
  const exit = ({ dir }: NavCustom) => ({
    opacity: 0, y: dir > 0 ? -50 : 50, filter: 'blur(8px)',
    transition: { duration: 0.45, ease: [0.55, 0, 1, 0.45] as const },
  });
  const enter = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)', transition: { duration: 0.9, delay: 0.35, ease } };
  switch (fx) {
    case 'paper':
      return {
        initial: ({ dir }: NavCustom) => ({ opacity: 0, y: dir > 0 ? 120 : -120, rotate: dir > 0 ? 1.5 : -1.5 }),
        animate: { ...enter, transition: { duration: 0.95, delay: 0.3, ease: [0.22, 1.1, 0.36, 1] } },
        exit,
      };
    case 'glitch':
      return { initial: { opacity: 0, x: -30, filter: 'blur(4px)' }, animate: enter, exit };
    case 'nebula':
      return { initial: { opacity: 0, scale: 0.94, filter: 'blur(14px)' }, animate: enter, exit };
    case 'bounce':
      return {
        initial: { opacity: 0, y: 80, scale: 0.96 },
        animate: { ...enter, transition: { type: 'spring', stiffness: 120, damping: 14, delay: 0.35 } },
        exit,
      };
    default:
      return { initial: ({ dir }: NavCustom) => ({ opacity: 0, y: dir > 0 ? 50 : -50, filter: 'blur(10px)' }), animate: enter, exit };
  }
}

/**
 * 作品頁：若是從大地圖俯衝而來，延後登場並從「穿越鏡頭」的放大模糊中浮現。
 */
export function projectVariants(fx: EnterFx, reduced: boolean): Variants {
  const base = contentVariants(fx, reduced);
  if (reduced) return base;
  const resolve = (v: Variants[string], c: NavCustom) =>
    (typeof v === 'function' ? v(c, {}, {}) : v) as TargetAndTransition;
  return {
    ...base,
    initial: (c: NavCustom) =>
      c.fromMap ? { opacity: 0, scale: 1.18, y: 0, filter: 'blur(16px)' } : resolve(base.initial, c),
    animate: (c: NavCustom) => {
      const a = resolve(base.animate, c);
      return c.fromMap
        ? { ...a, scale: 1, transition: { duration: 1.1, delay: 0.85, ease } }
        : a;
    },
  };
}

/**
 * 大地圖：離開時鏡頭朝建築俯衝放大；回來時從該建築的位置縮小退回全景。
 * 注意：這裡刻意不用 filter，濾鏡會讓 3D 沙盤被壓平、平面排序錯亂。
 */
export function mapVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.4 } },
      exit: { opacity: 0, transition: { duration: 0.25 } },
    };
  }
  return {
    initial: ({ origin, dir }: NavCustom) =>
      dir < 0
        ? { ...origin, opacity: 0, scale: 3.6 }
        : { opacity: 0, scale: 0.92 },
    animate: {
      opacity: 1, scale: 1,
      transition: { duration: 1.35, delay: 0.25, ease: [0.16, 1, 0.3, 1] },
    },
    exit: ({ origin }: NavCustom) => ({
      ...origin,
      scale: 5,
      opacity: [1, 1, 0],
      transition: {
        duration: 1.1, ease: [0.55, 0, 0.45, 1], times: [0, 0.72, 1],
        originX: { duration: 0 }, originY: { duration: 0 },
      },
    }),
  };
}
