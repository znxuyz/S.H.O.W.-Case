# Blender 程序化建模管線

用 Blender 的 Python 版（`bpy`）在背景執行建模腳本，匯出 `.glb` 精細箱庭，取代網站上程式建構的版本。

## 一次性準備

```bash
python3 -m venv .blender-venv
.blender-venv/bin/pip install bpy==5.3.0 numpy pillow
```

（`bpy` 只用在建模，不會打包進網站。）

## 建模與壓縮

```bash
.blender-venv/bin/python tools/blender/build_scheduling.py /tmp/scheduling-raw.glb
npx gltf-transform optimize /tmp/scheduling-raw.glb public/models/scheduling.glb \
  --compress meshopt --texture-compress webp --texture-size 512 --simplify false --join false --flatten false
```

`gltf-transform` 已固定版本列在 devDependencies，`npm ci` 後即可使用。

## 腳本慣例

- 地塊 4×4、頂面 z = 0，與 `src/three/kit.tsx` 的 `Plinth` 一致；Blender 的 -Y 方向 = 網站鏡頭正面。
- 所有零件加倒角並烘焙成實際幾何，世界座標方盒投影 UV，貼圖由 Python 程序化產生。
- 同材質零件合併成一個網格以減少繪製次數。
- 需要在網站上動的部分做成具名節點：`Crane`（旋轉）、`Hook`（上下擺動），見 `src/three/ModelDiorama.tsx`。

## 接上網站

在 `src/data/projects.ts` 該作品加上 `model: 'models/<檔名>.glb'`。載入期間會先顯示程式建構版。
