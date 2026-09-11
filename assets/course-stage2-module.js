/**
 * Course booking Stage 2/3（裝備加租／民宿加購）重複使用模組。
 * 視覺語言直接沿用原本商品頁 STEP UI（course-booking-form.liquid）已定案的樣式：
 * 步驟指示條、雙軌卡片（accordion-card + toggle-switch）、學員分組深色標題列（attendee-gear-group-box）。
 * 純渲染 + 資料函式，不假設自己被放在哪個頁面、哪個容器裡，也不主動判斷「何時該顯示」——
 * 觸發時機由呼叫端（例如 snippets/cart-stage2-trigger.liquid）決定。
 * 掛在 window.CourseStage2Module，供任何頁面的 <script> 直接呼叫。
 *
 * ES module（載入端 snippets/cart-stage2-trigger.liquid 用 type="module"）：需要 import
 * CartUpdateEvent 才能送出主題原生購物車元件（component-cart-items.js／cart-drawer.js 等）
 * 看得懂的 cart:update 事件，見 writeCourseFormDataToCart() 底部。
 */
import { CartUpdateEvent } from '@theme/events';

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
  /* 性別是「學員層級」的共用欄位，不是個別裝備的 sizeFields——同一位學員勾選多項需要
     性別的裝備時，只填一次、所有裝備共用同一個值，不會出現同一位學員在不同裝備底下
     填出矛盾性別的可能性（2026-08-18 發現的資料一致性問題，見 renderGearRentalSection
     的共用性別欄位渲染／wireDependentSizeFields）。GENDER_FIELD 只用來定義這個共用
     欄位本身的型別/選項，不放進任何 GEAR_ITEMS 的 sizeFields 陣列。 */
  var GENDER_FIELD = { key: 'gender', label: '性別', type: 'select', options: ['男', '女'] };
  /* select-dependent：選項清單依 dependsOn 指定的欄位當下的值動態產生。dependsOn:'gender'
     一律解讀成「該學員的共用性別欄位」（不是同一裝備底下的欄位），見
     wireDependentSizeFields() 對 'gender' 的特殊處理。尚未選擇依賴欄位前維持 disabled。 */
  var CLOTHING_SIZE_FIELD = { key: 'clothingSize', label: '雪服尺碼', type: 'select-dependent', dependsOn: 'gender', optionsByValue: CLOTHING_SIZE_BY_GENDER };
  var HELMET_SIZE_FIELD = { key: 'helmetSize', label: '安全帽尺寸', type: 'select', options: HELMET_SIZE_OPTIONS };
  /* 這四項裝備勾選任一項時，該學員的共用性別欄位才列為必填——單板鞋組/雪服帽鏡組/雪服
     需要性別決定雪服尺碼選項，安全帽的性別純資訊性（不連動任何選項）但業主仍要求收集。
     只勾雪鏡／滑雪護具的學員不需要填性別。 */
  var GEAR_KEYS_REQUIRING_GENDER = ['單板鞋組', '雪服帽鏡組', '安全帽', '雪服'];

  /* sizeFields：裝備勾選後需要客人填寫的結構化尺寸欄位，取代原本只能寫在購物車備註欄
     的自由格式（備註欄仍保留，兩者並存，見 renderStage2Form 送出邏輯）。陣列裡的欄位
     一律視為必填（勾選該裝備才需要），沒有 sizeFields 或空陣列代表此裝備不需尺寸資訊
     （目前只有雪鏡）。「板種」（單板/雙板）刻意維持獨立的 skiType 屬性、不寫進
     sizeFields——未來新增雙板款式（例如「雙板鞋組」）只需要在這個陣列多加一筆帶
     skiType:'雙板' 跟自己的 sizeFields，renderGearRentalSection／驗證邏輯不需要改動。 */
  var GEAR_ITEMS = [
    { key: '單板鞋組', price: 1200, skiType: '單板', desc: '雪板 + 舒適雪鞋', isCombo: false, isMutual: false,
      /* 2026-09-05（防呆修復）：min/max 是業主確認的合理區間——身高 100~220cm、
         體重 20~150kg、鞋子尺寸（腳長，欄位單位本身就是 cm，不是歐規/日規鞋號）
         15~35cm。renderGearSizeFieldHtml() 用這兩個值產生 HTML5 原生 min/max
         屬性，findGearSizeIssues() 送出前另外用 JS 比對同一組數字（不只依賴
         HTML5 原生限制，原生限制在不同瀏覽器/輸入方式下行為不一致、也能被繞過）。 */
      sizeFields: [
        { key: 'height', label: '身高', type: 'number', unit: 'cm', min: 100, max: 220 },
        { key: 'weight', label: '體重', type: 'number', unit: 'kg', min: 20, max: 150 },
        { key: 'shoeSize', label: '鞋子尺寸', type: 'number', unit: 'cm', min: 15, max: 35 },
      ] },
    { key: '雪服帽鏡組', price: 1000, skiType: null, desc: '雪服 + 安全帽 + 雪鏡，一次租齊最划算', isCombo: true, isMutual: false,
      sizeFields: [ CLOTHING_SIZE_FIELD, HELMET_SIZE_FIELD ] },
    { key: '雪服', price: 800, skiType: null, desc: '防水透氣保暖材質', isCombo: false, isMutual: true,
      sizeFields: [ CLOTHING_SIZE_FIELD ] },
    { key: '安全帽', price: 300, skiType: null, desc: '輕量舒適', isCombo: false, isMutual: true,
      sizeFields: [ HELMET_SIZE_FIELD ] },
    { key: '雪鏡', price: 300, skiType: null, desc: '防曬抗 UV 鏡片', isCombo: false, isMutual: true },
    { key: '滑雪護具', price: 200, skiType: null, desc: '加強防護設計（護臀、護膝）', isCombo: false, isMutual: false,
      sizeFields: [ { key: 'padSize', label: '護具尺寸', type: 'select', options: ['S', 'M', 'L', 'XL'] } ] },
  ];

  /* 2026-08-29（緊急修復，範圍限定安全帽／雪鏡兩項）：Stage3 加購原本只把選擇內容寫進
     line item properties（純文字說明），從未真正讓 Shopify 收這筆錢——已在 PROGRESS.md
     記錄根因跟盤點結果。這兩項是盤點六項裝備裡唯二「Stage3 收集的資料維度」跟「Shopify
     後台真實商品的 variant 結構」剛好一對一對得起來的（安全帽：S/M/L 對應真實商品的
     頭圍尺寸三個 variant；雪鏡：無尺寸選項，真實商品也只有一個預設 variant），
     所以先只做這兩項的真實串接。
     variant id 直接來自 qgfchv-py.myshopify.com 商店（即時查 /products.json 確認，
     不是用表單/商品頁面上顯示的文字反推），是全店共用的常數，不分測試/正式主題環境。 */
  var HELMET_VARIANT_ID_BY_SIZE = {
    'S': 45841778606163, // 裝備租賃 - 安全帽 / S (52-55 cm)
    'M': 45841778638931, // 裝備租賃 - 安全帽 / M (55-59 cm)
    'L': 45841778671699, // 裝備租賃 - 安全帽 / L (59-63 cm)
  };
  var GOGGLES_VARIANT_ID = 43406544863315; // 裝備租賃 - 雪鏡 / Default Title

  /* 2026-08-29（第二批，滑雪護具）：真實商品「裝備租賃 - 滑雪護臀 護膝」
     （gear-rent-protect）是**一個商品、兩個 option 維度（護臀尺寸×護膝尺寸）合併成
     一個 variant**，不是兩個獨立商品——即時查 /products.json 確認共 8 個 variant。
     Stage3 只收一筆「護具尺寸」（S/M/L/XL），要換算成「護臀尺寸＋護膝尺寸」這組合併
     variant：護膝只有兩種尺寸，S 號護臀搭配「適用於S號護臀的護膝」，M/L/XL 號護臀
     都搭配同一種「適用於 M/L/XL 號護臀的護膝」——這是業主確認的對應規則（護膝尺寸
     由護臀尺寸決定，不是客人自己選），不是這裡自己發明的假設。每個 padSize 值剛好
     對應唯一一個 variant，所以做法跟安全帽的「尺寸→variant」對照表完全一樣，
     不需要另外設計「一對多」的特殊處理邏輯。 */
  var PAD_VARIANT_ID_BY_SIZE = {
    'S': 45840784490579,  // 護臀 S (參考腰圍 56-66 cm) / 護膝 適用於S號
    'M': 45840784588883,  // 護臀 M (參考腰圍 60-74 cm) / 護膝 適用於 M/L/XL 號
    'L': 45840784654419,  // 護臀 L (參考腰圍 70-80 cm) / 護膝 適用於 M/L/XL 號
    'XL': 45840784719955, // 護臀 XL (參考腰圍 74-88 cm) / 護膝 適用於 M/L/XL 號
  };

  /* 2026-09-11：單板鞋組確實只有單一 variant（無尺寸維度），繼續固定送出這一顆——
     這不是退而求其次，是這個商品本來就沒有尺寸可選。 */
  var SBOARD_BOOTS_VARIANT_ID = 43406544830547; // 裝備租賃 - 單板鞋組 / Default Title（唯一 variant）

  /* 2026-09-11（雪服／雪服帽鏡組改真正一對一查表）：業主已把 gear-rent-jacket-pant／
     full-set-bundle 兩個商品的男款尺碼統一成 M/L/XL/2XL/3XL（女款維持 S/M/L/XL），
     Stage3 這邊原本因為「男女尺寸並列兩個獨立 option」跟「依性別切換單一尺寸池」
     兩種資料維度對不起來、只能固定送出同一顆 variant 的問題，改用「性別-尺碼」
     組合字串當 key 來解決——這兩個商品的 variant 本身還是「女款尺寸 × 男款尺寸」
     兩個獨立 option（業主這次沒有把它們合併成一個 option，只統一了男款尺碼清單），
     所以同一個「性別-尺碼」key 底下，另一個性別的維度必須固定填一個佔位值才能對到
     單一 variant——這裡統一固定取該維度的第一個尺碼（女款固定用 S、男款固定用 M）
     當佔位值，價格不受影響（同商品所有 variant 價格一致，即時查 /products.json 確認
     過），variant title 裡「客人沒選的那個性別」尺寸只是佔位文字，真正的客人尺寸
     一律另外寫進 line item properties（buildStage3SummaryHtml／送出邏輯既有的
     「學員N_加購_XXX_雪服尺碼」文字說明），後勤／教練核對尺寸看 properties，不是看
     variant title。
     兩份表都是即時查 /products/gear-rent-jacket-pant.js、/products/full-set-bundle.js
     的完整 variant 清單逐一比對產生，不是手動推算或用文字反推。 */
  var CLOTHING_VARIANT_ID_BY_GENDER_SIZE = {
    // 裝備租賃 - 雪服（gear-rent-jacket-pant，4 女款 × 5 男款 = 20 variant，男款尺碼佔位固定用 M，女款尺碼佔位固定用 S）
    '女-S': 45841848696915,  // S / M（男款佔位）
    '女-M': 45841848959059,  // M / M（男款佔位）
    '女-L': 45841849221203,  // L / M（男款佔位）
    '女-XL': 45841849483347, // XL / M（男款佔位）
    '男-M': 45841848696915,  // S（女款佔位）/ M
    '男-L': 45841848729683,  // S（女款佔位）/ L
    '男-XL': 45841848762451, // S（女款佔位）/ XL
    '男-2XL': 45841848795219,// S（女款佔位）/ 2XL
    '男-3XL': 45841848827987,// S（女款佔位）/ 3XL
  };
  var FULL_SET_BUNDLE_VARIANT_ID_BY_KEY = {
    // 裝備租賃 - 雪服帽鏡組（full-set-bundle，3 安全帽 × 4 女款 × 5 男款 = 60 variant，
    // key 格式：安全帽尺寸 + '|' + 性別-尺碼；女款尺碼佔位固定用 S，男款尺碼佔位固定用 M）
    'S|女-S': 45841855053907,  'S|女-M': 45841855217747,  'S|女-L': 45841855381587,  'S|女-XL': 45841855545427,
    'S|男-M': 45841855053907,  'S|男-L': 46229523464275,  'S|男-XL': 45841855086675, 'S|男-2XL': 45841855119443, 'S|男-3XL': 45841855152211,
    'M|女-S': 45841855709267,  'M|女-M': 45841855873107,  'M|女-L': 45841856036947,  'M|女-XL': 45841856200787,
    'M|男-M': 45841855709267,  'M|男-L': 46229523595347,  'M|男-XL': 45841855742035, 'M|男-2XL': 45841855774803, 'M|男-3XL': 45841855807571,
    'L|女-S': 45841856364627,  'L|女-M': 45841856528467,  'L|女-L': 45841856692307,  'L|女-XL': 45841856856147,
    'L|男-M': 45841856364627,  'L|男-L': 46229523726419,  'L|男-XL': 45841856397395, 'L|男-2XL': 45841856430163, 'L|男-3XL': 45841856462931,
  };

  /* 把已勾選的裝備（selectedGear，來自 getSelectedGear()）轉成 /cart/add.js 需要的
     { id, quantity } 清單。GEAR_ITEMS 六項裝備現在全部有對應：安全帽／滑雪護具用
     「尺寸→variant」查表，雪鏡固定一顆 variant，單板鞋組維持固定一顆（無尺寸維度），
     雪服／雪服帽鏡組改用「性別-尺碼」組合 key 查表（見上方兩份常數旁的說明）——
     這兩項需要 gearControls.getAttendeeGender() 才能組出 key，所以這個函式多收一個
     gearControls 參數（呼叫端 submitBtn 的 click handler 本來就有這個變數在作用域內）。
     同一個 variant（例如兩位學員都選 M 號安全帽，或兩位學員都選女 M 號雪服帽鏡組）
     合併成一筆、quantity 疊加，不會拆成兩筆重複的 line item——這是 Shopify 購物車
     本來就有的「同 variant 用 quantity 疊加」慣例，不是這裡額外發明的邏輯。 */
  function buildRealGearCartItems(selectedGear, gearControls) {
    var quantityByVariantId = {};
    (selectedGear || []).forEach(function (g) {
      var variantId = null;
      if (g.key === '安全帽') {
        var helmetSize = g.sizeValues && g.sizeValues.helmetSize;
        variantId = HELMET_VARIANT_ID_BY_SIZE[helmetSize] || null;
      } else if (g.key === '雪鏡') {
        variantId = GOGGLES_VARIANT_ID;
      } else if (g.key === '滑雪護具') {
        var padSize = g.sizeValues && g.sizeValues.padSize;
        variantId = PAD_VARIANT_ID_BY_SIZE[padSize] || null;
      } else if (g.key === '單板鞋組') {
        variantId = SBOARD_BOOTS_VARIANT_ID;
      } else if (g.key === '雪服帽鏡組') {
        var bundleGender = gearControls && gearControls.getAttendeeGender(g.attendee);
        var bundleClothingSize = g.sizeValues && g.sizeValues.clothingSize;
        var bundleHelmetSize = g.sizeValues && g.sizeValues.helmetSize;
        if (bundleGender && bundleClothingSize && bundleHelmetSize) {
          variantId = FULL_SET_BUNDLE_VARIANT_ID_BY_KEY[bundleHelmetSize + '|' + bundleGender + '-' + bundleClothingSize] || null;
        }
      } else if (g.key === '雪服') {
        var jacketGender = gearControls && gearControls.getAttendeeGender(g.attendee);
        var jacketClothingSize = g.sizeValues && g.sizeValues.clothingSize;
        if (jacketGender && jacketClothingSize) {
          variantId = CLOTHING_VARIANT_ID_BY_GENDER_SIZE[jacketGender + '-' + jacketClothingSize] || null;
        }
      }
      if (!variantId) return;
      quantityByVariantId[variantId] = (quantityByVariantId[variantId] || 0) + 1;
    });
    return Object.keys(quantityByVariantId).map(function (variantId) {
      return { id: Number(variantId), quantity: quantityByVariantId[variantId] };
    });
  }

  /* 指定教練加購：整組課程層級的單選（不是每學員各自選），固定加價 NT$400，
     跟哪一位教練無關（四選一，價格一致——2026-09-05 新增 Una 為第四位教練選項，
     業主確認 Una 已經是 BTA Resource 共用容量的 4 位教練之一，跟 Stage3 加購清單
     沒有同步過，純粹補上這個選項清單裡的一筆，不涉及新商品/variant）。跟裝備加租
     不同，資料寫入時只會有
     一個 line item property（例如 `指定教練`: `阿哲`），不比照 `學員N_加購_XXX` 的每人一筆格式。 */
  var COACH_PRICE = 400;
  var COACH_ITEMS = [
    { key: '阿哲', label: '教練：阿哲' },
    { key: 'Angus', label: '教練：Angus' },
    { key: 'Kris', label: '教練：Kris' },
    { key: 'Una', label: '教練：Una' },
  ];

  /* 2026-08-31（緊急修復）：指定教練原本只寫 properties，Shopify 從未真正收過這 $400——
     跟裝備加租當初的根因完全一樣。業主已建立對應商品「課程加購 - 指定教練」（單一
     variant，跟哪一位教練無關，三選一價格一致，做法比照雪鏡：固定送出同一顆 variant，
     教練姓名維持寫入 properties 文字說明供核對）。variant id 即時查 /products.json 確認。 */
  var COACH_VARIANT_ID = 46088858730579; // 課程加購 - 指定教練 / Default Title

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
      /* 開發指令規格順序6（2026-08-27 方向性修正）：Stage 2「滑雪場」欄位答案不是
         「富良野」時隱藏裝備租賃／住宿加購卡片（不再看商品標籤）。只用 CSS 隱藏，
         HTML 結構跟既有的 JS 監聽器完全不動，見 renderStage2Form() 頂部註解。 */
      '.cs2-resort-hidden { display: none !important; }',
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
      /* 2026-09-10（精確修復）：原本 600px 是設計給「只有幾個尺寸輸入欄位」的高度抓的，
         2026-09-10 加入的裝備尺寸對照表（雪服/雪服帽鏡組最多同時顯示女+男共 5 張表，
         實測 scrollHeight 高達 1525px）被這個 overflow:hidden 的天花板硬裁切，且因為是
         hidden 不是 auto，裁掉的部分連捲軸提示都不會有——這正是業主用 DevTools 定位到
         的根因。改成 3000px（跟外層 .accordion-content.is-expanded 的天花板同值，兩層
         天花板一致，外層 3000px 才是真正的上限，這裡不會變成新的裁切點）。 */
      '.gear-size-fields.is-expanded { max-height: 3000px; opacity: 1; padding: 10px 2px 2px 2px; margin-top: 6px; border-top: 1px dashed #B8D9ED; }',
      '.gear-size-field { display: flex; align-items: center; gap: 8px; }',
      '.gear-size-label { font-size: 12px; font-weight: 700; color: #1A2E4A; flex: 0 0 88px; }',
      '.gear-size-field select, .gear-size-field input[type="number"] { flex: 1 1 auto; min-width: 0; padding: 6px 8px; border: 1px solid #B8D9ED; border-radius: 6px; font-size: 13px; color: #1A2E4A; background: #fff; }',
      '.gear-size-field select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }',
      '.cs2-gear-size-warning { color: #C0392B; font-size: 12px; font-weight: 700; margin: 10px 2px 0 2px; }',
      '.cs2-gear-size-warning[hidden] { display: none; }',

      /* 學員層級共用性別欄位：固定顯示在該學員裝備清單最上方，不隨任何裝備勾選狀態
         展開/收合——同一位學員底下所有需要性別的裝備都讀這一個值，只填一次。 */
      '.attendee-shared-gender { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #E8F4FA; border-bottom: 1px solid #B8D9ED; }',
      '.attendee-shared-gender .gear-size-label { flex: 0 0 88px; }',
      '.attendee-shared-gender select { flex: 1 1 auto; min-width: 0; padding: 6px 8px; border: 1px solid #B8D9ED; border-radius: 6px; font-size: 13px; color: #1A2E4A; background: #fff; }',

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

      /* 2026-08-29 修正（任務二）：順序5原本在 Stage 3 另外做了一個可勾選的「同行人員中
         有兒童」checkbox（純資料收集，跟 Stage 2 的「是否有 6~12 歲兒童同行」各自獨立）。
         業主確認這是重複詢問，Stage 3 不該再讓客人重新勾選一次——改成唯讀顯示：直接讀
         Stage 2 這個 BTA Booking Field 的答案（呼叫端 cart-stage2-trigger.liquid 已經
         判斷好傳進來），答案是「有」才顯示這一行醒目文字，「沒有」則整個不渲染。
         `.cs2-companion-info-row`（原本的可勾選淺灰底框行）已跟著拿掉，換成這個唯讀版
         `.cs2-child-notice`，用跟三張加購卡片不同的「提示語氣」（左側色條＋粗體），
         不是可互動的表單元素。 */
      '.cs2-child-notice { display: flex; align-items: center; gap: 8px; background: #E8F4FA; border: 1px solid #B8D9ED; border-left: 3px solid #3A7AB5; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; color: #1A2E4A; font-size: 13px; font-weight: 700; }',

      /* 金額總計（課程原價 + 已勾選加購項目），放在送出按鈕正上方，比照「實際參加人數」
         驗證那則按鈕旁提示文字的位置邏輯，讓客人捲到按鈕位置就能直接看到，不用往上找 */
      '.cs2-total-summary { display: flex; justify-content: flex-end; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #B8D9ED; }',
      '.cs2-total-label { font-size: 14px; font-weight: 700; color: #5A6A78; }',
      '.cs2-total-amount { font-size: 20px; font-weight: 800; color: #1A2E4A; white-space: nowrap; }',

      /* 送出前確認彈窗：疊加在原表單 .cs2-overlay 之上（appendChild 出來的新 sibling），
         z-index 比表單那層高一階，確保穩定疊在最上面。彙整內容清單式排版（不用表格，
         手機 375px 表格容易擠壓），跟現有 .cs2-panel 外殼共用同一套圓角/陰影/RWD/捲動。 */
      '.cs2-confirm-overlay { z-index: 99999; }',
      '.cs2-confirm-section { margin-bottom: 18px; }',
      '.cs2-confirm-section-title { font-size: 14px; font-weight: 800; color: #1A2E4A; margin: 0 0 10px 0; padding-left: 10px; border-left: 3px solid #3A7AB5; }',
      '.cs2-summary-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 7px 4px; border-bottom: 1px solid #f0f4f8; font-size: 13px; }',
      '.cs2-summary-label { color: #5A6A78; font-weight: 700; flex: 0 0 auto; }',
      '.cs2-summary-value { color: #1A2E4A; font-weight: 700; text-align: right; word-break: break-word; }',
      '.cs2-summary-attendee { border: 1px solid #B8D9ED; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; background: #fafcff; }',
      '.cs2-summary-attendee-title { font-size: 12px; font-weight: 800; color: #fff; background: linear-gradient(90deg, #1A2E4A 0%, #2D5F8A 100%); display: inline-block; padding: 3px 12px; border-radius: 999px; margin: 0 0 8px 0; }',
      '.cs2-summary-gear-list { list-style: disc; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }',
      '.cs2-summary-gear-name { font-weight: 700; color: #1A2E4A; font-size: 13px; }',
      '.cs2-summary-gear-sizes { display: block; font-size: 12px; color: #5A6A78; margin-top: 2px; }',
      '.cs2-summary-consent { font-size: 13px; font-weight: 700; color: #1A2E4A; background: #E8F4FA; border: 1px solid #B8D9ED; border-radius: 8px; padding: 10px 14px; margin-top: 6px; }',

      '.cs2-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }',
      '.cs2-btn-primary { background: #1A2E4A; color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }',
      '.cs2-btn-primary:hover { background: #2D5F8A; }',
      '.cs2-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; background: #1A2E4A; }',
      '.cs2-btn-primary:disabled:hover { background: #1A2E4A; }',
      '.cs2-btn-skip { background: none; border: none; color: #5A6A78; font-size: 14px; cursor: pointer; text-decoration: underline; }',

      /* 裝備尺寸對照表：沿用原生 <details>/<summary>（比照 snippets/cart-products.liquid
         已經在用的「摘要＋可展開」模式），不另外寫 JS 開關邏輯。表格本身重用既有的
         .cs2-legal-table／.cs2-legal-note，不新增一套重複的表格樣式。 */
      '.cs2-size-reference { margin-top: 8px; }',
      '.cs2-size-reference summary { cursor: pointer; color: #2D5F8A; font-weight: 700; font-size: 12px; list-style: none; }',
      '.cs2-size-reference summary::-webkit-details-marker { display: none; }',
      '.cs2-size-reference summary::before { content: "▸ "; display: inline-block; transition: transform 0.15s ease; }',
      '.cs2-size-reference[open] summary::before { transform: rotate(90deg); }',
      '.cs2-size-reference-content { margin-top: 8px; padding: 10px 12px; background: #fafcff; border: 1px solid #B8D9ED; border-radius: 8px; }',
      '.cs2-size-reference-subtitle { font-weight: 700; color: #1A2E4A; font-size: 12.5px; margin: 10px 0 4px 0; }',
      '.cs2-size-reference-subtitle:first-child { margin-top: 0; }',
      '.cs2-gender-table-hidden { display: none !important; }',
      '.cs2-size-reference-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }',
      '.cs2-size-reference-table-scroll .cs2-legal-table { min-width: 420px; }',
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

  /* 2026-09-10：裝備尺寸對照表——純參考資訊，供客人選尺寸時查閱，不寫入任何
     line item property、不影響送出/驗證邏輯（getSelectedGear() 只讀
     [data-gear-size-field]，這裡的內容完全在那個選擇器之外）。
     安全帽頭圍區間、護臀腰圍區間直接沿用 HELMET_SIZE_OPTIONS／PAD_VARIANT_ID_BY_SIZE
     旁邊註解裡業主已確認過的數字，不是另外定義的新資料來源。護膝區間、雪服/雪服帽鏡組
     男女對照表的量測說明是業主這次任務直接提供的文字內容。雪服/雪服帽鏡組的六個維度
     （衣長/袖長/胸圍/肩幅/身高/體重）具體數字業主之後才會提供參考截圖，這裡先把表格
     欄位結構建好、格子用「－」佔位，不因為數字還沒到齊卡住這次開發；量測方式圖示同理
     先留文字註記，等業主提供正式素材再做第二輪圖片替換。 */
  function helmetSizeReferenceHtml() {
    return '' +
      '<p class="cs2-legal-note">量測方式：額頭與後腦勺最突出處、耳上一圈量測頭圍。（量測方式圖示製作中）</p>' +
      '<table class="cs2-legal-table"><thead><tr><th>尺寸</th><th>頭圍</th></tr></thead><tbody>' +
        '<tr><td>S</td><td>52-55cm</td></tr>' +
        '<tr><td>M</td><td>55-59cm</td></tr>' +
        '<tr><td>L</td><td>59-63cm</td></tr>' +
      '</tbody></table>';
  }

  function padSizeReferenceHtml() {
    return '' +
      '<p class="cs2-legal-note">護臀量腰圍；護膝於膝上約 10cm 處量一圈。（量測方式圖示製作中）</p>' +
      '<table class="cs2-legal-table"><thead><tr><th>尺寸</th><th>護臀（腰圍）</th><th>護膝（膝上10cm）</th></tr></thead><tbody>' +
        '<tr><td>S</td><td>56-66cm</td><td>32-38cm</td></tr>' +
        '<tr><td>M</td><td>60-74cm</td><td>38-52cm</td></tr>' +
        '<tr><td>L</td><td>70-80cm</td><td>38-52cm</td></tr>' +
        '<tr><td>XL</td><td>74-88cm</td><td>38-52cm</td></tr>' +
      '</tbody></table>';
  }

  /* 2026-09-10（補件）：業主提供的實際數字是「外套」「褲子」兩份各自獨立的量測表
     （外套：著丈/袖丈/胸圍/肩幅/身高/體重；褲子：腰圍/臀圍/大腿圍/股上/褲長/褲口），
     不是原本 Checkpoint 1 估計的單一 6 欄表格——雪服帽鏡組本來就是「雪服+安全帽+雪鏡」
     一次租齊的組合，「雪服」品項本身其實包含外套跟褲子兩件，資料到齊後才發現這個
     結構差異，這裡照實際資料結構拆成兩張表，不是自己另外設計的規格。
     尺碼列（S/M/L/XL、M/L/XL/2XL/3XL）維持跟 CLOTHING_SIZE_BY_GENDER 一致，沒有調整。 */
  var CLOTHING_JACKET_DATA = {
    '女': { headers: ['著丈', '袖丈', '胸圍', '肩幅', '身高(cm)', '體重(kg)'], rows: {
      'S': ['72', '57', '120', '54', '155-165', '45-50'],
      'M': ['74', '58', '125', '56', '160-175', '47.5-55'],
      'L': ['76', '59', '130', '58', '160-180', '55-65'],
      'XL': ['78', '60', '135', '60', '170-185', '62.5-72.5'],
    } },
    '男': { headers: ['著丈', '袖丈', '胸圍', '肩幅', '身高(cm)', '體重(kg)'], rows: {
      'M': ['74', '58', '125', '56', '160-175', '47.5-55'],
      'L': ['76', '59', '130', '58', '160-180', '55-65'],
      'XL': ['78', '60', '135', '60', '170-185', '62.5-72.5'],
      '2XL': ['80', '61', '140', '62', '170-190', '70-80'],
      '3XL': ['82', '62', '145', '64', '170-195', '77.5-90'],
    } },
  };
  var CLOTHING_PANTS_DATA = {
    '女': { headers: ['腰圍', '臀圍', '大腿圍', '股上(前/後)', '褲長', '褲口'], rows: {
      'S': ['63-67', '104', '66', '32/45', '100', '47'],
      'M': ['67-71', '108', '68', '33/45', '101', '48'],
      'L': ['75-79', '112', '70', '33/46', '102', '49'],
      'XL': ['79-87', '116', '72', '34/47', '103', '50'],
    } },
    '男': { headers: ['腰圍', '臀圍', '大腿圍', '股上(前/後)', '褲長', '褲口'], rows: {
      'M': ['67-71', '108', '68', '33/45', '101', '48'],
      'L': ['75-79', '112', '70', '33/46', '102', '49'],
      'XL': ['79-87', '116', '72', '34/47', '103', '50'],
      '2XL': ['87-95', '120', '74', '34/47', '104', '51'],
      '3XL': ['95-103', '124', '76', '35/48', '105', '52'],
    } },
  };

  /* 6 欄數值＋尺碼共 7 欄，375px 寬度下會被壓到文字換行——包一層 overflow-x:auto
     讓表格用自己的寬度橫向捲動，不擠壓儲存格（不動共用的 .cs2-legal-table 本身，
     避免影響它原本只有 2~3 欄的其他用途，例如租賃風險聲明表格）。 */
  function sizeDataTableHtml(headers, sizeData) {
    var headHtml = '<th>尺碼</th>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('');
    var bodyHtml = Object.keys(sizeData.rows).map(function (size) {
      var cells = sizeData.rows[size].map(function (v) { return '<td>' + v + '</td>'; }).join('');
      return '<tr><td>' + size + '</td>' + cells + '</tr>';
    }).join('');
    return '' +
      '<div class="cs2-size-reference-table-scroll">' +
        '<table class="cs2-legal-table"><thead><tr>' + headHtml + '</tr></thead><tbody>' + bodyHtml + '</tbody></table>' +
      '</div>';
  }

  /* data-gender-table 屬性給 wireSizeReferenceGenderToggle() 用，依客人當下選的性別
     動態只顯示對應那組；性別尚未選擇時（gender === ''）兩組都顯示，各自清楚標示
     「女款」/「男款」，不會讓客人看到空白內容。 */
  function clothingSizeReferenceHtml() {
    function genderBlock(genderLabel) {
      return '' +
        '<div data-gender-table="' + genderLabel + '">' +
          '<p class="cs2-size-reference-subtitle">' + genderLabel + '款・外套</p>' +
          sizeDataTableHtml(CLOTHING_JACKET_DATA[genderLabel].headers, CLOTHING_JACKET_DATA[genderLabel]) +
          '<p class="cs2-size-reference-subtitle">' + genderLabel + '款・褲子</p>' +
          sizeDataTableHtml(CLOTHING_PANTS_DATA[genderLabel].headers, CLOTHING_PANTS_DATA[genderLabel]) +
        '</div>';
    }
    return '' +
      '<p class="cs2-legal-note">未標註單位的欄位皆為公分（cm）。（量測方式圖示製作中）</p>' +
      genderBlock('女') +
      genderBlock('男');
  }

  /** 依裝備品項組出尺寸對照表的 <details> HTML；沒有對照表的品項（單板鞋組、雪鏡）
   * 回傳空字串，呼叫端不會渲染出空的 <details>。 */
  function renderSizeReferenceDetailsHtml(gearKey) {
    var contentHtml = '';
    if (gearKey === '安全帽') {
      contentHtml = helmetSizeReferenceHtml();
    } else if (gearKey === '雪服') {
      contentHtml = clothingSizeReferenceHtml();
    } else if (gearKey === '雪服帽鏡組') {
      contentHtml = clothingSizeReferenceHtml() +
        '<p class="cs2-size-reference-subtitle">安全帽頭圍對照</p>' + helmetSizeReferenceHtml();
    } else if (gearKey === '滑雪護具') {
      contentHtml = padSizeReferenceHtml();
    }
    if (!contentHtml) return '';
    return '' +
      '<details class="cs2-size-reference">' +
        '<summary>查看尺寸對照表</summary>' +
        '<div class="cs2-size-reference-content">' + contentHtml + '</div>' +
      '</details>';
  }

  /** 尺寸對照表裡的男女對照表（data-gender-table）依當下選的性別動態只顯示對應那組。
   * 呼叫時機、參數跟 wireDependentSizeFields() 一致（同一輪迴圈裡一起呼叫），
   * 沒有 data-gender-table 元素的品項（安全帽、滑雪護具）直接跳過。 */
  function wireSizeReferenceGenderToggle(sizeFieldsRoot, genderSelect) {
    var genderTables = sizeFieldsRoot.querySelectorAll('[data-gender-table]');
    if (!genderTables.length || !genderSelect) return;
    function sync() {
      var gender = genderSelect.value;
      genderTables.forEach(function (el) {
        el.classList.toggle('cs2-gender-table-hidden', gender !== '' && el.getAttribute('data-gender-table') !== gender);
      });
    }
    genderSelect.addEventListener('change', sync);
    sync();
  }

  /** 單一尺寸欄位的 HTML。number/select/select-dependent 三種型別，皆是 GEAR_ITEMS 裡
   * item.sizeFields 的元素。select-dependent 初始 disabled，等 wireDependentSizeFields()
   * 依當下的依賴欄位值動態灌選項。 */
  function renderGearSizeFieldHtml(field) {
    if (field.type === 'number') {
      // 2026-09-05：min/max 優先用欄位自己定義的合理區間（見 GEAR_ITEMS 的 height/
      // weight/shoeSize），沒有定義的號稱數字欄位維持原本的 min="0" 下限。
      var minAttr = (field.min != null) ? field.min : 0;
      var maxAttr = (field.max != null) ? ' max="' + field.max + '"' : '';
      return '' +
        '<div class="gear-size-field" data-gear-size-field data-size-key="' + field.key + '">' +
          '<label class="gear-size-label">' + field.label + (field.unit ? ' (' + field.unit + ')' : '') + '</label>' +
          '<input type="number" inputmode="decimal" step="any" min="' + minAttr + '"' + maxAttr + ' data-gear-size-input placeholder="請輸入">' +
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
   * 控制欄位變動時，重新灌選項、清空目前選擇。dependsOn:'gender' 一律解讀成該學員的
   * 共用性別欄位（genderSelect 參數），不在裝備自己的 .gear-size-fields 裡找——性別
   * 已經提升成學員層級欄位，其他 dependsOn 值則維持原本在同一個 sizeFieldsRoot 裡找。 */
  function wireDependentSizeFields(sizeFieldsRoot, item, genderSelect) {
    (item.sizeFields || []).forEach(function (field) {
      if (field.type !== 'select-dependent') return;
      var controlSelect;
      if (field.dependsOn === 'gender') {
        controlSelect = genderSelect;
      } else {
        var controlWrap = sizeFieldsRoot.querySelector('[data-size-key="' + field.dependsOn + '"]');
        controlSelect = controlWrap && controlWrap.querySelector('[data-gear-size-input]');
      }
      var dependentWrap = sizeFieldsRoot.querySelector('[data-size-key="' + field.key + '"]');
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

  /** 學員層級共用性別欄位的 HTML：固定顯示在該學員分組最上方，不隨裝備勾選狀態展開/收合。 */
  function renderAttendeeGenderFieldHtml() {
    var optionsHtml = '<option value="">請選擇</option>' + GENDER_FIELD.options.map(function (v) {
      return '<option value="' + v + '">' + v + '</option>';
    }).join('');
    return '' +
      '<div class="attendee-shared-gender">' +
        '<label class="gear-size-label">性別</label>' +
        '<select data-attendee-gender-input>' + optionsHtml + '</select>' +
      '</div>';
  }

  /**
   * 渲染裝備加購區塊（學員分組 + gear-item-box 清單，勾選裝備後就地展開結構化尺寸欄位)。
   * 每位學員最上方固定顯示一個共用性別欄位（不隨裝備勾選展開/收合），需要性別的裝備
   * （見 GEAR_KEYS_REQUIRING_GENDER）一律讀這個值，不再各自重複詢問。純函式：只依賴
   * 傳入的 container/options。
   * @param {HTMLElement} container
   * @param {{ attendeeCount: number, skiTypeByAttendee?: Record<number,string> }} options
   * @returns {{
   *   getSelectedGear: () => Array<{attendee:number,key:string,price:number,sizeFields:Array|null,sizeValues:Record<string,string>}>,
   *   getAttendeeGender: (attendee:number) => string,
   * }}
   */
  function renderGearRentalSection(container, options) {
    options = options || {};
    var attendeeCount = options.attendeeCount || 1;
    var skiTypeByAttendee = options.skiTypeByAttendee || {};

    var html = '';
    for (var a = 1; a <= attendeeCount; a++) {
      html += '<div class="attendee-gear-group-box" data-attendee-group data-attendee="' + a + '">' +
        '<p class="attendee-group-title">學員 ' + a + ' 加購選項</p>' +
        renderAttendeeGenderFieldHtml() +
        '<div class="gear-grid">';
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
            renderSizeReferenceDetailsHtml(item.key) +
          '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-attendee-group]').forEach(function (groupBox) {
      var genderSelect = groupBox.querySelector('[data-attendee-gender-input]');
      groupBox.querySelectorAll('[data-gear-item-wrap]').forEach(function (wrap) {
        var item = GEAR_ITEMS.filter(function (g) { return g.key === wrap.getAttribute('data-gear-key'); })[0];
        var sizeFieldsRoot = wrap.querySelector('[data-gear-size-fields]');
        if (item && sizeFieldsRoot) {
          wireDependentSizeFields(sizeFieldsRoot, item, genderSelect);
          wireSizeReferenceGenderToggle(sizeFieldsRoot, genderSelect);
        }
      });
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
      getAttendeeGender: function (attendee) {
        var groupBox = container.querySelector('[data-attendee-group][data-attendee="' + attendee + '"]');
        var genderSelect = groupBox && groupBox.querySelector('[data-attendee-gender-input]');
        return genderSelect ? genderSelect.value : '';
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

  function escHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 送出前確認彈窗——Stage2 區塊內容：直接讀呼叫端傳入的該 line item properties
     （options.stage2Properties，來自 /cart.js，不是重新問一次表單）。「時段(半天專用)」
     跟「備註／其他需求」兩個欄位刻意用「有值才顯示」判斷——半天商品才有時段欄位、
     備註本身也是選填，這個判斷剛好同時滿足「僅半天商品顯示」跟「空值不顯示」兩條規則，
     不需要額外傳一個 isHalfDay 旗標。其餘欄位一律顯示，缺值時顯示「—」而不是整行省略，
     避免舊資料/欄位改名時整個確認畫面看起來像壞掉。 */
  function buildStage2SummaryHtml(properties) {
    properties = properties || {};
    var alwaysRows = [
      ['預約日期', properties['Start']],
      ['滑雪場', properties['雪場區域']],
      ['雪板類型', properties['雪板類型']],
      ['課程分級', properties['課程分級']],
      ['實際參加人數', properties['實際參加人數']],
      ['是否有兒童同行', properties['是否有 6~12 歲兒童？（每組最多接受 1 位兒童同行)']],
      ['語言', properties['語言']],
      ['通訊軟體', properties['通訊軟體']],
      ['通訊帳號／ID', properties['帳號／ID']],
    ];
    var html = alwaysRows.map(function (row) {
      return '<div class="cs2-summary-row"><span class="cs2-summary-label">' + row[0] + '</span><span class="cs2-summary-value">' + escHtml(row[1] || '—') + '</span></div>';
    }).join('');
    var timeSlot = properties['時段(半天專用)'];
    if (timeSlot) {
      html += '<div class="cs2-summary-row"><span class="cs2-summary-label">時段</span><span class="cs2-summary-value">' + escHtml(timeSlot) + '</span></div>';
    }
    var notes = properties['備註／其他需求'];
    if (notes) {
      html += '<div class="cs2-summary-row"><span class="cs2-summary-label">備註</span><span class="cs2-summary-value">' + escHtml(notes) + '</span></div>';
    }
    return html;
  }

  /* 送出前確認彈窗本身：疊加式，appendChild 成 container 的新 sibling，不動原本表單的
     DOM（container 目前只有一個子節點，就是 renderStage2Form 產生的 .cs2-overlay）。
     「返回」只 remove() 這個新增節點，原表單完全沒被碰過；「確認」才呼叫 onConfirm()
     觸發既有的 close()+onSubmit() 送出路徑。z-index 比表單那層 .cs2-overlay 高一階，
     確保一定疊在最上面（不依賴 DOM 順序決定的 stacking 行為，避免未來結構調整意外翻車）。 */
  function showConfirmationOverlay(container, opts) {
    var overlay = document.createElement('div');
    overlay.className = 'cs2-overlay cs2-confirm-overlay';
    overlay.innerHTML =
      '<div class="cs2-backdrop"></div>' +
      '<div class="cs2-panel">' +
        '<h3 class="cs2-title">確認預訂內容</h3>' +
        '<div class="cs2-confirm-section">' +
          '<h4 class="cs2-confirm-section-title">課程資訊</h4>' +
          opts.stage2Html +
        '</div>' +
        '<div class="cs2-confirm-section">' +
          '<h4 class="cs2-confirm-section-title">加購內容</h4>' +
          opts.stage3Html +
        '</div>' +
        '<div class="cs2-total-summary"><span class="cs2-total-label">結帳總額</span><span class="cs2-total-amount">' + opts.totalText + '</span></div>' +
        '<div class="cs2-footer">' +
          '<button type="button" class="cs2-btn-skip" data-cs2-confirm-back>返回修改</button>' +
          '<button type="button" class="cs2-btn-primary" data-cs2-confirm-yes>確認</button>' +
        '</div>' +
      '</div>';
    container.appendChild(overlay);
    overlay.querySelector('[data-cs2-confirm-back]').addEventListener('click', function () {
      overlay.remove();
    });
    overlay.querySelector('[data-cs2-confirm-yes]').addEventListener('click', function () {
      overlay.remove();
      opts.onConfirm();
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
    /* 開發指令規格順序6（2026-08-27 方向性修正）：裝備租賃／住宿加購只在 Stage 2
       「滑雪場」欄位答案為「富良野」時顯示（不是商品標籤），呼叫端
       （cart-stage2-trigger.liquid）已經讀好 line item properties 判斷結果傳進來。
       只用嚴格 === false 判斷「明確不顯示」，
       undefined／true 一律當作顯示——沒有傳這個 option 的未來呼叫端（如果有）維持
       跟改動前一致的行為，不會因為忘記傳這個新 option 就意外把區塊藏起來。
       ⚠️ 刻意只用 CSS 隱藏這兩張卡片，不是不渲染 HTML／不掛 JS 監聽器——兩個 toggle
       預設就是未勾選，隱藏之後使用者不可能點到它們，`gearToggle.checked`／
       `hotelToggle` 自然維持 false，下面 syncSubmitButtonState()／submit handler
       既有的「toggle 沒開＝不列入送出」邏輯完全不用改，風險比另外寫一套「不渲染就要
       同步 guard 每一處讀取」的分支小很多。 */
    var hideGearAndHotel = options.showGearAndHotel === false;
    /* 任務二（2026-08-29）：Stage 2「是否有 6~12 歲兒童同行」答案是「有」時，才顯示這行
       唯讀提示——呼叫端（cart-stage2-trigger.liquid）已經讀好 line item properties
       判斷結果傳進來（測試/正式環境的 property key 不一樣，已個別實測查證，呼叫端統一
       轉成這個布林值，這裡不需要知道底層 key 細節）。嚴格 === true 才顯示，
       undefined／false 都不顯示——沒有兒童同行是常態，預設不顯示比預設顯示更安全。 */
    var hasChildCompanion = options.hasChildCompanion === true;
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
          (hasChildCompanion ? '<div class="cs2-child-notice">同行人員中有兒童</div>' : '') +
          '<div class="dual-track-container">' +
            '<div class="accordion-card' + (hideGearAndHotel ? ' cs2-resort-hidden' : '') + '">' +
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
            '<div class="accordion-card' + (hideGearAndHotel ? ' cs2-resort-hidden' : '') + '">' +
              '<div class="accordion-header">' +
                '<div class="card-info">' +
                  '<h4>專屬特約民宿加購</h4>' +
                  '<p>2026 年 11 月開放預訂・搶先預留官方民宿</p>' +
                '</div>' +
                '<label class="toggle-switch">' +
                  '<input type="checkbox" disabled>' +
                  '<span class="toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="hotel-placeholder-box">' +
                '<span class="hotel-badge">敬請期待</span><br>' +
                '民宿預訂系統建置中，預計 2026 年 11 月上線開放訂購' +
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
      // 裝備打勾狀態影響金額；裝備打勾 + 尺寸欄位（含 select-dependent 的依賴欄位變動）+
      // 學員層級共用性別欄位都要重新檢查送出按鈕能不能點——尺寸/性別都不影響金額，
      // updateTotal 只需要因裝備打勾重跑。
      if (event.target.matches('[data-gear-checkbox]')) {
        syncSubmitButtonState();
        updateTotal();
      } else if (event.target.matches('[data-gear-size-input]') || event.target.matches('[data-attendee-gender-input]')) {
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
       另外，性別是學員層級共用欄位：只要該學員勾了 GEAR_KEYS_REQUIRING_GENDER 裡任一項
       裝備，性別就列為必填，不管實際勾了幾項——避免同一位學員被要求填好幾次，也避免
       同一位學員各裝備間出現互相矛盾的性別值。裝備加租開關關閉時直接視為沒有缺漏/異常
       （跟金額計算/送出邏輯排除已勾裝備的原則一致）。

       2026-09-05（防呆修復）：業主反映單板鞋組的身高/體重/鞋子尺寸原本只檢查「有沒有
       填」，沒有檢查「填的數字合不合理」（例如 0、負數、9999 都能送出）。這裡擴充成
       同時回傳兩種問題：incompleteAttendees（欄位空著）跟 invalidMessages（欄位有填，
       但不是合法數字，或超出 GEAR_ITEMS 定義的 min/max 範圍）——分開回傳是因為兩種
       情況要顯示不同訊息（「尺寸資訊未完成」vs「數值不合理」），不能混在同一句提示裡
       讓客人搞不清楚是沒填還是填錯。只針對 type:'number' 的欄位做範圍檢查，select／
       select-dependent 欄位本來就是從固定選項挑，不會有這個問題。 */
    function findGearSizeIssues() {
      if (!gearToggle.checked) return { incompleteAttendees: [], invalidMessages: [] };
      var incomplete = {};
      var invalidMessages = [];
      var selectedGear = gearControls.getSelectedGear();
      selectedGear.forEach(function (g) {
        if (!g.sizeFields || !g.sizeFields.length) return;
        g.sizeFields.forEach(function (field) {
          var raw = g.sizeValues[field.key];
          if (!raw) { incomplete[g.attendee] = true; return; }
          if (field.type !== 'number') return;
          var num = Number(raw);
          var outOfRange = (field.min != null && num < field.min) || (field.max != null && num > field.max);
          if (isNaN(num) || outOfRange) {
            var rangeText = (field.min != null && field.max != null)
              ? field.min + '~' + field.max + (field.unit || '')
              : '合理範圍';
            invalidMessages.push('學員' + g.attendee + '「' + field.label + '」需介於 ' + rangeText);
          }
        });
      });
      var attendeesNeedingGender = {};
      selectedGear.forEach(function (g) {
        if (GEAR_KEYS_REQUIRING_GENDER.indexOf(g.key) > -1) attendeesNeedingGender[g.attendee] = true;
      });
      Object.keys(attendeesNeedingGender).forEach(function (attendee) {
        if (!gearControls.getAttendeeGender(Number(attendee))) incomplete[attendee] = true;
      });
      return {
        incompleteAttendees: Object.keys(incomplete).map(Number).sort(function (a, b) { return a - b; }),
        invalidMessages: invalidMessages,
      };
    }

    /* 指定教練不需要另外簽同意聲明，只需要「開關打開就必須選一位教練」這個較簡單的檢查；
       裝備尺寸未完成是第三條獨立條件。三條互不相關的 disabled 條件用 || 疊加。 */
    function syncSubmitButtonState() {
      var needsConsent = gearToggle.checked;
      var needsCoach = coachToggle.checked && !coachControls.getSelectedCoach();
      var gearSizeIssues = findGearSizeIssues();
      var needsGearSizes = gearSizeIssues.incompleteAttendees.length > 0 || gearSizeIssues.invalidMessages.length > 0;
      submitBtn.disabled = (needsConsent && !legalCheckbox.checked) || needsCoach || needsGearSizes;
      if (!needsConsent || legalCheckbox.checked) legalWarning.hidden = true;
      if (!needsCoach) coachWarning.hidden = true;
      if (needsGearSizes) {
        // 缺漏（沒填）跟不合理（填了但超出範圍）兩種訊息分開組，客人才看得出來是要
        // 補填還是要改數字。兩種都有時兩段訊息一起顯示。
        var messages = [];
        if (gearSizeIssues.incompleteAttendees.length > 0) {
          messages.push('學員' + gearSizeIssues.incompleteAttendees.join('、') + ' 尺寸資訊未完成');
        }
        messages = messages.concat(gearSizeIssues.invalidMessages);
        gearSizeWarning.textContent = messages.join('；');
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

    /* 送出前確認彈窗——Stage3 區塊內容：按學員分組列出「客人有勾選」的裝備（未勾選的
       完全不出現），同一位學員的所有裝備收在一起，不是先列裝備A的所有學員再列裝備B。
       性別只在該學員有勾到 GEAR_KEYS_REQUIRING_GENDER 任一項裝備時才顯示那一行，
       直接讀 gearControls.getAttendeeGender()（表單當下已選定的值，不重新觸發任何
       change 邏輯）。「已同意租賃聲明」這行文字固定顯示（法律證據用途，不受裝備/教練
       有沒有勾選影響）——這是業主拍板的最終規格，不是這裡自己判斷要不要顯示。 */
    function buildStage3SummaryHtml(selectedGear, selectedCoach) {
      var byAttendee = {};
      selectedGear.forEach(function (g) {
        if (!byAttendee[g.attendee]) byAttendee[g.attendee] = [];
        byAttendee[g.attendee].push(g);
      });
      var attendeeNumbers = Object.keys(byAttendee).map(Number).sort(function (a, b) { return a - b; });
      var html = '';
      attendeeNumbers.forEach(function (a) {
        var items = byAttendee[a];
        var needsGender = items.some(function (g) { return GEAR_KEYS_REQUIRING_GENDER.indexOf(g.key) > -1; });
        var genderValue = needsGender ? gearControls.getAttendeeGender(a) : '';
        html += '<div class="cs2-summary-attendee">';
        html += '<p class="cs2-summary-attendee-title">學員 ' + a + '</p>';
        if (needsGender && genderValue) {
          html += '<div class="cs2-summary-row"><span class="cs2-summary-label">性別</span><span class="cs2-summary-value">' + escHtml(genderValue) + '</span></div>';
        }
        html += '<ul class="cs2-summary-gear-list">';
        items.forEach(function (g) {
          html += '<li><span class="cs2-summary-gear-name">' + escHtml(g.key) + '</span>';
          if (g.sizeFields && g.sizeFields.length) {
            var parts = g.sizeFields.map(function (field) {
              var value = g.sizeValues[field.key];
              return value ? (field.label + '：' + value + (field.unit || '')) : null;
            }).filter(Boolean);
            if (parts.length) html += '<span class="cs2-summary-gear-sizes">' + escHtml(parts.join('、')) + '</span>';
          }
          html += '</li>';
        });
        html += '</ul></div>';
      });
      if (selectedCoach) {
        html += '<div class="cs2-summary-row"><span class="cs2-summary-label">指定教練</span><span class="cs2-summary-value">' + escHtml(selectedCoach) + '</span></div>';
      }
      html += '<div class="cs2-summary-consent">已同意租賃聲明</div>';
      return html;
    }

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
      var gearSizeIssues = findGearSizeIssues();
      if (gearSizeIssues.incompleteAttendees.length > 0 || gearSizeIssues.invalidMessages.length > 0) {
        var messages = [];
        if (gearSizeIssues.incompleteAttendees.length > 0) {
          messages.push('學員' + gearSizeIssues.incompleteAttendees.join('、') + ' 尺寸資訊未完成');
        }
        messages = messages.concat(gearSizeIssues.invalidMessages);
        gearSizeWarning.textContent = messages.join('；');
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
      // 性別是學員層級共用欄位，只寫一筆 學員N_性別，不在每個裝備項目底下各自重複寫一份
      // ——避免資料矛盾，也避免同一位學員的性別散落在好幾個 property 裡。
      var attendeesNeedingGender = {};
      selectedGear.forEach(function (g) {
        if (GEAR_KEYS_REQUIRING_GENDER.indexOf(g.key) > -1) attendeesNeedingGender[g.attendee] = true;
      });
      Object.keys(attendeesNeedingGender).forEach(function (attendee) {
        var genderValue = gearControls.getAttendeeGender(Number(attendee));
        if (genderValue) properties['學員' + attendee + '_性別'] = genderValue;
      });
      var selectedCoach = null;
      if (coachToggle.checked) {
        selectedCoach = coachControls.getSelectedCoach();
        if (selectedCoach) properties['指定教練'] = selectedCoach;
      }
      // 2026-08-29：GEAR_ITEMS 六項裝備額外算出真實 variant 清單，跟
      // properties 一起交給呼叫端（cart-stage2-trigger.liquid）——properties 繼續走
      // 原本的 writeCourseFormDataToCart()，這份清單另外呼叫 /cart/add.js，兩件事
      // 並行、互不影響，不是二選一。尺寸資訊不論商品有沒有對應 variant，一律照舊
      // 寫入 properties 文字說明（見 buildRealGearCartItems 旁的說明）。
      var realGearCartItems = buildRealGearCartItems(selectedGear, gearControls);
      // 2026-08-31：指定教練跟哪一位教練無關（三選一價格一致），固定加入
      // COACH_VARIANT_ID 這一顆 variant，quantity 固定 1（整組課程層級單選，不是
      // 每學員各自一份，不受 selectedGear 的 quantity 疊加邏輯影響）。
      if (selectedCoach) realGearCartItems.push({ id: COACH_VARIANT_ID, quantity: 1 });
      // 疊加式確認彈窗：驗證通過後不直接送出，改成蓋一層彙整畫面讓客人核對。
      // 「確認」才觸發既有 close()+onSubmit() 送出路徑；「返回」只移除疊加層
      // （見 showConfirmationOverlay），原表單這裡完全不會被 close() 清空。
      showConfirmationOverlay(container, {
        stage2Html: buildStage2SummaryHtml(options.stage2Properties),
        stage3Html: buildStage3SummaryHtml(selectedGear, selectedCoach),
        totalText: totalAmountEl.textContent,
        onConfirm: function () {
          close();
          if (options.onSubmit) options.onSubmit(properties, realGearCartItems);
        },
      });
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
      .then(function (r) {
        // 2026-09-01（緊急修復）：原本沒檢查 response.ok 就直接 .json()，非 200 回應
        // （例如暫時性錯誤、速率限制）大多不是合法 JSON，會在這裡丟一個難懂的
        // SyntaxError，而且呼叫端（cart-stage2-trigger.liquid 的 onSubmit）原本用
        // Promise.all 平行送出、沒有 .catch()，這個例外會變成無聲失敗——畫面上完全
        // 看不出來，購物車卻少了資料。改成明確擋下非 200 回應丟出可讀的錯誤，讓呼叫端
        // 的 catch 有機會處理（顯示錯誤、避免誤標記完成）。
        if (!r.ok) throw new Error('[CourseStage2] /cart/change.js 回應非 200（status ' + r.status + '）');
        return r.json();
      })
      .then(function (updatedCart) {
        /* 待辦 27 修復：改用 events.js 的 CartUpdateEvent，而不是裸的 CustomEvent。
           裸 CustomEvent 沒帶 detail（規格上會是 null），主題原生購物車元件（例如
           component-cart-items.js 的 #handleCartUpdate）讀 event.detail.data.sections
           時會直接對 null 取屬性丟例外，連它自己準備好的降級路徑
           （sectionRenderer.renderSection() 整段重新抓、不需要我們提供 sections）都跑不到，
           導致購物車頁面畫面停留在寫入前的舊內容，要手動整理頁面才會看到新資料——資料本身
           其實已經正確寫入，純粹是畫面沒收到通知。這裡沒有在 /cart/change.js 請求裡額外要
           sections（範圍不擴大），detail.data.sections 保持沒有，降級路徑會自動接手重新
           抓取這個區塊的最新 HTML。 */
        document.dispatchEvent(new CartUpdateEvent(updatedCart, 'course-stage2-module', { source: 'course-stage2-module' }));
        return updatedCart;
      });
  }

  /**
   * 2026-08-29：把安全帽／雪鏡／滑雪護具的真實 variant 加入購物車，成為各自獨立、有
   * 實際價格的 line item——這是這次緊急修復的核心：之前加購項目只寫 properties，
   * Shopify 從未真正收過這筆錢。呼叫 /cart/add.js（不是 /cart/change.js），因為這是
   * 「新增」而不是「修改既有項目」。items 為空陣列（例如這次沒勾這三項任何一項）時
   * 直接跳過，不打空的 /cart/add.js（Shopify 對空 items 陣列會回錯誤，不是靜默成功）。
   * @param {Array<{id:number,quantity:number}>} items - buildRealGearCartItems() 的結果
   * @returns {Promise<object|null>} 更新後的 cart 物件，items 為空時回傳 null
   */
  function addRealGearLineItems(items) {
    if (!items || !items.length) return Promise.resolve(null);
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items }),
    })
      .then(function (r) {
        // 2026-09-01（緊急修復）：同 writeCourseFormDataToCart() 的理由——非 200 回應
        // 不能直接當成功處理，否則呼叫端完全不會知道這批加購項目（教練／裝備共用
        // 這一個函式）其實沒有真的加進購物車。
        if (!r.ok) throw new Error('[CourseStage2] /cart/add.js 回應非 200（status ' + r.status + '）');
        return r.json();
      })
      // /cart/add.js 只回傳「這次新加的項目」（{items:[...]}），不是完整購物車物件，
      // 跟 CartUpdateEvent 預期收到「完整購物車」的規格對不上——沿用
      // writeCourseFormDataToCart() 同一招，另外打一次 /cart.js 拿完整、正確的購物車
      // 狀態再派發事件，不要直接把 /cart/add.js 的回應塞進去。
      .then(function () { return fetch('/cart.js'); })
      .then(function (r) { return r.json(); })
      .then(function (updatedCart) {
        document.dispatchEvent(new CartUpdateEvent(updatedCart, 'course-stage2-module', { source: 'course-stage2-module' }));
        return updatedCart;
      });
  }

  window.CourseStage2Module = {
    renderStage2Form: renderStage2Form,
    addRealGearLineItems: addRealGearLineItems,
    renderGearRentalSection: renderGearRentalSection,
    renderCoachSelectSection: renderCoachSelectSection,
    writeCourseFormDataToCart: writeCourseFormDataToCart,
    GEAR_ITEMS: GEAR_ITEMS,
    COACH_ITEMS: COACH_ITEMS,
    COACH_PRICE: COACH_PRICE,
  };
})();
