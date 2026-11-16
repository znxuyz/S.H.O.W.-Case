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

/**
 * 點擊熱點時，模型節點的專屬動畫：
 * pop 彈跳、stamp 蓋印、float 浮起、spin 旋轉、lid 開蓋（節點樞紐在鉸鏈處）、
 * press 按下、shake 抖動、swing 搖擺、flash 強制亮起並發光、ripple 只發出光波
 */
/**
 * 點擊熱點的「結構動作」（作用在模型的某個子節點上，節點的原點＝樞紐）：
 *   hinge   繞 axis 轉 amt 弧度後停住再回位（掀蓋、翻頁、展翅、吊臂轉向）
 *   slide   沿 axis 平移 amt（卡片升起、鋼索放下、抽屜拉出）
 *   stretch 沿 axis 拉伸到 amt 倍（全息柱伸長、鋼索變長）
 *   flap    繞 axis 來回擺動，振幅 amt、頻率 freq（翅膀拍動、鈴鐺搖晃）
 *   whirl   繞 axis 快速轉 amt 弧度（2π 的倍數；負值＝逆向）
 *   reveal  隱藏節點（FxHide_*）彈出顯示後收回（紅色印記、雷射線、投影）
 *   sweep   沿 axis 來回掃描 amt 距離、freq 次（掃描線、雷達）
 *   stamp   抬起後重壓 amt 距離（印章）   press  向下按壓（按鈕）
 *   pulse   心跳般縮放                     flash  依序亮燈（Lit_*）
 */
export type FxKind = 'hinge' | 'slide' | 'stretch' | 'flap' | 'whirl' | 'reveal' | 'sweep' | 'stamp' | 'press' | 'pulse' | 'flash';
export interface FxStep {
  /** 模型節點名稱（Blender 物件名；結尾可用 * 萬用字元） */
  node: string;
  kind: FxKind;
  /** 網站座標軸（x 右、y 上、z 朝鏡頭） */
  axis?: 'x' | 'y' | 'z';
  /** 角度（弧度）、距離或倍率，依動作而定 */
  amt?: number;
  /** 秒數（覆寫預設） */
  dur?: number;
  /** 擺動／掃描頻率 */
  freq?: number;
  /** 延遲秒數（做出依序觸發的效果） */
  delay?: number;
  /** 該節點的自發光材質在動作期間增亮（只給本來就會發光的零件：符文、霓虹、全息） */
  glow?: boolean;
  /** 從節點位置擴散一圈能量波的最大半徑 */
  ring?: number;
  _rung?: boolean;
}

/** 空間導覽熱點：綁在 3D 模型某個部位上的功能說明（座標為網站場景座標，Y 朝上） */
export interface Hotspot {
  title: string;
  body: string;
  /** 標記點位置 */
  at: [number, number, number];
  /** （選填）聚焦時的鏡頭位置；未指定則自動從場景中心往外退後抬高 */
  cam?: [number, number, number];
  /** 點擊時觸發的模型動畫 */
  fx?: FxStep[];
  /** 這個熱點是螢幕／投影／展示台：說明卡上顯示「觀看演示影片」 */
  video?: boolean;
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
  /**
   * 演示影片（從專案 README 擷取：.mp4 直連、YouTube 或 GIF）。只在使用者按「觀看演示影片」開啟燈箱時才載入，頁面初始不預載。
   * mp4 請用支援 Range 串流的網址（GitHub Pages 或 jsDelivr；GitHub raw 不適合）。
   */
  videoUrl?: string;
  /** 影片封面（燈箱開啟、影片緩衝時顯示） */
  videoPoster?: string;
  /** 原始完整影片（燈箱角落「在新分頁開啟完整影片」；videoUrl 為本站託管的 20 秒精華片段，由 tools/make_highlight.sh 產生） */
  videoFullUrl?: string;
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
    env: 'models/env_lplc.glb',
    videoUrl: 'videos/lplc.mp4',
    videoPoster: 'videos/lplc.jpg',
    videoFullUrl: 'https://znxuyz.github.io/L.P.S.D-System/media/lplc-intro.mp4',
    hotspots: [
      {
        title: '資金流向熱力圖',
        body: '方塊面積＝今日成交額、顏色＝漲跌幅（紅漲綠跌），依產業分組。一眼看出「錢今天流到哪裡」，盤中事件會從角落跳出通知。',
        at: [-0.8, 0.25, -0.6],
        fx: [
          { node: 'Fx_sector0', kind: 'stretch', amt: 1.7, delay: 0.0, dur: 2.4 },
          { node: 'Fx_sector1', kind: 'stretch', amt: 1.9, delay: 0.15, dur: 2.4 },
          { node: 'Fx_sector2', kind: 'stretch', amt: 1.4, delay: 0.3, dur: 2.4 },
          { node: 'Fx_sector3', kind: 'stretch', amt: 1.5, delay: 0.45, dur: 2.4 },
          { node: 'Fx_sector4', kind: 'stretch', amt: 1.6, delay: 0.6, dur: 2.4 },
          { node: 'Fx_sector5', kind: 'stretch', amt: 1.3, delay: 0.75, dur: 2.4 },
        ],
      },
      {
        title: '拉普拉斯之眼・市場情報',
        video: true,
        body: '產業資金流排行、加權指數與台指期、每 5 分鐘的資金輪動、國內外大事件與重大訊息，以及融資維持率等大盤風險指標。',
        at: [0, 2.2, -0.1],
        fx: [
          { node: 'Spin0', kind: 'whirl', amt: 12.5664, dur: 2.8 },
          { node: 'Spin0', kind: 'stretch', axis: 'x', amt: 1.4, dur: 2.8 },
          { node: 'Spin0', kind: 'stretch', axis: 'y', amt: 1.4, dur: 2.8 },
          { node: 'Spin0', kind: 'stretch', axis: 'z', amt: 1.4, dur: 2.8 },
          { node: 'SpinR0', kind: 'whirl', amt: -12.5664, dur: 2.8 },
          { node: 'SpinR0', kind: 'stretch', axis: 'x', amt: 1.5, dur: 2.8 },
          { node: 'SpinR0', kind: 'stretch', axis: 'y', amt: 1.5, dur: 2.8 },
          { node: 'SpinR0', kind: 'stretch', axis: 'z', amt: 1.5, dur: 2.8 },
          { node: 'FxHide_holo', kind: 'reveal', delay: 0.3, dur: 2.8 },
          { node: 'FxHide_holo', kind: 'stretch', amt: 2.5, delay: 0.3, dur: 2.8, glow: true },
          { node: 'FxHide_laser', kind: 'reveal', dur: 2.8, ring: 2.2 },
          { node: 'FxHide_laser', kind: 'sweep', amt: 2.2, freq: 1, dur: 2.8 },
          { node: 'Billboard0', kind: 'pulse', amt: 0.15, dur: 1.4 },
        ],
      },
      {
        title: 'K 線型態辨識',
        body: '全部上市櫃股票與 ETF：日 K、20 多種型態自動辨識，附多頭／空頭行情下的歷史勝率，再加上技術指標、籌碼與基本面綜合評分。',
        at: [1.25, 0.75, -1.55],
        fx: [
          { node: 'Fx_kline', kind: 'slide', amt: 0.25, dur: 2.6 },
          { node: 'FxHide_wmark', kind: 'reveal', delay: 0.5, dur: 2.0 },
        ],
      },
      {
        title: '五大選股策略',
        body: '低基期低本益比、動能成長、高股息、特殊事件、籌碼技術——五種策略的條件與篩選結果，一鍵就能在熱力圖上亮出來。',
        at: [-1.45, 0.75, 1.3],
        fx: [
          { node: 'Fx_lens0', kind: 'slide', amt: 0.0, dur: 2.6 },
          { node: 'Fx_lens1', kind: 'slide', amt: 0.12, dur: 2.6 },
          { node: 'Fx_lens2', kind: 'slide', amt: 0.24, dur: 2.6 },
          { node: 'Fx_lens3', kind: 'slide', amt: 0.36, dur: 2.6 },
          { node: 'Fx_lens4', kind: 'slide', amt: 0.48, dur: 2.6 },
          { node: 'Bob9', kind: 'slide', amt: -0.95, delay: 0.5, dur: 2.2 },
          { node: 'SpinR2', kind: 'whirl', amt: 6.2832, dur: 2.6 },
        ],
      },
      {
        title: 'ETF 透視',
        body: '殖利率、配息、折溢價、規模、受益人數、填息率；主動式 ETF 每天比對投信公告的真實持股，看出加碼與減碼。',
        at: [-1.5, 0.35, -1.45],
        fx: [
          { node: 'Fx_etf0', kind: 'slide', amt: 0.0, dur: 2.4 },
          { node: 'Fx_etf1', kind: 'slide', amt: 0.13, dur: 2.4 },
          { node: 'Fx_etf2', kind: 'slide', amt: 0.26, dur: 2.4 },
          { node: 'Fx_etf2', kind: 'hinge', axis: 'y', amt: 0.8, dur: 2.4 },
        ],
      },
      {
        title: '回到過去・模擬交易',
        body: '在看不到未來的情況下練習判斷：歷史回放模擬盤讓你回到任一天重新下單，網站也能加到主畫面、離線開啟。',
        at: [1.3, -0.3, 1.3],
        fx: [
          { node: 'SpinR1', kind: 'whirl', amt: 18.8496, dur: 2.4, glow: true, ring: 2.0 },
          { node: 'Spin1', kind: 'whirl', amt: -12.5664, dur: 2.4 },
        ],
      },
    ],
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
    env: 'models/env_stockgame.glb',
    hotspots: [
      {
        title: '買股票＝召喚契約',
        body: '每買進一檔新股票，就以它為契約從召喚陣中喚出一隻上古神獸；賣出時神獸進入圖鑑，獲利化為修為。',
        at: [0, 0.5, 0.05],
        fx: [
          { node: 'Fx_sigil', kind: 'whirl', amt: 12.5664, dur: 2.4, glow: true, ring: 1.6 },
          { node: 'Fx_beam', kind: 'stretch', amt: 2.4, dur: 2.6, glow: true },
          { node: 'Bob0', kind: 'whirl', amt: 12.5664, dur: 2.0 },
        ],
      },
      {
        title: '三維養成：等級・境界・魂環',
        body: '等級 Lv.1–999 對應累積投入；魂環境界對應持有時間；魂環特效（暗淡、脈動、旋轉、噴光）對應報酬率——你的投資組合就是神獸的模樣。',
        at: [0, 2.35, 0],
        fx: [
          { node: 'FxHide_wingL', kind: 'reveal', dur: 3.4 },
          { node: 'FxHide_wingL', kind: 'flap', axis: 'z', amt: 0.55, freq: 2.2, dur: 3.4 },
          { node: 'FxHide_wingR', kind: 'reveal', dur: 3.4 },
          { node: 'FxHide_wingR', kind: 'flap', axis: 'z', amt: -0.55, freq: 2.2, dur: 3.4 },
          { node: 'Spin0', kind: 'whirl', amt: -18.8496, dur: 2.8, glow: true, ring: 2.6 },
          { node: 'Spin0', kind: 'stretch', axis: 'x', amt: 1.35, dur: 2.8 },
          { node: 'Spin0', kind: 'stretch', axis: 'z', amt: 1.35, dur: 2.8 },
          { node: 'SpinR0', kind: 'whirl', amt: 18.8496, delay: 0.1, dur: 2.8, glow: true, ring: 3.2 },
          { node: 'SpinR1', kind: 'whirl', amt: 18.8496, delay: 0.2, dur: 2.8 },
        ],
      },
      {
        title: '魂環境界：凡 → 仙',
        body: '持股越久，境界越高：凡、靈、妖、神、聖、仙。六根石柱上的寶珠就是遊戲裡的六種魂環。',
        at: [1.4, 1.05, 0.81],
        fx: [
          { node: 'Billboard1', kind: 'slide', amt: 0.3, delay: 0.0, dur: 1.6 },
          { node: 'Billboard1', kind: 'whirl', amt: 6.2832, delay: 0.0, dur: 1.6 },
          { node: 'Billboard2', kind: 'slide', amt: 0.3, delay: 0.18, dur: 1.6 },
          { node: 'Billboard2', kind: 'whirl', amt: 6.2832, delay: 0.18, dur: 1.6 },
          { node: 'Billboard3', kind: 'slide', amt: 0.3, delay: 0.36, dur: 1.6 },
          { node: 'Billboard3', kind: 'whirl', amt: 6.2832, delay: 0.36, dur: 1.6 },
          { node: 'Billboard4', kind: 'slide', amt: 0.3, delay: 0.54, dur: 1.6 },
          { node: 'Billboard4', kind: 'whirl', amt: 6.2832, delay: 0.54, dur: 1.6 },
          { node: 'Billboard5', kind: 'slide', amt: 0.3, delay: 0.72, dur: 1.6 },
          { node: 'Billboard5', kind: 'whirl', amt: 6.2832, delay: 0.72, dur: 1.6 },
          { node: 'Billboard6', kind: 'slide', amt: 0.3, delay: 0.9, dur: 1.6 },
          { node: 'Billboard6', kind: 'whirl', amt: 6.2832, delay: 0.9, dur: 1.6 },
        ],
      },
      {
        title: '真實台股報價',
        body: '上市、上櫃與 ETF 都支援。盤中 9:05–13:30 每 30 秒自動更新，盤後使用最新收盤價。',
        at: [1.5, 0.5, 1.45],
        fx: [
          { node: 'FxHide_scan', kind: 'reveal', dur: 2.6 },
          { node: 'FxHide_scan', kind: 'sweep', amt: 0.55, freq: 1.5, dur: 2.6 },
          { node: 'Fx_stelecap', kind: 'whirl', amt: 6.2832, dur: 1.8 },
        ],
      },
      {
        title: '294 隻神祇圖鑑',
        body: '橫跨魔界、冥界、海界、佛界、道界、夢境界……13 大世界觀的原創上古神祇，附進度條、分類篩選與故事解鎖。',
        at: [-1.4, 0.15, 1.45],
        fx: [
          { node: 'FxHide_page0', kind: 'reveal', delay: 0.0, dur: 1.4 },
          { node: 'FxHide_page0', kind: 'hinge', axis: 'z', amt: 3.0, delay: 0.0, dur: 1.4 },
          { node: 'FxHide_page1', kind: 'reveal', delay: 0.3, dur: 1.4 },
          { node: 'FxHide_page1', kind: 'hinge', axis: 'z', amt: 3.0, delay: 0.3, dur: 1.4 },
          { node: 'FxHide_page2', kind: 'reveal', delay: 0.6, dur: 1.4 },
          { node: 'FxHide_page2', kind: 'hinge', axis: 'z', amt: 3.0, delay: 0.6, dur: 1.4 },
        ],
      },
      {
        title: '修為・簽到・任務',
        body: '升級、突破、解鎖特效、召喚與獲利都會給修為；每日簽到與連登里程碑、每日 3 任務與每週 4 任務，還有 30+ 項成就。',
        at: [-1.6, 0.75, -1.25],
        fx: [
          { node: 'Pulse1', kind: 'stretch', amt: 1.9, dur: 1.8, glow: true },
          { node: 'Fx_scroll', kind: 'stretch', amt: 1.4, dur: 2.6 },
          { node: 'Fx_rodb', kind: 'slide', amt: -0.25, dur: 2.6 },
        ],
      },
    ],
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
    videoUrl: 'videos/tianmu.mp4',
    videoPoster: 'videos/tianmu.jpg',
    videoFullUrl: 'https://cdn.jsdelivr.net/gh/znxuyz/TianMu-Island@main/docs/media/tianmu-island-tour-720p.mp4',
    hotspots: [
      {
        title: '天幕膠囊：靈液彈簧',
        video: true,
        body: '常駐在螢幕頂端正中的玄黑膠囊——無邊框、置頂、滑鼠穿透。懸停或點擊時以阻尼彈簧物理演算，像果凍般拉伸、回彈、流轉。',
        at: [0.25, 2.2, 0],
        fx: [
          { node: 'Bob_0', kind: 'stretch', axis: 'x', amt: 1.25, dur: 1.6 },
          { node: 'Bob_0', kind: 'stretch', axis: 'y', amt: 0.8, dur: 1.6 },
          { node: 'Bob_0', kind: 'stretch', axis: 'z', amt: 0.9, dur: 1.6 },
        ],
      },
      {
        title: '萬象樂律',
        body: '接管系統媒體（連瀏覽器裡的 YouTube 也行）：曲名、歌手、封面、同步歌詞、即時音訊頻譜與播放控制，全部收進膠囊裡。',
        at: [0.95, 3.1, -0.55],
        fx: [
          { node: 'Fx_note0', kind: 'slide', amt: 0.3, delay: 0.0, dur: 1.1 },
          { node: 'Fx_note0', kind: 'whirl', amt: 6.2832, delay: 0.0, dur: 1.1 },
          { node: 'Fx_note1', kind: 'slide', amt: 0.3, delay: 0.15, dur: 1.1 },
          { node: 'Fx_note1', kind: 'whirl', amt: 6.2832, delay: 0.15, dur: 1.1 },
          { node: 'Fx_note2', kind: 'slide', amt: 0.3, delay: 0.3, dur: 1.1 },
          { node: 'Fx_note2', kind: 'whirl', amt: 6.2832, delay: 0.3, dur: 1.1 },
          { node: 'Fx_note3', kind: 'slide', amt: 0.3, delay: 0.45, dur: 1.1 },
          { node: 'Fx_note3', kind: 'whirl', amt: 6.2832, delay: 0.45, dur: 1.1 },
          { node: 'SpinR_0', kind: 'whirl', amt: -6.2832, dur: 2.0 },
        ],
      },
      {
        title: '傳音入密',
        body: '系統通知化作符紙從天幕滑出；通知裡的驗證碼會自動辨識，一鍵就能複製。',
        at: [-0.8, 2.4, 0.55],
        fx: [
          { node: 'Fx_charm0', kind: 'flap', amt: 0.5, freq: 3.5, delay: 0.0, dur: 2.0 },
          { node: 'Fx_charm0', kind: 'slide', axis: 'z', amt: 0.25, delay: 0.0, dur: 2.0 },
          { node: 'Fx_charm1', kind: 'flap', amt: 0.5, freq: 3.5, delay: 0.15, dur: 2.0 },
          { node: 'Fx_charm1', kind: 'slide', axis: 'z', amt: 0.25, delay: 0.15, dur: 2.0 },
          { node: 'Fx_charm2', kind: 'flap', amt: 0.5, freq: 3.5, delay: 0.3, dur: 2.0 },
          { node: 'Fx_charm2', kind: 'slide', axis: 'z', amt: 0.25, delay: 0.3, dur: 2.0 },
        ],
      },
      {
        title: '玄漆描金・十二時辰',
        body: '專屬設計語言：玄黑漆面、五色描金、內嵌思源宋體、農曆日期與直書時辰；還會依晝夜自動變色，全螢幕時自動隱身。',
        at: [1.7, 2.15, 0.05],
        fx: [
          { node: 'Fx_hour0', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.0, dur: 0.9 },
          { node: 'Fx_hour1', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.08, dur: 0.9 },
          { node: 'Fx_hour2', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.16, dur: 0.9 },
          { node: 'Fx_hour3', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.24, dur: 0.9 },
          { node: 'Fx_hour4', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.32, dur: 0.9 },
          { node: 'Fx_hour5', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.4, dur: 0.9 },
          { node: 'Fx_hour6', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.48, dur: 0.9 },
          { node: 'Fx_hour7', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.56, dur: 0.9 },
          { node: 'Fx_hour8', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.64, dur: 0.9 },
          { node: 'Fx_hour9', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.72, dur: 0.9 },
          { node: 'Fx_hour10', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.8, dur: 0.9 },
          { node: 'Fx_hour11', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.88, dur: 0.9 },
          { node: 'Spin_0', kind: 'whirl', amt: 6.2832, dur: 2.4, ring: 2.4 },
        ],
      },
      {
        title: '洞府設施',
        body: '外掛式「法器」架構，每個功能都能獨立載入；設定面板、開機啟動、系統匣圖示，以及附 SHA-256 校驗的自動更新。',
        at: [-1.05, 0.65, 0.85],
        fx: [
          { node: 'Fx_roof1', kind: 'slide', amt: 0.3, dur: 2.6 },
          { node: 'Fx_pavglow', kind: 'pulse', amt: 0.08, dur: 2.6, glow: true },
          { node: 'Fx_lant0', kind: 'flap', amt: 0.5, freq: 2, delay: 0.0, dur: 2.2 },
          { node: 'Fx_lant1', kind: 'flap', amt: 0.5, freq: 2, delay: 0.1, dur: 2.2 },
          { node: 'Fx_lant2', kind: 'flap', amt: 0.5, freq: 2, delay: 0.2, dur: 2.2 },
          { node: 'Fx_lant3', kind: 'flap', amt: 0.5, freq: 2, delay: 0.3, dur: 2.2 },
        ],
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
    env: 'models/env_guardian.glb',
    videoUrl: 'videos/guardian.mp4',
    videoPoster: 'videos/guardian.jpg',
    videoFullUrl: 'https://cdn.jsdelivr.net/gh/znxuyz/ClassroomManagementSystem2.0@main/docs/demo.mp4',
    hotspots: [
      {
        title: '從蛋到守護神獸',
        body: '8 種台灣特有種（台灣黑熊、石虎、帝雉、穿山甲……）各有 4 個成長階段。累積經驗只增不減，讓孩子看著自己的守護獸一步步長大。',
        at: [1.35, 0.9, 1.0],
        fx: [
          { node: 'Billboard0', kind: 'flap', axis: 'z', amt: 0.25, freq: 5, dur: 1.2 },
          { node: 'Fx_rune0', kind: 'whirl', amt: 6.2832, delay: 0.4, dur: 1.2, glow: true },
          { node: 'Billboard0', kind: 'slide', amt: 0.15, delay: 0.4, dur: 1.0 },
          { node: 'Fx_rune1', kind: 'whirl', amt: 6.2832, delay: 0.7, dur: 1.2, glow: true },
          { node: 'Billboard1', kind: 'slide', amt: 0.15, delay: 0.7, dur: 1.0 },
          { node: 'Fx_rune2', kind: 'whirl', amt: 6.2832, delay: 1.0, dur: 1.2, glow: true },
          { node: 'Billboard2', kind: 'slide', amt: 0.15, delay: 1.0, dur: 1.0 },
          { node: 'Fx_rune3', kind: 'whirl', amt: 6.2832, delay: 1.3, dur: 1.2, glow: true },
          { node: 'Billboard3', kind: 'slide', amt: 0.15, delay: 1.3, dur: 1.0 },
          { node: 'FxHide_evolve', kind: 'reveal', delay: 1.5, dur: 2.2, ring: 1.2 },
          { node: 'Bob_0', kind: 'pulse', amt: 0.4, delay: 1.5 },
          { node: 'Spin_0', kind: 'whirl', amt: 12.5664, delay: 1.5, dur: 2.0 },
        ],
      },
      {
        title: '樹屋教室・課堂工具',
        video: true,
        body: '點名出席、抽籤機（可以優先抽到「需要關心」的孩子）、計時器、聯絡簿自動匯整——老師上課需要的工具都在這裡。',
        at: [-0.2, 1.45, -0.35],
        fx: [
          { node: 'Fx_board', kind: 'whirl', amt: 6.2832, dur: 1.8 },
          { node: 'Spin_1', kind: 'whirl', amt: 6.2832, dur: 2.6 },
          { node: 'Fx_glant0', kind: 'flap', amt: 0.5, freq: 2, delay: 0.0, dur: 2.0 },
          { node: 'Fx_glant1', kind: 'flap', amt: 0.5, freq: 2, delay: 0.1, dur: 2.0 },
          { node: 'Fx_glant2', kind: 'flap', amt: 0.5, freq: 2, delay: 0.2, dur: 2.0 },
        ],
      },
      {
        title: '照護站：需要關心的孩子',
        body: '超過 3 天沒被關注，寵物會「微恙」；超過 7 天會「生病」。系統自動把這些孩子列進需要關心清單，提醒老師多看一眼。',
        at: [0.95, 0.15, -0.0],
        fx: [
          { node: 'Bob1', kind: 'pulse', amt: 0.35, dur: 1.6 },
          { node: 'Bob1', kind: 'slide', amt: 0.2, dur: 1.6 },
          { node: 'Billboard8', kind: 'slide', amt: 0.12, delay: 0.2, dur: 0.9 },
          { node: 'FxHide_care', kind: 'reveal', dur: 1.8, glow: true },
        ],
      },
      {
        title: '獎品商店・積分雙軌',
        body: '累積經驗用來進化、可用積分用來兌換。老師自訂獎品與點數，學生自行兌換、老師確認發放。',
        at: [-1.35, 0.35, 0.35],
        fx: [
          { node: 'Fx_awning', kind: 'flap', amt: 0.25, freq: 3, dur: 1.6 },
          { node: 'Fx_prize0', kind: 'slide', amt: 0.15, delay: 0.0, dur: 1.0 },
          { node: 'Fx_prize0', kind: 'whirl', amt: 6.2832, delay: 0.0, dur: 1.0 },
          { node: 'Fx_prize1', kind: 'slide', amt: 0.15, delay: 0.12, dur: 1.0 },
          { node: 'Fx_prize1', kind: 'whirl', amt: 6.2832, delay: 0.12, dur: 1.0 },
          { node: 'Fx_prize2', kind: 'slide', amt: 0.15, delay: 0.24, dur: 1.0 },
          { node: 'Fx_prize2', kind: 'whirl', amt: 6.2832, delay: 0.24, dur: 1.0 },
          { node: 'Fx_prize3', kind: 'slide', amt: 0.15, delay: 0.36, dur: 1.0 },
          { node: 'Fx_prize3', kind: 'whirl', amt: 6.2832, delay: 0.36, dur: 1.0 },
          { node: 'Spin2', kind: 'slide', amt: 0.45, dur: 1.2 },
          { node: 'Spin2', kind: 'whirl', axis: 'x', amt: 18.8496, dur: 1.2 },
        ],
      },
      {
        title: '領地佔領戰',
        body: '分組對抗的即時佔領遊戲，搭配線上測驗（可一鍵從 Excel 匯入題庫）與教室大屏投影模式，全班一起見證成長。',
        at: [0.2, 0.25, -0.5],
        fx: [
          { node: 'Fx_flag0', kind: 'flap', axis: 'y', amt: 0.6, freq: 3, delay: 0.0, dur: 2.0 },
          { node: 'Fx_flag1', kind: 'flap', axis: 'y', amt: 0.6, freq: 3, delay: 0.2, dur: 2.0 },
          { node: 'Fx_flag2', kind: 'flap', axis: 'y', amt: 0.6, freq: 3, delay: 0.4, dur: 2.0 },
        ],
      },
    ],
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
    env: 'models/env_care.glb',
    videoUrl: 'videos/care.mp4',
    videoPoster: 'videos/care.jpg',
    videoFullUrl: 'https://znxuyz.github.io/C.A.R.E.-System/media/care-system-intro.mp4',
    hotspots: [
      {
        title: '違規登錄',
        body: '學號一輸入，立刻帶出姓名、班級與「15 天內已幾次」；選類型、地點、節次就完成登錄，並提示該發哪一張紙本反思卡。',
        at: [-0.62, 0.1, 1.5],
        fx: [
          { node: 'Fx_screen', kind: 'hinge', amt: -0.45, dur: 2.6 },
          { node: 'FxHide_logged', kind: 'reveal', delay: 0.5, dur: 2.4 },
          { node: 'FxHide_logged', kind: 'slide', amt: 0.12, delay: 0.5, dur: 2.4 },
        ],
      },
      {
        title: '15 天再犯偵測・三次門檻',
        body: '每筆登錄自動回溯 15 天（含當天）；累計達 3 次立即警示，並自動排入安全觀察員追蹤。視窗天數與門檻都能在後台調整。',
        at: [1.41, -0.3, 0.2],
        fx: [
          { node: 'Lit_0', kind: 'flash', delay: 0.0 },
          { node: 'Lit_1', kind: 'flash', delay: 0.08 },
          { node: 'Lit_2', kind: 'flash', delay: 0.16 },
          { node: 'Lit_3', kind: 'flash', delay: 0.24 },
          { node: 'Lit_4', kind: 'flash', delay: 0.32 },
          { node: 'Lit_5', kind: 'flash', delay: 0.4 },
          { node: 'Lit_6', kind: 'flash', delay: 0.48 },
          { node: 'Lit_7', kind: 'flash', delay: 0.56 },
          { node: 'Lit_8', kind: 'flash', delay: 0.64 },
          { node: 'Lit_9', kind: 'flash', delay: 0.72 },
          { node: 'Lit_10', kind: 'flash', delay: 0.8 },
          { node: 'Lit_11', kind: 'flash', delay: 0.88 },
          { node: 'Lit_12', kind: 'flash', delay: 0.96 },
          { node: 'Lit_13', kind: 'flash', delay: 1.04 },
          { node: 'Lit_14', kind: 'flash', delay: 1.12 },
          { node: 'Bob3', kind: 'flap', amt: 0.7, freq: 3, delay: 1.25, dur: 1.6 },
          { node: 'Bob4', kind: 'flap', amt: 0.7, freq: 3, delay: 1.45, dur: 1.6 },
          { node: 'Bob5', kind: 'flap', amt: 0.7, freq: 3, delay: 1.65, dur: 1.6 },
        ],
      },
      {
        title: '紙本反思卡回收',
        body: '紙本反思卡照舊。學生繳回後按「已回收」，當日就解除下課管制；未回收的由排程每日自動續管制。',
        at: [0, 0.65, 0.05],
        fx: [
          { node: 'Fx_front', kind: 'hinge', amt: 1.45, dur: 3.6 },
          { node: 'Fx_card0', kind: 'slide', amt: 0.5, delay: 0.7, dur: 3.0 },
          { node: 'Fx_card0', kind: 'slide', axis: 'z', amt: 0.14, delay: 0.7, dur: 3.0 },
          { node: 'Fx_card1', kind: 'slide', amt: 0.5, delay: 1.0, dur: 3.0 },
          { node: 'Fx_card1', kind: 'slide', axis: 'z', amt: 0.14, delay: 1.0, dur: 3.0 },
          { node: 'Fx_card2', kind: 'slide', amt: 0.5, delay: 1.3, dur: 3.0 },
          { node: 'Fx_card2', kind: 'slide', axis: 'z', amt: 0.14, delay: 1.3, dur: 3.0 },
        ],
      },
      {
        title: '安全觀察員值勤',
        body: '一日 5 節下課到學務處值勤，逐節打卡並記錄勸導人數；繳回行為檢討書後，下一個上課日自動解鎖。所有動作都寫入稽核軌跡。',
        at: [1.25, 0.25, -1.2],
        fx: [
          { node: 'Fx_search', kind: 'whirl', amt: 6.2832, dur: 3.2 },
          { node: 'FxHide_beam', kind: 'reveal', dur: 3.2 },
          { node: 'Fx_logcover', kind: 'hinge', axis: 'z', amt: 2.6, delay: 0.3, dur: 3.0 },
        ],
      },
      {
        title: '公開唯讀看板',
        video: true,
        body: '其他老師不需帳號就能查看每日概況——預設只顯示統計數字，不含姓名、學號與個別明細。',
        at: [-1.3, 0.35, -1.25],
        fx: [
          { node: 'Fx_bar0', kind: 'stretch', amt: 2.6, delay: 0.0, dur: 2.6 },
          { node: 'Fx_bar1', kind: 'stretch', amt: 3.2, delay: 0.15, dur: 2.6 },
          { node: 'Fx_bar2', kind: 'stretch', amt: 2.2, delay: 0.3, dur: 2.6 },
        ],
      },
      {
        title: '正向管教保障',
        body: '管制期間仍可正常飲水與如廁（介面常駐提示）；免記或撤銷都必須填寫事由，保障每位學生。',
        at: [1.35, 0.2, 1.25],
        fx: [
          { node: 'FxHide_jet', kind: 'reveal', dur: 2.4, ring: 0.9 },
          { node: 'FxHide_jet', kind: 'stretch', amt: 1.6, delay: 0.1, dur: 2.2 },
        ],
      },
    ],
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
    env: 'models/env_admin.glb',
    videoUrl: 'videos/admin.mp4',
    videoPoster: 'videos/admin.jpg',
    videoFullUrl: 'https://znxuyz.github.io/School-Administration/docs/demo.mp4',
    hotspots: [
      {
        title: '四階段公文鐵道',
        body: '每個計畫拆成步驟，分屬「計畫 → 核定 → 執行 → 結案」四站；卡片上的節點軌道一眼看出計畫走到哪一段，還能登記公文流向。',
        at: [0.55, 0.3, 1.5],
        fx: [
          { node: 'Spin0', kind: 'whirl', amt: 6.2832, dur: 2.4 },
          { node: 'FxHide_steam', kind: 'reveal', dur: 2.4 },
          { node: 'Billboard1', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.4, dur: 0.9 },
          { node: 'Billboard2', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.7, dur: 0.9 },
          { node: 'Billboard3', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 1.0, dur: 0.9 },
          { node: 'Billboard4', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 1.3, dur: 0.9 },
        ],
      },
      {
        title: '逾期與公文卡關提醒',
        body: '逾期、久未更新、公文卡關的工作會被自動標示，並出現在統計磚與本週待辦裡，避免行政工作被遺忘。',
        at: [0.03, 0.25, 0.86],
        fx: [
          { node: 'Fx_gate', kind: 'hinge', amt: 1.45, dur: 2.6 },
          { node: 'Pulse0', kind: 'pulse', amt: 0.3, delay: 0.2, dur: 1.2, glow: true },
        ],
      },
      {
        title: '處室總覽',
        video: true,
        body: '主任看得到同處室本學年度「還要辦」的進度看板：進行中 / 逾期 / 待更新 / 已完成 / 公文卡關，一打開就是現在該看的東西。',
        at: [0, 1.05, 0],
        fx: [
          { node: 'Billboard0', kind: 'slide', amt: 0.25, dur: 2.8 },
          { node: 'FxHide_ovL', kind: 'reveal', delay: 0.3, dur: 2.6 },
          { node: 'FxHide_ovR', kind: 'reveal', delay: 0.3, dur: 2.6 },
        ],
      },
      {
        title: '行事曆與記事',
        body: '月曆標出各計畫的開始、結束與結算期限；任一天都能寫記事，預設只有自己看得到，也能改成同處室或全校可見。',
        at: [1.5, 0.05, -1.5],
        fx: [
          { node: 'FxHide_calpage', kind: 'reveal', dur: 1.6 },
          { node: 'FxHide_calpage', kind: 'hinge', amt: -3.0, dur: 1.6 },
          { node: 'Fx_sticky0', kind: 'flap', amt: 0.5, freq: 3, delay: 0.3, dur: 1.4 },
          { node: 'Fx_sticky1', kind: 'flap', amt: 0.5, freq: 3, delay: 0.4, dur: 1.4 },
          { node: 'Fx_sticky2', kind: 'flap', amt: 0.5, freq: 3, delay: 0.5, dur: 1.4 },
        ],
      },
      {
        title: '搜尋與結案歸檔',
        body: '關鍵字加上學年度、處室、負責人、階段、公文所在、狀態等篩選；全部步驟完成的計畫自動歸入「已結案」。',
        at: [0.55, -0.2, -0.55],
        fx: [
          { node: 'Fx_mag', kind: 'sweep', axis: 'x', amt: 0.3, freq: 1.5, dur: 2.2 },
          { node: 'Fx_mag', kind: 'slide', amt: 0.08, dur: 2.2 },
          { node: 'Fx_drawer', kind: 'slide', axis: 'z', amt: 0.2, delay: 0.6, dur: 2.2 },
        ],
      },
      {
        title: '成員與權限',
        body: '管理員維護可登入的 Email 白名單、處室、職稱與權限；老師用自己的 Google 帳號登入，加到手機主畫面離線也打得開。',
        at: [-0.6, -0.05, 0.6],
        fx: [
          { node: 'Fx_badge0', kind: 'whirl', amt: 6.2832, delay: 0.0, dur: 1.2 },
          { node: 'Fx_badge1', kind: 'whirl', amt: 6.2832, delay: 0.15, dur: 1.2 },
          { node: 'Fx_badge2', kind: 'whirl', amt: 6.2832, delay: 0.3, dur: 1.2 },
        ],
      },
    ],
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
    videoUrl: 'videos/hcrs.mp4',
    videoPoster: 'videos/hcrs.jpg',
    videoFullUrl: 'https://cdn.jsdelivr.net/gh/znxuyz/H.C.R.S-HRES-Classroom-Reservation-System@main/public/media/hcrs-intro.mp4',
    hotspots: [
      {
        title: '公開借用月曆',
        video: true,
        body: '不用登入就能查看「借用狀況」月曆，只顯示已核准的借用。可依教室篩選，點一下日期就能看到當天各教室 × 節次的使用表。',
        at: [-0.1, -0.3, 0.85],
        fx: [
          { node: 'Fx_tile0', kind: 'slide', amt: 0.22, delay: 0.0, dur: 1.8 },
          { node: 'Fx_tile1', kind: 'slide', amt: 0.22, delay: 0.09, dur: 1.8 },
          { node: 'Fx_tile2', kind: 'slide', amt: 0.22, delay: 0.18, dur: 1.8 },
          { node: 'Fx_tile3', kind: 'slide', amt: 0.22, delay: 0.27, dur: 1.8 },
          { node: 'Fx_tile4', kind: 'slide', amt: 0.22, delay: 0.36, dur: 1.8 },
          { node: 'Fx_tile5', kind: 'slide', amt: 0.22, delay: 0.45, dur: 1.8 },
          { node: 'Fx_tile6', kind: 'slide', amt: 0.22, delay: 0.54, dur: 1.8 },
          { node: 'Fx_tile7', kind: 'slide', amt: 0.22, delay: 0.63, dur: 1.8 },
          { node: 'Fx_tile8', kind: 'slide', amt: 0.22, delay: 0.72, dur: 1.8 },
          { node: 'Fx_tile9', kind: 'slide', amt: 0.22, delay: 0.81, dur: 1.8 },
        ],
      },
      {
        title: '教室借用燈號與衝突檢查',
        body: '電腦、視聽、自然、禮堂……每間專科教室的借用狀態即時亮燈。送出申請時若和已核准的時段衝突，會直接擋下並列出衝突日期。',
        at: [-0.45, 0.35, -0.3],
        fx: [
          { node: 'Lit_0', kind: 'flash', delay: 0.0 },
          { node: 'Lit_1', kind: 'flash', delay: 0.12 },
          { node: 'Lit_2', kind: 'flash', delay: 0.24 },
          { node: 'Lit_3', kind: 'flash', delay: 0.36 },
          { node: 'Lit_4', kind: 'flash', delay: 0.48 },
          { node: 'Lit_5', kind: 'flash', delay: 0.6 },
          { node: 'Lit_6', kind: 'flash', delay: 0.72 },
          { node: 'Lit_7', kind: 'flash', delay: 0.84 },
        ],
      },
      {
        title: '三種借用方式',
        body: '只借一次、每週固定、每月固定——整學期的固定借用一次設定完成；管理員也能把舊 Excel 上的固定借用直接核准匯入。',
        at: [1.5, 0.65, 0.55],
        fx: [
          { node: 'Fx_arm0', kind: 'whirl', amt: 6.2832, delay: 0.0, dur: 1.6 },
          { node: 'Fx_arm1', kind: 'whirl', amt: -6.2832, delay: 0.15, dur: 1.6 },
          { node: 'Fx_arm2', kind: 'whirl', amt: 6.2832, delay: 0.3, dur: 1.6 },
        ],
      },
      {
        title: '主管一鍵審核',
        body: '主管在後台同意／不同意，也能切換成「自動同意」；核准時會再檢查一次衝突。所有借用可依狀態、教室、月份篩選並匯出 CSV。',
        at: [1.0, 0.8, 0.75],
        fx: [
          { node: 'Bob0', kind: 'stamp', amt: 0.23, dur: 1.6, ring: 1.2 },
          { node: 'FxHide_mark', kind: 'reveal', delay: 0.5, dur: 2.6 },
        ],
      },
      {
        title: '自動寄信通知',
        body: '教師送出申請 → 寄信給所有主管；審核完成 → 寄信通知申請人。只接受學校網域的 Google 帳號登入，前端與資料庫規則雙重把關。',
        at: [-1.6, 0.55, 0.6],
        fx: [
          { node: 'Fx_mlid', kind: 'hinge', amt: -1.3, dur: 3.0 },
          { node: 'Fx_letter', kind: 'slide', amt: 0.45, delay: 0.4, dur: 2.6 },
          { node: 'Spin0', kind: 'whirl', amt: 6.2832, delay: 0.6, dur: 2.2 },
        ],
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
    env: 'models/env_scheduling.glb',
    hotspots: [
      {
        title: '零衝突的立體課表',
        body: '同一間教室不會同時上兩門課、同一位老師不會同時教兩個班、同一個班不會同時排兩門課——大型國小 48 班、75 位老師、1312 個單元，31.7 秒求得最佳解，硬衝突 0 件。',
        at: [0.15, -0.15, 0.08],
        fx: [
          { node: 'Fx_day0', kind: 'slide', amt: 0.14, delay: 0.0, dur: 1.2 },
          { node: 'Fx_day1', kind: 'slide', amt: 0.14, delay: 0.12, dur: 1.2 },
          { node: 'Fx_day2', kind: 'slide', amt: 0.14, delay: 0.24, dur: 1.2 },
          { node: 'Fx_day3', kind: 'slide', amt: 0.14, delay: 0.36, dur: 1.2 },
          { node: 'Fx_day4', kind: 'slide', amt: 0.14, delay: 0.48, dur: 1.2 },
        ],
      },
      {
        title: '約束：老師的個別需求',
        body: '哪幾天不排課、只能排哪些時段、一天不超過幾節、不要連上太多節……所有需求都寫成約束，發光的線把同一位老師的課連在一起。',
        at: [-0.4, 0.2, -0.4],
        fx: [
          { node: 'Fx_thread', kind: 'stretch', amt: 1.6, dur: 2.2, glow: true },
        ],
      },
      {
        title: 'CP-SAT 求解器',
        body: '以 Google OR-Tools CP-SAT 求解。需求彼此打架時，不會只丟一句「無解」，而是給出「違反最少」的課表，並說明犧牲了什麼。',
        at: [0, 1.1, -0.3],
        fx: [
          { node: 'Fx_arm', kind: 'hinge', axis: 'y', amt: 1.57, dur: 3.6 },
          { node: 'Fx_cable', kind: 'stretch', amt: 1.6, delay: 0.5, dur: 2.8 },
          { node: 'Fx_grip', kind: 'slide', amt: -0.42, delay: 0.5, dur: 2.8 },
          { node: 'Fx_clawL', kind: 'hinge', axis: 'z', amt: -0.5, delay: 1.3, dur: 1.4 },
          { node: 'Fx_clawR', kind: 'hinge', axis: 'z', amt: 0.5, delay: 1.3, dur: 1.4 },
        ],
      },
      {
        title: '手動微調・連帶挪動',
        body: '排完還能拖拉微調；系統會自動連帶挪動受影響的課（同一位科任老師在別班的課、被共用的專科教室），全程不產生撞堂。',
        at: [0.15, 0.2, 0.71],
        fx: [
          { node: 'Drop_0', kind: 'slide', axis: 'x', amt: 0.56, delay: 0.0, dur: 1.6 },
          { node: 'Drop_1', kind: 'slide', axis: 'x', amt: -0.56, delay: 0.25, dur: 1.6 },
          { node: 'Drop_2', kind: 'slide', axis: 'x', amt: 0.56, delay: 0.5, dur: 1.6 },
          { node: 'Drop_3', kind: 'slide', axis: 'x', amt: -0.56, delay: 0.75, dur: 1.6 },
        ],
      },
      {
        title: '配課與鐘點檢查',
        body: '先設定每位老師要上哪些課，鐘點有沒有超載會即時檢查並標示出來。',
        at: [-0.75, -0.05, 1.68],
        fx: [
          { node: 'Fx_meter0', kind: 'stretch', amt: 1.5, delay: 0.0, dur: 1.8 },
          { node: 'Fx_pawn0', kind: 'slide', amt: 0.12, delay: 0.0, dur: 0.8 },
          { node: 'Fx_meter1', kind: 'stretch', amt: 1.5, delay: 0.1, dur: 1.8 },
          { node: 'Fx_pawn1', kind: 'slide', amt: 0.12, delay: 0.1, dur: 0.8 },
          { node: 'Fx_meter2', kind: 'stretch', amt: 1.5, delay: 0.2, dur: 1.8 },
          { node: 'Fx_pawn2', kind: 'slide', amt: 0.12, delay: 0.2, dur: 0.8 },
          { node: 'Fx_meter3', kind: 'stretch', amt: 1.5, delay: 0.3, dur: 1.8 },
          { node: 'Fx_pawn3', kind: 'slide', amt: 0.12, delay: 0.3, dur: 0.8 },
          { node: 'Fx_meter4', kind: 'stretch', amt: 1.5, delay: 0.4, dur: 1.8 },
          { node: 'Fx_pawn4', kind: 'slide', amt: 0.12, delay: 0.4, dur: 0.8 },
        ],
      },
      {
        title: '兩階段排課',
        body: 'Phase 1 先排科任與兼行政教師，並刻意為導師保留可用空格；Phase 2 導師各班獨立排。實測不保留空格時 6 次有 6 次失敗，保留後 0 次。',
        at: [0.9, -0.1, 1.75],
        fx: [
          { node: 'Fx_tray0_0', kind: 'slide', amt: 0.3, delay: 0.0, dur: 1.6 },
          { node: 'Fx_tray0_1', kind: 'slide', amt: 0.3, delay: 0.12, dur: 1.6 },
          { node: 'Fx_tray0_2', kind: 'slide', amt: 0.3, delay: 0.24, dur: 1.6 },
          { node: 'Fx_tray1_0', kind: 'slide', amt: 0.3, delay: 0.9, dur: 1.6 },
          { node: 'Fx_tray1_1', kind: 'slide', amt: 0.3, delay: 1.02, dur: 1.6 },
          { node: 'Fx_tray1_2', kind: 'slide', amt: 0.3, delay: 1.14, dur: 1.6 },
          { node: 'Pulse0', kind: 'pulse', amt: 0.3, delay: 1.6, dur: 1.2, glow: true },
        ],
      },
    ],
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
    env: 'models/env_passport.glb',
    hotspots: [
      {
        title: '六個年級入口',
        body: '一到六年級各有一座小島與一枚年級章；孩子點自己的年級就能直接進入對應的英聽練習頁面。',
        at: [-0.28, 0.45, -1.0],
        fx: [
          { node: 'Fx_stamp', kind: 'stamp', amt: 0.32, dur: 1.6, ring: 1.2 },
          { node: 'FxHide_pmark', kind: 'reveal', delay: 0.5, dur: 3.0 },
          { node: 'FxHide_leaf0', kind: 'reveal', delay: 1.2, dur: 1.6 },
          { node: 'FxHide_leaf0', kind: 'hinge', axis: 'z', amt: 3.0, delay: 1.2, dur: 1.6 },
          { node: 'FxHide_leaf1', kind: 'reveal', delay: 1.55, dur: 1.6 },
          { node: 'FxHide_leaf1', kind: 'hinge', axis: 'z', amt: 3.0, delay: 1.55, dur: 1.6 },
          { node: 'FxHide_leaf2', kind: 'reveal', delay: 1.9, dur: 1.6 },
          { node: 'FxHide_leaf2', kind: 'hinge', axis: 'z', amt: 3.0, delay: 1.9, dur: 1.6 },
          { node: 'Fx_cover0', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.0, dur: 2.6 },
          { node: 'Fx_cover1', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.15, dur: 2.6 },
          { node: 'Fx_cover2', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.3, dur: 2.6 },
          { node: 'Fx_cover3', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.45, dur: 2.6 },
          { node: 'Fx_cover4', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.6, dur: 2.6 },
          { node: 'Fx_cover5', kind: 'hinge', axis: 'y', amt: -1.9, delay: 0.75, dur: 2.6 },
        ],
      },
      {
        title: '英聽練習',
        body: '每個年級的英聽題目都整理成網頁，戴上耳機就能練習聽力與跟讀。',
        at: [0, 1.4, -0.2],
        fx: [
          { node: 'Bob3', kind: 'whirl', amt: 6.2832, dur: 2.4, ring: 1.4 },
          { node: 'Bob3', kind: 'slide', amt: 0.2, dur: 2.4 },
          { node: 'Fx_waveL', kind: 'pulse', amt: 0.5, dur: 2.4 },
          { node: 'Fx_waveR', kind: 'pulse', amt: 0.5, dur: 2.4 },
        ],
      },
      {
        title: '低年級也能自己點',
        body: '大大的按鈕、清楚的年級分類，不需要帳號或安裝任何東西，低年級孩子也能自己操作。',
        at: [0.28, 0.1, 0.45],
        fx: [
          { node: 'Fx_btn', kind: 'press', amt: 0.06, dur: 0.9 },
          { node: 'Bob0', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.3, dur: 1.2 },
          { node: 'Bob1', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.45, dur: 1.2 },
          { node: 'Bob2', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.6, dur: 1.2 },
        ],
      },
      {
        title: '在家也能練習',
        body: '網頁 24 小時都能開啟，孩子回家用平板或電腦就能繼續練習，不受上課時間限制。',
        at: [1.5, 0.0, -1.32],
        fx: [
          { node: 'Fx_door', kind: 'hinge', axis: 'y', amt: -1.6, dur: 2.6 },
        ],
      },
      {
        title: '協助部署上線',
        body: '老師做好了網頁，卻不知道怎麼發布到學校網站——我協助整理架構並部署到 GitHub Pages：純靜態、零伺服器成本，也交接了後續維護方式。',
        at: [-1.35, 1.0, -1.45],
        fx: [
          { node: 'Fx_arrow', kind: 'slide', amt: 0.35, dur: 2.0 },
          { node: 'FxHide_live', kind: 'reveal', delay: 0.6, dur: 2.6 },
          { node: 'Spin0', kind: 'whirl', amt: 6.2832, delay: 0.3, dur: 2.0 },
          { node: 'SpinR0', kind: 'whirl', amt: -6.2832, delay: 0.5, dur: 2.0 },
        ],
      },
    ],
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
    env: 'models/env_tablet.glb',
    hotspots: [
      {
        title: '文件下載專區',
        body: '學校平板載具計畫的所有文件集中在一個頁面：校務規範、導師必備、表單下載、學生宣導，一處就能找到。',
        at: [0.05, 0.2, 0.35],
        fx: [
          { node: 'FxHide_dl', kind: 'reveal', dur: 2.2 },
          { node: 'FxHide_dl', kind: 'slide', amt: -0.9, dur: 2.2 },
          { node: 'Fx_dbeam', kind: 'stretch', amt: 1.4, dur: 2.2, glow: true },
          { node: 'Pulse0', kind: 'slide', amt: -0.2, dur: 1.2 },
        ],
      },
      {
        title: '分類卡片',
        body: '文件依類別整理成卡片，每類的文件數量自動統計；新增分類只要在設定裡加一筆。',
        at: [0.25, 2.1, -0.45],
        fx: [
          { node: 'Fx_cat0', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.0, dur: 1.0 },
          { node: 'Fx_cat1', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.15, dur: 1.0 },
          { node: 'Fx_cat2', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.3, dur: 1.0 },
          { node: 'Fx_cat3', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.45, dur: 1.0 },
          { node: 'Fx_cat4', kind: 'whirl', axis: 'x', amt: 6.2832, delay: 0.6, dur: 1.0 },
        ],
      },
      {
        title: 'PDF ＋ Word 雙格式',
        body: '每份文件都提供 PDF 與可編輯的 Word 兩種格式下載，老師能直接修改表單再使用。',
        at: [-1.1, 1.35, -0.9],
        fx: [
          { node: 'Fx_doc0_0', kind: 'hinge', amt: 0.7, delay: 0.0, dur: 1.6 },
          { node: 'Fx_doc0_1', kind: 'hinge', amt: 0.7, delay: 0.15, dur: 1.6 },
          { node: 'Fx_doc0_2', kind: 'hinge', amt: 0.7, delay: 0.3, dur: 1.6 },
          { node: 'Fx_doc0_3', kind: 'hinge', amt: 0.7, delay: 0.45, dur: 1.6 },
        ],
      },
      {
        title: '改一行就上線',
        body: '不需要工程背景：把檔案上傳到 files 資料夾、在設定裡複製一行改成新文件，1～2 分鐘後網頁就會更新，並附完整維護說明。',
        at: [1.55, 0.35, 1.45],
        fx: [
          { node: 'Fx_pencil', kind: 'slide', amt: 0.12, dur: 2.4 },
          { node: 'Fx_pencil', kind: 'sweep', axis: 'x', amt: -0.4, freq: 2, delay: 0.2, dur: 2.0 },
          { node: 'FxHide_line', kind: 'reveal', delay: 0.6, dur: 2.2 },
        ],
      },
    ],
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
