/**
 * 互動音效（純 Web Audio 合成，零音檔）
 * - 預設靜音；使用者在右上角開啟後才建立 AudioContext（不影響載入，也符合瀏覽器自動播放規則）
 * - 依主題風格合成不同觸感：科技電子音、神話鐘聲、古風撥弦（五聲音階）、森林木琴、校園紙筆、工程機械、序章風鈴
 * - 事件：hover（首頁懸停島嶼）、select（點擊熱點／觸發動畫、篩選）、theme（切換主題領域）、toggle（開關本身）
 * - 每個聲音只建立數個振盪器、在 1.5 秒內自動結束並釋放；懸停有節流
 */
import { useSyncExternalStore } from 'react';
import type { ThemeKey } from '../themes/types';

export type SoundEvent = 'hover' | 'select' | 'theme' | 'toggle';

const KEY = 'show-sound';
let enabled = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const subs = new Set<() => void>();
let lastHover = 0;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const soundEnabled = () => enabled;
export function setSoundEnabled(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 無痕模式 */ }
  if (on) { audio(); play('toggle', 'brand'); }
  subs.forEach((f) => f());
}
export function useSoundEnabled() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => enabled, () => false);
}

/* ───────── 合成積木 ───────── */
interface ToneOpts { type?: OscillatorType; gain?: number; attack?: number; decay?: number; delay?: number; to?: number; glide?: number; filter?: number; detune?: number }
function tone(freq: number, o: ToneOpts = {}) {
  const c = ctx!, t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide ?? 0.15));
  if (o.detune) osc.detune.value = o.detune;
  const peak = o.gain ?? 0.3, a = o.attack ?? 0.004, d = o.decay ?? 0.25;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  let node: AudioNode = osc;
  if (o.filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); node = f; }
  node.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + a + d + 0.05);
}
function noise(o: { gain?: number; decay?: number; delay?: number; band?: number; q?: number } = {}) {
  const c = ctx!, t = c.currentTime + (o.delay ?? 0), d = o.decay ?? 0.05;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * (d + 0.02))), c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.band ?? 2500; f.Q.value = o.q ?? 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f).connect(g).connect(master!);
  src.start(t); src.stop(t + d + 0.02);
}
/** 鐘：基音＋非諧和泛音（2.76×、5.4×）長尾 */
function bell(f: number, gain = 0.22, delay = 0, decay = 1.2) {
  tone(f, { gain, decay, delay });
  tone(f * 2.76, { gain: gain * 0.35, decay: decay * 0.6, delay });
  tone(f * 5.4, { gain: gain * 0.15, decay: decay * 0.35, delay });
}
/** 撥弦：三角波＋起音微滑音＋八度泛音 */
function pluck(f: number, gain = 0.25, delay = 0, decay = 0.9) {
  tone(f * 1.015, { type: 'triangle', gain, decay, delay, to: f, glide: 0.04 });
  tone(f * 2, { gain: gain * 0.25, decay: decay * 0.5, delay });
}
/** 木琴：正弦＋4× 短泛音 */
function wood(f: number, gain = 0.28, delay = 0) {
  tone(f, { gain, decay: 0.35, delay });
  tone(f * 4, { gain: gain * 0.2, decay: 0.06, delay });
}

const PENTA = [293.66, 349.23, 392, 440, 523.25, 587.33]; // D F G A C D（古風五聲）

/** 每種主題 × 事件的音色 */
const VOICES: Record<ThemeKey, Record<SoundEvent, () => void>> = {
  cyber: {
    hover: () => tone(1320, { type: 'square', gain: 0.06, decay: 0.05, filter: 3200 }),
    select: () => { tone(660, { type: 'sawtooth', gain: 0.09, decay: 0.08, filter: 2600 }); tone(990, { type: 'sawtooth', gain: 0.09, decay: 0.12, delay: 0.07, filter: 3000 }); tone(1480, { type: 'square', gain: 0.05, decay: 0.1, delay: 0.14, filter: 4000 }); },
    theme: () => { tone(220, { type: 'sawtooth', gain: 0.1, decay: 0.45, to: 880, glide: 0.35, filter: 2400 }); noise({ gain: 0.06, decay: 0.3, band: 6000, q: 0.7 }); },
    toggle: () => tone(1046, { type: 'square', gain: 0.05, decay: 0.06, filter: 3000 }),
  },
  mythic: {
    hover: () => bell(1174.7, 0.08, 0, 0.6),
    select: () => { bell(587.3, 0.16); bell(880, 0.12, 0.09); },
    theme: () => { bell(293.7, 0.16, 0, 1.6); bell(440, 0.12, 0.12, 1.4); bell(587.3, 0.1, 0.24, 1.2); },
    toggle: () => bell(880, 0.1, 0, 0.7),
  },
  oriental: {
    hover: () => pluck(PENTA[4] * 2, 0.08, 0, 0.5),
    select: () => { pluck(PENTA[3], 0.22); pluck(PENTA[5], 0.16, 0.11); },
    theme: () => { tone(110, { gain: 0.2, decay: 1.5, to: 98, glide: 1.2 }); pluck(PENTA[0], 0.16, 0.05, 1.2); pluck(PENTA[2], 0.14, 0.22); pluck(PENTA[4], 0.12, 0.38); },
    toggle: () => pluck(PENTA[3] * 2, 0.12, 0, 0.6),
  },
  guardian: {
    hover: () => wood(1046.5, 0.08),
    select: () => { wood(523.25, 0.24); wood(784, 0.2, 0.09); },
    theme: () => { wood(392, 0.22); wood(523.25, 0.2, 0.1); wood(659.3, 0.2, 0.2); tone(2093, { gain: 0.04, decay: 0.12, delay: 0.32, to: 2637, glide: 0.08 }); },
    toggle: () => wood(784, 0.16),
  },
  campus: {
    hover: () => noise({ gain: 0.07, decay: 0.03, band: 3800, q: 2 }),
    select: () => { noise({ gain: 0.1, decay: 0.04, band: 2600, q: 1.5 }); tone(1046.5, { gain: 0.14, decay: 0.3, delay: 0.03 }); tone(1568, { gain: 0.08, decay: 0.25, delay: 0.06 }); },
    theme: () => { noise({ gain: 0.08, decay: 0.18, band: 1800, q: 0.6 }); tone(784, { gain: 0.12, decay: 0.3, delay: 0.1 }); tone(1046.5, { gain: 0.1, decay: 0.35, delay: 0.2 }); },
    toggle: () => tone(1046.5, { gain: 0.1, decay: 0.2 }),
  },
  blueprint: {
    hover: () => { tone(140, { type: 'square', gain: 0.05, decay: 0.02, filter: 900 }); noise({ gain: 0.06, decay: 0.02, band: 1500, q: 3 }); },
    select: () => { for (let k = 0; k < 3; k++) noise({ gain: 0.1, decay: 0.025, band: 1200 + k * 300, q: 4, delay: k * 0.05 }); tone(440, { type: 'triangle', gain: 0.1, decay: 0.15, delay: 0.16 }); },
    theme: () => { tone(300, { type: 'triangle', gain: 0.12, decay: 0.5, to: 620, glide: 0.4 }); noise({ gain: 0.05, decay: 0.4, band: 700, q: 0.8 }); },
    toggle: () => noise({ gain: 0.1, decay: 0.03, band: 1400, q: 3 }),
  },
  brand: {
    hover: () => tone(1568, { gain: 0.05, decay: 0.25 }),
    select: () => { tone(880, { gain: 0.12, decay: 0.5 }); tone(1318.5, { gain: 0.08, decay: 0.45, delay: 0.07 }); },
    theme: () => { tone(523.25, { gain: 0.1, decay: 0.9 }); tone(784, { gain: 0.08, decay: 0.9, delay: 0.1 }); tone(1174.7, { gain: 0.06, decay: 0.9, delay: 0.2 }); },
    toggle: () => { tone(880, { gain: 0.1, decay: 0.35 }); tone(1318.5, { gain: 0.07, decay: 0.4, delay: 0.08 }); },
  },
};

/** 播放一個互動音效（未開啟音效時直接略過，零成本） */
export function play(event: SoundEvent, flavor: ThemeKey = 'brand') {
  if (!enabled || typeof window === 'undefined') return;
  if (event === 'hover') {
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
  }
  if (!audio() || !master) return;
  try { VOICES[flavor][event](); } catch { /* 音效失敗不影響操作 */ }
}
