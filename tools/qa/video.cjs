// 演示影片燈箱：頁面載入期間不得有任何影片請求；按「觀看演示影片」後量測完整介紹開始播放所需時間、
// 下載量（faststart 應只需檔頭一小段即可開播）；切換「20 秒精華」；熱點說明卡按鈕可開啟；Esc 關閉
// 用法：node tools/qa/video.cjs <作品 id>
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || 'lplc';
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  const media = []; let bytes = 0;
  p.on('request', (r) => { if (/\.(mp4|webm|mov)(\?|$)|youtube/.test(r.url()) || r.resourceType() === 'media') media.push(r.url()); });
  p.on('response', async (r) => { if (/\.mp4/.test(r.url())) { const cl = +(r.headers()['content-length'] || 0); bytes += cl; } });
  await p.goto(BASE + '#/' + id); await p.reload();
  await p.waitForFunction(() => document.querySelector('.hs-layer.is-ready'), null, { timeout: 180000 });
  console.log('video requests during page load:', media.length);
  const t0 = Date.now();
  await p.locator('.sc-btn-video').click();
  await p.waitForFunction(() => { const v = document.querySelector('.video-modal video'); return v && !v.paused && v.currentTime > 0.05; }, null, { timeout: 60000 });
  console.log(`full: playing after ${Date.now() - t0}ms | src=${await p.evaluate(() => document.querySelector('.video-modal video').currentSrc.split('/').pop())} | duration=${await p.evaluate(() => Math.round(document.querySelector('.video-modal video').duration))}s | muted=${await p.evaluate(() => document.querySelector('.video-modal video').muted)} | bytes so far≈${Math.round(bytes / 1024)}KB`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/video-${id}.png`, timeout: 180000 });
  await p.locator('.video-modal-tabs button').nth(1).click();
  await p.waitForFunction(() => { const v = document.querySelector('.video-modal video'); return v && /\/[a-z]+\.mp4$/.test(v.currentSrc) && !v.paused && v.currentTime > 0.05; }, null, { timeout: 60000 });
  console.log('highlight tab: playing', await p.evaluate(() => document.querySelector('.video-modal video').currentSrc.split('/').pop()));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  console.log('after Esc: modal =', await p.locator('.video-modal').count());
  const n = await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').count();
  for (let i = 0; i < n; i++) {
    await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').nth(i).click(); await p.waitForTimeout(600);
    if (await p.locator('.tour-card-video').count()) { await p.locator('.tour-card-video').click(); console.log('hotspot', i + 1, 'card button opens modal:', await p.locator('.video-modal').count() > 0); break; }
  }
  console.log('errors', errs.filter((e) => !/net::|Failed to load resource/.test(e)).slice(0, 4)); await b.close();
})();
