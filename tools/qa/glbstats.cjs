// 模型預算統計：三角面、檔案大小、壓縮方式、貼圖數（node tools/qa/glbstats.cjs [id ...]）
const fs = require('fs');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['lplc', 'stockgame', 'tianmu', 'guardian', 'care', 'admin', 'hcrs', 'scheduling', 'passport', 'tablet'];
function stat(f) {
  const b = fs.readFileSync(f); const n = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + n).toString());
  let t = 0; for (const m of j.meshes || []) for (const p of m.primitives) { const a = j.accessors[p.indices ?? p.attributes.POSITION]; t += a.count / 3; }
  const comp = (j.extensionsUsed || []).filter((e) => /draco|meshopt/i.test(e)).join(',') || 'none';
  return { tris: Math.round(t), kb: Math.round(b.length / 1024), comp, imgs: (j.images || []).length };
}
let bad = 0;
for (const id of ids) {
  const m = stat(`public/models/${id}.glb`), e = stat(`public/models/env_${id}.glb`), l = stat(`public/models/map/${id}.glb`);
  const flags = [m.tris > 15000 && 'main>15k', m.kb > 1536 && 'main>1.5MB', e.kb > 1536 && 'env>1.5MB', l.kb > 200 && 'map>200KB', !/draco/i.test(m.comp + e.comp + l.comp) && 'no-draco'].filter(Boolean);
  if (flags.length) bad++;
  console.log(`${id.padEnd(11)} main ${String(m.tris).padStart(6)} tris ${String(m.kb).padStart(4)}KB ${m.comp} img${m.imgs} | env ${String(e.tris).padStart(6)} tris ${String(e.kb).padStart(4)}KB ${e.comp} | map ${String(l.kb).padStart(4)}KB ${l.comp}  ${flags.join(' ') || 'OK'}`);
}
console.log(bad ? `${bad} 個作品未達預算` : '全部符合預算（主模型 ≤15k 三角面、≤1.5MB；環境 ≤1.5MB；首頁版 ≤200KB；Draco）');
