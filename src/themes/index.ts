/**
 * 主題註冊表 —— 新增風格：
 *   1. 在 src/styles/themes.css 加上 [data-theme='<名稱>'] 的配色、字體與元件樣式
 *   2. 在下方註冊，並把 ThemeKey 加入 types.ts
 *   （背景由各作品的 3D 環境提供；轉場與標題動畫見 lib/transitions.ts、lib/titleFx.ts）
 */
import type { ThemeDef, ThemeKey } from './types';

export const themes: Record<ThemeKey, ThemeDef> = {
  brand: {
    key: 'brand', label: '序章', dark: true, chrome: '#0b0a09', enter: 'veil', title: 'rise',
  },
  cyber: {
    key: 'cyber', label: '未來科技', dark: true, chrome: '#03060d', enter: 'glitch', title: 'scramble',
  },
  mythic: {
    key: 'mythic', label: '神話神獸', dark: true, chrome: '#0d0718', enter: 'nebula', title: 'ember',
  },
  oriental: {
    key: 'oriental', label: '古典中式', dark: true, chrome: '#0c0a08', enter: 'ink', title: 'brush',
  },
  guardian: {
    key: 'guardian', label: '守護獸森林', dark: true, chrome: '#06201c', enter: 'bounce', title: 'pop',
  },
  campus: {
    key: 'campus', label: '校園文具', dark: false, chrome: '#f6f2ea', enter: 'paper', title: 'rise',
  },
  blueprint: {
    key: 'blueprint', label: '工程藍圖', dark: true, chrome: '#0b2a55', enter: 'wipe', title: 'type',
  },
};

export type { ThemeDef, ThemeKey } from './types';
