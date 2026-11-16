// 程序化細節貼圖套用（build.sh 在 Blender 匯出後、壓縮前執行）
// 依材質名稱／金屬度分類，替每個不透明材質掛上 bake_details.py 烘焙的共用貼圖：
//   normalTexture（切線空間法線：石材顆粒／木紋／金屬拉絲／灰泥起伏）
//   metallicRoughnessTexture（G＝粗糙度倍率 0.7–1.0，依 glTF 規格乘上材質自身 roughness／metallic）
// 每種貼圖在檔案內只存一份、所有材質共用；透明、發光、玻璃、光束、角色立牌不套用。
// 用法：node tools/blender/detail_maps.mjs <輸入.glb> <輸出.glb>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

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
const count = { stone: 0, wood: 0, metal: 0, plaster: 0, skip: 0 };
for (const m of root.listMaterials()) {
  const name = m.getName() || '';
  const emissive = Math.max(...m.getEmissiveFactor()) > 0.05;
  if (m.getAlphaMode() !== 'OPAQUE' || name.startsWith('card_') || SKIP.test(name) || (emissive && !m.getBaseColorTexture())) { count.skip++; continue; }
  const fam = m.getMetallicFactor() >= 0.5 ? 'metal' : WOOD.test(name) ? 'wood' : STONE.test(name) ? 'stone' : 'plaster';
  m.setNormalTexture(tex(`${fam}_normal`)).setNormalScale(SCALE[fam]);
  m.setMetallicRoughnessTexture(tex(`${fam}_rough`));
  count[fam]++;
}
await io.write(output, doc);
console.log('detail', path.basename(input), JSON.stringify(count));
