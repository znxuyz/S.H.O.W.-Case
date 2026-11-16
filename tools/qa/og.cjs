// 品牌素材產生器：
//   1. 從首頁 3D 浮空群島渲染社群分享封面（1200×630）→ tools/qa/out/og-raw.png（再由 Python 轉成 webp / jpg）
//   2. 把 public/favicon.svg 輸出成 PNG（apple-touch-icon 180、預覽 64/32/16）
// 用法：node tools/qa/og.cjs  （需先 npx vite preview --port 4173）
const fs = require('fs');
const path = require('path');
const { launch, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const b = await launch();
  if (!process.env.ICONS_ONLY) {
  // 封面：隱藏導覽外框與操作提示，只留品牌字標＋群島
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto(BASE); await p.reload();
  await p.waitForFunction(() => window.__mapGL, null, { timeout: 120000 });
  await p.addStyleTag({ content: '.chrome-top,.chrome-bottom,.dotnav,.map-hint{display:none!important}' });
  await p.waitForTimeout(+(process.env.QA_WAIT || 70000));
  await p.screenshot({ path: path.join(OUT, 'og-raw.png'), timeout: 240000 });
  }
  // 圖示
  const svg = fs.readFileSync(path.join(__dirname, '../../public/favicon.svg'), 'utf8');
  const q = await b.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  for (const s of [180, 64, 32, 16]) {
    await q.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg id="i" width="${s}" height="${s}" `)}</body></html>`);
    await q.locator('#i').screenshot({ path: path.join(OUT, `icon-${s}.png`), omitBackground: true });
  }
  console.log('done'); await b.close();
})();
