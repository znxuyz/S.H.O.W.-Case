// 自動導覽：按播放 → 每隔幾秒換下一個熱點（記錄說明卡標題）→ 拖曳畫面 → 應自動暫停
// 用法：node tools/qa/autotour.cjs <作品 id>
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || 'care';
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  await p.goto(BASE + '#/' + id); await p.reload();
  await p.waitForFunction(() => document.querySelector('.hs-layer.is-ready'), null, { timeout: 180000 });
  await p.locator('.tour-play').click();
  const t0 = Date.now(); const seen = [];
  while (Date.now() - t0 < 30000) {
    const title = await p.locator('.tour-card h3').textContent({ timeout: 1000 }).catch(() => null);
    const pl = await p.locator('.tour-play.is-playing').count();
    if (title && seen[seen.length - 1] !== title) {
      seen.push(title);
      await p.waitForTimeout(1500);
      const card = await p.evaluate(() => { const c = document.querySelector('.tour-card'); if (!c) return 'none'; const r = c.getBoundingClientRect(); return `${getComputedStyle(c).visibility} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; });
      console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', title, 'playing=' + pl, 'card=' + card);
    }
    if (!pl && !seen.stopped) { seen.stopped = true; console.log(((Date.now() - t0) / 1000).toFixed(1) + 's stopped'); }
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: `${OUT}/autotour-${id}.png`, timeout: 180000 });
  console.log('playing before drag:', await p.locator('.tour-play.is-playing').count());
  await p.mouse.move(640, 500); await p.mouse.down(); await p.mouse.move(760, 520, { steps: 5 }); await p.mouse.up();
  await p.waitForTimeout(800);
  console.log('playing after drag:', await p.locator('.tour-play.is-playing').count());
  console.log('errors', errs.slice(0, 4)); await b.close();
})();
