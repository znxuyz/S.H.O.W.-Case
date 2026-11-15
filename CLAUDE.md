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
  - `kit.tsx`：共用幾何體 / 材質快取與基礎零件（程序化 Low-Poly，不使用外部 .glb 模型）
  - `dioramas.tsx`：各主題的微縮箱庭；`world.tsx`：天空/地面/遠景/粒子/環境反射/後製
  - `MapWorld.tsx`：首頁 3D 群島；`DomainStage.tsx`：介紹頁全螢幕 3D 舞台（文字懸浮在左側）
  - R3F `<Canvas>` 一律加 `resize={{ offsetSize: true }}`：轉場會對外層做 CSS scale，用 getBoundingClientRect 量測會讓畫布尺寸錯誤而黑屏
- 首頁 2D 疊層：`src/map/`；領域背景插畫：`src/themes/<主題>/Background.tsx`
- 效能：Canvas `dpr={[1, 1.5]}`、幾何與材質共用、群島不使用點光源、觸控裝置關閉後製；2D 部分不用 filter / mix-blend-mode。
