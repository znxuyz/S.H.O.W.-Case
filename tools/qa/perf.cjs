// 記憶體 / GPU 資源回收測試：大地圖 ↔ 各作品頁來回切換，記錄 JS heap 與 three.js renderer.info
const { launch, collect, BASE } = require('./_launch.cjs');
const ids = (process.argv[2] || 'hcrs,tianmu,lplc,stockgame,care,hcrs,tianmu,lplc').split(',');
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  const cdp = await p.context().newCDPSession(p);
  const sample = async (label) => {
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
    const info = await p.evaluate(() => {
      const out = {};
      for (const k of ['__stageGL', '__mapGL']) { const g = window[k]; if (g && g.info) out[k] = `geo ${g.info.memory.geometries} tex ${g.info.memory.textures} prog ${g.info.programs ? g.info.programs.length : '?'}`; }
      return out;
    });
    console.log(label.padEnd(16), `heap ${heap}MB`, JSON.stringify(info));
  };
  await p.goto(BASE); await p.waitForTimeout(15000); await sample('map');
  for (const id of ids) {
    await p.evaluate((h) => { location.hash = '#/' + h; }, id); await p.waitForTimeout(25000); await sample(id);
    await p.evaluate(() => { location.hash = '#/map'; }); await p.waitForTimeout(12000); await sample('map');
  }
  console.log('errors', errs.slice(0, 6)); await b.close();
})();
