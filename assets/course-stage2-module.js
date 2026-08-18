/**
 * Course booking Stage 2/3（裝備加租／民宿加購）重複使用模組。
 * 視覺語言直接沿用原本商品頁 STEP UI（course-booking-form.liquid）已定案的樣式：
 * 步驟指示條、雙軌卡片（accordion-card + toggle-switch）、學員分組深色標題列（attendee-gear-group-box）。
 * 純渲染 + 資料函式，不假設自己被放在哪個頁面、哪個容器裡，也不主動判斷「何時該顯示」——
 * 觸發時機由呼叫端（例如 snippets/cart-stage2-trigger.liquid）決定。
 * 掛在 window.CourseStage2Module，供任何頁面的 <script> 直接呼叫。
 */
(function () {
  /* 裝備尺寸共用定義（單一資料來源，安全帽頭圍／雪服尺碼範圍調整只需要改這裡）。
     HELMET_SIZE_OPTIONS 的 value 是實際寫入 line item property 的值（S/M/L），
     label 才帶頭圍區間，只用於下拉選單顯示。 */
  var HELMET_SIZE_OPTIONS = [
    { value: 'S', label: 'S（頭圍 52-55cm）' },
    { value: 'M', label: 'M（頭圍 55-59cm）' },
    { value: 'L', label: 'L（頭圍 59-63cm）' },
  ];
  var CLOTHING_SIZE_BY_GENDER = {
    '女': ['S', 'M', 'L', 'XL'],
    '男': ['M', 'L', 'XL', '2XL', '3XL'],
  };
  var GENDER_FIELD = { key: 'gender', label: '性別', type: 'select', options: ['男', '女'] };
  /* select-dependent：選項清單依 dependsOn 指定的欄位（同一裝備底下的 gender）當下的值
     動態產生，尚未選擇依賴欄位前維持 disabled，見 wireDependentSizeFields()。 */
  var CLOTHING_SIZE_FIELD = { key: 'clothingSize', label: '雪服尺碼', type: 'select-dependent', dependsOn: 'gender', optionsByValue: CLOTHING_SIZE_BY_GENDER };
  var HELMET_SIZE_FIELD = { key: 'helmetSize', label: '安全帽尺寸', type: 'select', options: HELMET_SIZE_OPTIONS };

  /* sizeFields：裝備勾選後需要客人填寫的結構化尺寸欄位，取代原本只能寫在購物車備註欄
     的自由格式（備註欄仍保留，兩者並存，見 renderStage2Form 送出邏輯）。陣列裡的欄位
     一律視為必填（勾選該裝備才需要），沒有 sizeFields 或空陣列代表此裝備不需尺寸資訊
     （目前只有雪鏡）。「板種」（單板/雙板）刻意維持獨立的 skiType 屬性、不寫進
     sizeFields——未來新增雙板款式（例如「雙板鞋組」）只需要在這個陣列多加一筆帶
     skiType:'雙板' 跟自己的 sizeFields，renderGearRentalSection／驗證邏輯不需要改動。 */
  var GEAR_ITEMS = [
    { key: '單板鞋組', price: 1200, skiType: '單板', desc: '雪板 + 舒適雪鞋', isCombo: false, isMutual: false,
      sizeFields: [
        GENDER_FIELD,
        { key: 'height', label: '身高', type: 'number', unit: 'cm' },
        { key: 'weight', label: '體重', type: 'number', unit: 'kg' },
        { key: 'shoeSize', label: '鞋子尺寸', type: 'number', unit: 'cm' },
      ] },
    { key: '雪服帽鏡組', price: 1000, skiType: null, desc: '雪服 + 安全帽 + 雪鏡，一次租齊最划算', isCombo: true, isMutual: false,
      sizeFields: [ GENDER_FIELD, CLOTHING_SIZE_FIELD, HELMET_SIZE_FIELD ] },
    { key: '雪服', price: 800, skiType: null, desc: '防水透氣保暖材質', isCombo: false, isMutual: true,
      sizeFields: [ GENDER_FIELD, CLOTHING_SIZE_FIELD ] },
    /* 安全帽單獨項目不收「性別」：業主確認安全帽尺寸只看頭圍，跟雪服帽鏡組/雪服的
       「性別決定尺碼選項清單」邏輯無關，這裡刻意不掛 GENDER_FIELD。 */
    { key: '安全帽', price: 300, skiType: null, desc: '輕量舒適', isCombo: false, isMutual: true,
      sizeFields: [ HELMET_SIZE_FIELD ] },
    { key: '雪鏡', price: 300, skiType: null, desc: '防曬抗 UV 鏡片', isCombo: false, isMutual: true },
    { key: '滑雪護具', price: 200, skiType: null, desc: '加強防護設計', isCombo: false, isMutual: false,
      sizeFields: [ { key: 'padSize', label: '護具尺寸', type: 'select', options: ['S', 'M', 'L', 'XL'] } ] },
  ];

  /* 指定教練加購：整組課程層級的單選（不是每學員各自選），固定加價 NT$400，
     跟哪一位教練無關（三選一，價格一致）。跟裝備加租不同，資料寫入時只會有
     一個 line item property（例如 `指定教練`: `阿哲`），不比照 `學員N_加購_XXX` 的每人一筆格式。 */
  var COACH_PRICE = 400;
  var COACH_ITEMS = [
    { key: '阿哲', label: '教練：阿哲' },
    { key: 'Angus', label: '教練：Angus' },
    { key: 'Kris', label: '教練：Kris' },
  ];

  /* 品牌色彩／既有元件樣式，原封不動從 course-booking-form.liquid 搬過來（該檔案的 :root 變數在購物車頁不存在，這裡直接寫死色碼） */
  function injectStylesOnce() {
    if (document.getElementById('course-stage2-styles')) return;
    var style = document.createElement('style');
    style.id = 'course-stage2-styles';
    style.textContent = [
      /* Modal 外殼。桌機版加寬（C 項）：手機維持 width:92% 不變，桌機把 max-width 從 640
         放寬到 880，讓學員加購選項有空間並排，減少垂直捲動長度。 */
      '.cs2-overlay { position: fixed; inset: 0; z-index: 99998; display: flex; align-items: center; justify-content: center; font-family: var(--brand-font-family, "PingFang TC", "Microsoft JhengHei", sans-serif); }',
      '.cs2-backdrop { position: absolute; inset: 0; background: rgba(17,17,17,0.55); }',
      '.cs2-panel { position: relative; width: 92%; max-width: 640px; max-height: 88vh; overflow-y: auto; overflow-x: hidden; background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 24px 48px -8px rgba(0,0,0,0.25); }',
      '@media (min-width: 768px) { .cs2-panel { max-width: 880px; } }',
      '.cs2-title { color: #1A2E4A; font-size: 18px; font-weight: 800; margin: 0; padding-left: 12px; border-left: 4px solid #3A7AB5; flex: 1 1 auto; min-width: 0; overflow-wrap: break-word; }',

      /* 頂部固定區塊（B 項）：進度條 + 商品標題 + 即時總金額摘要，Modal 內容捲動時維持
         可見。用「負 margin 抵銷 .cs2-panel 的 padding、內部重新補回 padding」這個手法讓
         sticky 區塊能夠緊貼 .cs2-panel 這個捲動容器的最頂端（sticky 的 top:0 是相對捲動
         容器的 padding box 算，如果不抵銷 padding，捲動後上緣會多一段空隙、也蓋不住底下
         內容），同時保留跟面板一致的圓角跟左右留白觀感。 */
      /* top 刻意設為 -24px（不是 0）：margin-top 用 -24px 抵銷 .cs2-panel 的 padding-top(24px)
         讓它視覺貼齊面板邊緣，但瀏覽器計算 sticky 黏頂位置時不會把這個負 margin 完全計入，
         黏頂後框的實際位置會比預期低了 24px，捲動容器最頂端因此留下一條 24px 沒被蓋住的縫隙，
         底下捲動的內容（例如學員分組深色標題列）會從這條縫隙穿幫透出。top: -24px 讓黏頂
         位置往上補回這 24px，縫隙才會真正消失（實測 gap 從 24px 變成 0）。 */
      '.cs2-sticky-header { position: sticky; top: -24px; z-index: 5; margin: -24px -24px 16px -24px; padding: 20px 24px 14px 24px; background: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 6px 12px -8px rgba(26,46,74,0.18); }',
      '.cs2-sticky-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 14px; }',
      '.cs2-sticky-total { display: flex; align-items: baseline; gap: 6px; flex-shrink: 0; background: #E8F4FA; border: 1px solid #B8D9ED; border-radius: 999px; padding: 6px 14px; }',
      '.cs2-sticky-total .cs2-total-label { font-size: 12px; }',
      '.cs2-sticky-total .cs2-total-amount { font-size: 15px; }',

      /* 步驟指示條（原封不動照搬 booking-progress-stepper / step-item） */
      '.booking-progress-stepper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 12px 16px; background-color: #E8F4FA; border: 1px solid #B8D9ED; border-radius: 12px; font-size: 14px; font-weight: 700; color: #1A2E4A; }',
      '.step-item { display: flex; align-items: center; gap: 8px; color: #5A6A78; }',
      '.step-item .step-dot { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background-color: #B8D9ED; color: #1A2E4A; }',
      '.step-item.is-done { color: #1A2E4A; }',
      '.step-item.is-done .step-dot { background-color: #2D5F8A; color: #fff; }',
      '.step-item.is-active { color: #1A2E4A; }',
      '.step-item.is-active .step-dot { background-color: #1A2E4A; color: #fff; }',
      '.step-line { flex: 1; height: 2px; background-color: #3A7AB5; margin: 0 8px; border-radius: 1px; }',

      /* 雙軌加購卡片（原封不動照搬 dual-track-container / accordion-card / toggle-switch）。
         三張卡片（裝備加租／指定教練／民宿加購）固定等寬並排，展開後（尤其裝備加租多學員時）
         內容被壓縮得很擁擠。改成：任一張卡片展開時（.accordion-card.is-expanded，由
         wireAccordionToggle 同步標記在卡片本身，不只是 accordion-content），該卡片
         grid-column 撐滿整行、order 移到最前面；其餘卡片維持預設 order，自然被推到下一排、
         用 auto-fit 並排（2 欄）。收合回去時 class 移除，三張卡片自動恢復原本的三欄並排。
         這是通用規則（比對 class，不寫死哪一張卡片），三張卡片共用同一套。 */
      '.dual-track-container { display: flex; flex-direction: column; gap: 14px; margin-bottom: 4px; }',
      '@media (min-width: 640px) { .dual-track-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items: start; } .dual-track-container .accordion-card.is-expanded { grid-column: 1 / -1; order: -1; } }',
      '.accordion-card { background: #fff; border: 1px solid #e4ecf3; border-radius: 12px; overflow: hidden; }',
      '.accordion-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #E8F4FA; gap: 14px; }',
      '.card-info h4 { font-size: 15px; font-weight: 700; color: #1A2E4A; margin: 0 0 3px 0; }',
      '.card-info p { font-size: 13px; color: #5A6A78; margin: 0; line-height: 1.4; }',
      '.toggle-switch { position: relative; display: inline-block; width: 46px; height: 25px; flex-shrink: 0; }',
      '.toggle-switch input { opacity: 0; width: 0; height: 0; }',
      '.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #B8D9ED; transition: .22s; border-radius: 34px; }',
      '.toggle-slider:before { position: absolute; content: ""; height: 19px; width: 19px; left: 3px; bottom: 3px; background-color: #fff; transition: .22s; border-radius: 50%; }',
      '.toggle-switch input:checked + .toggle-slider { background-color: #2D5F8A; }',
      '.toggle-switch input:checked + .toggle-slider:before { transform: translateX(21px); }',
      '.toggle-switch input:disabled + .toggle-slider { opacity: 0.4; cursor: not-allowed; }',
      '.accordion-content { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease; padding: 0 18px; }',
      '.accordion-content.is-expanded { max-height: 3000px; padding: 18px; border-top: 1px solid #e4ecf3; opacity: 1; }',
      '.hotel-placeholder-box { padding: 24px 20px; text-align: center; font-size: 13px; color: #5A6A78; line-height: 1.7; }',
      '.hotel-placeholder-box .hotel-badge { display: inline-block; background: #1A2E4A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; }',

      /* 學員分組深色標題列（原封不動照搬 attendee-gear-group-box / attendee-group-title / gear-item-box）。
         學員分組容器（C 項）：手機維持單欄堆疊，桌機（跟 Modal 加寬同一個斷點）改雙欄並排，
         減少垂直捲動長度。改用容器 gap 控制間距，個別卡片不再自己留 margin-bottom。 */
      '[data-gear-rental-root] { display: flex; flex-direction: column; gap: 14px; }',
      '@media (min-width: 768px) { [data-gear-rental-root] { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; } }',
      '.cs2-gear-list-hidden { display: none !important; }',
      '.attendee-gear-group-box { border: 1px solid #B8D9ED; border-radius: 10px; overflow: hidden; }',
      '.attendee-group-title { font-weight: 800; letter-spacing: 0.07em; color: #fff; background: linear-gradient(90deg, #1A2E4A 0%, #2D5F8A 100%); padding: 8px 14px; margin: 0; font-size: 12px; }',
      '.gear-grid { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #fafcff; }',
      '.gear-item-box { display: flex; align-items: center; gap: 12px; border: 1px solid #B8D9ED; padding: 11px 13px; border-radius: 8px; cursor: pointer; background: #fff; transition: border-color 0.15s, background-color 0.15s; }',
      '.gear-item-box:hover { border-color: #7AB3D4; background: #f5faff; }',
      '.gear-item-box.is-locked { opacity: 0.38; cursor: not-allowed; background: #f1f5f9; pointer-events: none; }',
      '.gear-item-box input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 17px; height: 17px; flex-shrink: 0; border: 2px solid #B8D9ED; border-radius: 4px; background-color: #E8F4FA; cursor: pointer; transition: all 0.15s; position: relative; }',
      '.gear-item-box input[type="checkbox"]:checked { background-color: #1A2E4A; border-color: #1A2E4A; }',
      '.gear-item-box input[type="checkbox"]:checked::after { content: "\\2713"; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: #fff; font-size: 11px; font-weight: 700; }',
      '.gear-name { font-size: 14px; font-weight: 700; color: #1A2E4A; line-height: 1.3; }',
      '.gear-name strong { color: #2D5F8A; font-weight: 700; margin-left: 6px; }',
      '.gear-desc { font-size: 12px; color: #5A6A78; margin-top: 2px; line-height: 1.4; }',

      /* 裝備尺寸結構化欄位：勾選裝備後就地展開，沿用跟卡片層級（.accordion-content）
         同一套 max-height transition 手法，只是巢狀在單一裝備品項底下。.gear-item-wrap
         把 label（勾選列）跟 .gear-size-fields（展開內容）當成平行的手足元素，刻意不把
         尺寸欄位塞進 <label> 裡面——避免 select/input 被瀏覽器原生的 label 點擊轉發
         行為意外干擾到裝備勾選狀態。 */
      '.gear-item-wrap { display: flex; flex-direction: column; }',
      '.gear-size-fields { max-height: 0; overflow: hidden; opacity: 0; display: flex; flex-direction: column; gap: 8px; padding: 0 2px; transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease; }',
      '.gear-size-fields.is-expanded { max-height: 600px; opacity: 1; padding: 10px 2px 2px 2px; margin-top: 6px; border-top: 1px dashed #B8D9ED; }',
      '.gear-size-field { display: flex; align-items: center; gap: 8px; }',
      '.gear-size-label { font-size: 12px; font-weight: 700; color: #1A2E4A; flex: 0 0 88px; }',
      '.gear-size-field select, .gear-size-field input[type="number"] { flex: 1 1 auto; min-width: 0; padding: 6px 8px; border: 1px solid #B8D9ED; border-radius: 6px; font-size: 13px; color: #1A2E4A; background: #fff; }',
      '.gear-size-field select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }',
      '.cs2-gear-size-warning { color: #C0392B; font-size: 12px; font-weight: 700; margin: 10px 2px 0 2px; }',
      '.cs2-gear-size-warning[hidden] { display: none; }',

      /* 指定教練單選清單（整組課程層級，跟裝備加租的每學員分組不同，沒有分組標題列）。
         視覺沿用 gear-item-box 的卡片式選取列樣式，勾選標記從方形打勾改成圓形實心點，
         呼應 radio（單選）跟 checkbox（可複選）語意上的差異。 */
      '.coach-select-list { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #fafcff; }',
      '.coach-item-box { display: flex; align-items: center; gap: 12px; border: 1px solid #B8D9ED; padding: 11px 13px; border-radius: 8px; cursor: pointer; background: #fff; transition: border-color 0.15s, background-color 0.15s; }',
      '.coach-item-box:hover { border-color: #7AB3D4; background: #f5faff; }',
      '.coach-item-box input[type="radio"] { appearance: none; -webkit-appearance: none; width: 17px; height: 17px; flex-shrink: 0; border: 2px solid #B8D9ED; border-radius: 50%; background-color: #E8F4FA; cursor: pointer; transition: all 0.15s; position: relative; }',
      '.coach-item-box input[type="radio"]:checked { border-color: #1A2E4A; }',
      '.coach-item-box input[type="radio"]:checked::after { content: ""; position: absolute; top: 50%; left: 50%; width: 9px; height: 9px; border-radius: 50%; background: #1A2E4A; transform: translate(-50%,-50%); }',
      '.coach-name { font-size: 14px; font-weight: 700; color: #1A2E4A; }',
      '.cs2-coach-warning { color: #C0392B; font-size: 12px; font-weight: 700; margin: 10px 2px 0 2px; }',
      '.cs2-coach-warning[hidden] { display: none; }',

      /* 法律聲明必勾同意（定稿文字：滑雪裝備租賃風險與責任聲明）。A 項：現在巢狀在
         .accordion-content 裡面（開關打開才看得到），accordion-content 展開時自己已經有
         border-top/padding，這裡不用再疊一層頂部間距，改成只留跟底下加購清單的間距。 */
      '.cs2-legal-consent { margin-bottom: 18px; }',
      '.cs2-legal-scrollbox { max-height: 200px; overflow-y: auto; border: 1px solid #7AB3D4; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: #fafcff; }',
      '.cs2-legal-scrollbox h4 { color: #1A2E4A; font-size: 14px; font-weight: 800; margin: 0 0 10px 0; }',
      '.cs2-legal-scrollbox h5 { color: #1A2E4A; font-size: 13px; font-weight: 700; margin: 14px 0 4px 0; }',
      '.cs2-legal-scrollbox h5:first-of-type { margin-top: 0; }',
      '.cs2-legal-scrollbox p { font-size: 12.5px; color: #3A4A5A; line-height: 1.6; margin: 0 0 4px 0; }',
      '.cs2-legal-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12.5px; }',
      '.cs2-legal-table th { background: #1A2E4A; color: #fff; padding: 6px 8px; text-align: left; font-weight: 700; }',
      '.cs2-legal-table td { padding: 6px 8px; border-bottom: 1px solid #e4ecf3; color: #1A2E4A; }',
      '.cs2-legal-table tr:nth-child(even) td { background: #E8F4FA; }',
      '.cs2-legal-note { font-size: 12px; color: #5A6A78; margin: 6px 0 0 0; }',
      '.cs2-legal-consent-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }',
      '.cs2-legal-consent-label input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; border: 2px solid #7AB3D4; border-radius: 4px; background-color: #fff; cursor: pointer; transition: all 0.15s; position: relative; }',
      '.cs2-legal-consent-label input[type="checkbox"]:checked { background-color: #1A2E4A; border-color: #1A2E4A; }',
      '.cs2-legal-consent-label input[type="checkbox"]:checked::after { content: "\\2713"; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: #fff; font-size: 11px; font-weight: 700; }',
      '.cs2-legal-consent-text { font-size: 13px; color: #1A2E4A; line-height: 1.5; }',
      '.cs2-legal-consent-warning { color: #C0392B; font-size: 12px; font-weight: 700; margin: 6px 0 0 28px; }',
      '.cs2-legal-consent-warning[hidden] { display: none; }',

      /* 金額總計（課程原價 + 已勾選加購項目），放在送出按鈕正上方，比照「實際參加人數」
         驗證那則按鈕旁提示文字的位置邏輯，讓客人捲到按鈕位置就能直接看到，不用往上找 */
      '.cs2-total-summary { display: flex; justify-content: flex-end; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #B8D9ED; }',
      '.cs2-total-label { font-size: 14px; font-weight: 700; color: #5A6A78; }',
      '.cs2-total-amount { font-size: 20px; font-weight: 800; color: #1A2E4A; white-space: nowrap; }',

      '.cs2-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }',
      '.cs2-btn-primary { background: #1A2E4A; color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }',
      '.cs2-btn-primary:hover { background: #2D5F8A; }',
      '.cs2-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; background: #1A2E4A; }',
      '.cs2-btn-primary:disabled:hover { background: #1A2E4A; }',
      '.cs2-btn-skip { background: none; border: none; color: #5A6A78; font-size: 14px; cursor: pointer; text-decoration: underline; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function progressStepperHtml() {
    return '' +
      '<div class="booking-progress-stepper">' +
        '<div class="step-item is-done"><span class="step-dot">✓</span><span>日期</span></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-item is-done"><span class="step-dot">✓</span><span>資訊</span></div>' +
        '<div class="step-line"></div>' +
        '<div class="step-item is-active"><span class="step-dot">3</span><span>加購</span></div>' +
      '</div>';
  }

  /** 單一尺寸欄位的 HTML。number/select/select-dependent 三種型別，皆是 GEAR_ITEMS 裡
   * item.sizeFields 的元素。select-dependent 初始 disabled，等 wireDependentSizeFields()
   * 依當下的依賴欄位值動態灌選項。 */
  function renderGearSizeFieldHtml(field) {
    if (field.type === 'number') {
      return '' +
        '<div class="gear-size-field" data-gear-size-field data-size-key="' + field.key + '">' +
          '<label class="gear-size-label">' + field.label + (field.unit ? ' (' + field.unit + ')' : '') + '</label>' +
          '<input type="number" inputmode="decimal" step="any" min="0" data-gear-size-input placeholder="請輸入">' +
        '</div>';
    }
    if (field.type === 'select-dependent') {
      return '' +
        '<div class="gear-size-field" data-gear-size-field data-size-key="' + field.key + '">' +
          '<label class="gear-size-label">' + field.label + '</label>' +
          '<select data-gear-size-input disabled><option value="">請先選擇性別</option></select>' +
        '</div>';
    }
    // type === 'select'：選項可以是純字串（value === label）或 {value,label} 物件（例如安全帽頭圍）
    var optionsHtml = '<option value="">請選擇</option>' + field.options.map(function (o) {
      var opt = (typeof o === 'string') ? { value: o, label: o } : o;
      return '<option value="' + opt.value + '">' + opt.label + '</option>';
    }).join('');
    return '' +
      '<div class="gear-size-field" data-gear-size-field data-size-key="' + field.key + '">' +
        '<label class="gear-size-label">' + field.label + '</label>' +
        '<select data-gear-size-input>' + optionsHtml + '</select>' +
      '</div>';
  }

  /** 把 select-dependent 欄位（例如「雪服尺碼」依賴「性別」）接上它依賴的控制欄位：
   * 控制欄位變動時，重新灌選項、清空目前選擇。範圍限定在同一個 .gear-size-fields
   * 區塊內查詢，逐學員逐裝備各自獨立，不會互相干擾。 */
  function wireDependentSizeFields(sizeFieldsRoot, item) {
    (item.sizeFields || []).forEach(function (field) {
      if (field.type !== 'select-dependent') return;
      var controlWrap = sizeFieldsRoot.querySelector('[data-size-key="' + field.dependsOn + '"]');
      var dependentWrap = sizeFieldsRoot.querySelector('[data-size-key="' + field.key + '"]');
      var controlSelect = controlWrap && controlWrap.querySelector('[data-gear-size-input]');
      var dependentSelect = dependentWrap && dependentWrap.querySelector('[data-gear-size-input]');
      if (!controlSelect || !dependentSelect) return;
      controlSelect.addEventListener('change', function () {
        var options = field.optionsByValue[controlSelect.value] || [];
        dependentSelect.innerHTML = '<option value="">請選擇</option>' + options.map(function (v) {
          return '<option value="' + v + '">' + v + '</option>';
        }).join('');
        dependentSelect.disabled = options.length === 0;
        dependentSelect.value = '';
      });
    });
  }

  /**
   * 渲染裝備加購區塊（學員分組 + gear-item-box 清單，勾選裝備後就地展開結構化尺寸欄位)。
   * 純函式：只依賴傳入的 container/options。
   * @param {HTMLElement} container
   * @param {{ attendeeCount: number, skiTypeByAttendee?: Record<number,string> }} options
   * @returns {{ getSelectedGear: () => Array<{attendee:number,key:string,price:number,sizeFields:Array|null,sizeValues:Record<string,string>}> }}
   */
  function renderGearRentalSection(container, options) {
    options = options || {};
    var attendeeCount = options.attendeeCount || 1;
    var skiTypeByAttendee = options.skiTypeByAttendee || {};

    var html = '';
    for (var a = 1; a <= attendeeCount; a++) {
      html += '<div class="attendee-gear-group-box"><p class="attendee-group-title">學員 ' + a + ' 加購選項</p><div class="gear-grid">';
      GEAR_ITEMS.forEach(function (item) {
        var skiType = skiTypeByAttendee[a];
        var locked = item.skiType && skiType && item.skiType !== skiType;
        var hasSizeFields = item.sizeFields && item.sizeFields.length > 0;
        html += '<div class="gear-item-wrap" data-gear-item-wrap data-attendee="' + a + '" data-gear-key="' + item.key + '">';
        html += '' +
          '<label class="gear-item-box' + (locked ? ' is-locked' : '') + '" data-attendee="' + a + '" data-gear-key="' + item.key + '">' +
            '<input type="checkbox" data-gear-checkbox' + (locked ? ' disabled' : '') + '>' +
            '<div class="gear-text">' +
              '<div class="gear-name">' + item.key + '<strong>+$' + item.price.toLocaleString() + '</strong></div>' +
              '<div class="gear-desc">' + item.desc + '</div>' +
            '</div>' +
          '</label>';
        if (hasSizeFields) {
          html += '<div class="gear-size-fields" data-gear-size-fields>' +
            item.sizeFields.map(renderGearSizeFieldHtml).join('') +
          '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-gear-item-wrap]').forEach(function (wrap) {
      var item = GEAR_ITEMS.filter(function (g) { return g.key === wrap.getAttribute('data-gear-key'); })[0];
      var sizeFieldsRoot = wrap.querySelector('[data-gear-size-fields]');
      if (item && sizeFieldsRoot) wireDependentSizeFields(sizeFieldsRoot, item);
    });

    // 勾選裝備時就地展開/收合它的尺寸欄位（跟卡片層級 wireAccordionToggle 同一套視覺邏輯，
    // 這裡是巢狀在單一裝備品項底下，範圍限定在該品項自己的 .gear-item-wrap）
    container.addEventListener('change', function (event) {
      if (!event.target || !event.target.matches || !event.target.matches('[data-gear-checkbox]')) return;
      var wrap = event.target.closest('[data-gear-item-wrap]');
      var sizeFieldsRoot = wrap && wrap.querySelector('[data-gear-size-fields]');
      if (sizeFieldsRoot) sizeFieldsRoot.classList.toggle('is-expanded', event.target.checked);
    });

    return {
      getSelectedGear: function () {
        var selected = [];
        container.querySelectorAll('[data-gear-checkbox]:checked').forEach(function (cb) {
          var label = cb.closest('[data-gear-key]');
          var key = label.getAttribute('data-gear-key');
          var item = GEAR_ITEMS.filter(function (g) { return g.key === key; })[0];
          var wrap = cb.closest('[data-gear-item-wrap]');
          var sizeValues = {};
          if (wrap) {
            wrap.querySelectorAll('[data-gear-size-field]').forEach(function (fieldEl) {
              var input = fieldEl.querySelector('[data-gear-size-input]');
              sizeValues[fieldEl.getAttribute('data-size-key')] = input ? input.value : '';
            });
          }
          selected.push({
            attendee: Number(label.getAttribute('data-attendee')),
            key: key,
            price: item ? item.price : 0,
            sizeFields: item ? (item.sizeFields || null) : null,
            sizeValues: sizeValues,
          });
        });
        return selected;
      },
    };
  }

  /**
   * 渲染指定教練單選清單。整組課程只選一位教練（不是每學員各自選），純函式：
   * 只依賴傳入的 container，不假設自己被放在哪個卡片裡。
   * @param {HTMLElement} container
   * @returns {{ getSelectedCoach: () => string|null }}
   */
  function renderCoachSelectSection(container) {
    var html = '<div class="coach-select-list">';
    COACH_ITEMS.forEach(function (item) {
      html += '' +
        '<label class="coach-item-box">' +
          '<input type="radio" name="cs2-coach-select" data-coach-radio value="' + item.key + '">' +
          '<span class="coach-name">' + item.label + '</span>' +
        '</label>';
    });
    html += '</div>';
    container.innerHTML = html;

    return {
      getSelectedCoach: function () {
        var checked = container.querySelector('[data-coach-radio]:checked');
        return checked ? checked.value : null;
      },
    };
  }

  function wireAccordionToggle(toggleInput, contentEl) {
    var cardEl = toggleInput.closest('.accordion-card');
    toggleInput.addEventListener('change', function () {
      contentEl.classList.toggle('is-expanded', toggleInput.checked);
      if (cardEl) cardEl.classList.toggle('is-expanded', toggleInput.checked);
    });
  }

  /**
   * 渲染 Stage 2/3 表單成一個置中 Modal，蓋在傳入的 container 上層。
   * 視覺結構：步驟指示條（1/2 已完成、3 進行中）→ 雙軌卡片（裝備加租 / 民宿加購，民宿維持 disabled）。
   * 不對 container 的頁面上下文做任何假設——購物車頁、商品頁都能直接呼叫。
   * @param {HTMLElement} container - 掛載點（一個空的 div 即可，函式會把 modal 塞進去）
   * @param {{ attendeeCount?: number, productTitle?: string, onSubmit: (properties: Record<string,string>) => void, onSkip?: () => void }} options
   */
  function renderStage2Form(container, options) {
    options = options || {};
    var attendeeCount = options.attendeeCount || 1;
    injectStylesOnce();

    container.innerHTML =
      '<div class="cs2-overlay">' +
        '<div class="cs2-backdrop"></div>' +
        '<div class="cs2-panel">' +
          '<div class="cs2-sticky-header">' +
            progressStepperHtml() +
            '<div class="cs2-sticky-title-row">' +
              '<h3 class="cs2-title">' + (options.productTitle || '完成預訂前的最後一步') + '</h3>' +
              '<div class="cs2-sticky-total"><span class="cs2-total-label">總額</span><span class="cs2-total-amount" data-cs2-total-amount-sticky>$0.00</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="dual-track-container">' +
            '<div class="accordion-card">' +
              '<div class="accordion-header">' +
                '<div class="card-info">' +
                  '<h4>官方專屬裝備加租</h4>' +
                  '<p>課前為您準備，現省自尋租還時間</p>' +
                '</div>' +
                '<label class="toggle-switch">' +
                  '<input type="checkbox" data-gear-toggle>' +
                  '<span class="toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="accordion-content" data-gear-content>' +
                '<div class="cs2-legal-consent">' +
                  '<div class="cs2-legal-scrollbox" tabindex="0" aria-label="裝備租賃風險與責任聲明">' +
                    '<h4>滑雪裝備租賃風險與責任聲明</h4>' +
                    '<h5>一、裝備確認</h5>' +
                    '<p>租賃開始前，出租方與租賃者已共同確認租賃裝備外觀與功能均為正常、可使用狀態。</p>' +
                    '<h5>二、運動風險及責任歸屬</h5>' +
                    '<p>租賃者知悉並同意，滑雪屬於具高度風險之運動，於滑雪過程中，可能因跌倒、碰撞、雪況、地形或其他不可預期因素，導致裝備損壞、功能異常，甚至造成人身受傷或其他損害。</p>' +
                    '<p>上述因滑雪運動本身所產生之風險、損害或意外情事，均屬租賃者自行承擔之範圍，租賃者不得因此向出租方主張任何形式之賠償或責任。</p>' +
                    '<h5>三、裝備保管責任</h5>' +
                    '<p>租賃期間內，所有裝備（包含但不限於滑雪器材、防護裝備及服裝）皆由租用者自行負責妥善保管與使用。</p>' +
                    '<p>若因個人疏忽、遺失、未歸還、遭第三人取走，或非正常使用情況導致裝備無法回收，將視同遺失處理。</p>' +
                    '<h5>四、遺失賠償原則</h5>' +
                    '<p>租賃期間內，所有裝備皆由租賃者自行負責保管。如發生遺失、未歸還或無法回收之情形，租賃者同意依下列金額賠償：</p>' +
                    '<table class="cs2-legal-table">' +
                      '<thead><tr><th>裝備項目</th><th>NT$</th><th>¥</th></tr></thead>' +
                      '<tbody>' +
                        '<tr><td>安全帽</td><td>1,000</td><td>5,000</td></tr>' +
                        '<tr><td>雪鏡</td><td>1,000</td><td>5,000</td></tr>' +
                        '<tr><td>護臀</td><td>500</td><td>2,500</td></tr>' +
                        '<tr><td>護膝</td><td>500</td><td>2,500</td></tr>' +
                        '<tr><td>雪服</td><td>2,000</td><td>10,000</td></tr>' +
                        '<tr><td>雪褲</td><td>2,000</td><td>10,000</td></tr>' +
                        '<tr><td>雪鞋</td><td>6,000</td><td>30,000</td></tr>' +
                        '<tr><td>雪板＋固定器</td><td>8,000</td><td>40,000</td></tr>' +
                      '</tbody>' +
                    '</table>' +
                    '<p class="cs2-legal-note">※ 若同時遺失多項裝備，將依實際遺失項目累計計算賠償金額。</p>' +
                    '<h5>五、特別提醒</h5>' +
                    '<p>請勿將裝備隨意放置於雪場公共區域。休息、用餐或離場時，請務必確認裝備已妥善存放。</p>' +
                    '<h5>六、同意聲明</h5>' +
                    '<p>完成租賃即視為租賃者已詳閱、理解並同意上述所有內容。</p>' +
                  '</div>' +
                  '<label class="cs2-legal-consent-label">' +
                    '<input type="checkbox" data-cs2-legal-checkbox>' +
                    '<span class="cs2-legal-consent-text">我已詳閱並同意上述《滑雪裝備租賃風險與責任聲明》全部內容</span>' +
                  '</label>' +
                  '<p class="cs2-legal-consent-warning" data-cs2-legal-warning hidden>請先閱讀並同意租賃聲明</p>' +
                '</div>' +
                '<div data-gear-rental-root class="cs2-gear-list-hidden"></div>' +
                '<p class="cs2-gear-size-warning" data-cs2-gear-size-warning hidden></p>' +
              '</div>' +
            '</div>' +
            '<div class="accordion-card">' +
              '<div class="accordion-header">' +
                '<div class="card-info">' +
                  '<h4>指定教練</h4>' +
                  '<p>加價 NT$400，全程由指定教練帶您的整組課程</p>' +
                '</div>' +
                '<label class="toggle-switch">' +
                  '<input type="checkbox" data-coach-toggle>' +
                  '<span class="toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="accordion-content" data-coach-content>' +
                '<div data-coach-select-root></div>' +
                '<p class="cs2-coach-warning" data-cs2-coach-warning hidden>請先選擇一位教練</p>' +
              '</div>' +
            '</div>' +
            '<div class="accordion-card">' +
              '<div class="accordion-header">' +
                '<div class="card-info">' +
                  '<h4>專屬特約民宿加購</h4>' +
                  '<p>10 月份開放預訂・搶先預留官方民宿</p>' +
                '</div>' +
                '<label class="toggle-switch">' +
                  '<input type="checkbox" disabled>' +
                  '<span class="toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="hotel-placeholder-box">' +
                '<span class="hotel-badge">敬請期待</span><br>' +
                '民宿預訂系統建置中，預計 2026 年 10 月上線開放訂購' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cs2-total-summary">' +
            '<span class="cs2-total-label">結帳總額</span>' +
            '<span class="cs2-total-amount" data-cs2-total-amount>$0.00</span>' +
          '</div>' +
          '<div class="cs2-footer">' +
            '<button type="button" class="cs2-btn-skip" data-cs2-skip>略過，之後再補</button>' +
            '<button type="button" class="cs2-btn-primary" data-cs2-submit>確認加購</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var gearRoot = container.querySelector('[data-gear-rental-root]');
    var gearControls = renderGearRentalSection(gearRoot, { attendeeCount: attendeeCount });
    var gearToggle = container.querySelector('[data-gear-toggle]');
    wireAccordionToggle(gearToggle, container.querySelector('[data-gear-content]'));

    var coachRoot = container.querySelector('[data-coach-select-root]');
    var coachControls = renderCoachSelectSection(coachRoot);
    var coachToggle = container.querySelector('[data-coach-toggle]');
    wireAccordionToggle(coachToggle, container.querySelector('[data-coach-content]'));

    /* 金額總計即時連動：課程原價（呼叫端從購物車 line item 帶進來，單位是分）加上目前所有
       已勾選加購項目的金額。加購金額一律透過 getSelectedGear() 讀（它內部比對 GEAR_ITEMS
       這個唯一的價格資料來源），不在這裡另外寫死或重複解析金額，價格調整只需要改
       GEAR_ITEMS，這裡完全不用動。checkbox 是這次渲染出來的靜態 DOM（不像 BTA iframe
       會被 React 重繪替換節點），監聽器直接掛一次即可，不需要 capture phase 委派。
       兩處都要更新（底部原有位置 + 頂部新增的 sticky 位置），同一個數字，只是顯示兩處。 */
    var coursePriceCents = Number(options.coursePriceCents) || 0;
    var totalAmountEl = container.querySelector('[data-cs2-total-amount]');
    var totalAmountStickyEl = container.querySelector('[data-cs2-total-amount-sticky]');

    function formatCurrency(cents) {
      return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /* A 項：加購開關關閉時，客人根本沒有要租裝備，金額總計不應該把（可能殘留在隱藏清單
       裡、之前勾過又關掉開關的）加購項目算進去，只算課程原價。 */
    function updateTotal() {
      var gearCents = gearToggle.checked
        ? gearControls.getSelectedGear().reduce(function (sum, g) { return sum + g.price * 100; }, 0)
        : 0;
      var coachCents = (coachToggle.checked && coachControls.getSelectedCoach()) ? COACH_PRICE * 100 : 0;
      var text = formatCurrency(coursePriceCents + gearCents + coachCents);
      totalAmountEl.textContent = text;
      totalAmountStickyEl.textContent = text;
    }

    gearRoot.addEventListener('change', function (event) {
      if (!event.target || !event.target.matches) return;
      // 裝備打勾狀態影響金額；裝備打勾 + 尺寸欄位（含 select-dependent 的依賴欄位變動）
      // 都要重新檢查送出按鈕能不能點——尺寸本身不影響金額，updateTotal 不用因尺寸重跑。
      if (event.target.matches('[data-gear-checkbox]')) {
        syncSubmitButtonState();
        updateTotal();
      } else if (event.target.matches('[data-gear-size-input]')) {
        syncSubmitButtonState();
      }
    });

    coachRoot.addEventListener('change', function (event) {
      if (event.target && event.target.matches && event.target.matches('[data-coach-radio]')) {
        syncSubmitButtonState();
        updateTotal();
      }
    });

    /* 法律聲明必勾同意：checkbox 未勾選時「確認加購」按鈕強制 disabled，兩者即時雙向連動。
       因為 Modal 本身每次開啟都是 container.innerHTML 整段重新渲染（見 close()／呼叫端
       checkAndTrigger()），checkbox 天生不會沿用上次的勾選狀態，不需要額外的重置邏輯。

       A 項擴充：現在這整組（風險聲明／必勾同意／加購清單）都巢狀在「官方專屬裝備加租」
       這個開關底下——開關本身已經用 wireAccordionToggle 控制展開/收合（決定看不看得到），
       這裡另外處理「開關狀態如何影響送出按鈕的 disabled 判斷」與「加購清單什麼時候該
       出現」：
       - 開關關閉：客人不打算加租裝備，不需要同意任何聲明，送出按鈕不因為 legalCheckbox
         而被 disabled；加購清單維持隱藏（即使裡面有殘留勾選也不重要，updateTotal 已經
         把這個狀態排除在計算之外，送出時也一樣排除，見下方 submitBtn 的 click handler）。
       - 開關打開但未勾同意：送出按鈕 disabled，加購清單維持隱藏（先看完聲明、同意了才
         看得到清單，避免客人在還沒同意風險聲明前就先選裝備）。
       - 開關打開且已勾同意：送出按鈕可點擊，加購清單展開。 */
    var legalCheckbox = container.querySelector('[data-cs2-legal-checkbox]');
    var legalWarning = container.querySelector('[data-cs2-legal-warning]');
    var coachWarning = container.querySelector('[data-cs2-coach-warning]');
    var gearSizeWarning = container.querySelector('[data-cs2-gear-size-warning]');
    var submitBtn = container.querySelector('[data-cs2-submit]');

    /* 已勾選裝備裡，只要有一項帶 sizeFields 且任一欄位還空著，該學員就算「尺寸未完成」。
       回傳有缺漏的學員編號（去重、遞增排序），用來組出「學員2、3 尺寸資訊未完成」這種提示。
       裝備加租開關關閉時直接視為沒有缺漏（跟金額計算/送出邏輯排除已勾裝備的原則一致）。 */
    function findAttendeesWithIncompleteGearSizes() {
      if (!gearToggle.checked) return [];
      var incomplete = {};
      gearControls.getSelectedGear().forEach(function (g) {
        if (!g.sizeFields || !g.sizeFields.length) return;
        var missing = g.sizeFields.some(function (field) { return !g.sizeValues[field.key]; });
        if (missing) incomplete[g.attendee] = true;
      });
      return Object.keys(incomplete).map(Number).sort(function (a, b) { return a - b; });
    }

    /* 指定教練不需要另外簽同意聲明，只需要「開關打開就必須選一位教練」這個較簡單的檢查；
       裝備尺寸未完成是第三條獨立條件。三條互不相關的 disabled 條件用 || 疊加。 */
    function syncSubmitButtonState() {
      var needsConsent = gearToggle.checked;
      var needsCoach = coachToggle.checked && !coachControls.getSelectedCoach();
      var incompleteAttendees = findAttendeesWithIncompleteGearSizes();
      var needsGearSizes = incompleteAttendees.length > 0;
      submitBtn.disabled = (needsConsent && !legalCheckbox.checked) || needsCoach || needsGearSizes;
      if (!needsConsent || legalCheckbox.checked) legalWarning.hidden = true;
      if (!needsCoach) coachWarning.hidden = true;
      if (needsGearSizes) {
        gearSizeWarning.textContent = '學員' + incompleteAttendees.join('、') + ' 尺寸資訊未完成';
        gearSizeWarning.hidden = false;
      } else {
        gearSizeWarning.hidden = true;
      }
    }

    function syncGearListVisibility() {
      gearRoot.classList.toggle('cs2-gear-list-hidden', !(gearToggle.checked && legalCheckbox.checked));
    }

    function handleGearToggleChange() {
      syncSubmitButtonState();
      syncGearListVisibility();
      updateTotal();
    }
    gearToggle.addEventListener('change', handleGearToggleChange);

    function handleLegalCheckboxChange() {
      syncSubmitButtonState();
      syncGearListVisibility();
      updateTotal();
    }
    legalCheckbox.addEventListener('change', handleLegalCheckboxChange);

    function handleCoachToggleChange() {
      syncSubmitButtonState();
      updateTotal();
    }
    coachToggle.addEventListener('change', handleCoachToggleChange);

    // 初始狀態同步：開關預設關閉，這裡確保按鈕/清單/總金額一開始就是正確狀態，不依賴 HTML 寫死的屬性。
    syncSubmitButtonState();
    syncGearListVisibility();
    updateTotal();

    function close() {
      container.innerHTML = '';
    }

    container.querySelectorAll('[data-cs2-skip]').forEach(function (el) {
      el.addEventListener('click', function () {
        close();
        if (options.onSkip) options.onSkip();
      });
    });

    submitBtn.addEventListener('click', function () {
      /* 雙重防呆：即使 disabled 理論上點不到，仍在送出邏輯最前面擋一次，
         避免 disabled 屬性被其他腳本／瀏覽器擴充功能意外移除而繞過檢查。
         只有開關打開時才需要同意聲明——開關關閉時完全跳過這個檢查。 */
      if (gearToggle.checked && !legalCheckbox.checked) {
        legalWarning.hidden = false;
        return;
      }
      if (coachToggle.checked && !coachControls.getSelectedCoach()) {
        coachWarning.hidden = false;
        return;
      }
      var incompleteAttendees = findAttendeesWithIncompleteGearSizes();
      if (incompleteAttendees.length > 0) {
        gearSizeWarning.textContent = '學員' + incompleteAttendees.join('、') + ' 尺寸資訊未完成';
        gearSizeWarning.hidden = false;
        return;
      }
      var selectedGear = gearToggle.checked ? gearControls.getSelectedGear() : [];
      var properties = {};
      selectedGear.forEach(function (g) {
        properties['學員' + g.attendee + '_加購_' + g.key] = '需要';
        // 結構化尺寸欄位跟既有的備註欄（BTA「備註／其他需求」）並存，這裡不寫入也不清空備註欄，
        // writeCourseFormDataToCart() 的 merge 邏輯本來就只會疊加這裡列出的 properties。
        if (g.sizeFields && g.sizeFields.length) {
          g.sizeFields.forEach(function (field) {
            var value = g.sizeValues[field.key];
            if (value) properties['學員' + g.attendee + '_加購_' + g.key + '_' + field.label] = value;
          });
        }
      });
      if (coachToggle.checked) {
        var selectedCoach = coachControls.getSelectedCoach();
        if (selectedCoach) properties['指定教練'] = selectedCoach;
      }
      close();
      if (options.onSubmit) options.onSubmit(properties);
    });
  }

  /**
   * 把資料寫進購物車該項目的 line item properties（用 /cart/change.js，會先 merge 既有 properties 再送出，
   * 避免覆蓋掉 BTA widget 自己寫入的日期/雪板類型等欄位)。
   * @param {string} cartItemKey - cart.js 裡該 line item 的 key
   * @param {Record<string,string>} newProperties - 要追加/更新的欄位
   * @returns {Promise<object>} 更新後的 cart 物件
   */
  function writeCourseFormDataToCart(cartItemKey, newProperties) {
    return fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var item = cart.items.filter(function (i) { return i.key === cartItemKey; })[0];
        var mergedProperties = Object.assign({}, item ? item.properties : {}, newProperties);
        // /cart/change.js 若省略 quantity 會把數量重置成預設值，這裡明確帶回原本的數量避免覆蓋掉
        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cartItemKey, quantity: item ? item.quantity : 1, properties: mergedProperties }),
        });
      })
      .then(function (r) { return r.json(); })
      .then(function (updatedCart) {
        document.dispatchEvent(new CustomEvent('cart:update', { bubbles: true }));
        return updatedCart;
      });
  }

  window.CourseStage2Module = {
    renderStage2Form: renderStage2Form,
    renderGearRentalSection: renderGearRentalSection,
    renderCoachSelectSection: renderCoachSelectSection,
    writeCourseFormDataToCart: writeCourseFormDataToCart,
    GEAR_ITEMS: GEAR_ITEMS,
    COACH_ITEMS: COACH_ITEMS,
    COACH_PRICE: COACH_PRICE,
  };
})();
