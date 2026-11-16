// 效能剖析：量測每頁的繪製呼叫、三角面、陰影投射物件、材質/著色器數，並錄 6 秒 CPU profile 列出主執行緒最耗時的函式
// 用法：node tools/qa/probe.cjs [hash，預設大地圖]   加 BUDGET=1 會依效能預算判定 PASS / FAIL（新增作品時使用）
const { launch, collect, BASE } = require('./_launch.cjs');
(async () => {
  const id = process.argv[2] || '';
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = collect(p);
  await p.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
  });
  await p.goto(BASE + (id ? '#/' + id : '')); await p.reload();
  const glKey = id ? '__stageGL' : '__mapGL', sceneKey = id ? '__stageScene' : '__mapScene';
  await p.waitForFunction((k) => window[k], glKey, { timeout: 120000 });
  await p.waitForTimeout(+(process.env.QA_WAIT || 45000));
  const stats = await p.evaluate(async ([gk, sk]) => {
    const gl = window[gk], scene = window[sk];
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    gl.info.autoReset = false; await frame(); gl.info.reset(); await frame();
    const r = { calls: gl.info.render.calls, tris: gl.info.render.triangles, lines: gl.info.render.lines, points: gl.info.render.points };
    gl.info.autoReset = true;
    let meshes = 0, cast = 0, recv = 0, transp = 0, visible = 0; const mats = new Set(), geos = new Set();
    scene.traverse((o) => { if (!o.isMesh && !o.isPoints) return; meshes++; if (o.visible) visible++; if (o.castShadow) cast++; if (o.receiveShadow) recv++;
      const m = o.material; (Array.isArray(m) ? m : [m]).forEach((x) => { mats.add(x); if (x.transparent) transp++; }); geos.add(o.geometry); });
    return { frame: r, programs: gl.info.programs.length, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
      meshes, visible, castShadow: cast, receiveShadow: recv, transparentMeshes: transp, materials: mats.size, uniqueGeometries: geos.size,
      pixelRatio: gl.getPixelRatio(), shadowMap: gl.shadowMap.enabled, shadowAuto: gl.shadowMap.autoUpdate };
  }, [glKey, sceneKey]);
  console.log(JSON.stringify(stats, null, 1));
  const longs = await p.evaluate(() => window.__long);
  if (process.env.BUDGET) {
    // 效能預算（2026-11-16 徹查後的基準：現有作品頁約 70–150 次繪製、15–18 支著色器、載入長任務 < 0.5 秒）
    const longSum = longs.reduce((a, x) => a + x[1], 0);
    const limits = id ? { calls: 160, programs: 20, tris: 60000, longSum: 800 } : { calls: 400, programs: 26, tris: 130000, longSum: 1200 };
    const got = { calls: stats.frame.calls, programs: stats.programs, tris: stats.frame.tris, longSum };
    const bad = Object.keys(limits).filter((k) => got[k] > limits[k]);
    console.log(`BUDGET ${bad.length ? 'FAIL' : 'PASS'} ` + Object.keys(limits).map((k) => `${k}=${got[k]}/${limits[k]}`).join(' '));
  }
  console.log('long tasks during load (start ms, dur ms):', JSON.stringify(longs.filter((x) => x[1] > 100).slice(0, 25)), 'total', longs.length, 'sum', longs.reduce((a, x) => a + x[1], 0));
  // 穩定狀態 CPU profile
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  await p.waitForTimeout(6000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((sid, i) => { const n = byId.get(sid); const f = n.callFrame; const key = `${f.functionName || '(anon)'} ${(f.url || '').split('/').pop()}:${f.lineNumber}`; self.set(key, (self.get(key) || 0) + (dt[i] || 0)); });
  const total = [...self.values()].reduce((a, x) => a + x, 0);
  console.log('CPU 6s profile, top self time:');
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(((v / total) * 100).toFixed(1).padStart(5) + '%  ' + k));
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
  console.log('rAF fps (software renderer, relative only):', fps.toFixed(1));
  console.log('errors', errs.slice(0, 4)); await b.close();
})();
