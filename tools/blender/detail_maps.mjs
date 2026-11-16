// 程序化細節貼圖套用（build.sh 在 Blender 匯出後、壓縮前執行）
// 依材質名稱／金屬度分類，替每個不透明材質掛上 bake_details.py 烘焙的共用貼圖：
//   normalTexture（切線空間法線：石材顆粒／木紋／金屬拉絲／灰泥起伏）
//   metallicRoughnessTexture（G＝粗糙度倍率 0.7–1.0，依 glTF 規格乘上材質自身 roughness／metallic）
// 每種貼圖在檔案內只存一份、所有材質共用；透明、發光、玻璃、光束、角色立牌不套用。
// 手機相容：法線貼圖只掛在「每個三角形都有正常 UV」的材質上，並預先計算 MikkTSpace 切線，
// 讓 three.js 使用頂點切線（不走螢幕空間導數推算）——導數法在手機低精度 GPU 上會溢位成彩色雜點。
// 用法：node tools/blender/detail_maps.mjs <輸入.glb> <輸出.glb>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { tangents, unweld } from '@gltf-transform/functions';
import { generateTangents } from 'mikktspace';

const [, , input, output] = process.argv;
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'detail');
const SKIP = /glass|water|beam|lens|glow|light|lamp|neon|spirit|flame|halo|wave|steam|cloud|smoke|scan|laser|holo|firefly|lantern|lit_|sky|sun|moon|star|evolve|wing|ring_bead|core|iris|screen|sigil|ticker|pattern|petal/i;
const WOOD = /wood|bark|desk|bench|plank|stall|shelf|trunk|crate|stamp_handle|basket|easel|post_wood/i;
const STONE = /stone|rock|concrete|brick|gravel|soil|karst|cliff|violet|jade|altar|tier|pedestal|stele|marble|techfloor|ballast|path|moss|plinth|rim|pillar|cradle|mat_dark|frame|ground|lawn|grass|forest_floor/i;
const SCALE = { stone: 1.0, wood: 0.85, metal: 0.6, plaster: 0.55 };

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const cache = new Map();
const tex = (name) => {
  if (!cache.has(name)) cache.set(name, doc.createTexture(name).setMimeType('image/png').setImage(new Uint8Array(fs.readFileSync(path.join(DIR, `${name}.png`)))).setURI(`${name}.png`));
  return cache.get(name);
};
const count = { stone: 0, wood: 0, metal: 0, plaster: 0, skip: 0, roughOnly: 0 };
// 每個材質底下的網格是否都有可用 UV（標牌的側面、未展 UV 的零件都是退化 UV → 不掛法線貼圖）
const uvOk = new Map();
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const mat = prim.getMaterial(); if (!mat) continue;
  const uv = prim.getAttribute('TEXCOORD_0'); const idx = prim.getIndices();
  let ok = !!uv;
  if (ok) {
    const n = idx ? idx.getCount() : uv.getCount(); let bad = 0; const a = [0, 0], b = [0, 0], c = [0, 0];
    for (let i = 0; i < n; i += 3) {
      const i0 = idx ? idx.getScalar(i) : i, i1 = idx ? idx.getScalar(i + 1) : i + 1, i2 = idx ? idx.getScalar(i + 2) : i + 2;
      uv.getElement(i0, a); uv.getElement(i1, b); uv.getElement(i2, c);
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) < 1e-9) bad++;
    }
    ok = bad === 0;
  }
  uvOk.set(mat, (uvOk.get(mat) ?? true) && ok);
}
for (const m of root.listMaterials()) {
  const name = m.getName() || '';
  const emissive = Math.max(...m.getEmissiveFactor()) > 0.05;
  if (m.getAlphaMode() !== 'OPAQUE' || name.startsWith('card_') || SKIP.test(name) || (emissive && !m.getBaseColorTexture())) { count.skip++; continue; }
  const fam = m.getMetallicFactor() >= 0.5 ? 'metal' : WOOD.test(name) ? 'wood' : STONE.test(name) ? 'stone' : 'plaster';
  m.setMetallicRoughnessTexture(tex(`${fam}_rough`));
  if (uvOk.get(m) === false) { count.roughOnly++; continue; }
  m.setNormalTexture(tex(`${fam}_normal`)).setNormalScale(SCALE[fam]);
  count[fam]++;
}
// 有法線貼圖的網格預先計算切線（MikkTSpace）
await doc.transform(unweld(), tangents({ generateTangents, overwrite: true }));   // MikkTSpace 需要先拆開頂點；之後 optimize 會再 weld
await io.write(output, doc);
console.log('detail', path.basename(input), JSON.stringify(count));
