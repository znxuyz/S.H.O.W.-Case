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

## 設計原則：先分析專案，再決定主角

主角不一定是建築。先找出專案「在做什麼」，再把它變成一個看得懂的場景：
- 《國小排課系統》＝把老師、班級、教室、時段排成零衝突的課表 → **課表排列引擎**：
  立體課表棋盤、正在放積木的龍門機械臂、落入空格的科目積木、連接同一位老師課程的約束線、時鐘與齒輪引擎。
- 背景（`src/three/world.tsx` 的 scenery）也要呼應同一個概念，例如排課系統是「約束空間」。

## 腳本慣例

- 地塊 4×4、頂面 z = 0，與 `src/three/kit.tsx` 的 `Plinth` 一致；Blender 的 -Y 方向 = 網站鏡頭正面。
- 所有零件加倒角並烘焙成實際幾何，世界座標方盒投影 UV，貼圖由 Python 程序化產生。
- 同材質零件合併成一個網格以減少繪製次數。
- 共用工具在 `kit.py`（貼圖、材質、倒角、UV、合併、匯出）。
- 需要在網站上動的部分做成具名節點（`Gear*`、`ClockHand`、`GantryBridge`、`GantryHead`、`Drop_N`、`Spin*`、`Bob*`），動畫規則見 `src/three/ModelDiorama.tsx`。

## 接上網站

在 `src/data/projects.ts` 該作品加上 `model: 'models/<檔名>.glb'`。載入期間會先顯示程式建構版。
