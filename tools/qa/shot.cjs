// node tools/qa/shot.cjs <hash> [寬x高] [zoom]
const { launch, collect, OUT, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || '';
  const [w, h] = (process.argv[3] || '1440x900').split('x').map(Number);
  const zoom = process.argv[4] === 'zoom';
  const b = await launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = collect(p);
  await p.goto(BASE + (id ? '#/' + id : '')); await p.reload(); await p.waitForTimeout(9000);
  await p.screenshot({ path: `${OUT}/${id || 'map'}-${w}.png`, timeout: 180000 });
  if (zoom) {
    await p.mouse.move(w * 0.72, h * 0.58);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -240); await p.waitForTimeout(150); }
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/${id}-${w}-zoom.png`, timeout: 180000 });
  }
  console.log('errors', errs.slice(0, 8)); await b.close();
})();
