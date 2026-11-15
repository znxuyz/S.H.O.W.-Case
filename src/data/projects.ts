/**
 * ─────────────────────────────────────────────────────────────
 *  S.H.O.W. Case 作品清單
 * ─────────────────────────────────────────────────────────────
 *  新增作品：複製任一筆物件、修改內容即可，順序 = 網站上的出場順序。
 *
 *  theme     視覺風格，可選值見 src/themes/index.ts
 *            （cyber 未來科技 / mythic 神話神獸 / oriental 古典中式 /
 *              guardian 守護獸森林 / campus 校園文具 / blueprint 工程藍圖）
 *  accent    （選填）覆寫該主題的強調色，同一主題的作品可藉此做出區別
 *  showcase  （選填）作品視覺：圖片或內建的動態示意畫面
 *  status    live 上線中 / dev 開發中 / maintenance 維修中 / archived 已停用
 *  hidden    true = 暫不在網站上顯示（資料保留，日後改回 false 即可）
 *  model     （選填）精細 3D 模型檔（.glb，放在 public/models/），有設定就取代程式建構的箱庭
 *  building  （選填）大地圖上的微縮建築造型，預設依 theme 決定
 *            tower 全息高塔 / altar 懸浮祭壇 / pagoda 飛簷重樓 / treehouse 巨木樹屋 /
 *            school 鐘樓學校 / hall 列柱大樓 / library 圓頂圖書館 / kiosk 地球儀郵亭 / workshop 施工塔吊
 *  大地圖位置：category 為 personal 的作品放在「個人創作島」，campus 放在「校園專案島」，依順序自動排列
 * ─────────────────────────────────────────────────────────────
 */
import type { ThemeKey } from '../themes/types';
import type { BuildingKind } from '../three/kinds';

export type ProjectStatus = 'live' | 'dev' | 'maintenance' | 'archived';

export type Showcase =
  | { kind: 'image'; src: string; alt: string; shape?: 'wide' | 'tall'; w: number; h: number }
  | { kind: 'pets'; pets: string[] }
  | { kind: 'heatmap' }
  | { kind: 'stages' }
  | { kind: 'calendar' }
  | { kind: 'timetable' }
  | { kind: 'passport' };

/** 空間導覽熱點：綁在 3D 模型某個部位上的功能說明（座標為網站場景座標，Y 朝上） */
export interface Hotspot {
  title: string;
  body: string;
  /** 標記點位置 */
  at: [number, number, number];
  /** （選填）聚焦時的鏡頭位置；未指定則自動從場景中心往外退後抬高 */
  cam?: [number, number, number];
}

export interface Project {
  /** 網址錨點，例如 #/lplc */
  id: string;
  /** 大標題 */
  title: string;
  /** 縮寫或英文名，顯示在標題上方 */
  code?: string;
  /** 一句話標語 */
  tagline: string;
  /** 作品簡介 */
  description: string;
  /** 亮點（建議 3–4 條） */
  highlights: string[];
  /** 技術標籤 */
  tech: string[];
  theme: ThemeKey;
  accent?: string;
  category: 'personal' | 'campus';
  status: ProjectStatus;
  /** 附註小字，例如「校園實際使用中」 */
  note?: string;
  links: {
    /** Live Demo（GitHub Pages 等實際運作網址） */
    demo?: string;
    /** Live Demo 按鈕文字，預設「Live Demo」 */
    demoLabel?: string;
    /** Source Code（GitHub Repository） */
    repo: string;
  };
  showcase?: Showcase;
  building?: BuildingKind;
  model?: string;
  /** （選填）介紹頁的 3D 環境模型（.glb，放在 public/models/），取代程式產生的遠景 */
  env?: string;
  /** 3D 空間導覽熱點（建議 3–5 個） */
  hotspots?: Hotspot[];
  hidden?: boolean;
}

export const projects: Project[] = [
  {
    id: 'lplc',
    title: '拉普拉斯預測核心',
    code: 'L.P.L.C. · Laplace Predictive Leading Core',
    tagline: '如果知道現在的一切，就能推算未來。',
    description:
      '台股資金流向、選股與個股分析的情報中樞。把每天的行情、籌碼、財報與事件轉譯成一眼看懂的畫面；模擬盤則反其道而行——帶你回到過去，在看不見未來的情況下練習判斷。',
    highlights: [
      '成交額 × 漲跌幅即時熱力圖，看清錢今天流向哪裡',
      '20+ 種 K 線型態自動辨識，附多空行情歷史勝率',
      '五大選股策略與 ETF 持股異動追蹤',
      '歷史回放模擬交易，可安裝為離線 App',
    ],
    tech: ['React', 'TypeScript', 'Vite', 'Cloudflare Worker', 'Firebase', 'PWA'],
    theme: 'cyber',
    category: 'personal',
    status: 'live',
    model: 'models/lplc.glb',
    links: {
      demo: 'https://znxuyz.github.io/L.P.S.D-System/#sim',
      repo: 'https://github.com/znxuyz/L.P.S.D-System',
    },
    showcase: { kind: 'heatmap' },
  },
  {
    id: 'stockgame',
    title: '神獸股市',
    code: 'StockGame · 山海經股票養成',
    tagline: '買股票召喚神獸，持股越久，魂環越盛。',
    description:
      '把真實的台股投資組合化為一座上古神祇動物園。294 隻原創神獸橫跨 13 大世界觀；等級、魂環境界與魂環特效，分別對應你的投入金額、持有時間與報酬率。',
    highlights: [
      '294 隻原創上古神祇 × 13 大世界觀圖鑑',
      '盤中每 30 秒同步真實台股報價',
      '等級／境界／特效三維養成與修為系統',
      '雲端帳號跨裝置同步，毛玻璃 HUD 介面',
    ],
    tech: ['React', 'TypeScript', 'Tailwind', 'Supabase', 'PWA'],
    theme: 'mythic',
    category: 'personal',
    status: 'maintenance',
    model: 'models/stockgame.glb',
    links: {
      demo: 'https://stockgame-692.pages.dev',
      repo: 'https://github.com/znxuyz/StockGame',
    },
    showcase: { kind: 'image', src: 'media/stockgame-cover.webp', alt: '神獸股市主視覺：巨大神獸展翼於燈火仙城之上', shape: 'tall', w: 640, h: 1142 },
  },
  {
    id: 'tianmu',
    title: '天幕島',
    code: 'TianMu-Island · Windows 頂部動態法寶',
    tagline: '天幕垂落，萬象歸島。',
    description:
      '一件常駐於 Windows 螢幕頂端正中的懸浮法器。靜時如墨玉懸空，觸之則如靈液般拉伸、回彈、流轉——音律、訊息、時辰與專注，皆收於這方寸天幕之中。',
    highlights: [
      '阻尼彈簧物理演算，懸停點擊如果凍般形變',
      '接管系統媒體：同步歌詞、封面與音訊頻譜',
      '通知化作符紙滑出，驗證碼自動辨識一鍵複製',
      '「玄漆描金」設計語言：農曆與直書時辰',
    ],
    tech: ['.NET 10', 'WPF', 'C#', 'Windows 10/11'],
    theme: 'oriental',
    category: 'personal',
    status: 'live',
    env: 'models/env_tianmu.glb',
    hotspots: [
      {
        title: '天幕膠囊：靈液彈簧',
        body: '常駐在螢幕頂端正中的玄黑膠囊——無邊框、置頂、滑鼠穿透。懸停或點擊時以阻尼彈簧物理演算，像果凍般拉伸、回彈、流轉。',
        at: [0.25, 2.2, 0],
      },
      {
        title: '萬象樂律',
        body: '接管系統媒體（連瀏覽器裡的 YouTube 也行）：曲名、歌手、封面、同步歌詞、即時音訊頻譜與播放控制，全部收進膠囊裡。',
        at: [0.95, 3.1, -0.55],
      },
      {
        title: '傳音入密',
        body: '系統通知化作符紙從天幕滑出；通知裡的驗證碼會自動辨識，一鍵就能複製。',
        at: [-0.8, 2.4, 0.55],
      },
      {
        title: '玄漆描金・十二時辰',
        body: '專屬設計語言：玄黑漆面、五色描金、內嵌思源宋體、農曆日期與直書時辰；還會依晝夜自動變色，全螢幕時自動隱身。',
        at: [1.7, 2.15, 0.05],
      },
      {
        title: '洞府設施',
        body: '外掛式「法器」架構，每個功能都能獨立載入；設定面板、開機啟動、系統匣圖示，以及附 SHA-256 校驗的自動更新。',
        at: [-1.05, 0.65, 0.85],
      },
    ],
    model: 'models/tianmu.glb',
    links: {
      demo: 'https://github.com/znxuyz/TianMu-Island/releases/latest',
      demoLabel: '下載安裝',
      repo: 'https://github.com/znxuyz/TianMu-Island',
    },
    showcase: { kind: 'image', src: 'media/tianmu-poster.webp', alt: '天幕島導覽影片畫面：螢幕頂端的玄黑膠囊', shape: 'wide', w: 1280, h: 720 },
  },
  {
    id: 'guardian',
    title: '守護獸學園',
    code: 'Guardian Beast Academy · 班級養成系統',
    tagline: '每一次好表現，都讓一隻守護獸長大。',
    description:
      '把傳統加分制升級為虛擬寵物養成的遊戲化班級經營系統。台灣黑熊、石虎、帝雉、穿山甲……8 種台灣特有種從蛋孵化為守護神獸——孩子養著的，是這片土地上真實存在的居民。',
    highlights: [
      '8 種台灣特有種 × 4 階段進化，經驗與積分雙軌',
      '寵物「微恙」機制，自動找出需要關心的孩子',
      '課堂工具、線上測驗、領地佔領戰與獎品商店',
      'AI 評語助手與投影模式，全班一起見證成長',
    ],
    tech: ['JavaScript', 'Firebase', 'Firestore', 'Google Auth'],
    theme: 'guardian',
    category: 'personal',
    status: 'live',
    model: 'models/guardian.glb',
    links: {
      demo: 'https://znxuyz.github.io/ClassroomManagementSystem2.0/',
      repo: 'https://github.com/znxuyz/ClassroomManagementSystem2.0',
    },
    showcase: { kind: 'pets', pets: ['bear', 'cat', 'magpie', 'pheasant', 'pangolin', 'deer'] },
  },
  {
    id: 'care',
    title: 'C.A.R.E. System',
    code: 'Conduct Assessment & Reflection Education',
    tagline: '紙本反思卡照舊，最難手算的交給系統。',
    description:
      '校園生活管教的違規登錄與再犯追蹤系統。15 天滾動視窗自動計算再犯次數，達門檻即排入安全觀察員追蹤；以 Firestore 交易與 27 項安全規則測試守住資料正確與學生隱私。',
    highlights: [
      '學號一輸入即帶出姓名、班級與 15 天內次數',
      '累計達門檻自動警示並排入觀察員值勤',
      '公開唯讀看板只顯示統計，不露個資',
      '全程免費方案運行，不需 Cloud Functions',
    ],
    tech: ['React', 'TypeScript', 'Vite', 'Firebase'],
    theme: 'campus',
    accent: '#0f9b8e',
    category: 'campus',
    status: 'live',
    building: 'hall',
    model: 'models/care.glb',
    links: {
      demo: 'https://znxuyz.github.io/C.A.R.E.-System/',
      repo: 'https://github.com/znxuyz/C.A.R.E.-System',
    },
    showcase: { kind: 'image', src: 'media/care-dashboard.webp', alt: 'C.A.R.E. 生教組儀表板（深色模式）', shape: 'wide', w: 1100, h: 1229 },
  },
  {
    id: 'admin',
    title: '行政工作進度追蹤',
    code: 'School Administration Tracker',
    tagline: '讓每一件行政工作，都不再被遺忘。',
    description:
      '把行政計畫拆解成步驟，用「計畫 → 核定 → 執行 → 結案」四站節點軌道一眼看出進度。逾期與久未更新的工作會被自動標示，主任隨時掌握處室全貌。',
    highlights: [
      '四階段節點軌道，計畫走到哪一目了然',
      '逾期、待更新、公文卡關自動統計',
      '行事曆記事可設定個人／處室／全校可見',
      '可加到主畫面，離線也打得開',
    ],
    tech: ['HTML', 'CSS', 'JavaScript', 'Firebase', 'PWA'],
    theme: 'campus',
    accent: '#d9622b',
    category: 'campus',
    status: 'live',
    building: 'library',
    model: 'models/admin.glb',
    links: {
      demo: 'https://znxuyz.github.io/School-Administration/',
      repo: 'https://github.com/znxuyz/School-Administration',
    },
    showcase: { kind: 'stages' },
  },
  {
    id: 'hcrs',
    title: '教室借用系統',
    code: 'H.C.R.S. · HRES Classroom Reservation System',
    tagline: '告別 Excel 登記表，借教室只要三步。',
    description:
      '取代紙本與 Excel 的校園教室借用平台。單次、每週、每月三種借用方式，送出即檢查時段衝突；主管線上審核並自動寄信通知，公開月曆讓全校一目了然。',
    highlights: [
      '單次／每週／每月三種借用模式',
      '送出與核准時雙重衝突檢查',
      '審核結果自動寄信，支援手動／自動同意',
      '一鍵匯出 CSV，Excel 直接開啟',
    ],
    tech: ['JavaScript', 'Firebase Auth', 'Firestore', 'Google 登入'],
    theme: 'campus',
    accent: '#3563e9',
    category: 'campus',
    status: 'live',
    note: '已於學校帳號正式上線使用',
    building: 'school',
    env: 'models/env_hcrs.glb',
    model: 'models/hcrs.glb',
    hotspots: [
      {
        title: '公開借用月曆',
        body: '不用登入就能查看「借用狀況」月曆，只顯示已核准的借用。可依教室篩選，點一下日期就能看到當天各教室 × 節次的使用表。',
        at: [-0.1, -0.3, 0.85],
      },
      {
        title: '教室借用燈號與衝突檢查',
        body: '電腦、視聽、自然、禮堂……每間專科教室的借用狀態即時亮燈。送出申請時若和已核准的時段衝突，會直接擋下並列出衝突日期。',
        at: [-0.45, 0.35, -0.3],
      },
      {
        title: '三種借用方式',
        body: '只借一次、每週固定、每月固定——整學期的固定借用一次設定完成；管理員也能把舊 Excel 上的固定借用直接核准匯入。',
        at: [0.85, 0.95, -0.3],
      },
      {
        title: '主管一鍵審核',
        body: '主管在後台同意／不同意，也能切換成「自動同意」；核准時會再檢查一次衝突。所有借用可依狀態、教室、月份篩選並匯出 CSV。',
        at: [1.0, 0.8, 0.75],
      },
      {
        title: '自動寄信通知',
        body: '教師送出申請 → 寄信給所有主管；審核完成 → 寄信通知申請人。只接受學校網域的 Google 帳號登入，前端與資料庫規則雙重把關。',
        at: [0, 1.65, -0.75],
      },
    ],
    links: {
      demo: 'https://hresnoc-lang.github.io/H.C.R.S-HRES-Classroom-Reservation-System/index.html#calendar',
      repo: 'https://github.com/znxuyz/H.C.R.S-HRES-Classroom-Reservation-System',
    },
    showcase: { kind: 'calendar' },
  },
  {
    id: 'scheduling',
    title: '國小排課系統',
    code: 'Class Scheduling System · CP-SAT',
    tagline: '需求互相打架時，給出犧牲最少的那張課表。',
    description:
      '以 Google OR-Tools CP-SAT 求解教師配課與教室排課。先排科任、再為導師保留空格的兩階段策略，讓大型國小 48 班、75 位老師、1312 個單元在 31.7 秒內求得最佳解，零硬衝突。',
    highlights: [
      '教室、老師、班級三重防撞堂約束',
      '個別需求衝突時回報「違反最少」的解與代價',
      '手動微調時自動連帶挪動受影響的課',
      '12 班範例學校 1.7 秒求得 OPTIMAL',
    ],
    tech: ['Python', 'OR-Tools', 'CP-SAT', '約束規劃'],
    theme: 'blueprint',
    category: 'campus',
    status: 'dev',
    model: 'models/scheduling.glb',
    links: {
      repo: 'https://github.com/znxuyz/Class-Scheduling-System',
    },
    showcase: { kind: 'timetable' },
  },
  {
    id: 'passport',
    title: '英語學習護照',
    code: 'English Learning Passport · Grade 1–6',
    tagline: '一到六年級的英聽練習，一鍵直達。',
    description:
      '校內英語老師製作了 1–6 年級的英聽練習網頁，卻不知道如何發布到學校網站。我協助整理架構並部署到學校 GitHub Pages，讓孩子在家也能隨時開口練習。',
    highlights: [
      '六個年級入口，低年級也能自己點選',
      '純靜態網頁，零伺服器成本',
      '協助教師完成部署與後續維護流程',
    ],
    tech: ['HTML', 'CSS', 'JavaScript', 'GitHub Pages'],
    theme: 'campus',
    accent: '#e0457b',
    category: 'campus',
    status: 'live',
    note: '協助校內教師部署',
    building: 'kiosk',
    model: 'models/passport.glb',
    links: {
      demo: 'https://hresnoc-lang.github.io/115English-Learning-Passport/',
      repo: 'https://github.com/hresnoc-lang/115English-Learning-Passport',
    },
    showcase: { kind: 'passport' },
  },
  {
    id: 'tablet',
    title: '平板載具文件專區',
    code: 'HRES Tablet Program · Document Hub',
    tagline: '校務規範、表單與宣導文件，一處下載。',
    description:
      '為學校平板載具計畫打造的文件下載中心。分類卡片搭配 PDF／Word 雙格式下載；非工程背景的同仁只要上傳檔案、修改一行設定，就能自行新增文件。',
    highlights: [
      '分類卡片與文件數量自動統計',
      'PDF 與可編輯 Word 雙格式下載',
      '附完整維護說明，同仁可自行更新',
    ],
    tech: ['HTML', 'CSS', 'JavaScript', 'GitHub Pages'],
    theme: 'campus',
    accent: '#c2410c',
    category: 'campus',
    status: 'live',
    note: '已於學校帳號正式上線使用',
    building: 'school',
    model: 'models/tablet.glb',
    links: {
      demo: 'https://hresnoc-lang.github.io/hres-tablet/',
      repo: 'https://github.com/hresnoc-lang/hres-tablet',
    },
    showcase: { kind: 'image', src: 'media/tablet.webp', alt: '平板載具計畫文件下載專區首頁', shape: 'wide', w: 1280, h: 800 },
  },
  {
    id: 'scoreboard',
    title: '班級記分板 V3',
    code: 'Class Scoreboard · Google Sheets Edition',
    tagline: '守護獸學園的前身。',
    description:
      '以 Google Apps Script 與 Google Sheets 打造的班級記分板，支援排行榜、獎勵兌換與即時搶分活動；後續演進為「守護獸學園」。',
    highlights: ['Google Sheets 雲端儲存', '學生端 / 教師端雙角色', '即時搶答排名'],
    tech: ['Google Apps Script', 'Google Sheets'],
    theme: 'campus',
    category: 'personal',
    status: 'archived',
    links: { repo: 'https://github.com/znxuyz/ClassManagementSystem-V3.1' },
    hidden: true,
  },
];

export const visibleProjects = projects.filter((p) => !p.hidden);
