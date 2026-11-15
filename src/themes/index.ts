/**
 * 主題註冊表 —— 新增風格：
 *   1. 在 src/themes/<名稱>/ 建立 Background.tsx
 *   2. 在 src/styles/themes.css 加上 [data-theme='<名稱>'] 的配色、字體與元件樣式
 *   3. 在下方註冊，並把 ThemeKey 加入 types.ts
 */
import { lazy } from 'react';
import type { ThemeDef, ThemeKey } from './types';

export const themes: Record<ThemeKey, ThemeDef> = {
  brand: {
    key: 'brand', label: '序章', dark: true, chrome: '#0b0a09', enter: 'veil', title: 'rise',
    Background: lazy(() => import('./brand/Background')),
  },
  cyber: {
    key: 'cyber', label: '未來科技', dark: true, chrome: '#03060d', enter: 'glitch', title: 'scramble',
    Background: lazy(() => import('./cyber/Background')),
  },
  mythic: {
    key: 'mythic', label: '神話神獸', dark: true, chrome: '#0d0718', enter: 'nebula', title: 'ember',
    Background: lazy(() => import('./mythic/Background')),
  },
  oriental: {
    key: 'oriental', label: '古典中式', dark: true, chrome: '#0c0a08', enter: 'ink', title: 'brush',
    Background: lazy(() => import('./oriental/Background')),
  },
  guardian: {
    key: 'guardian', label: '守護獸森林', dark: true, chrome: '#06201c', enter: 'bounce', title: 'pop',
    Background: lazy(() => import('./guardian/Background')),
  },
  campus: {
    key: 'campus', label: '校園文具', dark: false, chrome: '#f6f2ea', enter: 'paper', title: 'rise',
    Background: lazy(() => import('./campus/Background')),
  },
  blueprint: {
    key: 'blueprint', label: '工程藍圖', dark: true, chrome: '#0b2a55', enter: 'wipe', title: 'type',
    Background: lazy(() => import('./blueprint/Background')),
  },
};

export type { ThemeDef, ThemeKey } from './types';
