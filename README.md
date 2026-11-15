# S.H.O.W. Case

**Selected Hub Of Works** — 個人作品集與工具展示網站。

每一件作品都有一個專屬的全螢幕世界：切換作品時，背景特效、字體、配色、UI 邊框與轉場動畫會整個換掉。

🔗 https://znxuyz.github.io/S.H.O.W.-Case/

## 操作

| 方式 | 動作 |
|---|---|
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
  hidden: false,                    // true = 暫時不顯示
}
```

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

1. 建立 `src/themes/<名稱>/Background.tsx`（全螢幕背景元件）
2. 在 `src/styles/themes.css` 加上 `[data-theme='<名稱>']` 的配色、字體與元件樣式
3. 在 `src/themes/types.ts` 的 `ThemeKey` 與 `src/themes/index.ts` 註冊，選擇轉場 (`enter`) 與標題特效 (`title`)

## 開發

```bash
npm install
npm run dev      # 本機預覽
npm run build    # 產出 dist/
```

技術：Vite · React · TypeScript · Tailwind CSS v4 · Motion · GSAP（SplitText / ScrambleText）· React Three Fiber。

## 部署

推送到 `main` 分支後，`.github/workflows/deploy.yml` 會自動建置並發布到 GitHub Pages。
第一次使用請到 **Settings → Pages → Source** 選擇 **GitHub Actions**。
