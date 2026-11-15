// 共用：以 SwiftShader 啟動能跑 WebGL 的 headless Chromium
const { chromium } = require('playwright');
const path = require('path');
exports.OUT = path.join(__dirname, 'out');
require('fs').mkdirSync(exports.OUT, { recursive: true });
exports.BASE = process.env.QA_BASE || 'http://localhost:4173/S.H.O.W.-Case/';
exports.launch = () => chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
exports.collect = (p) => {
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); });
  return errs;
};
