# S.H.O.W. Case — 專案備忘

## Git / 部署規則（使用者指定）
- 完成的修改**直接推送到 `main`**，不需要另外開 PR 或等待確認。
- 推送到 `main` 後，GitHub Actions（`.github/workflows/deploy.yml`）會自動建置並部署到 GitHub Pages：
  https://znxuyz.github.io/S.H.O.W.-Case/
- 推送前先跑 `npm run build` 確認可以建置成功。

## 專案結構
- 作品清單：`src/data/projects.ts`
- 主題（背景、配色、字體）：`src/themes/`、`src/styles/themes.css`
- 3D（Three.js + @react-three/fiber + drei）：`src/three/`
  - `Diorama.tsx`：島嶼主模型（只載入 .glb，Suspense fallback 為 null，不再有程序化替代模型）；`assets.ts`：模型路徑與 `useGLTF.preload` 預載
  - `world.tsx`：天空/霧/柔光/粒子/環境反射/後製（地形與遠景由 `env_<id>.glb` 提供）
  - `MapWorld.tsx`：首頁漂浮群島（拖曳、慣性）；`cosmos.tsx`：星雲背景；`sigils.tsx`：各風格選取法陣
  - `DomainStage.tsx`：介紹頁全螢幕 3D 舞台；`Hotspots.tsx`：熱點投影、鏡頭聚焦；`ModelDiorama.tsx`：載入 .glb、依節點名稱驅動動畫、離開時釋放資源
  - R3F `<Canvas>` 一律加 `resize={{ offsetSize: true }}`：轉場會對外層做 CSS scale，用 getBoundingClientRect 量測會讓畫布尺寸錯誤而黑屏
- 精細模型：`public/models/<id>.glb`（`build_<id>.py`）、3D 環境 `env_<id>.glb`（`build_env_<id>.py`）、首頁輕量版 `models/map/<id>.glb`（`build_map_lod.sh`）；在 `projects.ts` 以 `model` / `env` 指定
- 建模：`BLENDER_PY=.blender-venv/bin/python tools/blender/build.sh <名稱>`；改了主模型後記得重跑 `build_map_lod.sh <id>`
- 點擊動畫：熱點的 `fx` 指定模型節點與「結構動作」（hinge/slide/stretch/flap/whirl/reveal/sweep/stamp/press/pulse/flash，定義見 `projects.ts` 的 FxKind；軸向為網站座標）；不要用整塊發光＋跳動的通用動畫，每個物件拆出子網格各自動
- Blender 端：`group='Fx_<名稱>'` 收集零件後 `kit.fx_node(名稱, 樞紐)`（樞紐＝轉軸/鉸鏈位置）；`FxHide_*` 節點平常隱藏、只在 reveal 時出現；掛在會動的節點下用 `kit.reparent`；檢查：`node tools/qa/fx.cjs <id>`（加索引會以 ?fxslow 放慢截圖）
- 主島底座：各 `build_env_<id>.py` 呼叫 `env.cradle(...)`（mound / tiers / tower / books / cloud）
- 空間導覽熱點：`projects.ts` 的 `hotspots`（座標為網站場景座標，Y 朝上；Blender 座標 (x, y, z) → 網站 (x, z - 0.4, -y)）
- 長任務進度：`UPGRADE_ROADMAP.md`（中斷後從未打勾項目續做）；QA 腳本在 `tools/qa/`（需先 `npx vite preview --port 4173`）
- 手機版（≤760px）：標題卡 `pointer-events: none`（只有按鈕可點）以免攔截 3D 手勢；島上只顯示熱點編號、不顯示文字標籤；隱藏右側 `.dotnav`；聚焦時 `.tour.is-focused` 收起標語與按鈕
- 首頁 2D 疊層：`src/map/`；終章背景：`src/components/OutroBackground.tsx`（唯一的 2D 背景插畫）
- 載入流程：`ModelDiorama` 先 `compileAsync` 編譯著色器、分批上傳貼圖，完成後才放進場景並浮上淡入；`DomainStage` 的 `StageLoader` 顯示進度，主模型與環境都就緒才收起並顯示熱點；就緒後在空檔預載前後作品，首頁預載所有輕量版、滑過島嶼時預載精細版
- 效能（2026-11-16 徹查後的原則，量測工具 `node tools/qa/probe.cjs [hash]`）：不使用後製（EffectComposer）；不要加點光源（每個 PBR 像素都要多算）；3D 環境用 Lambert 材質；首頁不開陰影、介紹頁陰影按需更新（`ShadowOnDemand`）；抗鋸齒只在 dpr < 1.5 的桌機開；新增會動態出現的材質要納入預熱（`compileAsync`＋`finishPrograms`），否則第一次出現時會卡頓；`gl.debug.checkShaderErrors` 只在開發模式開；首頁輕量版由 `map_lod_strip.mjs` 去掉 Fx 節點並合併網格；
- 其他：Canvas `dpr={[1, 1.5]}`、陰影貼圖 1024、環境模型不參與陰影；幾何與材質共用、群島不使用點光源、觸控裝置關閉後製；熱點投影只在數值改變時寫 DOM、不每幀量測；2D 部分不用 filter / mix-blend-mode（說明卡的 backdrop-filter 為使用者指定的例外）。
