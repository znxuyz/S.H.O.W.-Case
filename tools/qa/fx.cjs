// 點擊熱點專屬動畫：逐一點擊每個熱點，檢查動畫節點是否都找得到（window.__fxLast），並截圖
// 用法：node tools/qa/fx.cjs <作品 id> [熱點索引，預設全部]
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || 'care';
  const only = process.argv[3];
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  await p.goto(BASE + (only !== undefined ? '?fxslow=' + (process.env.FX_SLOW || 20) : '') + '#/' + id); await p.reload();
  await p.waitForFunction(() => window.__stageGL, null, { timeout: 120000 });
  await p.waitForTimeout(+(process.env.QA_WAIT || 30000));
  const n = await p.locator('.tour-strip button').count();
  let missing = 0;
  for (let i = 0; i < n; i++) {
    if (only !== undefined && +only !== i) continue;
    if (await p.locator('.tour-strip button').nth(i).getAttribute('aria-pressed') === null) continue;
    await p.locator('.tour-strip button').nth(i).click();
    await p.waitForFunction((k) => window.__fxLast && window.__fxLast.key >= k, i + 1, { timeout: 60000 }).catch(() => {});
    const last = await p.evaluate(() => window.__fxLast);
    const bad = (last?.found ?? []).filter((x) => x.endsWith(':0'));
    missing += bad.length;
    console.log(i, last ? last.found.join(' ') : 'NO TRIGGER', bad.length ? '  ← 找不到' : '');
    if (only !== undefined) { await p.waitForTimeout(+(process.env.FX_AT || 25000)); await p.screenshot({ path: `${OUT}/fx-${id}-${i}.png`, timeout: 180000 }); }
  }
  console.log('missing nodes', missing, 'errors', errs.slice(0, 6)); await b.close();
})();
