# shopify-theme

## 專案目的
lifechillsnow.com 的 Shopify 佈景主題，基底是 Shopify 官方 Horizon 3.5.1。
網站經營北海道滑雪課程與裝備租借：課程預約用 BookThatApp（BTA），評價用 Judge.me。

品牌色、表單、按鈕、間距規範以 @.agents/AGENTS.md 為準，所有 UI 修改都要遵守。

## 結構
- Horizon 架構：`sections/`、`blocks/`（theme blocks）、`snippets/`、`templates/*.json`、`config/`、`locales/`
- schema 文字使用 locale key（`t:...`），不要寫死
- 重點檔案：`snippets/course-booking-form.liquid`（BTA 課程預約）、`assets/base.css`（全站覆寫）、`layout/theme.liquid`
- 根目錄的 `update_*.js`、`patch.js` 等是過去的一次性批次腳本，沒有要求就不要執行

## 工作流程
- 開發與驗證一律在未發布的副本主題 190500634707「LCS-視覺測試-20261111」（2026-11-11 由正式主題複製；舊 dev 主題 188842377299 已被 Shopify 回收，190496702547 已不用）（`.claude/launch.json` 的 `shopify-theme-dev`）。若再失效，用 `shopify theme duplicate --theme 147355926611 --name ... --force --json` 重新複製，更新 launch.json 與此 ID，不要改指向正式主題
- 預覽網址用 `https://lifechillsnow.com/?preview_theme_id=190500634707`（BTA 在 localhost 不運作）；只推改動的檔案：`shopify theme push --theme 190500634707 --only <檔案> --nodelete`
- `design-src/` 是 Flow 原始圖，只放本機，不進 git
- 不要對正式主題執行 `shopify theme dev`，那會把本機修改即時同步到正式站
- 推上正式站（`shopify theme push --allow-live`）前，必須先取得 Eric 明確同意
- 驗證：Playwright WebKit iPhone 14 + Chromium 1440px，要量實際尺寸（getBoundingClientRect），不能只看 DOM 存不存在
- 改完執行 `shopify theme check`
- 每次重要修改，在 PROGRESS.md 最上方新增一節：現象、根因、修法、驗證
- commit 訊息用繁體中文

## 優先使用的 skill
| 情境 | Skill |
|---|---|
| 修飾、審查、評論既有頁面 | `/impeccable`（audit / polish / critique） |
| 無障礙與介面規範檢查 | `web-design-guidelines` |
| 新 section / block 的視覺方向 | `frontend-design`、`design-taste-frontend`（一定要套 AGENTS.md 的品牌色） |
| Hero banner、品牌素材 | `ui-ux-pro-max:banner-design`、`ui-ux-pro-max:brand` |

## 有條件使用
- `gsap-*`：需要捲動或進場動畫時可使用 GSAP，以原生 JS 實作（不包 React、不引入前端框架）

## 不要用
- `shadcn-ui`、`react-vite-dashboard`、`stitch-*`：本專案是 Liquid 加原生 JS，沒有 React、Tailwind 或 Stitch
- `hallmark`：預設不用於既有主題；只有 Eric 明確點名（例如 audit 或 study）時才使用
- `nothing-design`：跟本專案的品牌色衝突
- Impeccable 產出的 DESIGN.md 只是參考，品牌規範一律以 AGENTS.md 為準
