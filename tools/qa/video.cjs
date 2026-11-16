// 演示影片燈箱：頁面載入期間不得有任何影片請求；按「觀看演示影片」後才建立 <video> 並請求影片；熱點說明卡上的按鈕也能開啟；Esc 關閉
// 用法：node tools/qa/video.cjs <作品 id>
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || 'lplc';
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  const media = [];
  p.on('request', (r) => { if (/\.(mp4|webm|mov)(\?|$)|youtube/.test(r.url()) || r.resourceType() === 'media') media.push(r.url()); });
  await p.goto(BASE + '#/' + id); await p.reload();
  await p.waitForFunction(() => document.querySelector('.hs-layer.is-ready'), null, { timeout: 180000 });
  console.log('video requests during page load:', media.length, '| <video> in DOM:', await p.locator('video').count());
  await p.locator('.sc-btn-video').click();
  await p.waitForSelector('.video-modal video', { timeout: 10000 });
  await p.waitForTimeout(1500);
  console.log('after click: <video> =', await p.locator('.video-modal video').count(), '| requests =', media.length, media[0] ? media[0].slice(0, 90) : '');
  console.log('state after open:', await p.evaluate(() => { const v = document.querySelector('.video-modal video'); return v ? { readyState: v.readyState, paused: v.paused, t: v.currentTime.toFixed(2), src: v.currentSrc.split('/').slice(-2).join('/') } : null; }),
    '| loading overlay:', await p.locator('.video-modal-loading').count(), '| full link:', await p.locator('.video-modal-full').getAttribute('href').catch(() => null));
  await p.screenshot({ path: `${OUT}/video-${id}.png`, timeout: 180000 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  console.log('after Esc: modal =', await p.locator('.video-modal').count());
  // 從熱點說明卡開啟
  const idx = await p.evaluate(() => 0);
  const n = await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').count();
  let opened = false;
  for (let i = 0; i < n && !opened; i++) {
    await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').nth(i).click(); await p.waitForTimeout(600);
    if (await p.locator('.tour-card-video').count()) { await p.locator('.tour-card-video').click(); opened = await p.locator('.video-modal').count() > 0; console.log('hotspot', i + 1, 'card button opens modal:', opened); }
  }
  console.log('errors', errs.filter((e) => !/net::|Failed to load resource/.test(e)).slice(0, 4)); await b.close();
})();
