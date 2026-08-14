# BTA 課程預約表單 — 進度文件

最後更新：2026-08-15

## ✅ 2026-08-15：Stage 3 加購 Modal 三項體驗優化（風險聲明條件觸發 + 頂部固定總金額 + 桌機加寬）

**只改了 `assets/course-stage2-module.js`（`snippets/cart-stage2-trigger.liquid` 沒有異動，呼叫端介面沒變）。已 commit（`0a8b2fc`），三項優化正式完工。**

### A：風險聲明改為條件觸發

原本不管「官方專屬裝備加租」開關開不開，風險聲明＋必勾同意 checkbox 都固定顯示。改成把風險聲明整段（連同必勾同意 checkbox）搬進 `.accordion-content`（開關本身既有的展開/收合容器）裡面，並在其後新增加購清單的巢狀顯示條件：

- 開關預設**改成關閉**（原本是 `checked`）。
- 開關關閉：整段（聲明＋checkbox＋清單）維持收合，送出按鈕**不**因為必勾同意而 disabled。
- 開關打開：聲明＋checkbox 出現，但加購清單仍隱藏（新增 `cs2-gear-list-hidden` class，`display:none !important`，獨立於 accordion 展開/收合的疊加防呆）；此時送出按鈕 disabled，直到勾選同意。
- 勾選同意：加購清單才出現，送出按鈕解除 disabled。
- **邊界情況**：開關打開→勾同意→選了裝備→又把開關關掉，此時即使加購 checkbox 底層還留著勾選狀態，`updateTotal()` 與送出時的屬性收集都改成先檢查 `gearToggle.checked`，開關關閉一律當作「沒有要加購」處理，不會把殘留的勾選算進總金額或送出資料裡。

### B：Modal 頂部固定顯示（含即時總金額）

新增 `.cs2-sticky-header`（`position: sticky; top: 0`），把進度條＋商品標題包進去，用「負 margin 抵銷 `.cs2-panel` 的 padding、內部重新補回 padding」讓它能貼齊捲動容器最頂端、蓋住底下捲動內容，同時維持跟面板一致的圓角。標題旁新增一個小總金額徽章（`.cs2-sticky-total`），跟原本按鈕上方的總金額（保留，沒有移除）由同一個 `updateTotal()` 同步更新，兩處數字一致。

### C：桌機版 Modal 加寬

`.cs2-panel` 的 `max-width` 在 `min-width:768px` 時從 640px 放寬到 880px，手機維持 `width:92%` 不變。學員加購清單容器（`[data-gear-rental-root]`）同步在桌機改成 `grid-template-columns: 1fr 1fr` 雙欄並排（手機維持單欄 flex 堆疊），減少垂直捲動長度。

### 驗證結果（草稿預覽網域，非 127.0.0.1，`test-course-fullday-peak` + `test-course-halfday-peak`）

- **A**：初始狀態確認 `accordion-content` 高度/opacity 皆為 0（真正收合，不是只有視覺遮蔽）、送出按鈕不 disabled；開關打開→聲明出現但清單仍帶 `cs2-gear-list-hidden`、按鈕變 disabled；勾同意→清單出現（`gearGroupCount` 正確對應人數）、按鈕解除 disabled；取消勾選→清單重新隱藏、按鈕重新 disabled；**開關關閉的邊界情況**：先勾同意選了「單板鞋組」（總金額正確變成 $14,375）後把開關關掉，確認總金額立即退回課程原價 $13,175、送出按鈕不 disabled，且送出後 `/cart.js` 確認**沒有**寫入任何 `學員N_加購_XXX` 屬性——殘留的勾選狀態確實在開關關閉時被正確排除。
- **B**：用 `getBoundingClientRect()` 在捲動前後比對 `.cs2-sticky-header` 的 `top` 值，確認捲動 300-400px 後完全沒有位移（同時用 `.cs2-footer` 的位置變化證實捲動確實有發生，不是誤判），總金額徽章在捲動到清單中段時即時更新正確。桌機截圖直接肉眼確認：進度條＋標題＋總金額徽章固定在畫面頂端，底下加購清單正常捲動。
- **C**：分別在 1280px、1440px、1920px 三種桌機視窗寬度下確認 `.cs2-panel` 都精準卡在 880px（沒有超版），且 `document.body.scrollWidth` 沒有超出視窗寬度；桌機截圖確認學員 1、學員 2 加購清單雙欄並排顯示。手機 375px 確認 Modal 寬度維持 92%（345px，未受桌機加寬影響），加購清單維持單欄堆疊（`display:flex`，不是 grid）。
- **與既有功能並存驗證**：完整走過兩次端對端流程（桌機 + 手機各一次，含勾選加購項目、勾必勾同意、送出），`/cart.js` 確認 properties 精準對應實際勾選狀態；「實際參加人數」驗證邏輯（在商品頁 BTA iframe 內、跟這次改動完全不同的程式碼路徑）另外單獨重測一次，預設不合理值時按鈕正確 disabled、提示文字正確顯示，確認沒有被這次 Stage 3 Modal 的改動影響。
- Console 檢查：只有既有已知的 `cart:update` 缺少 `detail` payload 錯誤，沒有新增錯誤。
- 測試完成後已清空購物車，沒有留測試資料。

---

## ✅ 2026-08-13（最晚）：Stage 3 加購金額總計——重新完整驗證通過（沒有程式碼改動）

**背景**：這個功能本身已經在 2026-08-12 完成並 commit（`73dd611`），這次是使用者要求在 `Allow Date Range` 實測/復原、`proxyBaseUrl` 修復等一連串中間改動之後，**重新走一次完整驗證**，確認沒有被間接影響。純測試，程式碼沒有異動，不需要 commit。

**驗證方式**：草稿預覽網域（`lifechillsnow.com?preview_theme_id=147355926611`，非 127.0.0.1），桌機 `test-course-fullday-peak`（實際參加人數選 2人，2 位學員組）+ 手機 375px `test-course-halfday-peak`。

- **初始狀態**：Modal 開啟時總計立即正確顯示課程原價（桌機 `$13,175.00`、手機 `$9,350.00`），未勾選任何加購項目時金額完全等於課程原價 ✅
- **多學員多項目即時加總**：桌機測試跨 2 位學員勾選 4 項（學員1：單板鞋組 $1,200＋雪鏡 $300；學員2：雪服帽鏡組 $1,000＋滑雪護具 $200），每勾一項都手動核對加總正確（`$13,175 → $14,375 → $14,675 → $15,675 → $15,875`）✅
- **取消勾選即時減少**：桌機、手機都測試取消勾選，金額立即正確扣除對應項目（例如手機測試 `$10,450 → $10,150`，扣掉的 $300 剛好對應取消的「安全帽」）✅
- **與必勾同意 checkbox、實際參加人數驗證並存不衝突**：
  - 勾選/取消加購項目完全不影響必勾 checkbox 的送出按鈕邏輯（未勾必勾同意時，不管加購選了什麼，送出按鈕都維持 disabled，金額顯示照常更新）
  - 測試中途意外選了跟人數方案不符的「實際參加人數」（4人，但 variant 是 1~2人方案），BTA 送出按鈕正確被攔截 disabled——證實這兩套疊加驗證邏輯（金額總計、實際參加人數）確實是各自獨立監聽各自的 DOM 事件，互不干擾
- **桌機、手機都驗證過**：手機 375px 額外確認 `.cs2-total-summary` 沒有橫向溢出、頁面本身也沒有橫向捲動
- **Console 檢查**：只有既有已知的 `cart:update` 缺少 `detail` payload 錯誤（2026-08-10 就記錄過的舊問題），沒有新增錯誤
- 最終完整送出一次，`/cart.js` 確認 properties 精準對應最後實際勾選的加購項目，沒有多寫或漏寫

**結論：功能維持正常，沒有被中間一連串的設定變更（Redirect、proxyBaseUrl 修復、Allow Date Range 實測/復原）間接影響。** 測試完成後已清空購物車，沒有留測試資料。

---

## ⚠️ 2026-08-13（更晚）：實測「Allow Date Range」——日曆確實變成範圍模式，但目前設定下多天選不了、且讓單日流程多了一步，建議先取消勾選

**背景**：使用者在 BTA 後台把測試 Widget（124456）的 `Allow Date Range` 打勾（Widget 層級設定，影響全部四個測試商品）。這次是**純測試回報，沒有修改任何程式碼**，比照前一節查證任務的方法在草稿預覽網域（`lifechillsnow.com?preview_theme_id=147355926611`，非 127.0.0.1）實測。

### 1. 日曆確實變成範圍模式（DOM 層級證據）

`test-course-fullday-peak`、`test-course-halfday-peak` 兩個商品都確認：日曆根節點 class 從原本的 `rdp sc-cWSHoV jtkrQN` 多了一個 `Range`（`rdp sc-cWSHoV jtkrQN Range`），確認是 Widget 層級設定、四個商品都會受影響（沒有逐一測完四個，但機制上是同一個設定，抽測兩個已足以確認一致性）。

### 2. 互動方式：目前設定下實際上還是只能選 1 天，而且比原本多一個步驟

實測發現（用 `javascript_tool` 逐步點擊、每步之間等待讓 React 狀態穩定後才讀取，避免誤判）：

- **點第一下**：該日期同時拿到 `rdp-day_selected`、`rdp-day_range_start`、`rdp-day_range_end` 三個 class——也就是「起始=結束=同一天」的 1 天範圍，但這個狀態**還沒被 widget 視為「已確認」**。
- **點另一個日期（不管是隔壁那天還是隔幾天）**：**不會延伸範圍**，而是整個重設成一個新的單日「範圍」（原本選的那天失去 selected class，新點的那天變成新的 start=end）。試過緊鄰隔天（21）、隔 2 天（22）、隔 3 天（23），結果都一樣——**目前這個設定完全沒辦法真的選出一個跨天的範圍**。
- **點同一天兩次**：第二次點擊後，才會被 widget 接受為「已確認的選擇」，這時候點「下一頁」才能正常進到 Stage 2。
- **只點一次就按「下一頁」**：畫面會跳出一則**英文、未翻譯**的錯誤訊息「**Please select finish date**」，擋住流程，不會進到 Stage 2。桌機、手機都重現一樣的訊息跟行為。

**白話結論**：這代表現在的設定「表面上」啟用了範圍選擇模式（DOM 有 Range class、有 finish date 檢查），但**實際上選不出多天**——原因很可能是官方文件提到的「Enter the minimum and maximum values for the Date Range」這組必要的最短/最長天數設定還沒配置（只勾了 `Allow Date Range` 這一個開關，文件裡是兩個步驟）。**淨效果是：現有的單日選擇流程從「點一下」變成「要點兩下同一天」，且中間如果客人直覺點了另一天會被重設、卡在英文錯誤訊息，體驗上是倒退，而且多天功能還沒真的能用。**

### 3. 對既有功能的回歸測試——全部正常，沒有被影響

完整走過一次（`test-course-fullday-peak`，用「點同一天兩次」的方式過 Stage1）：

- Stage 2 表單：雪板類型/滑雪場/實際參加人數/通訊軟體/語言/兒童同行/保險同意，填寫跟送出都正常，沒有異常
- 送出後正常自動跳轉購物車，Stage 3 Modal 正常彈出
- **必勾同意 checkbox**：預設 disabled、未勾選狀態正確
- **實際參加人數驗證**（2026-08-12 剛做的功能）：另外重測一次「未觸碰任何欄位的預設狀態」，按鈕正確 disabled、提示文字正確顯示「您選擇的方案為 1-2 人，請填寫對應的實際參加人數」——**沒有被這次設定改動影響**
- **Stage 3 加購金額總計**（2026-08-12 剛做的功能）：正確顯示課程原價 `$13,175.00`，加購群組數正確對應人數
- 點「略過」→ `_stage2_completed: "skipped"` 正確寫入
- Console 沒有新增錯誤

### 4. `quantity` 欄位：目前沒有被影響，但多了一個新的 `Finish` property

`/cart.js` 確認：`quantity: 1`（沒變）、`price`/`line_price` 都跟原本一樣（`1317500`，沒有被乘以天數）——**因為目前選不出超過 1 天的範圍，「Date range updates quantity?」那個機制根本沒有被觸發的機會，所以現在還沒有真的踩到「課程商品 quantity 恆為 1」這個假設**。但 properties 裡多了一組**新欄位**：`"Finish": "08/20/2026"` + `"_finish_iso8601": "2026-08-20T15:59:59.000Z"`（原本只有 `Start`/`_start_iso8601`）。目前沒有觀察到這組新欄位造成任何功能異常，但這是一個結構性改動，值得記錄——如果之後真的能選出跨天範圍，`quantity` 是否開始代表天數、`Finish` 欄位的值會不會正確反映跨天範圍的結束日，都還沒驗證過。

### 建議

**目前這個設定的淨效果是「單日流程變差、多天功能還不能用」，建議業主評估是否要先取消勾選 `Allow Date Range`，恢復原本的單日選擇流程，等確認好「最短/最長天數」等額外設定後再重新測試。** 沒有嘗試修改任何程式碼或後台設定去解決這個問題，純粹回報現象，依照使用者指示等候決定。

### ✅ 後續：使用者已取消勾選，重新驗證確認恢復正常

使用者到 `bookthatapp.com` 把 `Allow Date Range` 取消勾選後，重新在草稿預覽網域測試 `test-course-fullday-peak`：

- 日曆根節點 class 仍然帶有 `Range` 字樣（`rdp sc-cWSHoV hOirtZ Range`）——**單看這個 class 名稱本身不可靠**，不能當作判斷依據（推測是日曆套件內部固定的複合 class 命名，不完全反映功能是否啟用）。
- **改用實際互動行為驗證才是準的**：只點一次日期、立刻按「下一頁」，**直接正常進入 Stage 2**（`August 20, 2026`），沒有再跳出「Please select finish date」錯誤——確認「點一下直接選定」的原始行為已經恢復，沒有殘留剛才那種「要點同一天兩次」的異常。
- 完整走完一次流程：`/cart.js` 確認 properties 只有 `Start`/`_start_iso8601`，**先前多出來的 `Finish`/`_finish_iso8601` 欄位已經不見了**，`quantity: 1`、`price` 都跟改動前一致。
- Stage 3 Modal 正常彈出，點略過後 `_stage2_completed: "skipped"` 正確寫入，Console 沒有新增錯誤。
- 測試完成後已清空購物車。

**結論：已確認完全恢復到原始單日選擇行為，沒有殘留異常。**

---

## 🔍 2026-08-13：多天預訂（最多3-4天）可行性查證——查證任務，未動任何程式碼

**任務性質**：業主想知道能不能讓客人選連續多天（最多3-4天）的課程日期範圍，而不是目前的單一日期。這次只查證可行性跟風險，**沒有實作任何功能，沒有異動任何程式碼**。

### 結論：技術上可行，不需要切換 Booking Type，而且有兩條實作路徑可選

目前設定 Booking Type: Rentals（BTA 內部對應「Product」booking profile），查證確認**這個 profile 原生就支援多天預訂**，不需要換成 Appointments/Classes/Events 等其他 Booking Type。查到兩條路徑，風險/複雜度差很多：

**路徑 A：`Allow Date Range`（日期範圍選擇器，客人選起訖兩個日期）**
- Widget 設定裡有一個現成的 `Allow Date Range` 勾選項（在 Widgets → Rentals 的設定面板，跟目前已經打過交道的 `Redirect` 設定同一個面板），開啟後日曆從「選單一天」變成「選一個起訖區間」。
- 要配合開啟 BTA 後台 `Settings → Order Processing → Date range updates quantity?`，之後 BTA 才會依選中的天數自動把 Shopify 購物車的 `quantity` 設成天數，達到「每天加價」的計價效果（`每日單價 × 選中天數`）。
- **這是店鋪層級（store-wide）的設定，不是單一 Widget 專屬**——文件沒有明確寫清楚這個開關會不會連帶影響「沒有開 Allow Date Range」的其他既有商品（例如目前的課程商品是單日期選擇，quantity 恆為 1），這點需要實際在後台看到 Settings 頁面完整說明才能確認範圍，**這次沒能查證到**（見下方「未能完成查證的部分」）。
- **對現有架構的風險**：這條路徑會讓 Shopify 的 `quantity` 開始代表「天數」，直接踩到專案裡已經記錄多次的核心假設「課程商品 quantity 恆為 1，不能用 quantity 推算人數/資料」（[cart-stage2-trigger.liquid](snippets/cart-stage2-trigger.liquid) 的 `getAttendeeCount()` 特地繞開 `quantity`、改讀「實際參加人數」property 就是為了這個原因）。如果改用這條路徑，`quantity` 的語意會被 BTA 自己接管去表示天數，雖然「實際參加人數」目前是獨立的 property、理論上不會被覆蓋，但整體上這是對既有架構假設影響最大的一條路徑。日曆從單日互動變成範圍選擇（通常是兩次點擊：先選起始日、再選結束日），widget 的 DOM 結構/高度變化目前沒有實測confirm過，**決策 6 的定位邏輯（`position:absolute` + Hero banner 高度量測 + 雙 `ResizeObserver`）理論上因為本來就是動態量測 widget 實際高度，換成範圍選擇器應該還是能運作，但沒有實測驗證過，不能保證**。

**路徑 B：Duration 變體（用 Shopify Variant 表示天數，客人只選一個起始日期）**——**這條路徑風險明顯低很多，建議優先考慮**
- 官方文件明確描述這是「Pricing Based on Rental Duration」情境的標準做法：**在 Shopify 建立代表天數的 Variant（例如「1天」「2天」「3天」「4天」，各自設定價格），BTA 這邊把 Duration 基準設成 Variant 層級，客人的操作流程是「先選 Variant（天數方案）→ 再選一個起始日期」**——日曆本身完全不需要切換成範圍選擇器，維持現在的單日期選擇互動模式，BTA 會依 Variant 設定的天數自動計算應該連續佔用/鎖定的日期區間（這正是「Duration」欄位存在的目的，不需要另外開發）。
- **這條路徑幾乎是現有「人數方案」變體模式（`1~2人`／`3~4人`）的直接延伸**——專案已經有成熟的「用 Variant 表示分級選項、前端疊加驗證比對」的模式（實際參加人數驗證功能整套邏輯就是這樣做的），用同樣的手法多加一個「天數」維度，架構上是「做同樣的事情、多一組資料」，不是全新模式。
- **不需要開店鋪層級的 `Date range updates quantity?` 設定**，`quantity` 語意完全不受影響，繼續維持現有「恆為 1」的假設不變。
- **日曆互動模式不變**（維持單日期選擇），決策 6 的定位邏輯需要調整的可能性遠低於路徑 A——但因為沒能實測「多一個 Duration 下拉選單後 widget 實際渲染高度變化」，`ResizeObserver` 動態量測機制理論上會自動適應（這正是決策 6 當初刻意設計成動態量測而非寫死高度的原因），但仍建議实作前先用測試 Widget 實測一次確認。

### 對現有已完成功能的潛在影響評估

- **Stage2 Booking Fields（雪板類型/滑雪場/實際參加人數/通訊軟體等）**：這些是綁定商品 tag 的 BTA Booking Fields，跟日期選擇機制（單日 vs 範圍 vs Duration 變體）彼此獨立，**兩條路徑都不影響**。
- **Stage3 裝備加購／必勾同意 checkbox**：完全是購物車頁面獨立運作的邏輯（讀「實際參加人數」property、跟 BTA 送出流程解耦），**兩條路徑都不影響**。
- **「實際參加人數」驗證邏輯（2026-08-12 剛完成）**：`parseAttendeeRange()` 目前用正則解析 `variant.title`（例如「1 ~ 2 人」）取得人數範圍。**路徑 A（Allow Date Range）不影響**這個邏輯，因為人數方案 Variant 不變。**路徑 B（Duration 變體）如果把「天數」也做成 Variant 維度、跟「人數方案」合併成同一組 Variant（例如「1~2人 / 3天」），`variant.title` 的文字格式會改變，現有正則會解析失敗，需要同步更新**——但如果「天數」是獨立於「人數方案」之外的另一個獨立 Variant 選項（Shopify 商品可以有多個 Option 維度），這個既有邏輯完全不用動。這是實作前需要跟業主確認的產品設計細節，不是技術限制。
- **整體評估：路徑 B 是小改動**（沿用既有變體+前端驗證模式，日曆互動不變）；**路徑 A 是中等改動**（需要處理範圍選擇器 UI、店鋪層級設定變更、quantity 語意變化，且需要重新驗證決策 6 的日曆定位邏輯），都不是需要重新設計整體架構的大工程。

### 查證方式與依據

**已完成（純文件查證，公開資訊、不需要登入）**：
- [⚙️ Rental Widget Settings in BookThatApp](https://support.bookthatapp.com/hc/en-us/articles/5974258635663--Rental-Widget-Settings-in-BookThatApp)：確認現代 Widget（我們目前用的架構，非 Classic Booking Form）設定面板裡有 `Allow Date Range`、`Include Return Date`、`Show Choosing Duration` 等欄位，且面板同時列出 `Redirect` 設定——跟這次對話早些時候實際操作過的 Redirect 設定是同一個面板結構，確認文件描述的介面跟我們實際在用的介面一致，不是查到不相關版本的文件。
- [Product Rental Widget](https://support.bookthatapp.com/hc/en-us/articles/360001602196-Product-Rental-Widget)：現代 Widget 架構下完整的三種計價模型（固定天數 Variant／固定日租金／依天數分級日租金）設定流程，明確寫出「Booking type 選 Product」（對應我們的 Rentals）+「Widgets → Rentals」的安裝路徑，並指出「若用模型 b/c 記得開 Allow Date Range」——反向確認模型 a（固定天數 Variant，即路徑 B）**不需要**開 Allow Date Range。
- [How To Set Up Product Pricing Options](https://support.bookthatapp.com/hc/en-us/articles/213137343-How-To-Set-Up-Product-Pricing)：明確寫出模型 a 的「Customer Experience：Customers select the rental duration (variant) first and then select the start date」——直接證實路徑 B 的日曆互動維持單日期選擇，不是範圍選擇器。
- 另外兩篇 Classic Booking Form 舊版文件（[Item Rentals - Customer Specified Start and End Date](https://support.bookthatapp.com/hc/en-us/articles/333756999716-Item-Rentals-Customer-Specified-Start-and-End-Date)、[Item Rentals - Set Rental Period](https://support.bookthatapp.com/hc/en-us/articles/333757000136-Item-Rentals-Set-Rental-Period)）查過但**不是我們架構適用的文件**（BTA 自己在文件裡註明「Widgets are our newest type of booking form. We highly recommend using a widget over a classic form」），只用來交叉確認底層機制（日期範圍會轉換成 quantity 計算）跟現代 Widget 文件描述一致，沒有拿來當作主要依據。
- [How Do I Choose the Right Booking Form/Booking Type?](https://support.bookthatapp.com/hc/en-us/articles/211514406-How-Do-I-Choose-the-Right-Booking-Form-Booking-Type)：確認「As of May 2022, widgets are available for all booking scenarios except those that require Booking Form 6」——只有 Form 6（範圍+時間選擇器）不支援 Widget 化，我們需要的 Form 2（純日期範圍，無時間）功能有被 Widget 涵蓋。

**未能完成查證的部分（誠實記錄，不要假裝已確認）**：
- **沒有實際進到 BTA 後台看我們自己這個測試 Widget（124456）或正式 Widget（111783）的設定畫面**，無法用截圖確認 `Allow Date Range` 這個選項在我們自己的 Widget 設定介面上實際存在、長什麼樣子。原因：從 Shopify 後台點「Open BookThatApp.com」要跳轉到 BTA 獨立後台時，**Shopify 觸發了帳號身分驗證關卡（`TrustChallengeRequiredError`，導向 `admin.shopify.com/challenges/user_verification`，要求輸入 Shopify 帳號密碼）**——這是使用者帳號本身的安全機制，**不是我能夠或應該代為輸入密碼的地方，已停止嘗試繞過**，改用純文件查證的方式完成這次任務。
- **沒有新建任何測試用的 Widget/Service**（原規格要求的備案方式），因為同樣卡在上述登入門檻，進不去後台建立。
- 因此也**沒有實測「開啟 Allow Date Range 後，widget 實際渲染的 DOM 結構/高度變化」**，決策 6 定位邏輯是否需要調整，目前只是根據既有動態量測機制的設計推論「理論上應該還能運作」，不是實測結果。
- **「Date range updates quantity?」這個店鋪層級設定，具體的作用範圍（是否會影響沒開 Allow Date Range 的其他商品）沒有查到明確文件說明**，需要實際在 Settings → Order Processing 頁面看到完整敘述文字才能確認。

**建議下一步**：如果業主想繼續推進這個功能，建議先請使用者自己完成一次 Shopify 帳號驗證（清掉這個 trust challenge），下一個對話串就能接著實際進 BTA 後台截圖確認 `Allow Date Range` 設定畫面、並在一個新建的測試 Widget 上實測路徑 B（Duration 變體）的日曆行為，不影響任何正式商品或正式 Widget。

---

## ✅ 2026-08-13：`proxyBaseUrl` 問題已確認修復並結案

**背景**：測試 Widget（124456）`proxyBaseUrl` 誤指向 `127.0.0.1` 這個問題（見文件下方「✅ 已定位根因（2026-08-10）」專章），2026-08-11 已回報 BTA 客服。這次對話 BTA 客服回報已修正，比照當初定位問題時用過的嚴謹方法（完全跳出瀏覽器的 `curl`、不帶 cookie/session、交叉比對測試 Widget 跟正式 Widget）重新驗證，避免重蹈先前「這次有、下次沒有」的間歇性假象覆轍。

**驗證方式與結果**：

1. **第一次 curl 測試**（伺服器時間 `2026-08-13 13:43:37 GMT`，本機時間 21:43:06 台北時間）：
   ```
   curl -sD headers.txt "https://lifechillsnow.com/apps/bookthatapp/widgets/124456?locale=zh-TW&pp=disabled&product=8029961846867&shop=qgfchv-py&hostname=lifechillsnow.com&widgetPath=products" -o body.html
   ```
   回應內容（54,361 bytes）逐字串搜尋 `127.0.0.1` → **0 筆符合**（`grep -c` 結果為 0）。關鍵兩個信號都正確：
   ```
   <link rel="preconnect" href="https://lifechillsnow.com/apps/bookthatapp">
   <link rel="dns-prefetch" href="https://lifechillsnow.com/apps/bookthatapp">
   proxyBaseUrl: 'https://lifechillsnow.com/apps/bookthatapp'
   ```

2. **第二次 curl 測試**（伺服器時間 `2026-08-13 13:59:15 GMT`，本機時間 21:59:12 台北時間，**間隔約 15 分 38 秒**，用完全相同的 URL 重新請求）：結果跟第一次**逐位元組（byte-for-byte）完全一致**（`diff test1-body.html test2-body.html` 輸出 0 行差異），同樣 0 筆 `127.0.0.1`、`proxyBaseUrl` 同樣正確指向 `lifechillsnow.com`。**證實不是當下那一刻剛好正常的偶發性假象，是穩定的修復。**

3. **完整端對端流程驗證**（草稿預覽網域 `lifechillsnow.com?preview_theme_id=147355926611`，非 127.0.0.1，`test-course-fullday-peak`）：
   - 日曆正常顯示可選日期（22 天可選、20 天不可選，**不再是先前 bug 那樣整月全部顯示 Unavailable**）
   - 選日期 → Stage2 填完整資料（雪板類型/滑雪場/實際參加人數/通訊軟體/語言/兒童同行/保險同意）→ 送出 → **正確自動跳轉到 `/cart`**
   - `/cart.js` 確認 properties 完整正確（日期、雪板類型、滑雪場等全部正確寫入）
   - Stage 3 加購 Modal 正確自動彈出，點「略過」→ `_stage2_completed: "skipped"` 正確寫入
   - Console 檢查：只剩既有已知的 `cart:update` 缺少 `detail` payload 錯誤（2026-08-10 就記錄過的舊問題，待辦 27），**沒有再出現任何 `127.0.0.1` 相關的連線錯誤或 BTA bootstrap 例外**
   - 測試完成後已清空購物車

**結論：`proxyBaseUrl` 問題正式結案**，測試 Widget（124456）設定已穩定修復，跟正式 Widget（111783）表現一致。待辦事項第 31 點、「📋 待補事項」第 2 點已同步更新為已結案狀態。

---

## 📋 2026-08-12 整日總結（新對話串接手第一件事，先讀這段）

今天完成一系列使用者驗收回饋的修正跟新功能，全部已 commit，working tree 乾淨。下方依時間順序列出，細節都在各自的「✅」章節：

1. **「實際參加人數」驗證錯誤提示可見性優化**（commit `7842272`，文件記錄 commit `b9ba329`）：比照 Stage3 checkbox 的「即時反應」模式，送出按鈕即時 disabled/enabled 連動、按鈕正上方新增提示文字，跟欄位旁原有提示同步。過程中意外抓到並修正兩個問題：Stage2 Modal 開啟後 Stage1「下一頁」按鈕仍留在 DOM 導致誤判、MutationObserver 有時不會在 Modal 剛開啟時觸發（已知既有限制，加了保底輪詢解決）。
2. **測試 Widget（`124456`）Redirect 設定改為 Cart Page，端對端流程完整驗證通過**（commit `c22f974`）：桌機+手機各跑一次完整流程（選日期→Stage2送出→跳轉購物車→Stage3加購），確認跳轉行為正確、購物車 properties 完整、既有功能（必勾checkbox、實際參加人數驗證、原生加入購物車按鈕隱藏）都沒被影響。順便修正 PROGRESS.md 決策 3 一個過時的「Plan A 單頁不跳轉」前提（已確認技術上不可行，Stage 3 只能在購物車頁完成）。
3. **Stage 3 加購過程新增即時金額總計**（commit `73dd611`）：勾選/取消加購項目時，送出按鈕正上方即時顯示「結帳總額」（課程原價 + 已勾選加購項目加總），金額一律從既有的 `GEAR_ITEMS` 資料結構讀取，不寫死價格。跟必勾同意 checkbox、實際參加人數驗證兩套既有邏輯並存測試通過。
4. **方案資訊卡片全日/半日內容錯置修正 + 步驟指示條箭頭改細線**（commit `46775b2`，兩個獨立需求一起送出）：
   - 修正「您選擇的方案資訊」卡片時段文字判斷條件比對了一個實際上不存在的中文 tag「全天班」，導致全日商品也顯示半日文字的資料正確性問題。改用跟 `breadcrumbs.liquid` 一致的 handle/title 比對慣例。四個測試商品逐一核對，並確認目前沒有任何正式商品受影響（`course-booking-form.liquid` 掛載條件目前只有測試商品符合）。
   - 步驟指示條（「日期→資訊→加購」）中間的箭頭符號「➔」改成 2px 細線，產品頁跟購物車 Stage3 Modal 兩處複製的元件都改了。

**今天新增五個 commit**：`7842272` → `b9ba329` → `c22f974` → `73dd611` → `46775b2`。working tree 目前乾淨。

---

## ✅ 2026-08-12（最晚）：步驟指示條箭頭改為 2px 細線

**需求**：「日期→資訊→加購」步驟指示條中間的箭頭符號「➔」，改成一條約 2px 的細線。

**改動範圍**：這個步驟指示條有兩處複製（`assets/course-stage2-module.js` 的註解本來就寫「原封不動照搬」），兩處都改了，維持視覺一致：
- `snippets/course-booking-form.liquid`：產品頁 Stage1-3 頂部的進度條
- `assets/course-stage2-module.js`：購物車頁 Stage3 Modal 自己的進度條

`.step-line` 從純文字箭頭（`color`/`font-weight`）改成 `flex: 1; height: 2px; background-color: #3A7AB5;` 的線段，HTML 內容從 `➔` 改成空 `<div>`。用 `flex:1` 讓線段自動撐滿兩個步驟圓點之間的間距（原本 `justify-content: space-between` 的版面不用調整）。

**驗證**（草稿預覽網域，非 127.0.0.1，桌機 + 手機 375px 截圖確認）：產品頁進度條、購物車 Stage3 Modal 進度條，兩處都正確顯示 2px 細線（`getComputedStyle` 確認高度精確為 `2px`），沒有破版或跟圓點重疊，Console 沒有新增錯誤。

---

## ✅ 2026-08-12（最晚）：方案資訊欄位內容錯置（全日/半日）已修正

**問題**：「您選擇的方案資訊」卡片的「時段與集合地點」文字，全日課程商品頁誤顯示成半日課程的時段資訊，屬於會誤導客人的資料正確性問題。**只改了 `snippets/course-booking-form.liquid`，尚未 commit。**

**根因**：[snippets/course-booking-form.liquid:683](snippets/course-booking-form.liquid:683)（修正前）判斷條件寫的是 `product.tags contains '全天班'`，但實測四個測試商品的實際 tag 都是英文（`test-fullday`／`test-halfday`／`fullday`／`halfday`），**從來沒有任何商品真的帶「全天班」這個中文 tag**，導致這個條件永遠不成立，所有商品（包含全天商品）都掉進 `else` 分支，固定顯示半天班文字。不是條件寫反、也不是拼錯字，是比對了一個實際上不存在的 tag。

**修法**：改成跟 `snippets/breadcrumbs.liquid` 已經在用、也已經驗證過的 handle/title 雙重比對慣例一致：`product.handle contains 'fullday' or product.title contains '全天'`，不再依賴不存在的 tag，也讓兩處判斷全日/半日的邏輯保持一致（之後如果這個慣例要調整，兩處要一起改）。

**四個測試商品逐一核對**（草稿預覽網域，桌機 + 手機 375px）：
- `test-course-fullday-peak`／`test-course-fullday-offpeak`：正確顯示「全天班（6小時，含1小時午休）｜ 課程時間：09:00～15:00」✅
- `test-course-halfday-peak`／`test-course-halfday-offpeak`：正確顯示「半天班（3小時）｜ 上午：09:00～12:00 ／ 下午：13:00～16:00」✅

**正式商品排查結果**：用 `/collections/all/products.json` 列出全店 18 個商品逐一檢查 `product_type`／`handle`，**目前沒有任何正式（非測試）商品的 handle 帶「course」或 type 是「Course」**——`course-booking-form.liquid` 的掛載條件（`blocks/buy-buttons.liquid:225`）是 `product.type == 'Course' or product.handle contains 'course'`，兩者都不成立就完全不會渲染這段「方案資訊」卡片。實測 `fullday-class-peak-season`（PROGRESS.md 記錄的「黃金基準」原生商品）頁面上確認 `#DynamicCourseTimeText` 這個元素根本不存在，證實這個 bug **目前只影響四個測試商品，沒有影響任何真實客人看得到的正式商品頁**，不需要提高處理急迫性或另外回報。**這個結論只反映現在的商品清單狀態**——之後業主把正式課程商品也串接同一套 STEP UI（handle 或 type 符合上述條件）時，這個修正會自動套用到那些商品上，不需要再另外處理。

---

## ✅ 2026-08-12（更晚）：Stage 3 加購過程同步金額總計

**需求**：Stage 3 裝備加購 Modal 裡，客人勾選/取消加購項目時即時顯示目前累計金額總計（課程原價 + 已勾選加購項目加總），不用等送出才知道總金額。**只改了 `assets/course-stage2-module.js`、`snippets/cart-stage2-trigger.liquid`，尚未 commit。**

**實作內容**：
1. `snippets/cart-stage2-trigger.liquid`：呼叫 `renderStage2Form` 時新增 `coursePriceCents` 參數，直接讀購物車該筆 line item 現有金額（`final_line_price` 優先，退回 `line_price`/`price`），不寫死任何金額。
2. `assets/course-stage2-module.js` 的 `renderStage2Form`：
   - 送出按鈕正上方新增 `.cs2-total-summary`（「結帳總額 $X,XXX.00」），比照先前「實際參加人數」按鈕旁提示文字的位置邏輯。
   - `updateTotal()` 讀 `gearControls.getSelectedGear()`（原本就有、內部比對 `GEAR_ITEMS` 這個唯一價格資料來源）加總已勾選項目金額，加上 `coursePriceCents` 後格式化顯示。金額完全不寫死、不重複解析，價格調整只需要改 `GEAR_ITEMS`。
   - 在 `gearRoot` 上掛一個 `change` 事件委派監聽（這裡的 checkbox 是我們自己渲染的靜態 DOM，不像 BTA iframe 會被 React 重繪替換節點，不需要 capture phase 那套疊加防呆）。
   - Modal 開啟時立即呼叫一次 `updateTotal()`，滿足「初始顯示課程原價」的要求。

**驗證**（草稿預覽網域 `lifechillsnow.com?preview_theme_id=147355926611`，非 127.0.0.1，`javascript_tool` 操作 DOM）：
- 桌機（`test-course-fullday-peak`）：Modal 開啟時總計正確顯示課程原價 `$13,175.00`；勾選「單板鞋組」→ `$14,375.00`；再勾選「雪服帽鏡組」+「安全帽」→ `$15,675.00`；取消「單板鞋組」→ `$14,475.00`，每一步金額都手動核對加總正確。跟必勾同意 checkbox 邏輯並存驗證：勾選加購項目不影響送出按鈕的 disabled 狀態（仍然要勾了法律聲明才會 enable），送出後 `/cart.js` 確認只有當下實際勾選的項目被寫入 properties。
- 手機（375px，`test-course-halfday-peak`）：同樣驗證初始總計、多選加總（`$9,350.00` → `$12,150.00`）都正確，`.cs2-total-summary` 沒有橫向溢出、頁面本身也沒有橫向捲動。
- 跟「實際參加人數」驗證邏輯並存：測試過程中意外用錯人數（選了「3人」但方案是「1~2人」），BTA 送出按鈕正確維持 disabled，證實兩套邏輯確實互不干擾（各自監聽各自的 DOM 事件，沒有共用狀態）。
- Console 檢查：只有既有已知的 `cart:update` 缺少 `detail` payload 錯誤（2026-08-10 就記錄過），沒有新增錯誤。
- 測試完成後已清空購物車，沒有留測試資料。

**過程中一個踩到的環境問題**：這次對話開始時 `shopify theme dev` 背景程序（上一輪對話留下的）已經停止執行，改用 `preview_start({url:...})` 開瀏覽器分頁不會自動啟動它，導致一開始程式碼怎麼改、草稿主題都沒有同步更新（`fetch` 資產內容比對確認過，資產完全是舊版）。改成直接用 Bash 背景執行 `shopify theme dev --theme 147355926611`（不透過會自動開 localhost 分頁的 `preview_start({name:...})`，避免走上次記錄過的「Browser tool 一旦連過 127.0.0.1 可能污染同一個 session 其他分頁」那個坑）解決，之後才恢復正常同步。**下次新對話串接手，如果發現改了程式碼但瀏覽器怎麼測都沒反應，先確認 `shopify theme dev` 背景程序是不是還活著**（`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'theme dev' }`），不要預設它一直在跑。

---

## ✅ 2026-08-12（稍晚）：測試 Widget Redirect 設定改為 Cart Page，端對端流程完整驗證通過

使用者把測試 Widget（`124456`）的 Redirect 設定從「Continue Shopping」改成「Cart Page」，跟正式 Widget（`111783`）設定一致後，這次對話完整驗證了整條端對端流程，並確認先前功能都沒有被這次設定改動影響。**沒有異動任何程式碼**，只有更新這份文件的決策記錄（見下方「決策 3 修正註記」）跟 `snippets/cart-stage2-trigger.liquid` 一則過時的程式碼註解。

**完整端對端流程驗證（草稿預覽網域 `lifechillsnow.com?preview_theme_id=147355926611`，非 127.0.0.1）**：
- 桌機：`test-course-fullday-peak`，Stage1 選日期 → Stage2 填完整資料（雪板類型/滑雪場/實際參加人數/通訊軟體/語言/兒童同行/保險同意）→ 送出 → **確認自動跳轉到 `/cart`**（改設定後才有這個行為，改之前用 Continue Shopping 會停留在原產品頁）→ Stage3 Modal 立即彈出 → 點「略過」→ `/cart.js` 確認 `_stage2_completed: "skipped"`、其餘 BTA 收集的 properties 全部正確、`quantity` 沒被重置 → 重新整理購物車頁確認 Modal 不會重複彈出。
- 手機（375px）：`test-course-halfday-peak`（含半天班專屬的「時段」欄位），同樣走完 Stage1→Stage2→送出→跳轉購物車→Stage3，這次改成**完整勾選裝備加購並送出**（而不是略過）→ `/cart.js` 確認 `_stage2_completed: "true"`、`學員1_加購_單板鞋組: "需要"` 正確寫入，且跟桌機那筆課程商品的 properties 完全沒有互相污染（各自 line item 獨立）。
- 兩次測試的購物車 properties 都完整，包含日期、滑雪場、雪板類型等 BTA 原生欄位，訂單資料完整性確認正常。

**回歸測試（確認沒有被這次設定改動影響）**：
- Stage 3 必勾同意 checkbox：預設 disabled、勾選/取消即時雙向連動，桌機上額外驗證了勾選→取消→再勾選三段式切換，行為正常 ✅
- 實際參加人數驗證（2026-08-12 稍早新增的即時連動功能）：Stage2 Modal 剛開啟、未觸碰任何欄位的預設狀態就正確顯示按鈕 disabled + 按鈕旁提示文字，選到相符的值後即時恢復正常，桌機/手機都驗證通過，手機版提示文字沒有橫向溢出 ✅
- 原生「加入購物車」按鈕在 Course 商品頁依然正確隱藏（`display:none`，且 `sticky-add-to-cart` 元件不存在）✅
- Console 檢查：只有既有已知的 `cart:update` 缺少 `detail` payload 錯誤（2026-08-10 就記錄過的舊問題，跟這次設定改動無關），沒有新增錯誤 ✅

**測試完成後已清空購物車**（`/cart/clear.js`），沒有留下測試資料。

**文件修正**：原本「決策 3」記錄的「未來可能升級成 Plan A（商品頁不跳轉，同頁完成）」這個前提，這次確認不成立——Stage 3 技術上只能實作在購物車頁，BTA widget 完全沒有在單一產品頁收集加購資料的機制，不是「還沒做」，是「這條路徑不存在」。已在決策 3 原始記錄下方用引註方式補充修正說明（沒有刪除原始討論脈絡），另外一併修正了 `cart-stage2-trigger.liquid` 呼應這個前提的過時程式碼註解。

---

## ✅ 2026-08-12：實際參加人數驗證「錯誤提示可見性優化」已完成並 commit（`7842272`）

接續 2026-08-11 排定的下一個優先任務，把「實際參加人數」跟「人數方案」不符時的錯誤提示，從「只在送出時攔截、只顯示在欄位旁」升級成比照 Stage3 checkbox 的「即時反應」模式。**只改了 `snippets/course-booking-form.liquid`，已 commit（`7842272`）。**

**實作內容**：
1. 新增 `checkAttendeeCount(select)` 純計算函式，把「範圍解析＋比對」邏輯抽出來，`validateAttendeeCount()`（即時 UI 連動）跟送出攔截的 click handler 共用同一套判斷與文案，不再各自維護。
2. 新增 `validateAttendeeCount()`：「實際參加人數」select 的 `change` 事件、Stage1 人數方案切換（`cbf:variantChanged` 自訂事件）任一觸發，就重新判斷並同步三件事——送出按鈕 `disabled` 狀態、按鈕正上方新增的提示文字（`.cbf-attendee-count-button-hint`）、欄位旁原有錯誤提示（沿用不變，文字跟按鈕旁提示完全一致）。只清除「我們自己」造成的 disabled（用 `data-cbf-attendee-invalid` 標記），不會蓋掉 BTA 自己因其他必填欄位缺漏而設的 disabled 狀態。
3. `Bta.callbacks.variantChanged`（檔案最上方早期 `<script>`）新增 `document.dispatchEvent(new CustomEvent('cbf:variantChanged'))`，橋接給主要邏輯（在 iframe 內執行、不共用作用域）。

**過程中抓到並修正兩個實測才發現的問題（沒有照抄原本規格假設）**：
- **送出按鈕誤判問題**：Stage2 確認 Modal 開啟後，Stage1 日曆畫面自己的 `button[data-type="submit"]`（文字「下一頁」）依然留在 DOM 裡沒被移除（Stage2 是疊加的 ReactModal，不是取代 Stage1），導致整份 `doc` 裡同時存在兩個 `button[data-type="submit"]`。原本天真地用 `doc.querySelector(...)` 抓「第一個」會抓錯，變成在操作「下一頁」而不是真正的「立即預訂」。修法：優先在「實際參加人數」select 所在的 `.ReactModal__Content` 範圍內找按鈕，範圍找不到才退回全域第一個。
- **初始渲染有時抓不到的問題**：Stage2 Modal 剛開啟、使用者還沒手動變動任何欄位的那個當下，實測發現 `MutationObserver` 有時不會如預期觸發 `runUpdates()`（`syncProgressStep()` 這個既有函式也一起受影響、不會把進度條同步到步驟2，證實不是這次新增邏輯的問題，是 BTA Modal 開啟時的 DOM 變動有時候不會被目前的 observer 設定完整捕捉到），導致「預設值不合理時按鈕應立即 disabled」這條驗收標準摸不到。修法：比照這個檔案別處已有的「MutationObserver 保底輪詢」模式（`checkAndReveal` 旁的 `pollId`），新增 `setInterval(validateAttendeeCount, 700)` 當保底，跟 MutationObserver 雙重覆蓋，函式本身很輕量，indefinite 輪詢成本可忽略。

**驗證方式**：因為這次工具環境的 Browser pane 一直很不穩定（`navigate`/`screenshot` 頻繁 timeout、`shopify theme dev` reload 偶發連不上 BTA 導致 widget 完全不掛載、且這個 session 一開始 `preview_start` 自動開了一個 `localhost` 分頁——**踩到之前記錄過的「Browser tool proxy contamination」教訓**，懷疑污染了同一個 session 裡其他「乾淨」分頁的行為），改用直接在草稿預覽網域（`lifechillsnow.com?preview_theme_id=147355926611`，`test-course-fullday-peak`）用 `javascript_tool` 精準操作 DOM（點日期、點「下一頁」、對 select 派發真實 `change` 事件、直接呼叫 `window.Bta.callbacks.variantChanged(...)` 模擬人數方案切換）取代滑鼠座標點擊，逐一讀取 DOM 狀態驗證：
- 未觸碰任何欄位、Stage2 剛開啟的預設狀態（select 值為空）→ 按鈕立即 `disabled`、按鈕旁提示文字立即顯示、文字正確 ✅（這條在加保底輪詢前一度驗證失敗，加了才過）
- 選到跟方案相符的值（1-2人方案選 2人）→ 按鈕立即恢復可點擊、兩處提示都消失 ✅
- 模擬人數方案從「1~2人」切換到「3~4人」（不重新選 select，維持原本選的「2人」）→ 立即重新判定為不符、按鈕重新 disabled、提示文字正確更新成新範圍「3-4 人」的文案 ✅
- 手機版（375px）：提示文字沒有橫向溢出（`scrollWidth === clientWidth`）、跟按鈕間距 18px 不會擠在一起 ✅
- 為了排除是不是自己改壞了東西，曾用 `git stash` 切回 2026-08-11 commit 的原始程式碼、在同一個受污染的瀏覽器 session 裡重跑一次同樣流程，**同樣重現「Modal 剛開啟時 `syncProgressStep` 不會同步」的現象**，證實這是既有邏輯在這個工具環境下的既有限制或環境雜訊，不是這次改動造成的新回歸，才放心保留「保底輪詢」這個防禦性修法並還原自己的改動。

**使用者後續補測（同一天）**：因為這次工具環境的螢幕截圖/滑鼠點擊一直失敗，上面的驗證全部是用 `javascript_tool` 讀 DOM 狀態間接證明邏輯正確，沒有肉眼視覺確認。使用者接手後**自己在瀏覽器實機操作，確認桌機視覺（按鈕變灰、提示文字排版）跟手機視覺都正常，完整購物流程（選日期→填資料→加購→加入購物車）也正常運作，全數通過**。已 commit（`7842272`）。

---

## 📋 2026-08-11 整日總結（新對話串接手第一件事，先讀這段）

今天完成「實際參加人數」欄位從查證到落地的完整閉環：查清楚 BTA 平台能力限制 → 設計對應的前端補強方案 → 實作 → 用模擬欄位初測 → 業主在 BTA 後台建好真實欄位後再用真實欄位完整覆測。**下方「🔴 下一個對話串優先任務」是接手後第一件事，直接跳過去看即可，這段總結只是背景脈絡。**

1. **BTA Variant 支援度查證結論：不支援**。逐一檢查 BTA 後台 Booking Fields 所有欄位的「Apply to specific products」設定，介面跟官方文件都明確指出這個機制只能用 Shopify 商品 tag，沒有 Variant 層級的選項。查到一個容易混淆的「Variant Actions」功能，確認是完全不同的機制（容量單位、隱藏日曆開關），已排除混淆。結論：「實際參加人數」欄位只能做成不分級距的 1-4 下拉選單，需要另外疊加前端驗證比對是否跟客人選的人數方案（Variant）合理對應。詳見文件下方「1. 查證結論」段落。
2. **「實際參加人數」前端驗證（方案 A）完整實作並用真實欄位驗證通過**（commit `58b44c5`）。技術路徑跟原規格假設有一處重要落差、已用實測修正：`Bta.callbacks.variantChanged` 這個官方回呼必須在 BTA App Embed 腳本執行「之前」搶先掛好，晚了會被整個覆蓋掉；另外網路上有 2019 年舊文回報這個回呼「只在頁面載入時觸發」，這次實機測試證實目前版本已不 reproduce，使用者切換人數方案下拉選單時會正確再次觸發，沒有照抄舊資訊。業主當天稍晚在 BTA 後台建好真實欄位後（Label「實際參加人數」、Apply=`test-fullday`／`test-halfday`、Options 為「1人」~「4人」帶「人」字），已用真實欄位（非模擬）重新測過全部六個驗收情境，包含 `parseInt` 對「1人」這種帶字選項值的解析行為，全數通過。詳見文件下方「2、3」段落。
3. **BTA 客服溝通進度（背景等待中，非急迫）**：針對測試 Widget（124456）`proxyBaseUrl` 誤指向 `127.0.0.1` 的問題，已回報給 BTA 客服，目前在等對方 email 跟進回覆。這是背景等待狀態，不需要主動追蹤，等回信後再處理即可。跟這個問題相關的 Sidekick 建議「更改 BTA proxyBaseUrl 設定」線索，這次對話沒有排入優先任務，仍待查看。

**今天新增一個 commit**：`58b44c5`（實際參加人數欄位真實串接驗證通過）。working tree 目前乾淨。

---

## ✅ 已完成（2026-08-12，見上方新章節）：實際參加人數驗證的錯誤提示可見性優化

**這個任務已經完成，細節見文件最上方「✅ 2026-08-12：實際參加人數驗證『錯誤提示可見性優化』已完成」章節，下面是當初 2026-08-11 交接時寫的原始規格，保留供參考。**

**問題**：目前「實際參加人數」前端驗證（commit `58b44c5`）攔截不合理組合時，錯誤提示文字（例如「您選擇的方案為 1-2 人，請填寫對應的實際參加人數」）**只出現在「實際參加人數」欄位正下方**。Stage2 表單是一個固定高度、可捲動的區塊，欄位在表單中段、送出按鈕在最下方——使用者填完欄位往下捲到按鈕位置點擊送出時，畫面上通常已經看不到欄位旁邊那則錯誤提示了，點擊沒反應但看不出原因，體驗上容易誤以為按鈕壞掉。

**目前的技術現況**（供接手時快速定位）：
- 驗證邏輯在 `snippets/course-booking-form.liquid` 的 `setupAttendeeCountValidation()` 函式（`attachTranslationAndStepSync` 內）
- 錯誤訊息元素：`#cbf-attendee-count-error`，樣式定義在 `injectBtaStyleSkin()` 裡的 `.cbf-attendee-count-error`
- 送出按鈕：`button[data-type="submit"]`（BTA 原生按鈕，每個 Stage 都重複使用，文字會依步驟變化）
- 目前送出按鈕**沒有**依驗證結果做 enable/disable 連動——不合理組合時只是攔截點擊事件（`preventDefault`/`stopPropagation`），按鈕視覺上完全沒變化

**要做的事**：
1. **按鈕即時 disabled/enabled 連動**：比照 Stage3 checkbox（`assets/course-stage2-module.js` 的 `syncSubmitButtonState()`）已經驗證過的模式，在「實際參加人數」下拉選單的 `change` 事件裡即時判斷目前的值是否跟已選 Variant 合理對應，不合理就把 `button[data-type="submit"]` 設為 `disabled`（視覺上要明顯降低透明度／改變游標樣式），合理則恢復 `enabled`。**要注意**：BTA 這顆按鈕在不同 Stage 会被重複使用、文字內容會變（下一頁／確認預約等），監聽器要處理節點可能被 React 重繪替換的情況（比照這個檔案裡「監聽穩定容器、不監聽會被取代的節點」的既有寫法）。
2. **按鈕旁新增提示文字**：除了欄位旁的錯誤訊息，在送出按鈕附近（例如按鈕正上方）也加一則簡短提示（例如「請確認實際參加人數與方案相符」），讓使用者捲到按鈕位置時不需要往回捲就能看到问题所在。
3. **驗證要求**：桌機、手機都要測，確認捲動到按鈕位置時能立即看到「按鈕變灰」+「按鈕旁提示文字」，不需要往回捲才知道哪裡出錯。實機於正式網域草稿預覽網址驗證，不要用 127.0.0.1。用真實 BTA 欄位測試（欄位已經建好，見上方整日總結），不需要再用模擬欄位。

**不確定、需要接手時自行判斷或跟使用者確認的地方**：BTA 原生送出按鈕的即時 disable 是否會跟 BTA 自己的欄位必填驗證邏輯打架（例如按鈕本來就會因為其他必填欄位沒填而呈現某種狀態）——建議先實測目前 BTA 按鈕在「必填欄位缺漏」情境下的原生行為，再決定我們疊加的 disabled 邏輯要怎麼跟它共存，不要假設兩者互不影響。

---

## 📋 待補事項（非急迫，記錄避免遺忘）

1. `test-course-halfday-offpeak` 端對端流程補測——先前（2026-08-08/09）因瀏覽器自動化工具逾時中斷，沒能確認該筆訂單是否成功進購物車，非阻塞性問題，有空可以重新驗證一次或查 Shopify 後台訂單記錄確認
2. ~~BTA 客服 email 回覆追蹤~~ ✅ **已結案（2026-08-13）**：BTA 客服回報已修正測試 Widget（124456）`proxyBaseUrl` 設定，重新驗證通過，細節見文件最上方「✅ 2026-08-13：`proxyBaseUrl` 問題已確認修復並結案」章節。

---

## 📋 2026-08-11 更新：Variant 層級限制查證 + 「實際參加人數」前端驗證（方案 A）已完成

**今天沒有處理「🔴 明天最優先」的 Sidekick proxyBaseUrl 線索**（使用者這次對話沒有指派這個任務，優先權留待下次），純粹先處理「實際參加人數」欄位設計方向查證跟前端驗證邏輯，業主同一天稍晚在 BTA 後台建好欄位後，已用真正欄位補測六個驗收情境全數通過並 commit（見下方第 3 節）。

### 1. 查證結論：BTA Booking Fields 不支援依 Variant 動態限制選項範圍

逐一檢查 BTA 後台 Booking Fields 所有現有欄位（雪板類型、滑雪場、時段等）的「Apply to specific products」設定，**介面上明確寫著「by entering multiple tags (comma separated)」**，下拉選單列出的可選項目全部是 Shopify 商品 tag（`halfday`/`fullday`/`test-course`/`test-halfday`/`test-fullday`...），沒有任何 Variant 層級的選項。官方文件 [📝 Booking Fields](https://support.bookthatapp.com/hc/en-us/articles/360000335275--Booking-Fields) 也明確寫「Product-Specific Fields... using product tags」，全文沒有出現 "variant" 字眼。另外查到一個容易混淆的相似功能「[⚙️ Variant Actions in BookThatApp](https://support.bookthatapp.com/hc/en-us/articles/115001168503-Date-Picker-Settings)」，但那是完全不同的機制（每個 Variant 的容量 Units、隱藏日曆的 Hide 開關），跟限制 Booking Field 選項內容無關，已排除混淆。

**結論：「實際參加人數」只能做成單一 1-4 範圍下拉選單，不分級距**，需要另外疊加前端驗證。

### 2. 「實際參加人數」前端驗證（方案 A）已實作完成（`snippets/course-booking-form.liquid`）

**技術路徑，跟規格文件假設不完全一樣，過程中重要發現**：

- `window.Bta.callbacks.variantChanged` 這個 BTA 官方回呼**確實存在且可用，但要在 BTA App Embed 腳本執行「之前」就先掛好**（本檔案最上方新增一段不 defer 的 `<script>`，早於 BTA 自己的 bootstrap）。**實測證實**：如果 `window.Bta` 先被 BTA 自己的腳本初始化，才輪到我們設定，會被整個覆蓋掉，callback 永遠不會被呼叫。
- 網路上查到一篇 2019 年 Shopify 社群舊文，回報「`variantChanged` 只在頁面載入時觸發一次，使用者改選項不會再觸發」——**這次實機測試在目前版本已經不 reproduce**：頁面載入時觸發一次（拿到預設 variant），使用者切換「人數」下拉選單（1~2人 ↔ 3~4人）時也確實會再次觸發，拿到正確的新 variant。**沒有照抄舊資訊，是用真實環境重新測過的結論**，用 `window.__cbfSelectedVariantTitle` 這個橋接變數存起來供後面驗證邏輯讀取。
- `variant.title` 實測格式為 `"1 ~ 2 人"`／`"3 ~ 4 人"`（數字 空格 波浪號 空格 數字 空格 人），用正則 `/(\d+)\s*[~～\-]\s*(\d+)/` 解析出 min/max。
- 送出攔截手法：`doc.addEventListener('click', handler, true)` 掛在 iframe 的 `contentDocument` 最外層（capture phase），比 BTA 自己 React 事件系統的監聽時機更早攔截到點擊，偵測到 `button[data-type="submit"]` 被點、且「實際參加人數」欄位存在時才驗證；不合理就 `preventDefault`/`stopPropagation`/`stopImmediatePropagation`，讓事件完全不會傳到 BTA 自己的 handler。跟決策6、Stage3 checkbox 是同一種「疊加防呆、不改原生邏輯」手法。
- 邊界情況：抓不到 variant 資訊（`variantChanged` 沒觸發、或格式解析失敗）→ `console.warn` 記錄，直接放行，不擋住正常送出流程。

**實際欄位 DOM 結構（用既有的雪板類型欄位反查，供未來參考）**：BTA 的 Dropdown 型 Booking Field 是原生 `<select class="form-control" name="{欄位Label文字}">`，`name` 屬性直接等於後台設定的 Label——這是為什麼驗證邏輯可以用 `select[name="實際參加人數"]` 精準定位，前提是 BTA 後台那個欄位的 Label 要精確填「實際參加人數」四個字。

### 3. ✅ 已用真正的 BTA 欄位重新完整驗證通過（同一天稍晚，欄位建好後補測）

業主在 BTA 後台建好「實際參加人數」欄位後（Label 精確為「實際參加人數」，Apply to specific products 設 `test-fullday`／`test-halfday` 兩個 tag——跟原建議的 `test-course` 不同，但兩個 tag 合起來涵蓋全部四個測試商品，功能等價，不需要改），**用真正的欄位重新測了一次全部六個驗收情境，不再是模擬欄位**：

- 用 DOM 檢查確認真實欄位的 `<option>` **value 屬性本身就帶「人」字**（例如 `value="1人"`），不是單純數字——這點跟原本設計假設一致，但這次是實測確認，不是憑印象假設。`parseInt("1人", 10)` 這種寫法本來就會正確解析出前導數字、忽略非數字字尾，所以不需要為了「人」字另外改程式碼。
- `test-course-fullday-peak`（`test-fullday` tag）：1-2人組 + 選1人 → 放行 ✅；1-2人組 + 選3人 → 攔截，紅字正確 ✅；3-4人組 + 選3人 → 放行 ✅；3-4人組 + 選1人 → 攔截，紅字正確 ✅（含真實切換 BTA 人數方案下拉選單觸發 `variantChanged`，不是用 JS 硬塞變數）
- 模擬 `variantChanged` 未觸發（`window.__cbfSelectedVariantTitle = undefined`）→ 正常放行，`console.warn` 正確記錄 ✅
- `test-course-halfday-peak`（`test-halfday` tag）手機 375px：1-2人組 + 選4人 → 攔截，紅字正確 ✅
- 全程 Console 無新增錯誤

**六個驗收情境全數通過，且是用真正的 BTA 欄位驗證，不再只是模擬欄位的間接證明。已 commit。**

### 涉及檔案

- `snippets/course-booking-form.liquid`（唯一異動）：新增 `Bta.callbacks.variantChanged` 早期掛鉤、`parseAttendeeRange()`、`setupAttendeeCountValidation()`，以及 `.cbf-attendee-count-error` 樣式

---

## 📋 2026-08-10 整日總結（新對話串接手第一件事，先讀這段）

今天完成了 Stage 3 裝備加租的完整收尾（必勾同意 checkbox → 法律聲明定稿文字 → 學員組數動態化），過程中意外在 BTA 後台發現一條可能直接解開「測試 Widget 127.0.0.1」懸案的線索，但因為工具環境問題卡在點擊不動，**這是明天的最優先任務**，細節跳到下方「🔴 明天最優先」章節。

1. **Stage 3 必勾同意 checkbox**（commit `1de8f5c`）：依規格選項 B 實作，開啟預設 disabled、勾選即時連動、送出防呆、繞過測試驗證通過、同頁連續開兩次 Modal 驗證重置邏輯正確。
2. **法律聲明定稿文字置入**（commit `11dde85`）：讀取業主提供的 PDF 原文逐字比對確認一致，置入可捲動聲明框（含賠償金額對照表），只動 HTML/CSS，checkbox 邏輯完全沒動。
3. **Stage 3 裝備加購組數對應實際人數**（commit `fd39027`）：抓到根因——`course-stage2-module.js` 的組數渲染邏輯本來就是動態的，問題出在 `cart-stage2-trigger.liquid` 把 `attendeeCount` 設成 Shopify 的 `quantity`（這類人數級距套裝價商品 `quantity` 恆為 1）。改成讀取 line item properties 的「實際參加人數」欄位，加上缺欄位時預設 1 組 + console 警告的防呆。2人→2組、4人→4組、缺欄位→fallback 1組，皆已實測驗證通過。**BTA 後台「實際參加人數」欄位本身還沒建立**，需要業主自己動手（見下方待辦），這件事今天卡在 BTA 後台 iframe 點擊環境異常，沒辦法代為操作。
4. **🔴 意外發現、明天最優先查看的線索**：在 BTA 後台側邊欄看到一個 Sidekick（Shopify AI）建議項目，文字是「更改 BTA proxyBaseUrl 設定」——名稱正好命中 2026-08-09/10 查了老半天、只能建議聯繫 BTA 客服的那個測試 Widget（124456）`proxyBaseUrl` 誤指向 `127.0.0.1` 的問題。因為當時 BTA 後台整個 iframe 點擊都失效，沒能點進去看內容，**明天第一件事應該先去看這個 Sidekick 建議在講什麼，很可能不用聯繫客服就能解決**。

**今天新增三個 commit**：`1de8f5c`（Stage3 checkbox）→ `11dde85`（法律聲明文字）→ `fd39027`（學員組數對應人數）。working tree 目前乾淨。

---

## 🔴 明天最優先：查看 BTA 後台 Sidekick 建議「更改 BTA proxyBaseUrl 設定」

**背景**：2026-08-10 查證「BTA 測試 Widget（124456）`proxyBaseUrl` 誤指向 127.0.0.1」問題時（見下方「✅ 已定位根因」專章），已經確認正式 Widget（111783）不受影響、不是緊急事件，當時建議的解法只剩兩條：使用者自己的 bookthatapp.com 獨立後台，或聯繫 BTA 客服。

**今天在排查「實際參加人數」欄位建立方式時，意外在 BTA 後台左側欄「Sidekick 建議」區塊看到一個項目，文字是「更改 BTA proxyBaseUrl 設定」**——這個標題幾乎可以肯定就是在講同一件事。但當下 BTA 後台整個嵌入 iframe（`bookthatapp.com`）的點擊完全沒反應（見下方「⚠️ 今天卡住的技術問題」段落），沒能點進去看這個建議的完整內容跟操作方式。

**明天第一件事**：
1. 進入 Shopify 後台 → BTA: Booking App，看左側欄「Sidekick 建議」底下是否還有「更改 BTA proxyBaseUrl 設定」這個項目（截圖當時同時還看到另外兩個「本機迴路 IP 位址設定問題」「搜尋本機迴路 IP 位址」，命名都跟這個問題高度相關）
2. 點開看內容，確認是否真的針對測試 Widget（124456）的 `proxyBaseUrl` 問題
3. 如果點擊功能已經恢復正常（今天的異常有可能只是暫時性的環境問題），照建議操作；如果又點不動，需要換一種方式（例如請使用者自己點開看內容截圖給我，或建議使用者直接照 Sidekick 建議自己操作）
4. 修好後，記得回去補測「決策6/E-1」驗證過的完整 BTA 端對端流程（選日期→送出→加購→加入購物車），確認 properties 正確帶入

---

## ✅ 2026-08-10 更新：Stage 3 裝備加購組數對應實際人數（commit `fd39027`）

**問題**：課程人數選項是「1-2人組」「3-4人組」這種價格級距（同級距內不管實際去幾人，價錢一樣，是套裝價不是依人頭計價），但 Stage 3 裝備加購固定只顯示「學員1」1 組，導致「1-2人組」選 2 人一起去時，第二人沒有管道加購裝備。

### 根因（比預期的簡單很多）

追查後發現 `assets/course-stage2-module.js` 的 `renderGearRentalSection()` 組數渲染邏輯**本來就是完全動態的**（`for (var a = 1; a <= attendeeCount; a++)`，每組的 checkbox 都正確帶 `data-attendee="N"`，送出時也正確以 `學員N_加購_XXX` 分開寫入 properties）——問題單純出在呼叫端 `snippets/cart-stage2-trigger.liquid` 把 `attendeeCount` 設成 **Shopify 的 `quantity`**，而這類人數級距套裝價商品的 `quantity` 恆為 1（人數是靠選不同「變體」，例如「1~2人」「3~4人」，不是靠 Shopify 數量欄位），所以永遠只會渲染 1 組。

### 修法

`cart-stage2-trigger.liquid` 新增 `getAttendeeCount(item)` 函式，改成讀取 line item properties 裡「實際參加人數」這個 key（未來由 BTA Booking Field 寫入），取代原本的 `targetItem.quantity`：
- 有值且是合法數字 → 用該數字
- 缺欄位或非數字（舊訂單／舊測試流程還沒填過新欄位）→ **fallback 顯示 1 組，並印出 `console.warn` 附上 line item key**，方便之後排查，不會報錯或空白

`course-stage2-module.js` **完全沒有改動**。

### 實測驗證（草稿預覽網域，用 `/cart/add.js` 直接帶 `實際參加人數` 屬性模擬，因為 BTA 表單本身還沒有這個欄位）

- `實際參加人數=2` → 正確顯示「學員1」「學員2」2 組（`document.querySelectorAll('.attendee-gear-group-box')` 驗證 `length===2`）
- `實際參加人數=4` → 正確顯示 4 組
- 缺欄位 → fallback 顯示 1 組，Console 出現 `[CourseStage2] 購物車項目缺少「實際參加人數」欄位資料，預設顯示 1 組加購選項。line item key: ...`
- 送出後 `/cart.js` 驗證：`學員1_加購_單板鞋組`／`學員2_加購_雪鏡` 各自獨立正確寫入，`實際參加人數` 屬性本身也完整保留（`writeCourseFormDataToCart` 的 merge 邏輯沒有把它洗掉）
- 桌機 + 手機 375px 都驗證過，Console 沒有新增錯誤（剩下的都是既有已知問題：BTA 測試環境 CORS/422、已記錄過的 `cart:update` detail payload 問題）

### ⚠️ 今天卡住的技術問題：BTA 後台 iframe 完全點不動，「實際參加人數」欄位沒能代為建立

規格要求在 BTA 後台 Booking Fields 新增「實際參加人數」欄位（比照先前「滑雪場」「時段」欄位的做法），**這次沒能完成**——不是找不到路徑，是整個 BTA 後台嵌入的跨網域 iframe（`bookthatapp.com`）今天完全點不動：

- Settings 總覽頁的卡片（Resources、Staff accounts、Booking fields...）點擊沒反應
- 連明顯的黑色「Open BookThatApp.com」按鈕都點擊沒反應
- 連本次對話**之前確實成功點擊過**的「Widgets → Snow class booking (測試)」也重新測過，一樣點不動
- 排除是座標算錯：在同一個瀏覽器分頁的**非 iframe** 頁面（一般 lifechillsnow.com 商品頁）點擊完全正常，證實問題侷限在這個特定跨網域 iframe，不是瀏覽器工具整體故障

**判斷是環境層級的暫時性問題，不是操作方法錯誤**，明天新對話串可以先重試一次（很可能就恢復正常了）。

### 涉及檔案

- `snippets/cart-stage2-trigger.liquid`（唯一異動，commit `fd39027`）
- `assets/course-stage2-module.js`（沒有改動，組數渲染邏輯本來就是對的）

---

## ✅ 2026-08-10 更新：裝備租賃法律聲明定稿文字已置入 Stage 3 Modal

使用者提供定稿文件（`滑雪裝備租賃風險與責任聲明.pdf` + 對應 markdown 規格），內容用 `Read` 工具直接讀取 PDF 原文逐字比對過，確認跟提供的 markdown 文字一致（僅排版微調，法律意義未變更）。

實作方式：`assets/course-stage2-module.js` 的 `renderStage2Form()` 裡，原本「（文案待補）」的 checkbox 旁邊，新增一個 `.cs2-legal-scrollbox`（固定高度 200px、`overflow-y:auto`、Ice Blue `#7AB3D4` 邊框）放完整聲明正文（一~六段 + 賠償金額表格，表格斑馬紋、Deep Navy 表頭），checkbox 標籤文字換成定稿的「我已詳閱並同意上述《滑雪裝備租賃風險與責任聲明》全部內容」。**只改了 HTML 內容跟對應 CSS，2026-08-10 稍早做的 checkbox 互動邏輯（`data-cs2-legal-checkbox`／`data-cs2-legal-warning`／disabled 連動／送出防呆）完全沒有動，selector 都保持一致。**

**驗證**（草稿預覽網域 `lifechillsnow.com?preview_theme_id=147355926611`，桌機 + 手機 375px）：
- 聲明正文完整渲染（一、裝備確認 → 六、同意聲明，含賠償金額表格），逐段文字跟 PDF 原文比對一致
- checkbox 勾選/取消 → 按鈕 enable/disable 即時連動，跟置入文案前驗證過的行為完全一致（沒有因為換了 HTML 內容而影響邏輯）
- 手機版捲動、版面都正常，沒有溢位
- Console 沒有新增錯誤（僅有跟這次改動無關的既有 BTA 本機/草稿環境假警報）

**過程中一個測試方法論的插曲，記錄避免下次誤判**：驗證時一度用 `fetch` 抓 CDN 上實際部署的 asset 內容、直接搜尋中文字串（例如「裝備確認」）確認有沒有部署成功，結果搜不到、一度懷疑是不是有另一個對話同時開著的 `shopify theme dev` 造成同步衝突。**後來發現是虛驚一場**：Shopify CDN 部署出來的 asset 內容會把中文字元轉成 `\uXXXX` unicode escape 序列，直接用原始中文字串搜尋當然找不到，把抓回來的內容先 decode `\uXXXX` 再搜尋，才確認內容其實早就正確部署了。**之後如果要用「直接 fetch CDN asset 內容比對字串」的方式驗證中文內容有沒有部署成功，記得要先 decode unicode escape，不要直接用中文字串搜尋，否則會誤判成部署失敗。**

**下一步**：法律聲明文字置入部分已全數完成，Stage 3 checkbox 整個功能（規格 + 文案）都已交付。**尚未 commit**，等使用者確認。

---

## ✅ 2026-08-10（稍早）：Stage 3 必勾同意 checkbox 已完成並 commit

依照 `Stage3_checkbox_需求規格.md`（選項 B：涉及法律免責性質，強制勾選才能繼續），在 `assets/course-stage2-module.js` 加入法律聲明必勾 checkbox 邏輯，commit `1de8f5c`：

- Modal 開啟預設未勾選、「確認加購」按鈕預設 `disabled`（`opacity:0.45` + `cursor:not-allowed`，跟 hover/一般狀態明顯區隔）
- checkbox `change` 事件即時雙向連動按鈕 enable/disable
- 送出函式最前面加防呆：checkbox 未勾選一律 `return` 攔截，並顯示紅字提示「請先閱讀並同意租賃聲明」——**實測過「用 JS 強制拔掉 disabled 屬性再點擊」的繞過情境，確認送出邏輯依然攔截、`/cart.js` properties 依然是空的**
- `cart-stage2-trigger.liquid`／`main-cart.liquid` 檢查過不需要改動：Modal 本身是每次開啟都 `container.innerHTML` 整段重新渲染（不是 display:none/block 切換），checkbox/按鈕狀態天生不會沿用上次的，不需要額外重置邏輯——**已用「同一頁面連續開啟兩次 Modal（購物車放兩個課程商品，第一個勾選後略過，緊接著第二個 Modal 彈出）」這個更嚴格的情境驗證過，確認第二個 Modal 的 checkbox 沒有沿用第一個的勾選狀態**
- 文案暫時用「（文案待補）」佔位，法律聲明定稿文字置入是下一步待辦（見下方）
- 全程在草稿預覽網域（`lifechillsnow.com?preview_theme_id=147355926611`）實測，未用 127.0.0.1

**下一步待辦（規格已交付，這次對話後續會處理）**：把法律聲明定稿文字置入 checkbox 旁邊「（文案待補）」的位置，定稿文件由使用者提供，只需要換文字，不涉及邏輯改動。

**⚠️ 意外發現、記錄成待辦、這次沒有修（見下方待辦事項清單相同項目）**：驗證「略過」流程時，Console 跳出 `Cannot read properties of null (reading 'resource'/'data')` 錯誤，追查是既有程式碼（`writeCourseFormDataToCart()` 送出後 `dispatchEvent(new CustomEvent('cart:update'))` 沒帶 `detail` payload，但主題原生一堆購物車元件如 `cart-drawer.js`／`cart-icon.js`／`sticky-add-to-cart.js` 等 15 個檔案都預期這個事件帶 `detail.resource`/`detail.data`），跟這次 checkbox 改動無關，中等優先度，不急著修但不要忘記。

**🔍 待查證、尚未處理**：這次 commit 前發現 `layout/theme.liquid` 也有一筆未預期的本機異動（不是這次對話任何人做的修改），內容是把本地沙盒防護腳本的 `.shopifypreview.com` 白名單判斷拿掉、console log 文字也改了——懷疑是 `shopify theme dev` 把某個透過 Shopify 後台（可能是 Sidekick AI 建議或其他人直接在 admin 編輯器）對草稿主題做的修改同步回本機。**這筆異動故意沒有跟這次 checkbox commit 放在一起**，維持在 working tree 未 commit 狀態，等使用者確認這是預期中的修改還是需要處理的意外變動。細節見文件最下方「🔍 待查證」章節。

---

## ✅ 2026-08-10（稍早）：空白訂單漏洞已修正、驗證、commit 完成

昨天（2026-08-09）規劃好的「🔴 明天最優先」任務已執行完成並 commit，細節見下方「✅ 已修正：原生『加入購物車』按鈕造成的空白訂單漏洞」專章。

**完整端對端流程（選日期→BTA送出→加購→加入購物車）今天嘗試在草稿預覽網域上補測，結果卡在 BTA 測試 Widget（id `124456`）本身的設定問題（`proxyBaseUrl` 誤指向 `127.0.0.1`）——這是跟這次程式碼修改完全無關的既有問題，已定位成因，細節見文件下方「✅ 已定位根因：`127.0.0.1` proxyBaseUrl 問題只存在於測試 Widget」專章。重點結論：正式商品用的 Widget（`111783`）設定正常、不受影響，不是緊急事件，不影響真實客人下單，只是會持續擋住我們自己拿測試商品做端對端驗證的工作，需要業主或有 BTA 後台權限的人去修正測試 Widget 的設定。**

## 📋 2026-08-09 整日總結（新對話串接手第一件事，先讀這段）

今天是完整一整天的工作，橫跨視覺 QA、架構決策、版心對齊、版面重構，最後在收尾階段意外抓到一個會造成客人下單漏收資料的功能性漏洞。**下方「🔴 明天最優先」是新對話串接手的第一件事，直接跳過去看即可，這段總結只是背景脈絡。**

1. **視覺 QA 修正需求規格 A→E 全部完成並實機驗證**（含端對端下單流程）：Step1 進度指示疊加＋按鈕中文化、Step2 CSS 皮膚化＋滑雪場選單資料修正、Stage3 Modal 移除點外部誤觸關閉、手機版 RWD 同步驗證、四商品欄位差異檢測＋保險文案定稿＋必填星號。過程中意外挖出並修正「測試商品跟正式商品共用 BTA tag」的架構問題（詳見文件下方「E-1」段落）。
2. **架構決策定案（已與業主確認）**：降低對訂閱制預約 App（BTA）的深度綁定——Stage1/2 天生綁定訂閱 App、接受此事實；Stage3 維持自建 Modal（`assets/course-stage2-module.js`），不遷移至 BTA 原生 Add-ons，即使測試證實 Add-ons 技術上可行也不遷移。同時完成 BTA Add-ons 功能探索記錄（僅供未來參考，非採用）。
3. **版心寬度對齊修正**：Body 主內容區塊（Hero banner、日曆卡片、方案資訊卡片等）跟 NavBar/Footer 邊界對不齊的問題，改用主題自己的 `--full-page-grid-with-margins` 變數重新對齊，拿掉了造成跑版的負邊界外推與 `.ski-booking-funnel-wrapper` 的 `max-width:1200px` 上限。
4. **Stage 1 空白長條殘留元件排查與移除**：找到並清除決策4/6遺留的空殼卡片（`.course-sticky-right-card`），改用 `display:contents` 的純錨點容器。
5. **Stage 1 版面重新設計**：日曆與「您選擇的方案資訊」卡片從上下堆疊改成左右並排（桌機兩欄、手機單欄），連帶重寫了決策6的日曆定位邏輯（改用 `.course-calendar-column` 座標量測取代 hero 高度量測），簡化了進度條定位跟 margin 補償邏輯。
6. **🐛→✅ 收尾階段意外發現的功能性漏洞，隔天已修正**：原生「加入購物車」按鈕會讓客人完全跳過 BTA 三步驟流程直接下單，產生日期/滑雪場/聯絡方式全部空白、BTA 自己都判定「無法預約」的訂單，而且我們自建的 Stage3 Modal 進度條還會**假裝**日期/資訊已完成（打勾但實際沒收集到資料）。**2026-08-10 已修正並實測驗證通過**，細節見下方專章。

**今天沒有任何檔案異動**（純排查與規劃性質的工作），git working tree 維持乾淨，最新 commit 仍是 `1501691`。

---

## ✅ 已修正（2026-08-10）：原生「加入購物車」按鈕造成的空白訂單漏洞

2026-08-09 規劃好的兩處修改，2026-08-10 已實際動手完成，並實測驗證通過。**已 commit。**

### 實際完成的兩處修改

1. **[blocks/buy-buttons.liquid:230](blocks/buy-buttons.liquid:230)**：`<div>` 包住原生 `content_for 'block', type:'add-to-cart'` 的地方，加上跟第 111 行人數選單同款的條件式：
   ```liquid
   <div{% if product.type == 'Course' or product.handle contains 'course' %} style="display: none !important;"{% endif %}>
   ```
2. **[sections/product-information.liquid:27](sections/product-information.liquid:27)**：原本 `product.type != 'Course'` 這種寫法沒辦法直接跟 `contains` 用 `==` 串在同一個 `if` 運算式裡（Liquid 語法不支援，第一次寫 `and product.handle contains 'course' == false` 直接讓 dev server 回 500，`Liquid syntax error (line 27): Expected end_of_string but found comparison`）。改成先用 `{% liquid %}` 區塊算出一個布林變數再判斷：
   ```liquid
   {% liquid
     assign is_course_product = false
     if product.type == 'Course' or product.handle contains 'course'
       assign is_course_product = true
     endif
   %}
   {% if section.settings.enable_sticky_add_to_cart and is_course_product == false %}
   ```

### 驗證結果（本機 dev server 實測，桌機 1280px + 手機 375px）

1. **四個測試商品**（`test-course-fullday-peak`／`fullday-offpeak`／`halfday-peak`／`halfday-offpeak`）**逐一 fetch 確認**：原生加入購物車按鈕的外層 div 都正確帶上 `style="display: none !important;"`，`document.querySelector('sticky-add-to-cart')` 在四個商品頁的 DOM 裡都**不存在**了。
2. **視覺確認**：桌機、手機都截圖比對過，頁面最下方「更多服務說明」卡片後直接接 Footer，原本那顆海軍深藍色滿版按鈕**已經消失**，沒有留下空白間隙。
3. **回歸測試（確認沒有殺過頭）**：用非 Course 商品（`fullday-class-peak-season`，PROGRESS.md 記錄的「黃金基準」原生商品）反向驗證——這個商品的 `sticky-add-to-cart` 元件依然存在（`stickyExists: true`），原生加入購物車按鈕依然沒被隱藏（`lastDivStyle: null`），證實這次修改**只精準命中 Course 商品，沒有誤傷其他商品類型**（Accommodation、Gear-rental 等一律沒動）。
4. **BTA 掛載機制沒受影響**：`.product-form-buttons` 的 `display:flex`（`revealStepUI()` 效果）、`#bta-product-widget` 底下的 `<iframe>` 都正常存在，Stage1 兩欄並排版面（8/9 剛做完的版面重構）視覺上完全正常。
5. **Console 檢查**：沒有新增錯誤，剩下的都是 PROGRESS.md 早就記錄過的本機 dev 環境已知假警報（`127.0.0.1` BTA API 連線被拒、`ERR_CONNECTION_REFUSED` 等，跟這次改動無關）。
6. **沒有做到、需要之後留意的部分**：2026-08-10 有在草稿預覽網域上嘗試補測完整端對端流程（選日期→BTA送出→加購），但卡在測試 Widget（`124456`）本身的 `proxyBaseUrl` 設定問題（誤指向 `127.0.0.1`，導致整月日期都顯示 Unavailable），**這是跟這次程式碼修改完全無關的既有 BTA 設定問題，不是這次改動造成的，也不是本機環境限定**（草稿預覽網域上一樣重現）。已定位成因並確認正式 Widget（`111783`）不受影響，細節見文件下方專章。**這次驗證用的是「DOM層級回歸測試」邏輯（原生按鈕/sticky bar 確認消失、BTA 掛載機制沒被破壞、非Course商品沒被誤傷），不是端對端下單驗證**——等測試 Widget 設定修好後，建議補一次完整端對端流程，用先前決策6/E-1驗證過的方法確認 properties 正確帶入。

### 涉及檔案（實際異動，尚未 commit）

- `blocks/buy-buttons.liquid`（1 行變動）
- `sections/product-information.liquid`（1 行變成 7 行，邏輯不變只是拆成變數判斷）

---

## 🐛 原生「加入購物車」按鈕造成空白訂單漏洞（2026-08-09 排查發現，2026-08-10 已修正，詳細根因記錄保留供參考）

**背景**：使用者提出規格，要求排查頁面最下方、Footer 上方一顆「海軍深藍色、滿版寬、來源不明」的加入購物車按鈕——懷疑跟客製的 Stage1-3 三步驟流程無關，且可能讓客人繞過必要資訊直接下單。排查方式全程**實測，不用猜的**：DevTools 檢查元素來源、真實點擊測試、查看 `/cart.js` 結果、查看購物車頁實際顯示。

### 根因

這顆按鈕是 **Shopify Horizon 主題原生的「加入購物車」按鈕**（`blocks/add-to-cart.liquid`，透過 [blocks/buy-buttons.liquid:230-237](blocks/buy-buttons.liquid:230) 的 `content_for 'block', type:'add-to-cart'` 渲染，`style_class: "button"` 主色系按鈕，[templates/product.course-booking.json:203-210](templates/product.course-booking.json:203) 可查到設定），不是任何客製程式碼寫的東西。

它跟 `course-booking-form.liquid`（Stage1-3 流程）是**同一個父容器 `.product-form-buttons` 底下的手足元素**：course-booking-form 的內容先渲染，這顆原生按鈕緊接著渲染在它後面，DOM 順序上排在整個 Stage1-3 流程的最下方、Footer 正上方。

**跟決策1/4的 `revealStepUI()` 機制直接相關**：`.product-form-buttons` 正是 BTA 用白名單規則預設隱藏、[revealStepUI()](snippets/course-booking-form.liquid:777) 在 BTA widget 掛載後強制 `display:flex` 解除隱藏的**同一個容器**。這顆原生按鈕是它的直接子元素，沒有被特別過濾掉，所以只要 Stage1-3 UI 被顯示，它就跟著一起被顯示。**這不是誰刻意保留的功能，是一個沒被順手清掉的殘留**——決策1只隱藏了人數選單（[buy-buttons.liquid:111](blocks/buy-buttons.liquid:111)），但沒有連同「加入購物車」按鈕一起處理。

### 實測證據（`test-course-fullday-peak`，本機 dev server，直接點擊未走 BTA 流程）

1. **確實會把商品加入購物車**，價格正確扣款（$13,175）。
2. **`/cart.js` 回傳 `"properties": {}`，完全空白**——沒有日期、沒有滑雪場、沒有雪板類型、沒有聯絡方式，任何 BTA 原本會收集的欄位都沒有。額外發現：這筆 line item 的 `"product_type": ""`（空字串），這個事實也是下面 Sticky Add to Cart 關聯問題的根因線索。
3. **BTA 自己的購物車頁擴充功能跳出紅字警告：「Booking could not be reserved」+「UPDATE RESERVATION」按鈕**——BTA 自己都判定這筆訂單沒有真正被預約成功，不是我們的猜測。
4. **更嚴重：Stage3 加購 Modal 依然照常跳出，步驟指示條顯示「① ✓ 日期 → ② ✓ 資訊 → ③ 加購」**——日期跟資訊被打勾顯示已完成，但實際上使用者完全沒有填過。這個勾勾是靜態 UI，不會檢查真實資料是否存在。客人可以就這樣一路按到「結帳」，付全額但沒有真正被 BTA 排進日期。（測試到此為止，**沒有實際點擊結帳完成付款**，測試用的購物車項目已用 `/cart/clear.js` 清空，不留殘留測試資料。）

**結論**：這證實了最初的擔憂——這顆按鈕會讓客人略過三步驟流程、直接下單，且產生的是缺少必要資訊、BTA 都判定「無法預約」的空白訂單，Stage3 Modal 的假勾勾還會讓客人誤以為流程正常完成。

### 關於「滿版寬貼齊視窗邊緣」的說法，誠實記錄一個沒對上的細節

實測目前最新 commit（`1501691`）的程式碼（手機 375px + 桌機 1014px/1280px），這顆按鈕的左右邊界其實**已經對齊版心**（跟 Footer 連結、NavBar 內容邊界完全一致），不是真正貼齊視窗邊緣——推測是 2026-08-09 稍早的「版心寬度對齊修正」把 `.product-details` 欄寬修好時，順帶讓這顆按鈕也一起對齊了，是個沒特別設計但剛好發生的副作用。**如果之後在草稿預覽網域上重新截圖，發現視覺上還是貼邊，不要照抄這個「已對齊」的結論，要重新查證**（可能是快取或瀏覽器 session 差異）。

### 意外挖到的關聯問題：Sticky Add to Cart 排除條件跟商品判斷邏輯不一致

排查「滿版寬」說法時，意外發現 [sections/product-information.liquid:27](sections/product-information.liquid:27) 的主題原生「Sticky Add to Cart」浮動條，排除 Course 商品的條件寫成 `product.type != 'Course'`，**沒有像 `buy-buttons.liquid` 其他判斷式一樣加上 `or product.handle contains 'course'` 的後備條件**。

實測證實：這個商品的 `product.type` 其實是**空字串**（不是字面上的 `"Course"`，由上面 `/cart.js` 回應的 `"product_type": ""` 佐證），導致這個排除條件**沒有生效**，`<sticky-add-to-cart>` 元件確實出現在 Course 商品頁的 DOM 裡（用 `document.querySelector('sticky-add-to-cart')` 直接驗證過存在）。

**這個浮動條的「加入購物車」按鈕，點擊行為是直接 `.click()` 代理到同一顆原生按鈕**（[assets/sticky-add-to-cart.js:165-168](assets/sticky-add-to-cart.js:165) `handleAddToCartClick` 內部呼叫 `this.#targetAddToCartButton.click()`），跟上面是同一個空白訂單風險。它手機版 CSS（`@media max-width:749px`）是真正的 `width:100%; max-width:none; border-radius:0`，觸發時會是名副其實的貼邊全版——比上面那顆「已對齊版心」的按鈕更符合「貼齊左右視窗邊緣，未套用版心寬度對齊」的字面描述，**懷疑使用者實際觀察到的搞不好是這一顆，而不是文件流裡那顆**。

**觸發機率評估**：這個浮動條靠 `IntersectionObserver` 監聽「原生按鈕所在的整個 `.buy-buttons-block` 完全捲出視窗上緣」才會顯示（[sticky-add-to-cart.js:101-158](assets/sticky-add-to-cart.js:101)）。實測 `test-course-fullday-peak`／`test-course-halfday-peak` 在手機 375px、桌機 1014px、1280px 三種尺寸下，都因為「原生按鈕本來就緊貼在 Footer 正上方，可捲動的剩餘空間不夠讓整個區塊完全捲出視窗」而**始終沒有真正觸發**（用 JS 直接算過座標：`buyBtnBlock` 底部座標始終大於「頁面可捲動最大值」，數學上到不了觸發門檻）。**目前判斷這個浮動條在正式站被客人實際看到的機率偏低，但邏輯上的漏洞跟風險是真實存在的，不應該放著不修**——之後如果有更長的商品頁面內容（例如加了更多課程說明文字），可捲動空間變大，就可能被真正觸發。

### 涉及檔案（尚未修改，明天動手時的異動範圍）

- `blocks/buy-buttons.liquid`：230-237 行外面包一層 Course 商品判斷式的 `display:none`
- `sections/product-information.liquid`：27 行的排除條件加上 handle 後備判斷

---

## ✅ Stage 1 版面重新設計：日曆與方案資訊左右並排（2026-08-09）

**需求**：原本「選擇日期」（日曆）只佔版寬約 40%，右側大片空白沒被利用，整頁被拉得很長。把「您選擇的方案資訊」卡片從日曆下方搬到日曆右側，兩者頂部對齊、同時出現在第一屏。「費用資訊」「安全規範」「更多服務說明」維持原本全版寬單欄排在下方。

**架構調整（決策 6 定位邏輯的重寫，非小補丁）**：
- 新增 `.course-top-row-grid`（桌機 `3fr/2fr` 兩欄 grid，手機 991px 斷點切成 `flex-direction:column` 單欄堆疊），左欄放 `.course-calendar-column`（BTA 錨點容器），右欄放拆出來的「您選擇的方案資訊」卡片（原本跟「費用資訊」同一張卡片，這次拆開，費用資訊留在下方 `.course-main-layout-grid` 第一張卡）。
- **定位基準從「Hero banner 高度」改成「`.course-calendar-column` 相對於 form 的座標」**：舊版日曆佔滿全寬，用 hero 高度當 top、`left:0/width:100%`。現在日曆只佔左欄寬度，改成直接量測 `.course-calendar-column`（一個留在正常文件流裡的容器，天生會隨 Hero 高度變化、RWD 斷點正確跟著跑到對的位置）的 `getBoundingClientRect()`，不用再自己另外算 hero 高度——連 hero 本身的 ResizeObserver 都還留著（原因見下一條）。
- **進度條不再搬離原本巢狀位置**：舊版進度條要 `insertBefore` 搬到跟 widget 同一層（form 直接子層）並用 `position:absolute`，是因為它要疊在「hero 下方、佔滿全寬」的日曆上緣。現在進度條留在 `.course-calendar-column` 正常文件流裡即可（不再是 form 直接子層，不會被 BTA 白名單隱藏規則命中，不需要再強制 `display`/`position`），簡化了一大段防呆邏輯。
- **`margin-top` 補償邏輯整個拿掉，改成 `.course-calendar-column` 自己的高度動態同步**：舊版要手動算「widget 高度」回填到 `.course-main-layout-grid` 的 `margin-top`，這次改版連「下一個區塊是誰」都變了（原本是全部內容，現在是「費用資訊」），如果沿用舊邏輯需要重新確認目標元素。改成讓 `.course-calendar-column` 的高度動態同步「進度條高度＋16px 間距＋widget 實際高度」，Grid/Flex 版面自動用這個高度正確保留空間，完全跟「下一個元素是誰」解耦，更不容易再壞掉。
- **完全沒有用 DOM 搬移方式改變 BTA widget 本身的節點位置**：BTA 自己relocate widget 到 form 直接子層的行為完全沒動，我們只是把「自己的錨點容器」放到新的兩欄版面裡（這是初始 HTML 渲染就決定的位置，不是執行期 DOM 搬移），widget 的視覺位置全部靠 CSS `position:absolute` 座標計算，不靠 DOM 結構。

**踩到的一個坑**：`.course-top-row-grid` 桌機版設了 `align-items: start`（給 Grid 用來頂部對齊兩欄），手機 `@media (max-width:991px)` 版面只覆寫了 `display`/`flex-direction`/`gap`，沒有覆寫 `align-items`——同一個屬性用在 `flex-direction:column` 時語意變成「橫向（cross-axis）要不要撐滿寬度」，導致手機版日曆欄位縮成只剩 116px 寬（縮成內容本身的寬度，不撐滿）。修法：手機版媒體查詢裡明確加 `align-items: stretch` 蓋掉桌機規則。

**驗證**：草稿預覽網域，桌機 1280px（`test-course-fullday-peak`、`test-course-halfday-peak` 兩商品）+ 手機 375px。確認：兩欄並排、頂部對齊、日曆＋方案資訊同時出現在第一屏不用捲動；完整走過 Stage1→Stage2 流程（選日期→下一步→Stage2 表單正確限縮在左欄寬度內、不佔滿全頁，返回 Stage1 後日曆欄高度正確縮回）；版心寬度對齊（NavBar/Footer 基準）在新版面下依然成立；手機版正確退回單欄堆疊（日曆在上、方案資訊在下），Stage2 表單全寬正常顯示；Console 沒有新增錯誤（僅剩已知的 BTA 掛載偶發性錯誤，跟這次改動無關）。

## ✅ Stage 1 空白長條元件排查與移除（2026-08-09）

**問題**：商品頁 Stage 1（選日期）畫面，日曆卡片右側/下方同一橫向高度，出現一個沒有文字/圖示內容的空心圓角長條（淺藍邊框、內部空白）。

**根因**：這是決策 4/6 留下的已知現象，早在 2026-08-06 就記錄過（見決策 4-2 段落「`.course-sticky-right-card` 本身在 BTA 掛載後就是空殼」），但當時判斷「只是視覺排序問題，不阻塞核心預約流程」而沒有處理。原本 `.course-main-layout-grid` 是 65fr/35fr 雙欄設計，右欄放一張 `.course-sticky-right-card` > `.course-booking-card-body` 卡片（白底、`#B8D9ED` 淺藍邊框、20px 圓角、陰影），裡面裝的是 BTA 錨點 div。但決策 6 把日曆 widget 改成 `position:absolute` 疊加在 Hero banner 下方後，JS 執行時會把進度條搬到 `form` 直接子層、BTA 自己也會把 `#bta-product-widget` 移除重建，這個右欄卡片最終永遠是空的——只剩下卡片本身的邊框/圓角/陰影樣式，沒有內容，這就是使用者看到的「空心圓角長條」。今天先前的版心寬度對齊修正把全站邊界修正對齊後，這個空卡片的存在感反而變得更明顯，才被注意到。

**確認過沒有其他用途**：`.course-sticky-right-card`/`.course-booking-card-body` 只在 CSS 定義跟這段 HTML 裡出現，JS 完全不依賴這兩個 class（只用 `#booking-current-date-picker`、`#bta-product-widget`、`#bta-step-progress-bar` 這些 id 選取器），確認是純視覺殘留，沒有預留給未來功能的跡象。

**修法**：
1. `.course-main-layout-grid` 從 `65fr/35fr` 雙欄改成單欄（`minmax(0, 1fr)`），左欄資訊卡片改佔滿全寬。
2. 拿掉 `.course-sticky-right-card`／`.course-booking-card-body`／`::before` 這組卡片視覺樣式的 CSS（含 sticky 定位、邊框、圓角、陰影、頂部漸層條），改成一個新的 `.course-booking-anchor`，用 `display:contents` 讓它完全不產生自己的版面框（不是「改小」或「透明」，是徹底不佔版面），純粹保留給 BTA／我們的 JS 找 id 用。
3. HTML 結構裡的 BTA 錨點 id（`#bta-booking-form-{{product.id}}`、`#booking-current-date-picker`、`#bta-step-progress-bar`、`#bta-product-widget`）完全沒有改動，只是拿掉外層的卡片包裝 div。

**驗證**：草稿預覽網域實測 `test-course-fullday-peak`，桌機 1280px + 手機 375px。確認空白長條消失、日曆/進度條位置正確（`.course-booking-anchor` 本身量測為零尺寸，`display:contents` 生效）、完整走過一次 Stage1→Stage2 流程（選日期→下一步→Stage2 表單皮膚化/翻譯/星號全部正常），Console 沒有新增錯誤（僅剩已知的 BTA 掛載偶發性錯誤，跟這次改動無關）。

## 🎓 重要技術/流程教訓

### 教訓：已登入 Shopify 後台的瀏覽器，無法用來驗證正式網域的真實樣貌（2026-08-09）

若同一個瀏覽器 session 曾登入過 Shopify 後台（`sessionStorage` 會存有 `isMerchantSession: true`），Shopify 會自動讓該已登入商家帳號，在正式網域（不帶 `?preview_theme_id=` 參數）上直接看到自己正在編輯的草稿主題內容，而非真正上線給一般顧客看的正式主題。

**這個污染無法透過清除 cookie 或開新分頁解決，因為它綁定的是登入 session 本身，不是 cookie 層級的殘留。**（實測過：清掉 `document.cookie` 全部內容、重新整理、甚至開全新分頁，`window.Shopify.theme.id` 依然回報草稿主題的 id，因為 `isMerchantSession` 這個判斷跟 Shopify 後台登入狀態綁定，不是靠 storefront 網域自己的 cookie。）

**正確驗證方法**：若需要確認正式網域的真實內容（例如驗證草稿主題修改沒有污染到正式站），須完全繞過瀏覽器，改用伺服器端請求（如 `curl`）：

1. 直接對正式網域發出請求（不帶任何 cookie/session），檢查回傳的 `Shopify.theme.id` 與 `role`（正式應為 `"main"`）
2. 對草稿預覽網址（`?preview_theme_id=`）發出請求時，須正確處理 302 轉址並保留其設定的 cookie（`curl -L` 並手動處理 cookie），否則會拿到錯誤或空白結果——**這裡本身就是一個容易踩的坑**：第一次沒加 `-L` 跟 cookie jar，curl 只拿到轉址回應本身（空 body），差點誤判成「草稿版本原始碼裡也找不到今天的標記」，如果沒有進一步檢查 HTTP 狀態碼跟 body 長度，這個假結果會被誤讀成「草稿站也沒污染」這種倒果為因的錯誤結論
3. 建議搜尋當次修改新增的、命名獨特不易誤判的程式碼標記字串（例如特定 CSS class name、JS function name），在兩個版本的原始碼裡分別比對出現次數，用具體數字佐證「有/沒有污染」，避免用「看起來差不多」這種模糊描述下結論

此方法已於 2026-08-09 用於驗證「版心寬度對齊」等一系列修改確實只存在草稿主題（`Designer_Eric`，id `147355926611`，role `unpublished`），完全未影響正式主題（`20251227-add-new-context`，id `142011367507`，role `main`）。

## ✅ 版心寬度對齊修正：Body 主內容區塊跟 NavBar/Footer 對不齊（2026-08-09）

**問題**：商品頁（`course-booking-form.liquid`）的 Hero banner、選擇日期卡片、方案資訊卡片等，左右邊界比 NavBar／Footer 更貼近視窗邊緣，全頁上下看下來邊界對不齊。使用者要求以 NavBar/Footer 目前的版心寬度為基準，修正 Body 區塊去對齊，不要反過來動 NavBar/Footer。

**根因（用瀏覽器實測抓出來的，不是憑空猜的）**：這個商品的 `product-information` section 開了 Horizon 主題的「equal_columns」設定，套用 `.product-information__grid--half` 版型——這個版型本來就是靠一組四欄的 `grid-template-columns`（外層 margin／內容一半／內容一半／外層 margin）讓左右邊界自動對齊全站共用的頁面邊界。course-booking-form.liquid 原本為了把「圖庫+內容」的雙欄版位收合成單欄（圖庫已隱藏），直接把 `.product-information__grid` 的 `grid-template-columns` 蓋成單一 `1fr !important`，這個動作**連同「外層 margin」欄位一起打掉了**，導致內容緊貼 section 邊緣，比 NavBar/Footer 的版心更貼近視窗邊緣。另外 Hero banner 跟兩欄主結構容器上還各自疊加了一層 `margin-left:-32px; margin-right:-24px` 的負邊界外推，是當初為了在「外層容器本來就跑版」的舊狀態下讓 banner 視覺置頂設計的補償手法，這次一併變成雪上加霜的因素。`.ski-booking-funnel-wrapper` 自己還另外設了 `max-width:1200px`，在寬螢幕（版心欄位本身超過 1200px 時）會讓內容比 NavBar/Footer 的版心更窄、置中留白——這個問題在較窄的螢幕不會發生，只有在夠寬的桌機才會浮現，之前沒被注意到。

**修法**：
1. `.product-information__grid` 的 `grid-template-columns` 改成直接沿用主題自己的 `--full-page-grid-with-margins` 變數（`assets/base.css` 裡 `.section` 基礎規則本來就是用這個變數），保證跟 NavBar/Footer 是完全同一套計算結果，不用自己重算。**踩過一次坑**：第一版曾手動寫 `var(--full-page-grid-margin) 1fr var(--full-page-grid-margin))`，結果三欄被拆成完全相等的三等份而不是「窄/寬/窄」——因為 `--full-page-grid-margin` 本身是 `minmax(40px, 1fr)`，中間欄如果也用純 `1fr`，三者 flex 係數相同，多餘空間會被 grid 演算法平均分掉，不是直覺的「margin 只吃最小值」。改用主題現成的 `--full-page-grid-with-margins`（中間欄用 `min()` 算好的固定寬度，不是 `1fr`）才是對的。
2. `.product-details` 的 `grid-column` 從 `1 / -1`（跨滿全部欄位）改成 `2 / 3`（只佔中間內容欄），並把殘留的 `padding-left`（原本是雙欄版位圖庫跟內容間的內側間距）歸零。
3. 拿掉 Hero banner 跟兩欄主結構容器上的負邊界外推 inline style（`margin-left:-32px; margin-right:-24px; width:calc(100% + 56px)`），改回自然佔滿父層 100% 寬度。
4. 拿掉 `.ski-booking-funnel-wrapper` 的 `max-width:1200px`（class 定義跟 inline style 兩處都有，inline 優先權更高，兩處都要拿掉才會生效），改成單純 `width:100%`，讓它完全信任外層已經修正好的版心欄位。

**驗證**：實機在草稿預覽網域測試 `test-course-fullday-peak`、`test-course-halfday-offpeak` 兩個商品，桌機 1014px／1280px／1600px 三種寬度、手機 375px，逐一用 JS 量測 NavBar 內容、Footer 內容、`.ski-booking-funnel-wrapper`、Hero banner、`.course-main-layout-grid`、三張資訊卡片的實際左右邊界座標，**全部完全對齊**（1600px 寬螢幕下驗證了移除 1200px 上限的效果，桌機三種寬度、手機都對齊在同一條垂直線）。決策 6 的日曆定位機制（`hero.getBoundingClientRect()` 高度量測、雙 `ResizeObserver`、BTA widget 疊加）**完全沒受影響**，測試中確認 widget 本身現在也正確對齊到跟 NavBar/Footer 一致的邊界（連帶好處，widget 定位邏輯本來就是動態量測，不需要額外調整）。手機版頭部的漢堡選單／購物車圖示本身用的是「大點擊區塊貼齊邊緣」的行動版慣例設計（圖示本身有內距），不是版心寬度問題，跟 Body 內容的 16px 版心邊界是兩件不同的事，沒有誤判成需要修正的對象。

**過程中觀察到、跟這次修正無關的既存現象**：BTA widget 掛載成功率維持先前已知的「非 100%」狀態（這次重測時遇到一次未掛載，重新整理後就正常），Console 出現的 `bta-widgets-bootstrap.min.js` 內部例外訊息也跟 PROGRESS.md 很早以前記錄過的一致——**這是已知、跟這次 CSS 改動無關的既存現象，不是新引入的回歸**。另外這次也觀察到 BTA widget 有時會顯示自己原生的繁中翻譯（例如「下一頁」而非英文 `Next`），有時顯示英文——這跟 A 項按鈕中文化的 `TEXT_MAP` 精準比對機制設計上是相容的（只覆蓋辨識到的英文字串，BTA 自己的中文不會被誤動），但代表 BTA 該按鈕的語系顯示本身不穩定，**這是一個新觀察到、值得之後留意的現象，這次沒有進一步處理，不在這次任務範圍內**。

## 📐 架構決策：降低對訂閱制預約 App 的深度綁定（2026-08-09，已與業主確認）

業主提出新需求：目前以 BTA（BookThatApp）為訂閱基準，但架構設計上要盡量避免深度綁定 BTA，讓未來如果更換其他訂閱制預約 App，改動範圍能降到最低。**這是既定方向，不是待決事項**，確立以下分工原則：

- **Stage 1（選日期）+ Stage 2（填資料）：天生綁定訂閱 App，接受此事實，不強求可攜性**。日曆/庫存/可預約時段是訂閱 App 的核心價值，換 App 時這部分必然需要重做。這次視覺 QA 修正（A-E）完成的 CSS 皮膚化、進度條疊加、文字翻譯等「手法」（例如 srcdoc iframe 同源操作、`MutationObserver` 監聽狀態切換、inline style + `!important` 蓋過動態注入樣式這些技巧）屬於**可轉移的方法論**，換 App 時可加快重做速度，但**程式碼本身不預期可直接沿用**。
- **Stage 3（裝備加購）：維持現有的自建購物車頁 Modal 架構（`assets/course-stage2-module.js` + `snippets/cart-stage2-trigger.liquid`），不遷移至 BTA 原生 Add-ons 功能，即使 Add-ons 測試證實完全可行也不遷移**。理由：自建 Modal 底層用 Shopify 標準機制（`/cart/change.js` + line item properties），不綁定特定 App；若改用 BTA 原生 Add-ons，Stage 3 會變成 BTA 專屬邏輯，與可攜性目標衝突。多數同類 App 換掉時大機率仍會用同一套 Shopify 購物車機制寫入 properties，自建 Modal 屆時可望直接沿用或稍加調整即可。

## 🔬 BTA Add-ons 功能探索記錄（僅供參考，非採用決策，2026-08-09）

**目的**：先前決策 1 記錄「Add-ons 對目前方案不可用（無 Manage 按鈕）」，後續查證官方文件發現「已設定成 Service 的商品不能被匯入成 Add-on」——先前卡關原因可能不是方案限制，而是舊商品早就是 Service。這次測試只為釐清這個技術細節、結案存查，**測試結果不會、也不需要觸發任何架構調整**——上方架構決策已明訂 Stage 3 維持自建 Modal，跟這次測試結果無關。

**測試方法**：在 Shopify 後台新建一個從未被 BTA 碰過的全新商品「測試用雪板裝備」（乾淨、未匯入過 BTA），到 BTA 後台 Services → Add-ons 分頁嘗試 `Create add-on` 與 `Imports` 兩條路徑，全程在 `admin.shopify.com` 正式後台操作（非 127.0.0.1）。

**測試結果——找到明確、有標示原因的答案，不是原本預期的「成功」或「卡住猜原因」兩種情境之一**：

1. **`Create add-on`（BTA 後台 Services → Add-ons → Create add-on）：完全可以正常操作**，表單（Title / Associated Services / Featured Image / Capacity / Pricing）能順利填寫，沒有卡住、沒有錯誤訊息。**但這個表單是「從零建立一個 BTA 原生 Add-on 實體」，不是把「測試用雪板裝備」這個既有 Shopify 商品匯入/關聯進去**——整張表單裡沒有任何「選擇既有商品」的欄位，BTA 會自己在背後生成對應的商品/變體資料，跟我們新建的測試商品完全無關。
2. **`Imports`（BTA 後台 Services → Add-ons → Imports，用來把既有 Shopify 商品匯入成 Add-on 的機制）：明確被鎖住，畫面直接寫明原因**：「This feature is available to subscribers of Standard or higher plans.」（並附一個 `View plans` 連結）。**這不是模糊的錯誤或卡住畫面，是 BTA 自己清楚標示的方案分級限制**，業主目前訂閱的 Lite 方案（$25/月）不含這個功能。
3. **結論對應原本的兩個分支**：介於「順利成功」跟「卡住但不知道原因」之間，是**第三種、更明確的情況**——「Imports 這條路徑本身就是被方案鎖住，有清楚標示，不是猜測，也不是『商品已是 Service』的問題」。先前決策 1 記錄的「Add-ons 對目前方案不可用」這個結論**方向是對的（確實是方案限制），但原本沒有找到 BTA 自己標示的明確理由，這次補上了**。
4. **「1 booking type」限制 vs. Add-ons 的關聯**：沒有查到官方文件明確連結兩者。這次看到的限制訊息明確指向「Product imports」這個獨立功能項目，跟「booking type 數量上限」看起來是兩個分開的方案分級維度，但無法 100% 確定，**依指示不再深究、不聯繫官方客服**。

**⚠️ 明確註記**：此記錄僅供未來情境改變時參考（例如業主之後升級方案、或考慮換一款預約 App 時可以回頭看）。**目前架構決策維持 Stage 3 自建 Modal 不變，不因這次測試結果而調整**，測完即結案。

**測試過程留下的痕跡**：Shopify 後台新建了一個測試商品「測試用雪板裝備」（未上架/未關聯任何 BTA Service，純粹用來確認匯入流程），目前還留在商品列表裡。**沒有清理掉**，因為刪除商品屬於有點難逆轉的操作，留給使用者自行決定要不要刪除。

## ✅ 視覺 QA 修正需求規格 A→E 全部完成（2026-08-08～09，跨兩個對話日）

依照使用者提供的 `視覺QA修正需求規格_20260808.md`，依序執行 A→B→C→D→E。**全部完成並實機驗證通過（含端對端下單流程）**。過程中 E-1 意外挖出一個架構性問題（測試商品跟正式商品共用 BTA tag，導致 Booking Field 錯配、且測試商品誤入正式商品系列），使用者已在 BTA/Shopify 後台修正，細節見下方「E-1」段落。

**下一步待辦（規格已交付但尚未執行）**：Stage 3 必勾同意 checkbox（見 `Stage3_checkbox_需求規格.md`）、裝備租賃法律聲明文字置入 Stage 3 Modal（見 `Stage3_法律聲明文字_定稿.md`），細節見文件最下方「待辦事項」。

### 關鍵技術發現（供之後維護這段程式碼的人參考）

1. **BTA widget 的 iframe 是用 `srcdoc` 掛載，跟外層頁面同源**，`iframe.contentDocument` 可以直接讀取/操作/監聽（已實機驗證多次）。這打開了一個之前沒探索過的管道：可以用 `MutationObserver` 監聽 BTA 自己 React app 內部的狀態變化（例如 `document.body` 出現 `ReactModal__Body--open` class 代表跳出「確認課程細節」彈窗），也可以直接改內部文字/注入 `<style>`。**但這個 iframe 剛被偵測到時，裡面可能還是瀏覽器給的空白 document，真正 srcdoc 內容載入後會整個換掉這個 document 物件**——一定要監聽 `iframe` 的 `load` 事件（同時搭配立即嘗試一次 + 短暫輪詢保底），不能只在偵測到 `<iframe>` 節點的當下就抓一次 `contentDocument` 存起來用。
2. **BTA 掛載 widget 時會把 `#bta-product-widget` 整個移除、重新插入成 `form.shopify-product-form` 的直接子層**（跟決策 4/5 記錄的現象一致，這次是第二次被實測證實）。這件事會連帶影響：任何「我們自己另外加的元素」如果原本巢狀放在 widget 附近但沒被 BTA 認得，會被留在原地——如果那個原地剛好在 `position: sticky`（或其他已定位）容器底下，會變成錯誤的 absolute 定位 containing block，位置全部跑掉。這次加的進度條疊加元件就踩到這個坑，修法是**偵測到 widget 定位好之後，用 `insertBefore` 把我們自己的元素也搬到跟 widget 同一層**（是我們自己的元素，不是 BTA 的節點，搬移沒有 decision 4 記錄的 iframe 重載風險）。
3. **BTA 用 `form[action*="/cart/add"] > :not(白名單)` 隱藏所有它不認得的直接子層元素**——上一點提到的「搬到跟 widget 同一層」會讓我們自己的元素也被這條規則連坐隱藏，必須跟 `revealStepUI()` 一樣，對它強制設 `display` + `!important` 蓋過去。
4. **注入進 iframe 內部的 `<style>`，大部分屬性都正常生效（顏色/框線/圓角/字重全部沒問題），但 `.ReactModal__Content` 這個元素的 `border`/`box-shadow` 兩個屬性怎麼樣都套用不上**（同一條規則裡的 `border-radius` 卻沒問題），懷疑是 styled-components 動態插入了另一條特異度或時機更晚的規則，原因沒有完全查清楚。**繞過法：這兩個屬性改用跟 widget 定位同一招的「直接 inline style + `setProperty(..., 'important')`，每次內容更新時重新套用一次」**，這招目前為止沒有失敗過。
5. **BTA 的 Stage2 表單欄位是 React controlled component**，如果要用程式（非真人點擊）去改 `<select>`/`<input>`/`<checkbox>` 的值做端對端測試，直接設 `.value`/`.checked` 再 `dispatchEvent(new Event('change'))` **對下拉選單有效，但對文字輸入框/radio/checkbox 無效**（React 內部用另一個 property descriptor 追蹤狀態，直接賦值會被無視）。要用 `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value)` 這個標準繞過法才能讓 React 偵測到變化。這不影響真人操作（真人點擊/輸入本來就正常），只影響「用程式模擬測試」時要注意。

### A. Step1 進度指示疊加 + 按鈕中文化 —— ✅ 完成並驗證通過

- 在 `#booking-current-date-picker` 內、`#bta-product-widget` 之前加了 `#bta-step-progress-bar`（沿用購物車頁 Stage3 Modal 的 `booking-progress-stepper`/`step-item`/`step-dot` 視覺語言），用跟決策 6 同一套「量測 hero 高度 + ResizeObserver 動態定位」手法疊加在 widget 上方，不改變 BTA DOM 順序。
- 用 `MutationObserver` 監聽 BTA iframe 內部 `ReactModal__Body--open` class 的出現/消失，同步進度條在「① 日期」（未選）跟「① ✓ 日期 → ② 資訊（進行中）」（已進入確認畫面）之間切換，桌機/手機都驗證過正確。
- 按鈕文字中文化：`Make a Selection`→`請選擇日期`、`Next`→`下一步`、`Book Now`→`確認預約`，用 `TreeWalker` 掃 iframe 內文字節點、逐一精準比對整段文字取代（不是子字串替換），搭配 `MutationObserver` 每次 BTA 重繪都重新套用一次。**沒有去查 BTA 後台是否有原生語言設定選項**（沒有登入權限），直接採用需求文件裡的前端 CSS/JS 覆蓋 fallback 方案，效果上等同。
- 實機在草稿預覽網域（`lifechillsnow.com` + `preview_theme_id`）驗證：桌機/手機（375px）都測過，進度條正確顯示、正確跟隨 Stage1↔Stage2 切換、按鈕文字正確、Console 無新增錯誤。

### B. Step2 CSS 皮膚化 + 滑雪場選單資料修正 —— ✅ 全部完成並驗證通過

- 用 `doc.head.appendChild(<style>)` 把皮膚化樣式直接注入 BTA iframe 自己的 document（外層頁面的 `<style>` 對 iframe 內部完全無效，這是這次才確認的事實）。套用範圍：`.ReactModal__Content` 卡片外框/圓角/陰影、`.widget-title`（改成「02 預訂資訊與規格確認」，比照 Gemini 稿標題格式＋左側 Sky Blue 裝飾線）、`.description-title`、`.additional-field-label`、`.control-label`、`.form-control`（Ice Blue 邊框）、送出按鈕（Deep Navy 底色）。
- 過程中修掉一個新發現的版位問題：Stage2 確認畫面左上角有一個 `position:absolute` 的返回箭頭，原本 `text-align:center` 的標題不會撞到它，改成靠左對齊後會被蓋住，用更高特異度選擇器（`.ReactModal__Content .widget-title`）只對這個彈窗額外加 `margin-left`，不影響 Stage1「Select a Date」標題原本的置中排版。
- 英文介面文字（`Book a product`、`Please confirm you would like to request the following product`、`Additional information`、下拉選單的 `Select...`）用跟 A 項同一套 `TreeWalker` 精準比對機制中文化。
- **滑雪場下拉選單資料修正（札幌手稻/旭川神居/富良野/佐幌 → 富良野滑雪場/神居滑雪場/星野滑雪場）已由使用者於 BTA 後台完成**——過程中意外牽出一個架構性問題（測試商品跟正式商品共用觸發用的 Shopify tag），連帶重新設計了整套 tag 架構，細節完整記錄在下方「E-1」段落，不重複寫在這裡。
- 桌機/手機都驗證過卡片外框、標題、欄位樣式、按鈕底色正確套用，Console 無新增錯誤。

### C. Stage3 Modal 移除點外部誤觸關閉 —— ✅ 完成並驗證通過

- `assets/course-stage2-module.js`：`.cs2-backdrop` 這個背景遮罩 div 原本跟關閉按鈕共用 `data-cs2-skip` 屬性，點擊背景會觸發跟按「略過，之後再補」一樣的關閉+skip 邏輯。**拿掉背景 div 的 `data-cs2-skip` 屬性即可**，明確的關閉方式（略過按鈕、確認加購按鈕）完全沒動。
- 用直接呼叫 `CourseStage2Module.renderStage2Form(...)` 的方式在購物車頁測試（不需要真的走完整加入購物車流程），桌機/手機都驗證過：點擊背景 Modal 維持開啟、已勾選項目不遺失，「略過，之後再補」按鈕仍正常關閉並觸發 `onSkip` callback。

### D. 手機版 RWD 同步驗證 —— ✅ 完成，A/B/C 三項手機版都正常，沒有發現需要回報的技術限制

- 375px 寬度下逐一重測 A（進度條加了一條 `@media (max-width: 480px)`，窄螢幕只顯示圓點+數字、隱藏「日期/資訊/加購」文字標籤，避免擠壓）、B（Stage2 表單卡片/標題/欄位排版在手機版一樣乾淨，沒有溢位或重疊）、C（Modal 手機版比例正常，背景點擊行為跟桌機一致）。
- 沒有發現任何「手機版跟電腦版行為不同、需要犧牲其中一邊」的情況，不需要另外跟使用者討論取捨。

### E. 四商品欄位差異檢測 + 保險文案定稿 + 必填星號 —— ✅ 全部完成，過程中意外挖出並修正一個架構性問題

**E-1（欄位差異檢測）—— 過程曲折，最終完成，並意外挖出測試商品跟正式商品共用 tag 的架構問題**：

- 結構性檢查（時段欄位有無）在四個商品上都驗證過：`test-course-fullday-peak`／`fullday-offpeak` 沒有「時段」欄位 ✓、`test-course-halfday-peak`／`halfday-offpeak` 有「時段(半天專用)」欄位 ✓，符合全天班固定時段、半天班需選時段的預期。
- **排查滑雪場下拉選單資料錯誤（B 項）時，發現真正的根因**：BTA 的 Booking Fields（雪板類型、滑雪場、時段等）都是用 Shopify 商品標籤 `halfday`／`fullday` 作為「Apply to specific products」的觸發條件，**而測試商品跟正式商品共用同一組 tag**。這導致新建的測試專用欄位（原本 Apply 條件設 `test-course`）跟舊有正式欄位（Apply 條件是 `halfday`／`fullday`）在測試商品上同時符合條件，同一個欄位重複顯示兩次。
- **意外連帶發現一個跟這次任務無關的既有 bug**：測試商品因為帶著 `halfday`／`fullday` tag，**同時被兩個正式商品系列（Collections）「北海道 富良野&神居 私人滑雪課程 (全天/半天)」自動收錄**——代表一般消費者瀏覽正式商品系列頁面時，理論上可能會看到測試商品混在裡面。已一併修正。
- **最終解法（使用者在 BTA/Shopify 後台完成，三層 tag 分工）**：
  1. 四個測試商品原本掛的 `halfday`／`fullday` tag，**改成 `test-halfday`／`test-fullday`**（全天班兩商品用 `test-fullday`，半天班兩商品用 `test-halfday`）
  2. `test-course` tag（四個測試商品共通）保留不變，套用「所有測試商品共通」的欄位（例如滑雪場）
  3. 測試專用 Booking Field 的 Apply 條件重新分工：滑雪場欄位 Apply = `test-course`（四商品共通）；時段欄位 Apply = `test-halfday`（**過程中一度誤設成 `test-course`，導致全天班商品也錯誤跑出時段選單，已修正為 `test-halfday`**）
  4. 正式商品的 tag（`halfday`／`fullday`）跟正式 Booking Field 設定完全沒被動到，只換了測試商品身上的 tag
  5. 副作用（正面）：測試商品不再帶 `halfday`／`fullday` 後，已自動從那兩個正式商品系列移除，順手修正了「測試商品誤入正式商品系列」的問題
- **踩到的坑，供之後參考**：
  - 之前請我搜尋整個 repo 程式碼確認「有沒有地方用 `product.tags contains 'halfday'/'fullday'` 做判斷」，結果是沒有（只有 `product.handle` 字串比對用於導頁，跟 tags 無關）——但 **Shopify 後台的商品系列（Collections）自動化規則本來就不會出現在程式碼裡，純程式碼搜尋抓不到這一層依賴**，是純後台查證才抓到的。之後遇到類似「這個 tag 還有誰在用」的問題，程式碼搜尋只能排除「theme 程式碼本身」這一層風險，Collections、自動化折扣規則等後台設定要另外查。
  - 新建平行測試用 Booking Field 時，Apply 條件的粒度要跟原始邏輯完全對應（時段只該對應半天班），圖方便套用更大範圍的共用 tag（`test-course`）會導致欄位在不該出現的商品上跑出來。
- **時段選項文字（原「上午3小時」/「下午3小時」→ 定稿「上午課程時間：9:00~12:00」/「下午課程時間：13:00~16:00」）已由使用者在 BTA 後台一併修正**。
- **端對端下單流程最終驗證結果**：`test-course-fullday-peak`、`test-course-fullday-offpeak`、`test-course-halfday-peak` 三個商品都已完整走過一次（選日期→填表單→加入購物車→properties 正確）。`test-course-halfday-offpeak` 在前次對話因瀏覽器自動化工具逾時中斷，**沒能確認那筆測試訂單是否成功進購物車**——這件事本身不影響「這次程式碼改動是否安全」的結論（送出邏輯完全沒被動過，其餘三商品都驗證通過），但那筆中斷的測試訂單如果還留在測試環境的購物車/訂單記錄裡，之後可以視需要清一下，不算功能缺陷。

**E-2（保險文案定稿）已完成並驗證通過，四個商品都套用正確**：
- 原文案被 `<strong>` 標籤切成好幾段文字節點，沒辦法用單一文字節點比對取代，改成整段 `<p>` 的 `textContent` 直接覆寫成定稿文字（`主辦方建議於入境日本 5 天內自行投保東京海上日動旅遊險，可享中文醫療專線、免墊付醫療費、突發事故保障。`），用「東京海上日動旅遊險」這個關鍵字定位到正確段落。**會失去原本 `<strong>` 的粗體強調效果**（換取文字逐字正確，需求明確以文字定稿為優先）。
- Checkbox 標籤文字「我已閱讀並了解上述保險建議」原本就已經跟定稿一致，不需要改。

**E-3（必填欄位標題加註 `*`）已完成並驗證通過，四個商品都套用正確**：
- 沒有用「猜」的方式判斷必填/非必填，而是**實際觸發一次 BTA 自己的空白送出驗證**（`test-course-halfday-peak` 上做的），看它自己標記哪些欄位 `Required`——結果除了「備註／其他需求」（唯一的 `<textarea>`，也是唯一 placeholder 寫 `[選填]` 的欄位）以外全部必填。用「容器內有沒有 `<textarea>`」這個結構性判斷加 `＊` 前綴，不寫死個別欄位名稱，四個商品欄位組合不同（時段欄位只有半天班有）也能通用套用。
- 保險同意欄位比較特殊：容器裡同時有「外層長描述段落」跟「checkbox 自己的短標籤」兩個 `.control-label`，星號加在使用者實際會看到的短標籤上（`＊我已閱讀並了解上述保險建議`，完全對應需求文件給的範例格式），不是加在描述段落開頭。

### 涉及檔案異動總覽（A-E 這次一起做的）

- `snippets/course-booking-form.liquid`：新增進度條 HTML/CSS、`positionWidgetOverlay()` 擴充支援進度條定位、新增 `setupBtaContentEnhancements()`/`attachTranslationAndStepSync()`/`injectBtaStyleSkin()`/`applyPanelFrame()`/`applyInsuranceTextFix()`/`applyRequiredAsterisks()` 這一整組 iframe 內容增強邏輯
- `assets/course-stage2-module.js`：`.cs2-backdrop` 拿掉 `data-cs2-skip` 屬性（C 項唯一異動）
- 以上都是**檔案層級**的異動。B/E-1 額外牽涉到的滑雪場選單資料、時段選項文字、tag 架構調整，都是**使用者直接在 BTA／Shopify 後台完成，不在這個 repo 的版控範圍內**，程式碼這邊不需要也沒有對應的 commit。

### ⚠️ 給下一個接手對話的重要提醒（tag 架構，2026-08-09）

1. **四個測試商品現在身上的 tag 應該是 `test-course` + (`test-halfday` 或 `test-fullday`)，不應該再帶有 `halfday`／`fullday`**。之後如果又發現測試商品混入正式商品系列（Collections），或 Stage2 表單欄位又重複/錯配，第一件事先檢查是不是 tag 被意外改回共用 tag。
2. **BTA 後台目前同時存在新舊兩組平行欄位**（例如兩個「滑雪場」欄位，可能還有兩個「時段」欄位），分別對應正式商品（Apply = `halfday`／`fullday`）跟測試商品（Apply = `test-course`／`test-halfday`／`test-fullday`）。建議之後在 BTA 後台把舊欄位 Label 加註「（正式）」之類的備註避免混淆——**這件事先前已經建議過，需要跟使用者確認是否已經做**。
3. `test-course-halfday-offpeak` 上次中斷的端對端測試訂單，有空可以查一下 Shopify 後台訂單記錄或購物車，確認要不要清掉，不算阻塞性問題。



這個資料夾**先前完全沒有 git**（本文件多處提過這件事，例如裝備租賃法律聲明文字刪除後無法復原，就是吃了這個虧）。現在已經：

1. `git init` 建立本機 repo
2. 建立 `.gitignore`，排除：`.shopify/`（Shopify CLI 本機快取/可能含 token）、`.claude/settings.local.json`（Claude Code 個人本機設定，非共用專案設定，`.claude/launch.json` 本身仍然照樣進版控）、`node_modules/`、常見 OS/編輯器暫存檔、`*.log`
3. Commit 前掃過根目錄所有 `.js` 工具腳本跟 `.agents/AGENTS.md`，確認沒有寫死任何 API token/密碼等機密資訊，才 `git add -A`
4. Git 身份：這台機器原本完全沒設定過 `user.name`/`user.email`，**已依使用者指示，只設定成這個 repo 本機專用**（`git config --local`，不影響其他專案或全域設定）：`Eric Tsai <erictsai@lifechillsnow.local>`
5. 初始 commit 已建立：`a5ef3b3`，457 個檔案、159,738 行新增，訊息為「Initial commit：專案穩定版本，含決策1-6完整功能（BTA整合、Stage2/3購物車流程、日曆定位）」

**之後的意義**：從這個 commit 開始，任何改動都可以用 `git diff`／`git log`／`git checkout` 真正回溯，不用再完全依賴 `PROGRESS.md` 文字記錄跟手動復原。**之後每完成一個決策/修正，建議搭配一次 commit**，讓版本歷史跟 PROGRESS.md 的記錄互相對應。

---

## ✅ 課程介紹頁「立即預訂」按鈕改成相對路徑（2026-08-08）

`templates/page.course-introduction.json` 裡兩個 `custom_liquid` 區塊（一個 disabled、一個啟用中，內容重複）的 4 個「立即預訂」按鈕，`href` 從寫死的 `https://lifechillsnow.com/products/...` 絕對網址，改成 `/products/...` 相對路徑（全天旺季/淡季、半天旺季/淡季各一個連結）。JSON 格式驗證過沒壞（`node -e "JSON.parse(...)"` 通過）。

`layout/theme.liquid` 的沙盒防護判斷式**在稍早的待辦 9 已經加過 `.shopifypreview.com`**，這次確認過還在，不用重做。

**驗證**：
- 草稿主題預覽網域（`lifechillsnow.com`，確認 `theme.id === 147355926611`）：點擊「立即預訂」後，`location.href` 正確變成同網域的相對商品網址，`theme.id` 維持不變，沒有跳出草稿預覽狀態
- 本機 `127.0.0.1:9292`：連結解析後的 `.href` 正確顯示 `http://127.0.0.1:9292/products/...`（**這是原本 bug 最明顯會出現的情境**——修正前點下去會直接跳到正式線上網站，現在確認留在本機）
- Console 檢查過，沒有新增錯誤（僅有既存、跟這次改動無關的 BTA 本機環境假錯誤）

---

## ✅ 決策 6 端對端購物車流程驗證通過（2026-08-07）

## ✅ 已定位根因（2026-08-10）：`127.0.0.1` proxyBaseUrl 問題只存在於測試 Widget，正式 Widget 確認乾淨

**這個章節原本標題是「🔍 觀察中（不是已解決）」，2026-08-10 已經把根因定位清楚，不再是懸而未決的觀察，改成確認結論，原始觀察記錄保留在下方供對照。**

### 2026-08-10 的新發現（用三種獨立方法交叉驗證，含完全跳出瀏覽器的 curl）

排查「原生加入購物車按鈕」漏洞時，在草稿預覽網域（`lifechillsnow.com?preview_theme_id=147355926611`）用**全新瀏覽器分頁**（排除今天稍早本機 127.0.0.1 測試殘留污染的可能性）走 `test-course-fullday-peak` 的 BTA 流程，12 月（旺季）整月 35 天**全部顯示 Unavailable**，一個日期都點不了。

追查發現 widget bootstrap 回應（`/apps/bookthatapp/widgets/124456?...`）裡寫死：
```
proxyBaseUrl: 'https://127.0.0.1/apps/bookthatapp'
```
用兩種完全獨立、都不涉及瀏覽器 cookie/session 的方法交叉驗證：(1) 頁面內 `fetch(..., {credentials:'omit'})`，(2) 終端機直接 `curl` 打同一個 widget 網址，**結果完全一致**——證實這不是瀏覽器工具或本機測試殘留造成的假象，是 BTA 後端這個 widget 的設定本身就有問題。

**關鍵一步——比對測試 Widget 跟正式 Widget，才發現問題範圍其實很侷限**：
- 四個 `test-course-*` 測試商品用的是 widget id `124456`（「Snow class booking」的某個版本，PROGRESS.md 決策4-1早就懷疑過這個 id 可能是意外新增/重置出來的）
- 真正的正式商品（例如 `fullday-class-peak-season`，product_id `7652851056723`）查證後用的其實是 widget id **`111783`**——這正是「專案基本資訊」段落原本就記錄的正式 widget id

分別用 `curl` 打兩個 widget 各自的 `proxyBaseUrl`：
```
測試 Widget 124456 → proxyBaseUrl: 'https://127.0.0.1/apps/bookthatapp'         ← 壞的
正式 Widget 111783 → proxyBaseUrl: 'https://lifechillsnow.com/apps/bookthatapp' ← 正常
```

### 結論

1. **正式商品（真正給客人下單用的 widget 111783）完全沒有這個問題，設定正確、`proxyBaseUrl` 正常指向 `lifechillsnow.com`**——不是緊急事件，不影響任何真實客人下單。
2. **問題完全侷限在測試 Widget（124456）本身的設定**，導致所有 `test-course-*` 系列測試商品目前在任何環境（本機、草稿預覽網域）都無法選日期。這解釋了 PROGRESS.md 從 2026-08-06 就開始斷斷續續記錄、卻一直「這次有、下次沒有」抓不到穩定根因的謎團——很可能是有人在 BTA 後台編輯測試 Widget（或關聯的 Season）設定時，反覆把這個欄位改對又改錯，導致每次重新測試結果不一致，不是真的「時好時壞的暫時性網路問題」。
3. **這件事現在的正確定性是「測試環境本身的設定錯誤，會持續擋住我們自己的端對端測試工作，但不影響正式站」**——優先度中等（會拖慢之後所有需要走完整 BTA 流程的驗證工作），但不是要立刻通報業主或聯繫 BTA 客服的緊急事件。
4. **建議處理方式**：請業主或有 BTA 後台權限的人，把測試 Widget（`124456`，「Snow class booking」的測試版本）的 `proxyBaseUrl` / storefront domain 相關欄位，比照正式 Widget（`111783`）的設定修正回 `lifechillsnow.com`，之後測試商品的日曆才能正常查詢可預約日期。

### 原始觀察記錄（2026-08-06～08，保留供對照，不再是「未解之謎」）

---

## 端對端購物車流程驗證通過（2026-08-07）——使用者在自己的真實瀏覽器上完整走通
1. 日曆選 2026/12/18 → 正常跳出訂購表單（雪板類型、滑雪場、通訊軟體、帳號/ID 等欄位），**完全沒有 Unavailable 的問題**
2. 填完表單、點 Book Now → **BTA 自動把商品加入購物車**（購物車圖示變成「1」）
3. 進到購物車頁，確認：
   - Line item properties 完整正確：`Start: 12/18/2026`、雪板類型：雙板SKI、滑雪場：富良野、通訊軟體：LINE、帳號/ID、兒童同行、投保確認、語言、備註全部正確寫入，價格 `$13,175.00`（旺季折扣價，含刪除線標示原價 `$15,500.00`）正確
   - **Stage 3 加購 Modal 正確自動觸發**：三步驟指示條（日期✓→資訊✓→加購進行中）、官方裝備加租選項清單、專屬民宿加購（disabled，「敬請期待」）都正常顯示

**結論**：決策 6（`position: absolute` + 雙 `ResizeObserver` 動態定位）的改動，在真實使用者流程下**完全沒有破壞任何既有功能**——BTA 掛載、日期選取、表單提交、自動加入購物車、properties 寫入、Stage 3 Modal 觸發，全部正常。**待辦 12（決策 6 端對端測試）視為完成**。這個結論跟上方「觀察中」的 `127.0.0.1` 現象是兩件獨立的事：前者是已經走通驗證過的事實，後者是尚未查明根因、需要持續觀察的現象，**不要把兩者混為一談**。

---

## 🗄️ 已更正的舊記錄（誤判過程，保留供教訓參考，不代表真實問題）

## ✅ 待辦 9 已修正：本地沙盒防護腳本補上 `.shopifypreview.com`（2026-08-07）

`layout/theme.liquid` 第 413 行判斷式加了 `|| window.location.hostname.endsWith('.shopifypreview.com')`，其餘不變。**刻意沒有動 `templates/page.course-introduction.json` 裡寫死的 `https://lifechillsnow.com/products/...` 絕對網址**——那些是給正式站真實顧客點的「立即預訂」按鈕，本來就該指向正式商品，問題只在防護腳本自己認得的測試環境範圍太窄。已在本機 `127.0.0.1` fresh reload 驗證：防護腳本正常啟動、判斷式邏輯正確、沒有引入新的 Console 錯誤。`.shopifypreview.com` 情境沒有實機網域可以測，只驗證了程式邏輯。

---

## 🚨 中斷點（2026-08-06 額度中斷時寫入，2026-08-07 復工後重新確認、狀況惡化）：端對端購物車流程被 BTA 後端設定卡住

**背景**：使用者在 BTA 後台把兩個半天服務加進「(test) 2026 Season」設定後（修好了先前「半天商品完全選不了日期」的問題，這不是程式碼問題），要求對 `test-course-fullday-peak` 走一次完整端對端流程驗證：選日期 → BTA widget 填課程細節 → 點「預約」→ 確認跳轉購物車 → 確認 `/cart.js` 的 `properties` 正確 → 確認 Stage 3 加購 Modal 正常觸發。

**執行到一半卡住，原因如下**：

1. 先在本機 `127.0.0.1:9292` 測試，8 月份（旺季開放日期是 12/16~2/28）日曆全部顯示「Unavailable」——這一開始以為只是本機環境限定的假警報（BTA 查詢可用性的 `blocks` API 打 `https://127.0.0.1/apps/bookthatapp/api/v1/blocks`，連線被拒），跟決策 4 第 1 點記錄過的已知現象一樣。
2. 翻到 12 月（旺季範圍內）測試，**同樣的 `Unavailable` 問題在本機環境依然出現**——不意外，因為根因（blocks API 打 127.0.0.1）跟月份無關。
3. **改到正式草稿主題預覽網域（`https://lifechillsnow.com/products/test-course-fullday-peak`，確認 `window.Shopify.theme.id === 147355926611`，是草稿主題沒錯）重測，12 月的日期依然全部顯示 Unavailable**。一開始懷疑是瀏覽器分頁殘留了本機代理設定，所以**開了一個全新、從未碰過 127.0.0.1 的分頁**重測，問題依然存在。
4. **直接 fetch BTA widget 後端回應內容，找到證據**：`https://lifechillsnow.com/apps/bookthatapp/widgets/124456?...&hostname=lifechillsnow.com&widgetPath=products` 這個請求（`hostname` 參數本身是正確的 `lifechillsnow.com`）回傳的 HTML 裡卻寫死了：
   ```html
   <link rel="preconnect" href="https://127.0.0.1/apps/bookthatapp">
   <link rel="dns-prefetch" href="https://127.0.0.1/apps/bookthatapp">
   ```
   這段 HTML 是 **BTA 自己的後端伺服器**回傳的，不是我們主題程式碼產生的——**這證實問題不在我們的 theme 程式碼，是 BTA 後台/App 本身的設定裡有一個地方被寫成 `127.0.0.1`**（可能是「Storefront domain」或類似的 API host 欄位）。

**懷疑的關聯性（未證實，但時間點吻合）**：這次測試看到的 widget id 是 `124456`，跟 2026-08-06 稍早（使用者修改 Season 設定之前）測到的 widget id `111783` **不一樣**。合理懷疑使用者稍早在 BTA 後台編輯 Season 設定的那個操作，連帶重新產生/重置了 widget 設定，過程中某個欄位被寫入或殘留了 `127.0.0.1`（可能是 BTA 開發/代理商過去測試時留下的值）。**這只是懷疑，需要使用者親自去 BTA 後台確認**。

**目前卡住的狀態**：因為所有日期都顯示 Unavailable，**沒辦法點選任何日期，端對端流程從第一步就過不去**——不是被昨天的程式碼改動（決策 6）擋住，決策 6 本身已經驗證完成沒有問題，是被這個新發現的 BTA 後端設定問題擋住。**需要使用者先去 BTA 後台檢查 widget/API 相關設定裡是否有殘留的 `127.0.0.1`，改回正確網域後，才能繼續把端對端流程測完。**

**2026-08-07 復工後重新確認：問題還在，而且症狀比昨天更嚴重**——用全新分頁、建立正確的草稿主題預覽 cookie（`?preview_theme_id=147355926611`，確認 `window.Shopify.theme.id === 147355926611`）後重測 `test-course-fullday-peak`，這次 **`#bta-product-widget` 連 DOM 節點都沒有生成**（昨天至少還會生成節點、掛載 iframe，只是查詢可用日期失敗）。Console 出現 BTA 自己腳本內部的例外：
```
Uncaught TypeError: Cannot read properties of undefined (reading 'querySelectorAll')
  at .../sdk/v1/js/bta-widgets-bootstrap.min.js:2:118464
```
同時依然看得到 `net::ERR_CONNECTION_REFUSED` 和 `[BTA: reservation widget] Network error during reservation check`。**判斷**：這應該是同一個 `127.0.0.1` 網路請求失敗的問題，往前影響到了 BTA 初始化流程更早的階段（可能是某個 fetch 失敗後回傳 `undefined`，緊接著的程式碼沒有防呆就直接呼叫 `.querySelectorAll`，導致整個腳本中斷、連 widget 容器都來不及建立）——**跟昨天判斷的根因是同一個，只是這次連鎖反應更早、更嚴重**，不是新問題，不需要另外查。重試了一次（reload）結果一樣。

**額度中斷前發生的另一件事**：本機 dev server 一度因為 port 9292 被舊進程佔用而啟動失敗，已修正 `.claude/launch.json` 加上 `"autoPort": true`（`shopify theme dev` 本身不需要固定佔用 9292，沒有 OAuth callback 之類的硬性需求），修正後 `preview_start` 已確認能正常重用/啟動 server。**這個修正已經生效，不需要重做**，但這次額度中斷後 dev server 進程已經不在跑了，下次接手需要重新 `preview_start` 啟動一次。

**下次接手第一件事**：
1. 問使用者是否已經去 BTA 後台查過/修過那個 `127.0.0.1` 的殘留設定。
2. 如果還沒修，**不要重複嘗試在本機或預覽網域測試日期選取**——已經確認這不是能從我們這邊繞過去的問題，重測只是浪費額度，先等使用者處理。
3. 如果已經修好，重新走一次「決策 6 完整驗證」段落列出的端對端流程（`test-course-fullday-peak`，之後視時間也測 `test-course-halfday-peak`），完成後更新本文件。

---

## ✅ 決策 6 正式實作完成並驗證通過（2026-08-06）

在「決策 6（研究階段）」的 DevTools 實驗基礎上，把 `position: absolute` 動態定位方案正式寫進 `snippets/course-booking-form.liquid` 的 `<script>`（`positionWidgetOverlay()` 函式，掛在跟 `revealStepUI()` 同一個 `checkAndReveal()` 觸發點，偵測到 BTA iframe 出現才執行一次）。

**跟研究階段的三個防呆要求對應的實作內容**：

1. **不寫死 260px**：`top` 偏移量改成即時讀 `hero.getBoundingClientRect().height`，每個商品各自量各自的。已用兩個 Hero banner 高度明顯不同的商品驗證：`test-course-fullday-peak`（單行標題，260px）跟 `test-course-fullday-offpeak`（雙行標題，285.25px），兩邊都量到各自正確的高度、日曆都正確貼齊 Hero banner 下緣。
2. **雙重 ResizeObserver**：一個 observe `.course-hero-banner`（高度變化就重算 widget 的 `top`），一個 observe `#bta-product-widget` 本身（高度變化就重算 `.course-main-layout-grid` 的 `margin-top`，幫下面的課程資訊卡預留空間）。**桌機版實測切換日曆月份**（August → September，widget 高度因為週數不同而縮短），下方內容正確跟著即時收緊，沒有殘留空白也沒有重疊。
3. **實作過程中發現、額外解決的問題（研究階段沒發現）**：把 `position/left/width/z-index` 設到 `#bta-product-widget` 上之後，量到的 inline style 只剩 `display` 跟後來補上的 `top`，其他全部消失——追出來是 **BTA 自己顯示/隱藏 widget 時用 `setAttribute('style', ...)` 整個覆蓋 style 屬性**（不是疊加），把我們設的東西一起洗掉。修法：加一個 `MutationObserver` 盯緊 `#bta-product-widget` 自己的 `style` attribute，一旦被改動、發現 `position:absolute`不見了就立刻補回去（用 `widget.style.position !== 'absolute'` 判斷，天然防止無限迴圈：補回去之後條件就不成立，不會再觸發）。這件事之後如果这段程式碼要挪到別的專案／別的 BTA widget 版本，要記得重新確認 BTA 是否還是用 `setAttribute` 整個覆蓋的方式。

**驗證結果**（`test-course-fullday-peak` + `test-course-fullday-offpeak`，桌機 1280px + 手機 390px，共 4 種組合）：
- 日曆都正確出現在 Hero banner 正下方，跟陽春版本體驗一致
- 下方課程資訊卡銜接乾淨，沒有重疊也沒有異常空白
- Console 全程無錯誤
- 桌機版切換日曆月份，動態預留空間即時正確調整
- `revealStepUI()`（`.product-form-buttons` 顯示邏輯）完全沒動，行為跟決策 4 驗證時一致

**測試中額外發現、待使用者查證的問題（不是這次改動造成的）**：`test-course-halfday-offpeak` 這個商品連續 4 次重新整理，BTA 的 widget 掛載請求（`/apps/bookthatapp/widgets/{id}?...&widgetPath=products`）完全沒有觸發（不是逾時失敗，是根本沒送出這個請求），跟同一批測試裡其他商品的行為不一樣。已確認沒有因此造成任何錯亂殘留狀態（`.product-form-buttons`、`#bta-product-widget` 都維持乾淨的預設狀態，我們的新程式碼沒有跑，因為它的觸發條件——iframe 出現——從未成立）。懷疑是這個商品在 BTA 後台的設定本身有問題（例如沒有正確關聯到「Snow class booking」widget），**建議之後去 BTA 後台查一下這個商品/變體的設定，比照先前查證 Add-ons 分頁的方式**。

**尚未測試、下次可以視需要補測的項目**：其餘服務組合（半天班旺季、全天班淡季以外的組合）、完整購物車寫入流程的端對端重測（這次改動沒有碰觸 `assets/course-stage2-module.js`／`cart-stage2-trigger.liquid`，理論上不受影響，但沒有這次一起重新走一遍完整下單流程驗證）。

---

## 🔬 決策 6（研究階段）：`position: absolute` 純視覺定位——部分可行，但有未解決的重疊問題（2026-08-06）

**方法**：在瀏覽器 DevTools 對已經穩定運作的 `test-course-fullday-peak` 頁面注入臨時 `<style>`（沒有改任何檔案），設 `<form class="shopify-product-form"> { position: relative; }`、`#bta-product-widget { position: absolute; top: 260px; left: 0; width: 100%; }`（260px 是量測出來的 `.course-hero-banner` 高度，讓 widget 剛好貼齊 Hero banner 下緣）。

**量到的關鍵事實**：`<form>` 的頂部跟 `.course-hero-banner` 的頂部完全對齊（`heroTopRelativeToForm: 0`），且 Hero banner 高度在桌機、手機都是固定 260px——這代表用絕對定位「理論上」可以精準算出正確的 `top` 偏移量。

**三項評估結果**：
1. **BTA 初始化行為**：沒有觀察到異常。注入 CSS 前後比對網路請求，沒有新的 BTA API 呼叫（`/apps/bookthatapp/widgets/...` 等請求時間戳都停留在頁面載入當下，注入 CSS 後沒有新增），代表 BTA 沒有偵測到「可見性變化」而重新初始化。手動點擊日曆格子（未開放日期）也正確跳出「Unavailable」提示，證實 iframe 底下的互動事件沒有被絕對定位擋住或打斷。**目前為止沒有發現任何跟 BTA 衝突的跡象。**
2. **原本位置留下的空隙／版面問題**：**這裡有實際問題，尚未解決**。`position: absolute` 讓 widget 脫離正常文件流，widget 原本佔用的高度不會被保留，導致 widget 用**浮動疊加**的方式蓋在下面的內容上——實測畫面顯示日曆直接蓋在「您選擇的方案資訊」卡片上面，兩者互相重疊，不是乾淨的版面（截圖可見卡片邊緣從日曆後方露出來）。要解決這個重疊，需要額外幫 `.course-info-left-column`（或其他在 widget 之後的內容）預留等同 widget 高度的空間（例如 `margin-top` 或 `padding-top`），但 widget 的實際高度會隨內容狀態變化（loading 中 vs. 已掛載 iframe、選日期前後可能不同），**用固定數值預留空間並不可靠，這是這個方案還沒解決的核心問題**。
3. **桌機／手機**：兩個斷點都測了，重疊問題兩邊都存在，且都用同一個 260px 偏移量就能讓 widget 貼齊 Hero banner（因為這次測試的 Hero banner 高度剛好兩個斷點都是 260px，但這可能是巧合，其他商品或極端字數情況下 Hero banner 高度是否穩定沒有驗證過）。

**結論**：`position: absolute` 這條路**沒有被推翻**（不像決策 5 那樣直接證實無效），跟 BTA 沒有偵測到衝突，是目前為止唯一「日曆位置」跟「內容完整顯示」可以同時成立的方案。但**重疊問題不解決就不能上正式環境**——需要想辦法動態抓 widget 實際高度（例如用 `ResizeObserver` 監聽 `#bta-product-widget` 或它內部 iframe 的高度變化，動態設定下方內容的 `margin-top`），或者接受某種程度的固定高度假設並在多種情境下（不同商品、不同語言文案長度導致 Hero banner 高度不同）反覆測試驗證穩定性。**這件事還沒有回報使用者討論是否要往這個方向做下去，下次接手先跟使用者過一輪這個結論，再決定要不要投入寫 `ResizeObserver` 動態預留空間的正式實作。**

---

## 🚫 決策 5：Liquid render 順序調整已證實無效，路徑排除（2026-08-06）

**背景**：比對陽春版本（`fullday-class-peak-season`，正式站）與測試版本，發現兩者 DOM 巢狀深度完全相同（`#bta-product-widget` 在兩邊都是 `<form class="shopify-product-form">` 的直接子層，往上到 `MAIN` 的結構逐層 class 也對得起來），排除了「測試版本巢狀層數過多」的假設。真正的差異：陽春版本的 `.product-form-buttons`（BTA 白名單沒收錄、預設被 BTA 自己的 CSS 設 `display:none`）從未被解除隱藏，所以它佔用高度 0px，`#bta-product-widget` 自然緊貼在標題/價格下方；測試版本因為 `revealStepUI()` 刻意解除了 `.product-form-buttons` 的隱藏（要顯示我們自己的課程資訊卡），該容器變成 2067px 高，把 widget 往下推。

**嘗試的修法**：把 `blocks/buy-buttons.liquid` 裡 `{% render 'course-booking-form' %}` 的呼叫，從 `.product-form-buttons` 內部移到它外面（跟 BTA 插入 `#bta-product-widget` 的地方同一層），理論上讓 Liquid 產生的 HTML 順序把我們的內容排在 widget 後面。

**結果：無效，已復原**。實測兩輪：
1. 第一輪移動後，日曆「看起來」跳到最上面了——但這是假象，真正原因是移出來的 `.ski-booking-funnel-wrapper` 自己變成 `<form>` 的直接子層後，被 BTA 的白名單隱藏規則命中（`form[action*="/cart/add"] > :not(白名單)`），整段內容被隱藏成 0 高度，widget 才「看起來」排到最前面。
2. 修正 `revealStepUI()` 改成解除 `.ski-booking-funnel-wrapper` 的隱藏、讓內容正確顯示後，widget **又被推回內容下方**——跟移動前幾乎一樣的位置。

**根本原因（已用 `bta-widgets-bootstrap.min.js` 原始碼佐證）**：BTA 是在頁面載入「之後」用 JS 動態把 `.widget-loading-indicator` / `#bta-product-widget` 這兩個節點 `appendChild` 到 `<form>` 尾端（原始碼裡對應的函式：`$=t=>{...t.appendChild(e)...}`，以及白名單陣列 `x` 裡明確列了 `"#bta-product-widget"`、`"div.widget-loading-indicator"` 這兩個字串，證實它們是 BTA 自己認定、由它自己插入的節點，不是我們的 Liquid 範本能控制的東西）。因為這個 `appendChild` 動作發生在瀏覽器執行期、在我們的 Liquid HTML 早就渲染完成之後，**不管把我們的內容放在 `<form>` 裡的哪個位置，BTA 永遠會把 widget 插到「當下 form 裡所有東西的最後面」**。這跟先前「CSS order 生效但視覺無效果」是同一類陷阱（技術上的改動正確套用了，但打錯了真正決定畫面呈現的機制）。

**結論：「調整 Liquid render 順序」這條路徑已排除，不要重複嘗試**。目前已知會影響 widget 視覺位置的因素只有：(a) DOM 樹裡的實際節點順序（我們控制不了，因為 widget 是 BTA 用 JS append 上去的，永遠排最後）、(b) 前面手足元素的顯示/隱藏與高度（`.product-form-buttons` 目前刻意撐開了 2067px 高度）。**兩個檔案（`blocks/buy-buttons.liquid`、`snippets/course-booking-form.liquid`）都已復原到本次調整前的版本**，`render` 呼叫回到 `.product-form-buttons` 內部、`revealStepUI()` 改回守護 `.product-form-buttons`，並重新驗證：`.product-form-buttons` 顯示 `flex`、`.ski-booking-funnel-wrapper` 顯示 `block`、widget iframe 正常掛載、`<form>` 子層順序回到原本已驗證過的結構、Console 無錯誤，跟決策 4 驗證時記錄的座標數字一致（內容 y≈207~2111，widget y≈2274 起）。

---

## ✅ 決策 4 遺留死 CSS 已清理完成（2026-08-06）

`snippets/course-booking-form.liquid` 從 1242 行減少到 717 行，移除了約 525 行 Stage1/2/3 精靈時期遺留、已無對應 HTML 的死 CSS。

**判斷方法**：先完整列出目前 HTML（`</style>` 之後的區塊）實際用到的 class/id，再逐一比對 CSS 區塊裡的選擇器；對於「看起來像死的」但不確定的（例如 `.attendee-gear-group-box`、`.gear-item-box`、`.toggle-switch`、`.dual-track-container`、`.accordion-card`、`.accordion-header`、`.card-info`），額外用 grep 搜過整個 repo，確認 `assets/course-stage2-module.js` 有自己獨立 `injectStylesOnce()` 注入的同名樣式副本（購物車頁不會載入這個檔案的 `<style>` 區塊，兩者完全獨立），排除誤刪購物車頁 Modal 真正在用的樣式的風險。

**刪除的內容**（都確認 repo 全域搜尋零使用）：`.card-step-title`、`.stage-footer-card-wrapper`（含重複定義）、`#BtnStage1Next`/`#BtnStage2Next`/`#BtnSubmitPackAjax`、`.accordion-info-*`、`.step-title`、`.bta-calendar-placeholder`/`.booking-fields-card`/`.premium-funnel-footer-card`/`.stage2-footer-card`、`.sandbox-*`、`.field-label`、`.insurance-*`、`.checkbox-container-wrap`/`.custom-premium-box`/`.checkbox-label-text`、`.footer-actions-row`、`.premium-nav-btn`、`.btn-primary-solid`（含重複定義）、`.btn-secondary-outline`、`.dual-track-container`、`.accordion-card`/`.accordion-header`/`.card-info`、`.toggle-switch`/`.toggle-slider`、`.accordion-content`/`.is-expanded`、`.ski-type-blocking-hint`、`.gear-hint`、`.hotel-placeholder-box`、`.footer-price-*`、`.attendee-gear-group-box`/`.gear-item-box`/`.gear-*`/`.premium-inline-tag`、`.cbf-course-info-*`/`.cbf-info-*` 整組手風琴、`.plan-summary-block`、`.cost-info-block`、`.required-consent-card`/`.consent-card-*`（舊版必勾卡片設計，已被 `.compact-cb-row` 系統取代）、`.more-services-*`/`.intro-link-*`（舊版「更多服務說明」JS 展開設計，已被原生 `<details>`/`<summary>` 的 `.modern-details-accordion` 取代）。

**刻意保留、沒有動的重複/重疊定義**：`.consent-unlock-hint` 有兩份定義（一份在檔案前段、一份在檔案尾端，字型大小等細節略有差異，CSS cascade 下實際是後者覆蓋前者部分屬性）；`.consent-checkbox-row`/`.consent-checkbox-label` 也各有「裸選擇器」與「`.compact-cb-row` 後代選擇器」兩份定義互相疊加。這些 class 目前都**有實際使用**，不是零使用的死代碼，只是定義重疊——清乾淨屬於「調和/去重」的另一類重構工作，風險層級不同（可能改變最終呈現樣式），這次任務範圍只處理零使用的死選擇器，沒有動它們。

**驗證**：`theme dev` fresh reload `test-course-fullday-peak`，確認左欄三張資訊卡、必勾同意卡片視覺樣式（框線/背景/hover）、「更多服務說明」手風琴、BTA widget 掛載（iframe 出現）、`revealStepUI()` 判斷（`.product-form-buttons` 正確變 `flex`）全部正常，Console 只有已知的本機 BTA 網路假警報，沒有新增錯誤。

---

## ✅ 決策 4 第 1 點已驗證通過（2026-08-06）

`theme dev` 重啟 + fresh reload `test-course-fullday-peak` 確認：

- 頁面正常渲染，Title/麵包屑/左欄三張資訊卡（含 `CheckBoxConsent1/2/3`，純靜態無 JS 屬預期行為）、「更多服務說明」手風琴都正常顯示，沒有孤兒 HTML 標籤或版面錯亂。
- 原生「加入購物車」按鈕可見。
- `revealStepUI()` 的 MutationObserver 機制正常運作：BTA iframe 掛載後，`.product-form-buttons` 正確切回可見，日曆/人數選單/價格/下一步按鈕都正常顯示。
- Console 沒有任何跟 `course-booking-form.liquid` 自身程式碼相關的錯誤或死參照。

**過程中額外發現、已處理的兩個環境問題**（跟決策 4 的程式邏輯本身無關，記錄起來避免下次又卡住）：

1. **本機遺留一個從 8/2 就沒關過的 `shopify theme dev` 進程（port 9292）**，導致瀏覽器打開後顯示「Failed to Upload Theme Files」，錯誤內容是 `snippets/` 資料夾裡幾個沒有 `.liquid` 副檔名的檔案（`sed3oebVp`、`sednAAHh9` 等）——這是上次用 `sed -i` 直接改行號時 sed 自己產生的暫存檔，事後檔案本身已經沒有殘留（`ls snippets/` 確認乾淨），但那個舊進程沒重啟過，卡著舊的錯誤畫面。**處理方式**：直接砍掉舊進程、用新建的 `.claude/launch.json`（`shopify theme dev --theme 147355926611`）重新啟動，問題消失。**教訓**：以後用 `sed -i` 大量編輯 `.liquid` 檔後，養成習慣順手看一眼 `snippets/`／改動到的資料夾有沒有多出非預期副檔名的檔案。
2. **BTA reservation widget 在本機測試環境噴 Console error**（`[BTA: reservation widget] Network error during reservation check`），追到網路請求層是 `https://127.0.0.1/apps/bookthatapp/api/v1/blocks`、`https://localhost/apps/bookthatapp/api/v1/reservations` 兩個請求用預設 443 埠打（而不是 dev server 實際在跑的 9292），連線被拒。**這是在完全乾淨、沒有任何瀏覽器擴充功能的環境下重現的**，跟文件先前（測試驗證紀錄段落）記載「已確認是使用者瀏覽器擴充功能造成」的說法對不上——比較可能的解釋是 BTA widget script 本身在組請求網址時沒有正確帶入本機開發用的非標準埠，屬於「本機 dev 環境限定的假警報」，不代表正式站或 `.myshopify.com` 預覽網域也會發生。**沒有因此改任何程式碼**，先記錄下來，如果之後又在真正的預覽網域（非 127.0.0.1 本機）看到同樣錯誤，才需要認真查。

---

## 🚫 決策 4 第 2 點：已實測，CSS order 路徑走不通，**暫緩擱置**（2026-08-06）

**原本的假設是錯的**：以為 `.course-sticky-right-card` 這個容器本身就是 BTA 日曆 widget 顯示的地方，只要對它加 `order` 就能在手機版把它排到左欄前面。實際寫了 `order: -1` 進 `@media (max-width: 991px) { .course-sticky-right-card { ... } }` 後，桌機/手機各自 fresh reload 實測（含 `revealStepUI()` 沒被干擾的驗證），**發現這個 CSS 對使用者實際看到的畫面完全沒有效果**。

**追查後確認的真實 DOM 結構**（用瀏覽器 JS 直接量測、追 `parentElement` 鏈得出，不是猜測）：

```
<form class="shopify-product-form">          ← display: block（不是 flex/grid！）
  ├── (hidden inputs...)
  ├── <div class="product-form-buttons">     ← revealStepUI() 控制顯示/隱藏的容器
  │     └── course-booking-form.liquid 整個內容（左欄 + 右欄）
  │           └── .course-sticky-right-card  ← BTA 掛載後，這裡其實是空殼（高度只剩 58px）
  ├── (hidden inputs...)
  ├── <div class="widget-loading-indicator">
  └── <div id="bta-product-widget">          ← BTA 真正掛載日曆 widget 的地方
```

**關鍵發現**：BTA 掛載 widget 時，並不是把內容渲染進我們巢狀設計、原本以為的 `#bta-product-widget`（在 `.course-sticky-right-card` 內部三層深的地方）——而是**整個移除原本那個巢狀節點，在 `<form class="shopify-product-form">` 底下重新插入一個同 id 的新節點，跟 `.product-form-buttons` 是同一層的手足元素**。這件事本文件很早以前就寫過一句警語（「BTA 可能不是原地修改 #bta-product-widget，而是整個移除舊節點、建立新節點取代它」），這次是第一次被實測證實。

**為什麼 CSS order 沒用**：`order` 屬性只在 flex/grid 容器的直接子項之間才有效。`#bta-product-widget`（真正顯示的地方）跟 `.product-form-buttons`（我們整個自訂表單的外層）雖然是手足，但共同父層 `<form class="shopify-product-form">` 是 `display: block`，`order` 在這裡完全不生效。而我們原本加 CSS 的 `.course-sticky-right-card` 是藏在 `.product-form-buttons` 底下更深、跟 `#bta-product-widget` 完全不同分支的節點，對它加 order 自然影響不到真正顯示的地方。

**唯一還算得上「純 CSS」的解法，是把 `<form class="shopify-product-form">` 改成 `display: flex; flex-direction: column`**，才能對 `.product-form-buttons` 和 `#bta-product-widget` 分別設 order。但這個 `<form>` 正是決策 1 修過巢狀 form bug、且 BTA 掛載邏輯與 `revealStepUI()` 判斷都高度依賴其目前渲染狀態的核心容器——**使用者評估後認為風險層級已經跟原本「純 CSS、低風險」的預期不同，決定暫緩**，理由是先前為了穩定 BTA 掛載花了很多輪測試才達到的狀態，不值得為了手機版視覺排序冒風險去動它。

**目前狀態**：
- 加過的 `order: -1` **已經移除**（沒有實際效果，留著只會誤導之後的人以為做完了）。
- `.course-sticky-right-card` 本身在 BTA 掛載後就是空殼，不影響任何功能——**這只是視覺排序問題，不阻塞核心預約流程**。
- 曾討論但未探索的替代方向（純研究記錄，尚未實作也未驗證可行性）：
  - 用 CSS Grid 的 `grid-template-areas` 把 `.product-form-buttons` 跟 `#bta-product-widget` 收進同一個共同父層的 grid 排版——但兩者現在也不是同一層的 grid item，一樣需要先把它們的共同父層（`<form>` 或更上層）改成 grid，風險跟改 flex 是同一等級。
  - 用 JS 純視覺量測（`getBoundingClientRect()`）搭配 CSS `position` 做「視覺模擬順序」，完全不動任何既有元素的 DOM 位置或 display 模式——理論上風險最低，但沒探索過實際寫法可不可行、會不會跟 BTA 自己的 iframe resize/reflow 邏輯打架，需要之後有空再研究。
- **下次要重啟這個項目前，先跟使用者確認風險是否可以接受**，不要不問就動 `<form class="shopify-product-form">` 的 display 屬性。

### 本次中斷前對 `snippets/course-booking-form.liquid` 的具體修改（決策 4 第 1 點）

用 `sed` 直接對行號操作完成，依序做了：

1. 刪除整段「底部沙盒核心控制鏈」重複的 Stage 切換 JS（原本獨立一個 `<script>`，跟第一個 DOMContentLoaded 內容重複）
2. 刪除整個第一個 Stage1/2/3 控制腳本 `<script>`（DOM 參考、必勾同意卡狀態同步 `syncConsentState()`、裝備裂變工廠 `buildGearForms()`、法規 Modal 開關邏輯、計價引擎 `calculateTotal()`、Ajax 送出 `submitBtn` handler、`.js-scroll-link` 錨點——**確認 `.js-scroll-link` 這個 class 在現有 HTML 裡完全沒被用到，是死的**）
3. 刪除法規彈出層 CSS（`.cbf-modal` 整組，約 75 行）
4. 刪除假日曆容器 CSS（`.sandbox-calendar-container`，已無 HTML 使用）
5. 刪除法規聲明內容模板 HTML（`<template id="TemplateLegalGear">`、`<template id="TemplateLegalHotel">`、`<div id="CbfLegalModal">` 整組彈出層 markup）——**這裡面有裝備租賃風險/賠償金額表等法律文字內容，刪除前沒有保留副本，如果之後購物車頁的裝備 Modal 需要類似法律聲明，這段文字已經不在檔案裡了，需要另外處理**
6. 把 `.course-sticky-right-card` 內部整段（`booking-progress-stepper` 進度條 + `Stage1Container` + `Stage2Container` + `Stage3Container`，約 200 行）換成一個精簡版本，**只保留**：
   - `<div id="bta-booking-form-{{ product.id }}" data-product-id="{{ product.id }}">`（外層容器，id 不變）
   - `<div id="booking-current-date-picker">`（`revealStepUI()` 的 `MutationObserver` 監聽對象，**id 完全沒動**）
   - `<div id="bta-product-widget" class="bta-calendar-picker-canvas"></div>`（BTA 真正辨識的錨點，**id 完全沒動**）
   - 中間過程修掉了一個因為刪除範圍算錯行號、多留下來的孤兒 `</div>`（已修正，目前肉眼看起來 HTML 標籤有配對整齊，但沒有實際跑過 Liquid 渲染驗證）

**左欄（`.course-info-left-column`，含「您選擇的方案資訊」「安全規範/資格確認/退款政策」三個必勾同意 checkbox「更多服務說明」）完全沒動**，維持原樣。

**尚未清理、還留在檔案裡的死 CSS**（Stage1/2/3 專用但現在已經沒有對應 HTML 在用的樣式，例如 `.booking-stage`、`.step-item`、`.card-step-title`、`.sandbox-field`、`.sandbox-select` 等）——這些目前是無害的死 CSS（不會造成錯誤，只是佔位），還沒清，決策 4 全部做完後可以一併處理。

**必勾同意 checkbox（`CheckBoxConsent1/2/3`）目前完全沒有 JS 行為**——原本 `syncConsentState()` 負責視覺回饋跟解鎖 `BtnStage1Next`，兩者都已被刪除的 JS 移除，checkbox 現在是純靜態、可勾選但不觸發任何事情的 HTML。這是預期中的結果（該按鈕本來就要被刪），但如果之後想保留「使用者體感上有勾選確認」這件事，可能需要另外設計。

---

## 專案基本資訊

- **商店**：qgfchv-py.myshopify.com（來趣滑雪 Life Chill Snow）
- **草稿主題**：`Designer_Eric`（theme id `147355926611`）—— 所有修改都只在這個草稿主題，未動正式線上主題
- **測試商品**：`test-course-fullday-peak`（product_id `8029961846867`，variant `45866593747027` = 1~2人方案）
- **BTA App**：BookThatApp，Widget 名稱「Snow class booking」（Type: Rentals, ID: `111783`），Storefront placement: Inline
- **黃金基準**：`templates/product.fullday.json`（原生 buy-buttons，未經修改，BTA 在這類商品上一直正常運作）
- 預覽網址是 Shopify 動態產生的短網址，**每次 `shopify theme dev` 重啟或 session 更新都可能改變**（同一個主題 id 底下），測試時務必先用 `window.Shopify.theme.id` 確認是 `147355926611`，不要依賴網址本身沒變。

---

## 架構決策（依時間順序）

### 決策 1：診斷階段確認的根因鏈（已解決）

依序找到並修正了以下疊加在一起的問題：

1. **巢狀 `<form>` bug**：`course-booking-form.liquid` 內自己開了一個 `<form action="/cart/add">`，巢狀在原生 `<form data-type="add-to-cart-form">` 裡面，導致瀏覽器解析器丟棄內層 form、提前關閉外層 form 的 owner 指標，使 Stage 2/3 欄位脫離表單歸屬。**修法**：內層 `<form>` 改成 `<div>`。
2. **原生 add-to-cart/quantity 被 `display:none` 隱藏**（`blocks/buy-buttons.liquid`，針對 `product.type == 'Course'` 的條件式樣式）。**修法**：移除該條件式隱藏，永久保持可見。
3. **假日曆錨點命名錯誤**：`course-booking-form.liquid` 手刻的 `#CustomModernCalendar` 從未對應 BTA 真正辨識的錨點。從 `bta-widgets-bootstrap.min.js` 原始碼反查出真正的錨點 id 是 **`#bta-product-widget`**。**修法**：把該 div 的 id 改成 `bta-product-widget`。
4. **BTA 自己注入的 CSS 連坐隱藏了整個 STEP UI**：BTA 的 widget 腳本會把 `form[action*="/cart/add"] > :not(白名單)` 全部設 `display:none`，白名單裡都是其他主題的 class 慣例，不包含 Horizon 的 `.product-form-buttons`（剛好是 STEP UI 的外層容器），因而被一起隱藏。**修法**：`course-booking-form.liquid` 加入 `MutationObserver` + 輪詢保底機制（`revealStepUI()`），偵測到 `#bta-product-widget` 內出現 `<iframe>`（代表 BTA 成功掛載）後，才把 `.product-form-buttons` 強制設回 `display:flex; flex-direction:column`。
5. **BTA 會停用 `.booking-form` class 內的所有 input**：`course-booking-form.liquid` 的 Stage1 外層 div 原本 class 是 `"bta-booking-form booking-form"`（原作者猜測性命名），意外撞上 BTA 自己會主動清理的 class，導致 Stage 切換後前面階段的欄位被停用、`FormData` 收集不到。**修法**：移除該 div 的這兩個 class（確認沒有 CSS 依賴它們）。

上述 1、2、3、5 都已經寫進 `snippets/course-booking-form.liquid` 並驗證通過（連續多次 fresh reload + 清 cookies/localStorage 測試）。

### 決策 2：BTA 官方文件確認的行為（改變了整體架構方向）

使用者查證 BTA 官方文件確認：**BTA widget 走完自己內部的完整流程（選日期 → 它自己的「確認課程細節」表單 → 它自己的「預約」按鈕）後，會自動把商品加入 Shopify 購物車，並把日期/它收集到的欄位資料寫入該 line item 的 properties，不需要我們手動同步。**

實測驗證（`test-course-fullday-peak`，即時點擊 BTA 自己的 UI 走完全部流程）：

```json
{
  "title": "【測試專用】全天滑雪課程(旺季) - 1 ~ 2 人",
  "price": 1317500,
  "properties": {
    "Start": "08/15/2026",
    "雪板類型": "雙板SKI",
    "滑雪場": "富良野",
    "通訊軟體": "LINE",
    "帳號／ID": "test_bta_line_456",
    "是否有 6～12 歲兒童？（每組最多接受 1 位兒童同行）": "沒有",
    "我已了解主辦方建議...投保建議": "我已閱讀並了解上述保險建議",
    "語言": "中文"
  }
}
```

**額外重大發現**：BTA widget 自己的「確認課程細節」畫面，內建欄位是**雪板類型、滑雪場、通訊軟體、帳號/ID、是否有兒童同行、保險同意**——跟我們自己刻的 STEP UI Stage 2 幾乎一模一樣。這是 BTA 後台「Booking fields: Show custom booking fields」原生提供的功能，不需要重刻。

### 決策 3：Plan B 架構（目前執行中）

- **Stage 1（日期）+ Stage 2（雪板類型/場地/聯絡方式/兒童同行）完全交給 BTA 自己的 widget 處理**，不再跟它搶主導權。
- **Stage 3（裝備加租）改成「加入購物車之後」的步驟**：在購物車頁監聽/檢查，偵測到 BTA 剛把課程商品加進購物車、且尚未補裝備資料時，跳出一個 Modal 收集裝備加購，用 `/cart/change.js` 追加寫入該 line item 的 properties。
- **未來可能升級成 Plan A（商品頁不跳轉，同頁完成）**——所以要求把「顯示什麼內容」（渲染邏輯）跟「何時該顯示」（觸發邏輯）拆成兩個獨立模組，未來只需要換觸發邏輯，渲染邏輯完全不用動。

> **📌 2026-08-12 修正註記（不刪除上面原始記錄，補充後續結論）**：上面「未來可能升級成 Plan A（商品頁不跳轉，同頁完成）」這個前提**不成立，已確認排除**。原因：Stage 3（裝備加租）技術上只能實作在購物車頁（監聽 `/cart.js`、用 `/cart/change.js` 追加寫入 line item properties），BTA widget 本身完全不提供在單一產品頁內、加入購物車前就能收集「加購」這種跟課程商品本身無關的額外資料的機制——這不是實作選擇，是 BTA 平台能力的硬限制，所以「同頁完成」這個方向從一開始就不可能達成，不是「還沒升級」，是「這條路徑不存在」。
>
> 這件事在 2026-08-12 測試 Widget（`124456`）的 Redirect 設定從「Continue Shopping」改成「Cart Page」、跑完整端對端流程後被明確驗證：BTA 送出訂單後**必須**先跳轉到購物車頁（這正是 Redirect 設定要改成 Cart Page 的原因——改之前用 Continue Shopping 會停留在原產品頁，Stage 3 Modal 沒有觸發時機），Stage 3 Modal 才能在購物車頁被 `cart-stage2-trigger.liquid` 偵測到並跳出。
>
> **目前確定的架構是**：Stage 1-2 在產品頁完成（BTA widget 處理，不跳轉），送出後**跳轉到購物車頁**完成 Stage 3（我們自建的裝備加購 Modal）。這是最終形態，不是過渡期方案，上面「Plan A」這個名稱之後不用再提。

### 決策 4：已拍板，執行中（見上方「中斷點」）

使用者回覆：
1. **同意**移除自訂 Stage 1/2 精靈 UI（假日曆容器、人數下拉選單、下一步按鈕、Stage2 自訂欄位），不用保留 fallback。**→ 執行到一半，見上方中斷點段落。**
2. **不同意** DOM 搬移（`appendChild`/`insertBefore`）把 `.buy-buttons-block` 移進 Stage 1 卡片位置——雖然巢狀 form 風險已消失，但 iframe 重建/重新載入的風險沒有被真正修好，只是被目前「不動 DOM、CSS + MutationObserver 控制可見性」這個已驗證 95% 穩定的方案繞過去而已，不該為了視覺搬移重新引入這個風險。**改用純 CSS 定位**（flexbox `order` 屬性）在 `@media (max-width: 991px)` 讓 `.course-sticky-right-card` 視覺排到 `.course-info-left-column` 前面，DOM 節點順序不變，`revealStepUI()` 的偵測時機邏輯完全不要重新設計。**→ 完全還沒開始。**

---

## 已完成的檔案

### `snippets/course-booking-form.liquid`（大幅修改）

- 巢狀 form 修正（`<form>` → `<div>`，含 id/class 保留）
- 新增 CSS：隱藏原生重複標題/價格區塊（`[data-block-id$="__group_icgrde"]`）、隱藏原生分隔線、`.product-information__grid` 收合成單欄滿版
- `#CustomModernCalendar` → 改名 `#bta-product-widget`（真正的 BTA 錨點）
- 新增 `MutationObserver` + 輪詢保底機制（`revealStepUI()`），等 BTA iframe 掛載成功才把 `.product-form-buttons` 設回可見
- 移除 Stage1 外層 div 的 `bta-booking-form booking-form` class（BTA 撞名 bug 修正）
- **清理掉的死程式碼（決策 4 之前）**：假日曆模擬 JS（`sandbox-date-node` 整組邏輯）、更早期的 `.day-btn` 假日曆系統（CSS + JS 監聽器，確認沒有對應 HTML）、`#BtaTimeSlotsWrapper`/`#bta-time-slots-*` 空殼容器
- **決策 4 執行中（未測試）**：Stage1/2/3 精靈整組（進度條、Stage1/2/3Container、consent 狀態同步、裝備裂變工廠、法規 Modal、計價引擎、Ajax 送出、底部沙盒控制鏈重複腳本）已從 HTML/JS/CSS 移除，右欄簡化成只剩 `#bta-booking-form-{{product.id}}` → `#booking-current-date-picker` → `#bta-product-widget` 三層錨點。**細節見文件最上方「中斷點」段落，尚未經瀏覽器驗證。**

### `blocks/buy-buttons.liquid`（小幅修改）

- 移除了針對 `product.type == 'Course'` 的原生 add-to-cart div `display:none` 條件式隱藏（永久生效，非暫時測試）

### `assets/course-stage2-module.js`（新檔案，Plan B 核心）

可重複使用模組，掛在 `window.CourseStage2Module`：

- `renderStage2Form(container, options)` — 純渲染函式，把裝備加購 Modal 渲染進任意 `container`，不假設頁面上下文。視覺語言直接沿用 `course-booking-form.liquid` 已定案但部分未使用的樣式（`.attendee-gear-group-box`／`.gear-item-box` 深色標題列系統，捨棄了目前實際在跑但完全沒有 CSS 的 `.cbf-attendee-group` 系統）
  - 內含：步驟指示條（1日期✓ → 2資訊✓ → 3加購進行中）、雙軌卡片（官方專屬裝備加租 / 專屬特約民宿加購-disabled）、學員分組裝備清單
- `renderGearRentalSection(container, options)` — 裝備清單子邏輯，可獨立呼叫
- `writeCourseFormDataToCart(cartItemKey, properties)` — 呼叫 `/cart/change.js`，**會先讀取該 line item 既有 properties 再 merge**（避免覆蓋 BTA 寫入的欄位），並**明確帶回原始 `quantity`**（踩過的坑：`/cart/change.js` 沒帶 quantity 會把數量重置成 1）

### `snippets/cart-stage2-trigger.liquid`（新檔案，Plan B 觸發器）

- 只負責「何時該顯示」：購物車頁載入 / `cart:update` 事件時，檢查 `/cart.js` 有沒有課程商品（`product_type === 'Course'` 或 handle 含 `course`）缺少 `_stage2_completed` 這個 properties 標記，有的話呼叫 `CourseStage2Module.renderStage2Form(...)`
- `_stage2_completed` 用底線開頭，Shopify 會自動不顯示在客戶看到的購物車/結帳頁面
- 「略過」也會寫入 `_stage2_completed: "skipped"`，避免重複糾纏使用者
- **未來升級成 Plan A 時，這個檔案可以整個刪除、換一個監聽商品頁 add-to-cart 事件的新觸發器，`course-stage2-module.js` 完全不用改**（2026-08-12 修正：此路徑已確認不成立，見上方決策 3 的修正註記，這個檔案會是長期存在的架構，不會被替換）

### `sections/main-cart.liquid`（一行掛載）

- 第 58-59 行新增 `{% render 'cart-stage2-trigger' %}`，是唯一跟 Plan B 觸發機制耦合的地方

---

## 測試驗證紀錄

- Stage2/3 Modal 完整流程（加入課程商品 → 購物車頁自動彈出 Modal → 勾選裝備 → 確認 → `/cart.js` 驗證 properties 正確合併、quantity 正確保留）✅ 通過
- 「略過」路徑（properties 正確標記 `skipped`，不重複彈出）✅ 通過
- 已完成標記的項目重新整理購物車頁不會重複彈出 ✅ 通過
- BTA widget 本身初始化成功率：連續測試約 8-20 次，成功率落在 80%~95% 之間（我方測試環境 vs 使用者無痕視窗結果不同，使用者確認 ~95% 屬於可接受範圍，**決定不用為此聯繫 BTA 官方**）
- 曾出現的 `POST https://127.0.0.1/apps/bookthatapp/api/v1/reservations` 失敗請求，**已確認是使用者瀏覽器擴充功能（翻譯工具）造成的干擾，不是網站問題**，無需處理——**但 2026-08-06 在完全乾淨、無擴充功能的環境下也重現了同樣的請求失敗**（見文件最上方「決策 4 第 1 點已驗證通過」段落的第 2 點），懷疑是 BTA widget script 在本機 dev 環境（非標準 443 埠）組網址時的已知限制，跟擴充功能無關。兩個成因可能都存在，暫不用處理，但下次若在正式預覽網域也看到同樣錯誤，這個「已確認是擴充功能」的結論需要重新檢視

---

## 待辦事項

0. ~~修正原生「加入購物車」按鈕造成的空白訂單漏洞~~ ✅ 已於 2026-08-10 完成、驗證、commit。細節見文件最上方「✅ 已修正（2026-08-10）」專章。**完整端對端流程還沒補測**——卡在測試 Widget（`124456`）的 `proxyBaseUrl` 設定問題（誤指向 127.0.0.1，跟這次改動無關，正式 Widget `111783` 不受影響），細節見文件下方「✅ 已定位根因」專章。**等業主/BTA後台權限的人修好測試 Widget 設定後，補一次完整端對端流程驗證 properties 正確帶入**
1. ~~【最優先，下次接手第一件事】驗證決策 4 第 1 點的刪除沒有把頁面弄壞~~ ✅ 已於 2026-08-06 驗證通過，細節見文件最上方
2. ~~執行決策 4 第 2 點（CSS order 手機版排序）~~ 🚫 已於 2026-08-06 實測發現原本的 CSS 路徑走不通，需要改動風險等級跟原訂單「純 CSS 低風險」不同，**使用者決定暫緩擱置**，細節見文件最上方「決策 4 第 2 點」段落。之後要重啟前，先跟使用者確認風險可接受再動手，不要不問就動 `<form class="shopify-product-form">` 的 display 屬性
3. ~~清理決策 4 遺留的死 CSS~~ ✅ 已於 2026-08-06 完成並驗證，細節見文件最上方「決策 4 遺留死 CSS 已清理完成」段落
4. ~~確認必勾同意 checkbox（`CheckBoxConsent1/2/3`）拿掉 JS 後是否需要重新設計互動~~ ✅ 已於 2026-08-10 完成並實測驗證通過（含繞過測試、同頁連續開啟兩次 Modal 驗證重置），commit `1de8f5c`，細節見文件最上方「Stage 3 必勾同意 checkbox 已完成並 commit」專章
5. 裝備租賃法律聲明文字（風險/賠償金額表，原在 `TemplateLegalGear`）已隨清理刪除，若購物車頁 Modal 需要類似聲明，需另外處理——**定稿文字已交付（見 `Stage3_法律聲明文字_定稿.md`），尚未置入 Stage3 Modal**，下次接手可以開始做
6. ~~檢查 BTA 後台「Add-ons」分頁，確認是否也能原生處理裝備加租~~ ✅ 已於 2026-08-06 查證：Add-ons 卡片顯示「No add-ons」且沒有「Manage」按鈕（對比同頁 Locations/Images 卡片都有），代表此功能對目前方案不可操作，非「尚未設定」。**結論：`assets/course-stage2-module.js` 購物車頁 Modal 是必要的，繼續維護，不考慮拆除**
7. **【現在最優先】視覺 QA**：使用者提到有參考截圖但這次對話中沒有實際附上圖檔，購物車頁 Modal 樣式是依文字規格 + 直接復用 `course-booking-form.liquid` 既有 CSS 重建，**尚未經過使用者針對截圖的逐項比對確認**——**使用者 2026-08-06 表示稍後會提供截圖，收到後優先處理**
8. ~~這次所有修正都只在 `test-course-fullday-peak`、`test-course-fullday-offpeak` 這兩個測試商品上驗證過，尚未套用到其餘服務組合（半天班旺季/淡季）~~ ✅ 已於 2026-08-08/09 視覺 QA 修正（A-E）過程中把四個測試商品都走過一次，細節見文件最上方「視覺 QA 修正需求規格 A→E 全部完成」段落
9. ~~`layout/theme.liquid` 本地沙盒防護腳本只認 `127.0.0.1`/`localhost`，不包含 `.shopifypreview.com`；`page.course-introduction.json` 「立即預訂」按鈕寫死正式網域絕對網址~~ ✅ 兩部分都已修正完成。防護腳本判斷式 2026-08-07 已加上 `.shopifypreview.com`（`layout/theme.liquid` 第 413 行）。**2026-08-08 使用者改變主意，決定連「立即預訂」按鈕本身也要改成相對路徑**（見文件最上方「課程介紹頁『立即預訂』按鈕改成相對路徑」段落）——這跟 2026-08-07 當時「這是正式站給真人顧客用的連結，不是 bug」的判斷不同，**以使用者這次的最新決定為準**，兩處都已修正並在草稿預覽網域 + 本機環境驗證通過
10. ~~決策 4 第 2 點 / 決策 5 都排除後的替代方向：`position: absolute` 純視覺定位方案~~ ✅ 已於 2026-08-06 正式實作完成並驗證通過（含動態量測、雙重 ResizeObserver、BTA style 覆蓋問題修正），細節見文件最上方「決策 6 正式實作完成並驗證通過」段落
11. ~~`test-course-halfday-offpeak` 商品的 BTA widget 完全無法掛載/選不了日期~~ ✅ 使用者已於 2026-08-06／07 查明根因：BTA 後台「(test) 2026 Season」設定一開始漏了兩個半天服務，已補上並存檔，四個測試商品（全天/半天 × 旺季/淡季）在正式預覽網域上都確認可以正常選日期。**不是程式碼問題，不需要任何檔案修改**
12. ~~決策 6 的完整購物車寫入流程端對端測試~~ ✅ 已於 2026-08-07 由使用者在自己的真實瀏覽器上完整驗證通過：選日期→填 BTA 表單→自動加入購物車→properties 正確寫入→Stage 3 加購 Modal 正確觸發，全部正常。細節見文件最上方「端對端購物車流程驗證通過」段落
13. ~~這次端對端驗證只測了 `test-course-fullday-peak`；`test-course-halfday-peak`／`halfday-offpeak`／`fullday-offpeak` 還沒有實際走過完整下單流程~~ 🔶 2026-08-08/09 已補測 `test-course-fullday-offpeak`、`test-course-halfday-peak` ✅ 通過；`test-course-halfday-offpeak` 送出後因瀏覽器自動化工具逾時中斷，**沒能確認該筆訂單是否成功進購物車**，有空可以重新驗證一次或查 Shopify 後台訂單記錄確認，非阻塞性問題
14. 🔍 **觀察中**：`127.0.0.1` preconnect / `blocks` API 連線失敗現象，2026-08-07 出現過一次、2026-08-08 重測未再出現，**根本原因未確認**（無法排除是測試工具環境問題，也無法排除是 BTA 後端偶發狀況）。細節、重現條件、給未來自己的提示見文件最上方「觀察中」段落。**只有在真實使用情境下穩定重現才需要升級處理**，不要因為這次的記錄就假設問題持續存在，也不要假設它已經排除
15. ~~課程介紹頁「立即預訂」按鈕改成相對路徑~~ ✅ 已於 2026-08-08 完成，`templates/page.course-introduction.json` 4 個商品連結全部改成相對路徑，草稿預覽網域跟本機環境都驗證過不會再被導離目前環境。細節見文件最上方對應段落
16. ~~專案初始化 Git 版本控制~~ ✅ 已於 2026-08-08 完成，`git init` + `.gitignore` + 初始 commit `a5ef3b3`。細節見文件最上方「專案正式納入 Git 版本控制」段落。**之後每完成一個決策/修正，建議搭配一次 commit**
17. ~~視覺 QA 修正需求規格 A→E（進度指示疊加、Step2 CSS 皮膚化、Stage3 Modal 誤觸關閉、手機版同步驗證、四商品欄位檢測＋保險文案定稿＋必填星號）~~ ✅ 已於 2026-08-08/09 全部完成並驗證通過，過程中意外挖出並修正測試商品跟正式商品共用 BTA tag 的架構問題。細節見文件最上方「視覺 QA 修正需求規格 A→E 全部完成」整個段落
18. ~~Stage 3 必勾同意 checkbox 互動重新設計~~ ✅ 已於 2026-08-10 完成，見上方待辦 4／文件最上方專章
19. ~~裝備租賃法律聲明文字置入 Stage 3 Modal~~ ✅ 已於 2026-08-10 完成並驗證通過，細節見文件最上方「裝備租賃法律聲明定稿文字已置入 Stage 3 Modal」專章
20. `test-course-halfday-offpeak` 上次端對端測試中斷，訂單是否成功進購物車尚未確認，有空查一下 Shopify 後台訂單記錄，非急迫
21. BTA 後台目前同時存在新舊兩組平行 Booking Fields（正式商品用 `halfday`/`fullday`，測試商品用 `test-course`/`test-halfday`/`test-fullday`），建議之後幫舊欄位 Label 加註「（正式）」避免混淆——需跟使用者確認是否已執行
22. 【2026-08-09 使用者指定明天首要任務】**整體 UI/UX 還有很大改善空間**——🔶 當天已實際展開並完成三項具體修正（見下方 23-25），不是空泛方向，是有明確交付的項目
23. ~~版心寬度對齊修正：Body 主內容區塊跟 NavBar/Footer 邊界對不齊~~ ✅ 已於 2026-08-09 完成並驗證通過，細節見文件最上方「版心寬度對齊修正」段落
24. ~~Stage 1 空白長條殘留元件排查與移除~~ ✅ 已於 2026-08-09 完成並驗證通過，細節見文件最上方「Stage 1 空白長條元件排查與移除」段落
25. ~~Stage 1 版面重新設計：日曆與方案資訊左右並排~~ ✅ 已於 2026-08-09 完成並驗證通過（含決策 6 定位邏輯重寫、手機版 align-items 踩坑修正），細節見文件最上方「Stage 1 版面重新設計」段落
26. ~~底部「加入購物車」滿版按鈕排查~~ ✅ 已於 2026-08-09 完成排查並實測驗證，發現真正的功能性漏洞（原生按鈕繞過 BTA 流程造成空白訂單），修法方向已規劃完成，**執行本身變成新的待辦 0（🔴 明天最優先）**，細節見文件最上方兩個專章
27. 🟡 **中等優先，不急但別忘記**：`assets/course-stage2-module.js` 的 `writeCourseFormDataToCart()` 送出後 `dispatchEvent(new CustomEvent('cart:update'))` 沒帶 `detail` payload，導致主題原生購物車元件（`cart-drawer.js`／`cart-icon.js`／`sticky-add-to-cart.js`／`component-cart-items.js`／`header-actions.js` 等，grep `detail\.resource|detail\.data` 共 15 個檔案）在 Console 噴 `Cannot read properties of null (reading 'resource'/'data')`。2026-08-10 驗證 Stage3 checkbox 時意外發現，**是既有問題，不是這次 checkbox 改動造成的**，目前沒觀察到畫面功能異常（Modal 關閉、purchase flow 都正常），但屬於確認存在的錯誤，找時間應該修掉，避免原生元件之後默默壞掉。修法方向：`dispatchEvent` 時要帶正確的 `detail` 結構（需要先讀懂 `cart-drawer.js` 等檔案實際依賴 `event.detail` 的哪些欄位），或改用主題現成的 cart 更新輔助函式。已另開一個背景任務記錄（task_a3177bff）。
28. ~~`layout/theme.liquid` 未預期本機異動（拿掉 `.shopifypreview.com` 白名單）~~ ✅ 已釐清並復原。使用者確認這是自己手動改的，**原意是想解決 BTA 測試 Widget（124456）`proxyBaseUrl` 誤指向 127.0.0.1 的問題**——但這兩者完全不相關：`theme.liquid` 這段是純前端連結改寫腳本（瀏覽器讀完頁面後改寫 `<a>` 標籤），只影響「測試連結會不會被導去正式站」；BTA 的 `proxyBaseUrl` 是 BTA 後端伺服器回應內容裡寫死的值，發生在瀏覽器執行任何主題 JS 之前，兩者無法互相影響。已用 `git checkout -- layout/theme.liquid` 復原成最新 commit 版本（含 `.shopifypreview.com` 白名單），確認 `git diff` 無異動。**BTA 測試 Widget 的問題仍未解決，真正能修的路徑還是只有 bookthatapp.com 獨立後台或聯繫 BTA 客服**，見待辦 0 / 文件中段「✅ 已定位根因」專章。
29. ~~Stage 3 裝備加購組數對應實際人數~~ ✅ 程式碼側已於 2026-08-10 完成並實測驗證通過（commit `fd39027`），細節見文件最上方對應專章。**唯一還沒完成的是 BTA 後台「實際參加人數」欄位本身**，見待辦 30。
30. ~~BTA 後台建立「實際參加人數」欄位~~ ✅ 業主已建好（Label「實際參加人數」，Apply = `test-fullday`／`test-halfday`，Options 1人~4人），並用真正欄位重新驗證六個情境全數通過，細節見文件最上方第 3 節「已用真正的 BTA 欄位重新完整驗證通過」。
31. ~~BTA 後台 Sidekick 建議「更改 BTA proxyBaseUrl 設定」~~ ✅ **已結案（2026-08-13）**：BTA 客服回報已修正，重新用 curl（不帶 cookie）驗證兩次（間隔約 16 分鐘，回應內容逐位元組比對完全一致）+ 完整端對端流程驗證通過，測試 Widget（124456）`proxyBaseUrl` 穩定指向 `https://lifechillsnow.com/apps/bookthatapp`，不再是 `127.0.0.1`。細節見文件最上方「✅ 2026-08-13：`proxyBaseUrl` 問題已確認修復並結案」章節。
32. 🔴 **下一個對話串優先任務**：實際參加人數驗證的錯誤提示可見性優化——目前錯誤提示（commit `58b44c5`）只出現在「實際參加人數」欄位旁，使用者捲到送出按鈕位置時看不到，容易誤以為按鈕壞掉。要做：(a) 按鈕即時 disabled/enabled 連動（比照 Stage3 checkbox 的 `syncSubmitButtonState()` 模式）；(b) 按鈕旁新增簡短提示文字。完整規格、技術現況、待確認的風險點見文件最上方「🔴 下一個對話串優先任務」專章。
