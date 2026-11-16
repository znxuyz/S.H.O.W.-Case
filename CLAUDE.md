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
- 模型管線：Blender 匯出 → `detail_maps.mjs`（主模型掛上共用細節貼圖：`tools/blender/detail/` 由 `bake_details.py` 以 Noise／ColorRamp／Bump 節點烘焙的石材／木紋／金屬拉絲／灰泥法線＋粗糙度，512px 無縫）→ 只套在純色、不透明、UV 完整的材質上，並以 MikkTSpace 預先計算切線（手機 GPU 不走導數推算，避免彩色雜點；不做「只有粗糙度」的半套組合以免多出著色器變體）→ gltf-transform **Draco** 壓縮＋WebP；網站用自架解碼器 `public/draco/`（`assets.ts` 的 `DRACO_PATH`）；倒角一律 1 段（`kit.box`／`label_block`），圓環／球體分段有上限；`node tools/qa/glbstats.cjs` 檢查預算（主模型 ≤ 15k 三角面、≤ 1.5MB；環境 ≤ 1.5MB；首頁版 ≤ 200KB）；`TRI_STATS` 會在建模輸出 `tris-top` 列出最吃面數的零件
- 演示影片：原片由專案 README 擷取，`tools/make_highlight.sh <原片> <id>` 用 ffmpeg 剪成 20 秒精華（4 段 × 5 秒、720p H.264 CRF 22、無音軌、faststart，單檔 ≤ 4MB）→ `public/videos/<id>.mp4／.jpg`；`projects.ts` 的 `videoUrl`／`videoPoster` 指向精華片段、`videoFullUrl` 為原始完整影片（燈箱角落連結）；螢幕類熱點加 `video: true`；`VideoModal` 延遲載入、只在開啟時建立 `<video>`，第一幀前顯示讀取動畫與進度；QA：`node tools/qa/video.cjs <id>`
- 點擊動畫：熱點的 `fx` 指定模型節點與「結構動作」（hinge/slide/stretch/flap/whirl/reveal/sweep/stamp/press/pulse/flash，定義見 `projects.ts` 的 FxKind；軸向為網站座標）；不要用整塊發光＋跳動的通用動畫，每個物件拆出子網格各自動
- Blender 端：`group='Fx_<名稱>'` 收集零件後 `kit.fx_node(名稱, 樞紐)`（樞紐＝轉軸/鉸鏈位置）；`FxHide_*` 節點平常隱藏、只在 reveal 時出現；掛在會動的節點下用 `kit.reparent`；檢查：`node tools/qa/fx.cjs <id>`（加索引會以 ?fxslow 放慢截圖）
- 主島底座：各 `build_env_<id>.py` 呼叫 `env.cradle(...)`（mound / tiers / tower / books / cloud）
- 鏡頭環繞淨空：各 `build_env_<id>.py` 在合併前呼叫 `env.clear_orbit()`，把會擋住自動環繞視線（桌機與手機直式兩種鏡頭距離）的高大物件連同同處零件推到環繞圈外（微小粒子除外、最多檢查 4 輪）；QA：`node tools/qa/orbit.cjs [id]`（每 10° 射線檢查，必須全部「無遮擋」）
- 精緻度：`kit.plinth(rich=True)` 自動加分段壓頂石、四角柱墩、土層岩線、草叢（草地頂面）、垂吊岩錐；`kit.tree` 為三層樹冠＋枝幹＋樹根；要加細節優先用低面數結構配件（小零件 `bevel=0` 只有 12 面），不要提高曲面細分；面數不夠時拿看不出差別的小球體／小方塊減面換取
- 空間導覽熱點：`projects.ts` 的 `hotspots`（座標為網站場景座標，Y 朝上；Blender 座標 (x, y, z) → 網站 (x, z - 0.4, -y)）
- 自動導覽：`ProjectScene` 的 `auto` 狀態（底部導覽列最前面的播放鈕），每站停留 6–11 秒（依說明字數）；使用者拖曳、滾輪、點按鈕或按鍵即暫停；QA：`node tools/qa/autotour.cjs <id>`
- 品牌素材：`public/favicon.svg`（浮島圖示）、`apple-touch-icon.png`、社群分享封面 `og-cover.jpg`／`.webp`（1200×630，由 `node tools/qa/og.cjs` 從首頁渲染後以 Python 加字）；`index.html` 的 OG／Twitter 標籤用絕對網址
- 長任務進度：`UPGRADE_ROADMAP.md`（中斷後從未打勾項目續做）；QA 腳本在 `tools/qa/`（需先 `npx vite preview --port 4173`）
- 手機版（< 768px，CSS `max-width: 767px`、JS `>= 768` 為桌機）：標題卡 `pointer-events: none`（只有按鈕可點）以免攔截 3D 手勢；模型上平常不顯示任何熱點圓點，只有選中的那一顆（`.hs-anchor.is-active`）以高亮標記出現；直接點模型會選取螢幕上 70px 內最近的熱點（`DomainStage` 的 `pickNearest`）；隱藏右側 `.dotnav`；聚焦時 `.tour.is-focused` 收起標語與按鈕；桌機維持全部帶標題的標籤
- 首頁 2D 疊層：`src/map/`；終章背景：`src/components/OutroBackground.tsx`（唯一的 2D 背景插畫）
- 載入流程：`ModelDiorama` 先 `compileAsync` 編譯著色器、分批上傳貼圖，完成後才放進場景並浮上淡入；`DomainStage` 的 `StageLoader` 顯示進度，主模型與環境都就緒才收起並顯示熱點；就緒後在空檔預載前後作品，首頁預載所有輕量版、滑過島嶼時預載精細版
- 效能（2026-11-16 徹查後的原則，量測工具 `node tools/qa/probe.cjs [hash]`；WebGL 一律 `GL_OPTS`：highp＋抗鋸齒，自訂著色器開頭加 `precision highp float;`；**不要用 Canvas 2D 漸層（createRadialGradient／createLinearGradient）做 3D 貼圖**——iOS Safari 會對漸層加逐像素彩色抖動，放大後變成彩色雜點，柔光改用著色器計算，見 `world.tsx` 的 `HaloLayer`）：不使用後製（EffectComposer）；不要加點光源（每個 PBR 像素都要多算）；3D 環境用 Lambert 材質；首頁不開陰影、介紹頁陰影按需更新（`ShadowOnDemand`）；抗鋸齒只在 dpr < 1.5 的桌機開；新增會動態出現的材質要納入預熱（`compileAsync`＋`finishPrograms`），否則第一次出現時會卡頓；`gl.debug.checkShaderErrors` 只在開發模式開；首頁輕量版由 `map_lod_strip.mjs` 去掉 Fx 節點並合併網格；
- 其他：Canvas `dpr={[1, 1.5]}`、陰影貼圖 1024、環境模型不參與陰影；幾何與材質共用、群島不使用點光源、觸控裝置關閉後製；熱點投影只在數值改變時寫 DOM、不每幀量測；2D 部分不用 filter / mix-blend-mode（說明卡的 backdrop-filter 為使用者指定的例外）。

## 新增作品 SOP（使用者丟 GitHub 網址時照做；也可輸入 `/add-project <網址>`）
不需要中途詢問，依序完成後再一次回報。

1. **讀專案**：用 `add_repo` 加入該 repo（只讀，或 `git clone --depth 1`），讀 README、`package.json`／主要原始碼、GitHub Pages 網址（repo 的 homepage 或 README 中的連結）。
   README 裡若有展示影片（.mp4、YouTube、GitHub 附件）：用 `git show HEAD:<路徑>` 取得原片 → `tools/make_highlight.sh` 產生 20 秒精華，`videoUrl: 'videos/<id>.mp4'`、`videoPoster: 'videos/<id>.jpg'`，`videoFullUrl` 填原片串流網址（GitHub Pages 或 `cdn.jsdelivr.net/gh/<owner>/<repo>@main/<路徑>`）。
   整理出：作品名、一句話標語、3–4 個亮點、技術、狀態（live / dev / maintenance / archived）、分類（campus / personal）。
2. **決定風格與 id**：id 用小寫英數（例 `newapp`）；`theme` 從 brand / cyber / mythic / oriental / guardian / campus / blueprint 選最貼近的；`accent` 取作品本身的主色。
3. **設計模型概念（最重要）**：模型要表達「作品在做什麼」，不一定是建築（例：信箱＝反思卡回收、護照書＝英聽練習、平板＝文件下載）。
   先寫下主角物件與 3–6 個熱點各自對應的「具體物件」，每個物件都要有符合其構造的專屬動作（掀蓋、翻頁、升降、轉向、蓋印、展翅…），禁止整塊發光＋跳動的通用動畫。
4. **建模**：`tools/new_project.sh <id> --title "作品名" --accent "#色碼" --skip-qa` 會從 `tools/blender/templates/` 產生
   `build_<id>.py`、`build_env_<id>.py` 並建出模型；接著**依步驟 3 改寫這兩個腳本**再重跑（遵守範本開頭的規則：4×4 地塊、鏡頭在 +X/-Y 側、
   熱點零件放 `group='Fx_<名稱>'`＋`kit.fx_node`、點擊才出現的放 `FxHide_*`、環境一定要 `env.cradle`）。
   若作品有實際網頁，可用 Playwright 截圖存 `public/media/<id>.webp` 當模型內螢幕貼圖或 `showcase` 預覽。
5. **寫入 `src/data/projects.ts`**：依現有作品的欄位格式新增一筆（`model`、`env`、`links.repo`、`links.demo`、`showcase`、`hotspots`）。
   熱點座標＝Blender 座標 (x, y, z) → 網站 (x, z − 0.4, −y)；每個熱點的 `fx` 指向步驟 4 的節點，軸向為網站座標。
6. **檢測**：`tools/new_project.sh <id>`（不加 `--skip-qa`）會檢查檔案大小／面數並跑 `probe.cjs`（BUDGET=1）與 `fx.cjs`：
   - 預算：主模型 ≤ 15k 三角面、≤ 1.5MB；環境 ≤ 1.5MB；首頁輕量版 ≤ 200KB；全部 Draco（`node tools/qa/glbstats.cjs <id>`）
   - 介紹頁：繪製呼叫 ≤ 160、著色器 ≤ 20、三角面 ≤ 60k、載入長任務總和 ≤ 800ms
   - `fx.cjs`：所有熱點節點都找得到（missing nodes 0）、沒有錯誤
   - `node tools/qa/orbit.cjs <id>`：自動環繞一圈桌機與手機都「無遮擋」
   任何一項 FAIL 就修到 PASS（常見手段：合併零件、減少材質種類、降低散佈數量）。再用 `tools/qa/shot.cjs <id>` 與 `tools/qa/tour.cjs <id> 390x844` 看桌機與手機畫面。
7. **收尾**：首頁群島會自動找空位；更新 README 作品清單（若有）與 `UPGRADE_ROADMAP.md` 進度紀錄；`npm run build` 後 commit 並直接推上 `main`（同時推開發分支），
   確認 GitHub Actions 部署成功後回報網址。
