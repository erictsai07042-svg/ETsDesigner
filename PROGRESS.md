# BTA 課程預約表單 — 進度文件

最後更新：2026-08-08

## ✅ 課程介紹頁「立即預訂」按鈕改成相對路徑（2026-08-08）

`templates/page.course-introduction.json` 裡兩個 `custom_liquid` 區塊（一個 disabled、一個啟用中，內容重複）的 4 個「立即預訂」按鈕，`href` 從寫死的 `https://lifechillsnow.com/products/...` 絕對網址，改成 `/products/...` 相對路徑（全天旺季/淡季、半天旺季/淡季各一個連結）。JSON 格式驗證過沒壞（`node -e "JSON.parse(...)"` 通過）。

`layout/theme.liquid` 的沙盒防護判斷式**在稍早的待辦 9 已經加過 `.shopifypreview.com`**，這次確認過還在，不用重做。

**驗證**：
- 草稿主題預覽網域（`lifechillsnow.com`，確認 `theme.id === 147355926611`）：點擊「立即預訂」後，`location.href` 正確變成同網域的相對商品網址，`theme.id` 維持不變，沒有跳出草稿預覽狀態
- 本機 `127.0.0.1:9292`：連結解析後的 `.href` 正確顯示 `http://127.0.0.1:9292/products/...`（**這是原本 bug 最明顯會出現的情境**——修正前點下去會直接跳到正式線上網站，現在確認留在本機）
- Console 檢查過，沒有新增錯誤（僅有既存、跟這次改動無關的 BTA 本機環境假錯誤）

---

## ✅ 決策 6 端對端購物車流程驗證通過（2026-08-07）

## 🔍 觀察中（不是已解決）：曾出現一次 `127.0.0.1` preconnect / `blocks` API 連線失敗現象

**現象描述**：2026-08-07 測試 `test-course-fullday-peak` 時，觀察到 widget bootstrap 回應的 HTML 裡出現寫死的 `<link rel="preconnect" href="https://127.0.0.1/apps/bookthatapp">` / `dns-prefetch`，且實際查詢可預約日期的 `blocks` API（`/apps/bookthatapp/api/v1/blocks?...`）連線失敗（`ERR_CONNECTION_REFUSED`），導致當時商品頁日曆**所有日期都顯示 Unavailable**，連正式草稿主題預覽網域（`lifechillsnow.com`，已確認是草稿主題 `147355926611`）上都能重現。**2026-08-08 用完全相同的方法（同一個瀏覽器 session、同一個 widget id `124456`、同一個 `fetch()` 直接打 widget 網址）重新測試，未再出現**——HTML 乾淨、`blocks` API 正確打到 `lifechillsnow.com` 且回應 200、widget 正常掛載 iframe。同一天，使用者在自己完全獨立的真實瀏覽器上，也完整走通了一次端對端購物車流程（見下方）。

**根本原因未確認**——這件事要老實講清楚：現有證據**無法排除**是測試工具/瀏覽器 session 環境本身的問題，**也無法排除**是 BTA 後端當時真的發生了一個後來自己恢復的暫時性狀況。2026-08-07 出問題的當下沒有做即時對照實驗（例如同一時刻在使用者的真實瀏覽器上並行測試），2026-08-08 的重新驗證只是回顧性的「現在乾淨」，不能倒推證明「當初問題出在哪一層」。**不要把這件事寫成「已排除是 BTA 問題」或「已確認是測試環境問題」，兩種說法目前都沒有足夠證據支撐。**

**給未來自己的提示**：如果之後在**真實使用情境**（不是我們自己的測試工具）中又觀察到同樣的「日期全部顯示 Unavailable」現象，**且能穩定重現**（不是像這次一樣只出現一次、之後就消失），才需要重新考慮聯繫 BTA 支援。屆時務必在**問題還存在的當下**立刻截圖、記錄完整的網路請求內容（尤其是 widget bootstrap 回應的原始 HTML 跟 `blocks` API 的請求/回應），不要等事後才回頭查證——這次的教訓就是回顧性驗證沒辦法還原「當時」發生了什麼。草擬給 BTA 客服的信已經寫好，如果之後真的需要用，在 2026-08-07 對話紀錄裡可以找到完整版本，屆時記得依照當下重現到的實際證據更新內容，不要照抄舊的推測。

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
- **未來升級成 Plan A 時，這個檔案可以整個刪除、換一個監聽商品頁 add-to-cart 事件的新觸發器，`course-stage2-module.js` 完全不用改**

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

1. ~~【最優先，下次接手第一件事】驗證決策 4 第 1 點的刪除沒有把頁面弄壞~~ ✅ 已於 2026-08-06 驗證通過，細節見文件最上方
2. ~~執行決策 4 第 2 點（CSS order 手機版排序）~~ 🚫 已於 2026-08-06 實測發現原本的 CSS 路徑走不通，需要改動風險等級跟原訂單「純 CSS 低風險」不同，**使用者決定暫緩擱置**，細節見文件最上方「決策 4 第 2 點」段落。之後要重啟前，先跟使用者確認風險可接受再動手，不要不問就動 `<form class="shopify-product-form">` 的 display 屬性
3. ~~清理決策 4 遺留的死 CSS~~ ✅ 已於 2026-08-06 完成並驗證，細節見文件最上方「決策 4 遺留死 CSS 已清理完成」段落
4. 確認必勾同意 checkbox（`CheckBoxConsent1/2/3`）拿掉 JS 後是否需要重新設計互動（目前純靜態）——**使用者 2026-08-06 表示先不用做，之後再說**
5. 裝備租賃法律聲明文字（風險/賠償金額表，原在 `TemplateLegalGear`）已隨清理刪除，若購物車頁 Modal 需要類似聲明，需另外處理（沒有保留備份，且本機資料夾沒有 git，無法從版本記錄復原）——**使用者 2026-08-06 表示還在確認這件事**
6. ~~檢查 BTA 後台「Add-ons」分頁，確認是否也能原生處理裝備加租~~ ✅ 已於 2026-08-06 查證：Add-ons 卡片顯示「No add-ons」且沒有「Manage」按鈕（對比同頁 Locations/Images 卡片都有），代表此功能對目前方案不可操作，非「尚未設定」。**結論：`assets/course-stage2-module.js` 購物車頁 Modal 是必要的，繼續維護，不考慮拆除**
7. **【現在最優先】視覺 QA**：使用者提到有參考截圖但這次對話中沒有實際附上圖檔，購物車頁 Modal 樣式是依文字規格 + 直接復用 `course-booking-form.liquid` 既有 CSS 重建，**尚未經過使用者針對截圖的逐項比對確認**——**使用者 2026-08-06 表示稍後會提供截圖，收到後優先處理**
8. 這次所有修正都只在 `test-course-fullday-peak`、`test-course-fullday-offpeak` 這兩個測試商品上驗證過，**尚未套用到其餘服務組合**（半天班旺季/淡季）
9. ~~`layout/theme.liquid` 本地沙盒防護腳本只認 `127.0.0.1`/`localhost`，不包含 `.shopifypreview.com`；`page.course-introduction.json` 「立即預訂」按鈕寫死正式網域絕對網址~~ ✅ 兩部分都已修正完成。防護腳本判斷式 2026-08-07 已加上 `.shopifypreview.com`（`layout/theme.liquid` 第 413 行）。**2026-08-08 使用者改變主意，決定連「立即預訂」按鈕本身也要改成相對路徑**（見文件最上方「課程介紹頁『立即預訂』按鈕改成相對路徑」段落）——這跟 2026-08-07 當時「這是正式站給真人顧客用的連結，不是 bug」的判斷不同，**以使用者這次的最新決定為準**，兩處都已修正並在草稿預覽網域 + 本機環境驗證通過
10. ~~決策 4 第 2 點 / 決策 5 都排除後的替代方向：`position: absolute` 純視覺定位方案~~ ✅ 已於 2026-08-06 正式實作完成並驗證通過（含動態量測、雙重 ResizeObserver、BTA style 覆蓋問題修正），細節見文件最上方「決策 6 正式實作完成並驗證通過」段落
11. ~~`test-course-halfday-offpeak` 商品的 BTA widget 完全無法掛載/選不了日期~~ ✅ 使用者已於 2026-08-06／07 查明根因：BTA 後台「(test) 2026 Season」設定一開始漏了兩個半天服務，已補上並存檔，四個測試商品（全天/半天 × 旺季/淡季）在正式預覽網域上都確認可以正常選日期。**不是程式碼問題，不需要任何檔案修改**
12. ~~決策 6 的完整購物車寫入流程端對端測試~~ ✅ 已於 2026-08-07 由使用者在自己的真實瀏覽器上完整驗證通過：選日期→填 BTA 表單→自動加入購物車→properties 正確寫入→Stage 3 加購 Modal 正確觸發，全部正常。細節見文件最上方「端對端購物車流程驗證通過」段落
13. 這次端對端驗證只測了 `test-course-fullday-peak`；`test-course-halfday-peak`／`halfday-offpeak`／`fullday-offpeak` 還沒有實際走過完整下單流程（只確認過日期選得到），有空可以視情況補測，非急迫
14. 🔍 **觀察中**：`127.0.0.1` preconnect / `blocks` API 連線失敗現象，2026-08-07 出現過一次、2026-08-08 重測未再出現，**根本原因未確認**（無法排除是測試工具環境問題，也無法排除是 BTA 後端偶發狀況）。細節、重現條件、給未來自己的提示見文件最上方「觀察中」段落。**只有在真實使用情境下穩定重現才需要升級處理**，不要因為這次的記錄就假設問題持續存在，也不要假設它已經排除
