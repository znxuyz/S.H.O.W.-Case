import type { ComponentType, LazyExoticComponent } from 'react';

export type ThemeKey = 'brand' | 'cyber' | 'mythic' | 'oriental' | 'guardian' | 'campus' | 'blueprint';

/** How the scene content enters / leaves. Implemented in components/transitions.ts */
export type EnterFx = 'veil' | 'glitch' | 'nebula' | 'ink' | 'bounce' | 'paper' | 'wipe';

/** How the big title is revealed. Implemented in lib/titleFx.ts */
export type TitleFx = 'rise' | 'scramble' | 'ember' | 'brush' | 'pop' | 'type';

export interface BackgroundProps {
  accent?: string;
  /** false while the layer is fading out — backgrounds may stop animating */
  active: boolean;
  reducedMotion: boolean;
}

export interface ThemeDef {
  key: ThemeKey;
  /** 風格名稱（顯示在導覽與目錄） */
  label: string;
  dark: boolean;
  /** browser chrome color */
  chrome: string;
  enter: EnterFx;
  title: TitleFx;
  Background: LazyExoticComponent<ComponentType<BackgroundProps>>;
}
