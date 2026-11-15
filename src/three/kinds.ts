/** 箱庭造型種類（純型別與對照表，不引入 three，避免把 3D 程式碼打包進首屏） */
import type { ThemeKey } from '../themes/types';

export type BuildingKind = 'tower' | 'altar' | 'pagoda' | 'treehouse' | 'school' | 'hall' | 'library' | 'kiosk' | 'workshop';

export const DEFAULT_BUILDING: Record<ThemeKey, BuildingKind> = {
  brand: 'hall', cyber: 'tower', mythic: 'altar', oriental: 'pagoda', guardian: 'treehouse', campus: 'school', blueprint: 'workshop',
};

export const ACCENT: Record<ThemeKey, string> = {
  brand: '#c8a869', cyber: '#22e4ff', mythic: '#ffc76b', oriental: '#e8c872', guardian: '#ffd35a', campus: '#3563e9', blueprint: '#ffd166',
};
