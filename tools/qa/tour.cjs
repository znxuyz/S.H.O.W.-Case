// 介紹頁空間導覽：全景 → 點第 N 個熱點（鏡頭聚焦＋說明卡）→ 下一個 → Esc 回全景
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || 'hcrs';
  const [w, h] = (process.argv[3] || '1440x900').split('x').map(Number);
  const b = await launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = collect(p);
  await p.goto(BASE + '#/' + id); await p.reload(); await p.waitForTimeout(10000);
  await p.screenshot({ path: `${OUT}/tour-${id}-${w}-0.png`, timeout: 180000 });
  const n = await p.locator('.hs-dot').count();
  console.log('hotspot markers', n);
  if (n) {
    await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').nth(0).click();
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `${OUT}/tour-${id}-${w}-1.png`, timeout: 180000 });
    await p.locator('.tour-strip button:not(.tour-play):not(.tour-home)').nth(Math.min(4, n)).click();
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `${OUT}/tour-${id}-${w}-2.png`, timeout: 180000 });
    console.log('card title:', await p.locator('.tour-card h3').textContent());
    await p.keyboard.press('Escape'); await p.waitForTimeout(3500);
    console.log('card after Esc:', await p.locator('.tour-card').count());
  }
  console.log('errors', errs.slice(0, 8)); await b.close();
})();
