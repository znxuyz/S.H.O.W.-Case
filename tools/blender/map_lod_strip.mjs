// 首頁輕量版前處理：首頁不需要點擊動畫，所以
//   1. 刪除 FxHide_*（平常隱藏的零件，首頁永遠不會顯示）
//   2. 把 Fx_* 節點的子網格併回上一層（保留世界座標），讓它們能與同材質網格合併
//   3. 刪除微縮小道具 Props_*（首頁島嶼很小看不出來，省下額外材質的繪製呼叫與檔案）
//   4. 同一層、同材質的網格合併成一個（大幅減少首頁的繪製呼叫）
// 用法：node tools/blender/map_lod_strip.mjs <輸入.glb> <輸出.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { join, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

/** 4×4 欄主序矩陣相乘 a·b */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

const [, , input, output] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
const parentOf = new Map();
const walk = (n, p) => { parentOf.set(n, p); n.listChildren().forEach((c) => walk(c, n)); };
scene.listChildren().forEach((n) => walk(n, null));

let removed = 0, lifted = 0;
for (const node of [...parentOf.keys()]) {
  if (node.getName().startsWith('FxHide') || node.getName().startsWith('Props')) {
    const kill = (n) => { n.listChildren().forEach(kill); n.dispose(); };
    kill(node); removed++;
  }
}
for (const node of [...parentOf.keys()]) {
  if (node.isDisposed?.() || !/^Fx_/.test(node.getName())) continue;
  const parent = parentOf.get(node);
  const m = node.getMatrix();
  for (const child of node.listChildren()) {
    const out = mul(m, child.getMatrix());
    node.removeChild(child);
    child.setMatrix(out);
    if (parent) parent.addChild(child); else scene.addChild(child);
    lifted++;
  }
  node.dispose();
}
// 首頁小島不需要法線／粗糙度細節貼圖（省檔案與著色器成本）
for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); }
await doc.transform(join({ keepNamed: false }), prune());
await io.write(output, doc);
console.log(`strip ${input.split('/').pop()}: removed ${removed} hidden, lifted ${lifted} fx parts`);
