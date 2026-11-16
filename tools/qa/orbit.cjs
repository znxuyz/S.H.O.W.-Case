// 環繞遮擋檢查：自動環繞的鏡頭路徑上（桌機與手機直式距離），哪些角度被 3D 環境擋住視線
// 用法：node tools/qa/orbit.cjs [作品 id ...]（預設全部）
const { launch, BASE } = require('./_launch.cjs');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['lplc', 'stockgame', 'tianmu', 'guardian', 'care', 'admin', 'hcrs', 'scheduling', 'passport', 'tablet'];
(async () => {
  const b = await launch();
  let bad = 0;
  for (const id of ids) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto(BASE + '#/' + id); await p.reload();
    await p.waitForFunction(() => document.querySelector('.hs-layer.is-ready'), null, { timeout: 180000 });
    const r = await p.evaluate(() => ({ desk: window.__orbitCheck(1), mobile: window.__orbitCheck(1.75) }));
    const fmt = (a) => (a.length ? a.map((h) => `${h.deg}°`).join(' ') : '無遮擋');
    if (r.desk.length || r.mobile.length) bad++;
    console.log(`${id.padEnd(11)} 桌機：${fmt(r.desk)} ｜ 手機：${fmt(r.mobile)}`);
    await p.close();
  }
  console.log(bad ? `${bad} 個作品有遮擋角度` : '全部作品環繞一圈都沒有被環境擋住');
  await b.close();
})();
