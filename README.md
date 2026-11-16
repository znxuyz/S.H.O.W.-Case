# S.H.O.W. Case

**Selected Hub Of Works** — 個人作品集與工具展示網站。

首頁是以 Three.js 渲染的 **3D 浮空微縮群島**：每一件作品都是一座懸浮在星空中的低多邊形箱庭島嶼，可拖曳旋轉、滾輪縮放；懸停時島嶼浮起並顯示名稱，點擊後鏡頭飛向該島，進入作品的全螢幕專屬世界。介紹頁是全螢幕的 3D 舞台，文字懸浮在左側，右側的微縮箱庭可 360° 旋轉（也可展開網站預覽）；切換作品時，背景特效、字體、配色、UI 邊框與轉場動畫會整個換掉。

🔗 https://znxuyz.github.io/S.H.O.W.-Case/

## 操作

| 方式 | 動作 |
|---|---|
| 首頁拖曳空白處 / 滾輪 | 旋轉 / 縮放 3D 群島 |
| 首頁按住島嶼拖動 | 移動那座島，放開後帶慣性漂浮 |
| 首頁點擊島嶼 | 鏡頭飛入該作品 |
| 介紹頁拖曳 / 滾輪 | 360° 旋轉 / 縮放微縮箱庭 |
| 介紹頁點擊模型上的編號標記、或底部導覽列 | 鏡頭聚焦該部位並顯示功能說明（←/→ 切換、Esc 回全景） |
| 右上「返回大地圖」 | 從作品縮小退回大地圖 |
| 滾輪 / ↑ ↓ / PageUp PageDown / 空白鍵 | 上一個 / 下一個作品 |
| 手機上下滑動 | 上一個 / 下一個作品 |
| 右側圓點 | 直接跳到該作品 |
| 右上「目錄」 | 依分類列出所有作品 |
| Home / End | 序章 / 終章 |
| 網址 `#/<id>` | 直接分享某件作品，例如 `#/tianmu` |

## 新增作品

只要修改 **`src/data/projects.ts`**：複製任一筆物件、改內容，陣列順序就是網站上的出場順序。

```ts
{
  id: 'my-new-app',                 // 網址 #/my-new-app
  title: '作品名稱',
  code: 'English Name · 副標',
  tagline: '一句話標語',
  description: '作品簡介……',
  highlights: ['亮點一', '亮點二', '亮點三'],
  tech: ['React', 'Firebase'],
  theme: 'cyber',                   // 視覺風格（見下表）
  accent: '#ff6b00',                // 選填：覆寫強調色
  category: 'personal',             // personal 個人創作 / campus 校園專案
  status: 'live',                   // live / dev / maintenance / archived
  links: {
    demo: 'https://znxuyz.github.io/my-new-app/',  // Live Demo（沒有就省略）
    repo: 'https://github.com/znxuyz/my-new-app',  // Source Code
  },
  showcase: { kind: 'image', src: 'media/my-new-app.webp', alt: '畫面說明', shape: 'wide' },
  building: 'tower',                // 選填：沒有 .glb 時的程式箱庭造型（預設依 theme）
  model: 'models/xxx.glb',          // 選填：Blender 精細模型
  env: 'models/env_xxx.glb',        // 選填：介紹頁的 3D 環境
  hotspots: [                       // 選填：3D 空間導覽（綁在模型部位上的功能說明）
    { title: '功能名稱', body: '說明……', at: [x, y, z] },
  ],
  hidden: false,                    // true = 暫時不顯示
}
```

每件作品會自動成為一座浮空島，依陣列順序排入群島位置，不需要填座標；島的地形依 `theme` 決定。

### 建築造型（`building`）

| 值 | 造型 | 預設對應主題 |
|---|---|---|
| `tower` | 霓虹全息高塔 | cyber |
| `altar` | 懸浮祭壇、靈晶與光環 | mythic |
| `pagoda` | 月夜飛簷樓閣、石拱橋與燈籠 | oriental |
| `treehouse` | 森林樹屋與發光靈獸祭壇 | guardian |
| `school` | 鐘樓學校 | campus |
| `hall` | 列柱行政大樓 | — |
| `library` | 圓頂圖書館 | — |
| `kiosk` | 地球儀郵亭 | — |
| `workshop` | 施工中線框建築與塔吊 | blueprint |

圖片請放在 `public/media/`（建議 webp、寬 1280px 以內）。

### 可用風格

| theme | 風格 | 適合 |
|---|---|---|
| `cyber` | 未來科技：WebGL 資料地形、掃描線、HUD 切角 | 數據、金融、科技工具 |
| `mythic` | 神話神獸：星雲、靈火、旋轉魂環 | 遊戲、奇幻 |
| `oriental` | 古典中式（玄漆描金）：水墨遠山、描金山脊、朱印、直書 | 東方美學 |
| `guardian` | 守護獸森林：夜林、螢火蟲、天光 | 可愛、養成、教育遊戲 |
| `campus` | 校園文具（淺色）：方格紙、裝訂線、手繪塗鴉 | 校務與行政工具 |
| `blueprint` | 工程藍圖：藍晒格線、約束線、打字機標題 | 演算法、開發中專案 |

### 新增風格

1. 在 `src/styles/themes.css` 加上 `[data-theme='<名稱>']` 的配色、字體與元件樣式
2. 在 `src/themes/types.ts` 的 `ThemeKey` 與 `src/themes/index.ts` 註冊，選擇轉場 (`enter`) 與標題特效 (`title`)
3. 作品頁的背景由該作品的 3D 環境（`env_<id>.glb`）與 `src/three/world.tsx` 的天空／霧色提供

## 開發

```bash
npm install
npm run dev      # 本機預覽
npm run build    # 產出 dist/
```

技術：Vite · React · TypeScript · Tailwind CSS v4 · Motion · GSAP（SplitText / ScrambleText）· Three.js · React Three Fiber · drei。

3D 程式在 `src/three/`：`Diorama.tsx`（島嶼主模型）、`ModelDiorama.tsx`（載入 .glb、預熱著色器後淡入、節點動畫與點擊動作）、`assets.ts`（模型路徑與預載）、
`world.tsx`（天空、霧、柔光、粒子、環境反射與後製）、`MapWorld.tsx`（首頁群島）、`DomainStage.tsx`（介紹頁全螢幕 3D 舞台與載入遮罩）、`Hotspots.tsx`（熱點投影與鏡頭聚焦）。
終章的星空背景在 `src/components/OutroBackground.tsx`（全站唯一的 2D 背景插畫）。

### 精細模型、3D 環境與首頁輕量版（.glb）
作品在 `projects.ts` 以 `model: 'models/xxx.glb'` 指定 Blender 建模的島嶼（必填；載入期間不顯示替代模型，只顯示載入遮罩）。
10 個作品都有 Blender 程序化建模的主模型（`build_<id>.py`）與 3D 環境（`build_env_<id>.py`），首頁使用 `tools/blender/build_map_lod.sh` 產生的輕量版（`models/map/`）。流程見 `tools/blender/README.md`，長期升級進度見 `UPGRADE_ROADMAP.md`。

### 效能原則
- 不使用 `filter` / `mix-blend-mode`，光影用漸層與 `box-shadow`。
- 3D：不用後製與點光源、環境用 Lambert、著色器在載入遮罩後預熱完成；以 `node tools/qa/probe.cjs [hash]` 量測繪製呼叫、著色器數與載入長任務。
- 持續動畫只動 `transform` / `opacity`（GPU 合成，不重繪）。
- 滑鼠視差以 `requestAnimationFrame` 直接寫入 DOM，不觸發 React 重新渲染。
- 3D 畫布 `dpr={[1, 1.5]}`，幾何體與材質全站共用，首頁群島不使用點光源。

## 部署

推送到 `main` 分支後，`.github/workflows/deploy.yml` 會自動建置並發布到 GitHub Pages。
第一次使用請到 **Settings → Pages → Source** 選擇 **GitHub Actions**。
