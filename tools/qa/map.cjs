// 首頁群島：初始、懸停（選取法陣）、拖曳島嶼、點擊進入
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = collect(p);
  await p.goto(BASE); await p.waitForTimeout(9000);
  await p.screenshot({ path: `${OUT}/map.png`, timeout: 180000 });
  const cursor = () => p.evaluate(() => document.querySelector('.map-canvas > div')?.style.cursor);
  const hits = [];
  for (let y = 330; y < 760; y += 70) for (let x = 200; x < 1300; x += 90) {
    await p.mouse.move(x, y); await p.waitForTimeout(25);
    if ((await cursor()) === 'grab') hits.push([x, y]);
    if (hits.length > 3) break;
  }
  console.log('hover hits', hits.length);
  if (hits.length) {
    const [hx, hy] = hits[0];
    await p.mouse.move(hx, hy); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/map-hover.png`, timeout: 180000 });
    await p.mouse.down(); for (let k = 1; k <= 12; k++) { await p.mouse.move(hx + k * 18, hy + k * 6); await p.waitForTimeout(30); }
    await p.mouse.up(); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/map-dragged.png`, timeout: 180000 });
    console.log('url after drag (should stay on map):', p.url());
    await p.mouse.move(hx + 216, hy + 72); await p.waitForTimeout(800);
    const again = []; for (let y = 200; y < 820 && !again.length; y += 45) for (let x = 120; x < 1380 && !again.length; x += 55) { await p.mouse.move(x, y); await p.waitForTimeout(25); if ((await cursor()) === 'grab') again.push([x, y]); }
    if (again.length) { await p.mouse.click(again[0][0], again[0][1]); await p.waitForTimeout(3500); console.log('url after click:', p.url()); }
  }
  console.log('errors', errs.slice(0, 8)); await b.close();
})();
