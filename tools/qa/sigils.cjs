// 所有島同時顯示選取法陣（?sigils），檢查六種風格
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = collect(p);
  await p.goto(BASE + '?sigils'); await p.waitForTimeout(10000);
  await p.screenshot({ path: `${OUT}/sigils.png`, timeout: 180000 });
  console.log('errors', errs.slice(0, 8)); await b.close();
})();
