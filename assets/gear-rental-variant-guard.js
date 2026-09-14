/**
 * Horizon's native variant picker always pre-selects the first available
 * value in every option dimension, and the Add to Cart button is only ever
 * disabled/enabled based on that resolved variant's inventory availability
 * (see product-form.js #onVariantUpdate) - never based on whether the
 * customer has actually clicked anything. For the equipment-rental products
 * this let customers submit an order without ever choosing a size.
 *
 * On top of that, Shopify resolves a full variant from a *partial*
 * selection by silently filling in the first available value for every
 * dimension the customer hasn't touched yet, and the picker's morphed HTML
 * re-renders those fallback values as "checked" too - so picking just one
 * dimension makes the picker look like every other dimension was chosen too.
 * This script tracks which dimensions the customer has genuinely clicked (by
 * fieldset index, via native 'change' events - which only fire on real
 * interaction, never from the morph rewriting `checked`), re-blanks any
 * dimension that isn't genuinely picked after every server update, and keeps
 * Add to Cart (both the main button and the sticky bar's proxy button)
 * disabled until every dimension that matters has a real, user-made
 * selection.
 *
 * Every fieldset is re-resolved by `data-fieldset-index` on every use rather
 * than cached as a long-lived DOM reference: morph() may patch a fieldset in
 * place, but it can also replace or (for any node it doesn't recognize at
 * all) outright remove one, so nothing here trusts a node reference to stay
 * attached across a fetch/morph cycle.
 *
 * 2026-09-11 (gender-pair merge): 裝備租賃裡「雪服」「雪服帽鏡組」兩項各自有
 * 「女款尺寸」「男款尺寸」兩個並列的原生 option，但客人只會是其中一種性別
 * ——原本「每個維度都要選滿才解鎖」的邏輯套在這種互斥維度上，會強迫客人選一個
 * 用不到的性別尺碼。這裡在偵測到「一個 legend 含女、另一個含男、其餘 0 個以上
 * 是兩者都不含的獨立維度（例如安全帽）」這個形狀時，額外插入一個自訂的性別切換
 * UI：客人選性別後只顯示對應那排原生尺寸選項，另一排整個隱藏，背後自動用該排
 * 第一個尺碼值當佔位（跟 Stage3 查表 CLOTHING_VARIANT_ID_BY_GENDER_SIZE／
 * FULL_SET_BUNDLE_VARIANT_ID_BY_KEY 已經在用的佔位慣例一致：女佔位固定用列表
 * 第一個值、男佔位固定用列表第一個值），確保這裡送出的 variant id 跟 Stage3
 * 查表算出來的完全對得上，不需要另外改查表。沒有偵測到這個形狀的商品（例如只有
 * 一個尺寸維度的安全帽、或維度結構不是「剛好一女一男加零到多個獨立維度」）
 * 完全走原本「每個維度都要選滿」的邏輯，不受影響。
 *
 * Scoped to the main product page's own variant picker only
 * (data-template-product-match="true"), so quick-add cards and product
 * recommendation widgets elsewhere on the page are never touched.
 */
(function () {
  function setupPicker(picker) {
    var productId = picker.dataset.productId;

    // Excludes the injected gender-toggle control (see below) - that one is
    // a UI-only control, not a real product option dimension.
    function getFieldsets() {
      return Array.prototype.slice.call(
        picker.querySelectorAll('fieldset.variant-option:not([data-gear-gender-toggle])')
      );
    }

    var initialFieldsets = getFieldsets();
    if (initialFieldsets.length === 0) return;

    var section = picker.closest('.shopify-section');
    var form = section && section.querySelector('product-form-component');
    var mainButton = form && form.querySelector('[ref="addToCartButton"]');
    if (!mainButton) return;

    var htmlForm = form.querySelector('form');

    var stickyButton = document.querySelector(
      'sticky-add-to-cart[data-product-id="' + productId + '"] [ref="addToCartButton"]'
    );

    // Fieldset indices the customer has genuinely clicked at least once.
    var userSelectedIndexes = {};

    // Set around our own synthetic .click() calls (placeholder auto-fill) so
    // the 'change' listener below doesn't mistake them for a genuine pick.
    var isAutoFilling = false;

    function blankFieldset(fieldset) {
      var checkedInputs = fieldset.querySelectorAll('input:checked');
      checkedInputs.forEach(function (input) {
        input.checked = false;
        input.dataset.currentChecked = 'false';
      });
    }

    function genuinelySelected(fieldset) {
      return Object.prototype.hasOwnProperty.call(userSelectedIndexes, fieldset.dataset.fieldsetIndex);
    }

    // --- Gender-pair detection (indexes only - never cache the nodes) ---
    var femaleFieldsetIndex = null;
    var maleFieldsetIndex = null;
    // { fieldsetIndex: legendText } for dimensions unrelated to gender (e.g.
    // full-set-bundle's helmet size) - used below to also report those in
    // line item properties, keyed by their own legend text.
    var otherFieldsetLegends = {};
    initialFieldsets.forEach(function (fieldset) {
      var legend = fieldset.querySelector('legend');
      var text = legend ? legend.textContent.trim() : '';
      var hasFemale = text.indexOf('女') > -1;
      var hasMale = text.indexOf('男') > -1;
      if (hasFemale && !hasMale && femaleFieldsetIndex === null) {
        femaleFieldsetIndex = fieldset.dataset.fieldsetIndex;
      } else if (hasMale && !hasFemale && maleFieldsetIndex === null) {
        maleFieldsetIndex = fieldset.dataset.fieldsetIndex;
      } else {
        otherFieldsetLegends[fieldset.dataset.fieldsetIndex] = text;
      }
    });
    var otherCount = Object.keys(otherFieldsetLegends).length;
    var hasGenderPair =
      femaleFieldsetIndex !== null && maleFieldsetIndex !== null && otherCount === initialFieldsets.length - 2;

    var currentGender = null; // '女' | '男' | null

    function resolveFieldset(fieldsetIndex) {
      if (fieldsetIndex === null) return null;
      return getFieldsets().filter(function (f) {
        return f.dataset.fieldsetIndex === fieldsetIndex;
      })[0] || null;
    }

    function isGenderedFieldset(fieldset) {
      var idx = fieldset.dataset.fieldsetIndex;
      return idx === femaleFieldsetIndex || idx === maleFieldsetIndex;
    }

    function visibleGenderedIndex() {
      if (!currentGender) return null;
      return currentGender === '女' ? femaleFieldsetIndex : maleFieldsetIndex;
    }

    function hiddenGenderedIndex() {
      if (!currentGender) return null;
      return currentGender === '女' ? maleFieldsetIndex : femaleFieldsetIndex;
    }

    // Forces a not-yet-hidden fieldset's first value checked, as the
    // placeholder for "the gender the customer isn't using". Matches the
    // Stage3 lookup tables' own placeholder convention (first value in that
    // dimension's option list) so the resulting variant id lines up exactly.
    function ensurePlaceholder(fieldset) {
      var radios = fieldset.querySelectorAll('input');
      var placeholder = radios[0];
      if (!placeholder || placeholder.checked) return;
      isAutoFilling = true;
      placeholder.click();
      isAutoFilling = false;
    }

    // Plain `hidden` isn't enough here: .variant-option carries its own
    // `display: flex` from base.css with higher specificity than the
    // `[hidden]` UA rule, so an inline `display` override is required to
    // actually take the fieldset out of the layout.
    function setFieldsetVisible(fieldset, isVisible) {
      fieldset.hidden = !isVisible;
      fieldset.style.display = isVisible ? '' : 'none';
    }

    function applyGenderVisibility() {
      if (!hasGenderPair) return;
      var visibleIdx = visibleGenderedIndex();
      [femaleFieldsetIndex, maleFieldsetIndex].forEach(function (idx) {
        var fieldset = resolveFieldset(idx);
        if (fieldset) setFieldsetVisible(fieldset, idx === visibleIdx);
      });
    }

    // --- Line item properties for the real selection -------------------
    // For gender-pair products, the submitted variant only encodes the
    // *visible* dimension correctly - the hidden one holds a fixed
    // placeholder value - so the cart's own variant title (e.g. "S / XL")
    // is actively misleading about what the customer actually picked. For
    // every other multi-dimension product here (helmet, pads) there's no
    // placeholder problem, but the native variant summary is still hidden
    // in the cart template (see snippets/cart-products.liquid) for a
    // consistent look, so it still needs *some* readable label in its
    // place. Either way, these hidden fields mirror Stage3's existing
    // convention of writing the real selection into line item properties.
    // Appended directly to the <form> (a sibling of the hidden `id` input,
    // not inside any of the specific sub-elements product-form.js morphs on
    // variant change), so they're untouched by those targeted morphs and
    // only need their `value` kept in sync.
    var propertyInputs = {};

    function buildPropertyInput(key) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'properties[' + key + ']';
      htmlForm.appendChild(input);
      return input;
    }

    if (htmlForm) {
      if (hasGenderPair) {
        propertyInputs.gender = buildPropertyInput('性別');
        propertyInputs.size = buildPropertyInput('尺碼');
      }
      // Gender-pair products report their non-gendered dimension (e.g.
      // full-set-bundle's helmet size) here too; non-gender-pair products
      // (安全帽's 頭圍尺寸, 滑雪護具's 護臀尺寸/護膝尺寸) report every one of
      // their dimensions here, keyed by that dimension's own legend text -
      // already a concise, customer-facing label, no extra naming needed.
      Object.keys(otherFieldsetLegends).forEach(function (idx) {
        propertyInputs[idx] = buildPropertyInput(otherFieldsetLegends[idx]);
      });
    }

    function syncProperties() {
      if (!htmlForm) return;

      if (hasGenderPair) {
        if (propertyInputs.gender) propertyInputs.gender.value = currentGender || '';

        if (propertyInputs.size) {
          var visible = resolveFieldset(visibleGenderedIndex());
          var checkedSize = visible && visible.querySelector('input:checked');
          propertyInputs.size.value = checkedSize ? checkedSize.value : '';
        }
      }

      Object.keys(otherFieldsetLegends).forEach(function (idx) {
        var input = propertyInputs[idx];
        if (!input) return;
        var fieldset = resolveFieldset(idx);
        var checked = fieldset && fieldset.querySelector('input:checked');
        input.value = checked ? checked.value : '';
      });
    }

    function selectGender(gender) {
      if (currentGender === gender) return;
      currentGender = gender;

      var visible = resolveFieldset(visibleGenderedIndex());
      var hidden = resolveFieldset(hiddenGenderedIndex());

      // The newly-visible dimension needs the customer's own, genuine pick -
      // clear any stale selection (including a prior placeholder auto-fill).
      if (visible) {
        delete userSelectedIndexes[visible.dataset.fieldsetIndex];
        blankFieldset(visible);
      }

      // The newly-hidden dimension isn't the customer's concern - keep it
      // filled with its placeholder value so a real variant still resolves.
      if (hidden) {
        delete userSelectedIndexes[hidden.dataset.fieldsetIndex];
        ensurePlaceholder(hidden);
      }

      applyGenderVisibility();
      updateGenderToggleVisual();
      syncButtons();
    }

    // --- Gender toggle UI (custom control, not a real product option) -
    var genderToggle = null;
    var genderInputs = {};

    function updateGenderToggleVisual() {
      if (!genderToggle) return;
      ['女', '男'].forEach(function (gender) {
        var input = genderInputs[gender];
        if (input) input.checked = currentGender === gender;
      });
    }

    // morph() diffs the *entire* <variant-picker> subtree against fresh
    // server HTML on every fetch and removes any node with no counterpart
    // there - including our injected toggle, on the very next update after
    // it's inserted. Re-running this (idempotent - inserting a node that's
    // already in the right place is a no-op) after every 'variant:update'
    // heals that instead of fighting morph() directly.
    function positionGenderToggle() {
      if (!genderToggle) return;
      var female = resolveFieldset(femaleFieldsetIndex);
      var male = resolveFieldset(maleFieldsetIndex);
      if (!female || !male) return;
      var firstGendered =
        female.compareDocumentPosition(male) & Node.DOCUMENT_POSITION_FOLLOWING ? female : male;
      firstGendered.parentNode.insertBefore(genderToggle, firstGendered);
    }

    function buildGenderToggle() {
      var reference = resolveFieldset(femaleFieldsetIndex);
      // A <div> here, not <fieldset> - Shopify's own variant-picker.js reads
      // `this.querySelectorAll('fieldset input:checked')` across the WHOLE
      // <variant-picker> to resolve the selected variant, with no filtering
      // for "is this a real product option". A <fieldset> toggle got swept
      // into that query, and since our radios carry no data-option-value-id,
      // it threw ("No option value ID found") inside variantChanged() and
      // silently broke the fetch/morph cycle for every subsequent real pick.
      // A <div> is invisible to that selector while keeping the exact same
      // classes for identical styling (see the CSS companion rule in
      // sections/product-information.liquid for the div variant of the
      // pill-hiding rule).
      var toggle = document.createElement('div');
      toggle.className = reference.className;
      toggle.setAttribute('data-gear-gender-toggle', '');

      var legend = document.createElement('legend');
      legend.textContent = '性別';
      toggle.appendChild(legend);

      var groupName = 'gear-gender-toggle-' + (productId || Math.random().toString(36).slice(2));

      ['女', '男'].forEach(function (gender) {
        var label = document.createElement('label');
        label.className = 'variant-option__button-label';

        var input = document.createElement('input');
        input.type = 'radio';
        input.name = groupName;
        input.value = gender;

        var pill = document.createElement('span');
        pill.className = 'variant-option__button-label__pill';
        pill.setAttribute('data-key', 'variant-option-pill');

        var text = document.createElement('span');
        text.className = 'variant-option__button-label__text';
        text.textContent = gender + '款';

        label.appendChild(input);
        label.appendChild(pill);
        label.appendChild(text);
        toggle.appendChild(label);

        genderInputs[gender] = input;

        input.addEventListener('change', function () {
          selectGender(gender);
        });
      });

      genderToggle = toggle;
      // Insert right before whichever gendered fieldset comes first in the
      // DOM, so it visually sits where that fieldset used to start.
      positionGenderToggle();
    }

    if (hasGenderPair) {
      buildGenderToggle();
      setFieldsetVisible(resolveFieldset(femaleFieldsetIndex), false);
      setFieldsetVisible(resolveFieldset(maleFieldsetIndex), false);
    }

    // --- Readiness / button state --------------------------------------
    function allDimensionsSelected() {
      var fieldsets = getFieldsets();
      if (fieldsets.length === 0) return false;

      var independentOk = fieldsets
        .filter(function (f) {
          return !isGenderedFieldset(f);
        })
        .every(genuinelySelected);

      if (!hasGenderPair) {
        return fieldsets.every(genuinelySelected);
      }

      if (!currentGender) return false;
      var visible = resolveFieldset(visibleGenderedIndex());
      return independentOk && !!visible && genuinelySelected(visible);
    }

    function syncButtons() {
      var ready = allDimensionsSelected();
      mainButton.disabled = !ready;
      if (stickyButton) stickyButton.disabled = !ready;
      syncProperties();
    }

    // Clear the server-rendered default selection on every real dimension
    // (the gendered pair is already forced hidden+blank above, if present).
    initialFieldsets.forEach(function (fieldset) {
      if (!isGenderedFieldset(fieldset)) blankFieldset(fieldset);
    });

    syncButtons();

    // A native 'change' event only ever fires from real user interaction (or
    // our own guarded synthetic clicks) - never when morph() rewrites the
    // `checked` property/attribute directly.
    picker.addEventListener('change', function (event) {
      var fieldset = event.target && event.target.closest && event.target.closest('fieldset.variant-option');
      if (fieldset && !fieldset.hasAttribute('data-gear-gender-toggle') && !isAutoFilling) {
        userSelectedIndexes[fieldset.dataset.fieldsetIndex] = true;
      }
      syncButtons();
    });

    // After every server-driven update, undo Shopify's silent fallback
    // selection on any dimension the customer hasn't actually picked yet,
    // keep the hidden gendered dimension pinned to its placeholder, re-heal
    // the toggle's position, and re-assert the real button state. Listening
    // on document guarantees this runs after product-form.js's own
    // section-level VariantUpdateEvent handler, since both sit on the bubble
    // path of the same event and a document listener always fires last.
    document.addEventListener('variant:update', function (event) {
      if (event.detail && event.detail.data && event.detail.data.productId !== productId) return;

      var visibleIdx = hasGenderPair ? visibleGenderedIndex() : null;

      getFieldsets().forEach(function (fieldset) {
        if (isGenderedFieldset(fieldset)) {
          if (!hasGenderPair) return;
          if (!currentGender) {
            blankFieldset(fieldset);
          } else if (fieldset.dataset.fieldsetIndex === visibleIdx) {
            if (!genuinelySelected(fieldset)) blankFieldset(fieldset);
          } else {
            ensurePlaceholder(fieldset);
          }
        } else if (!genuinelySelected(fieldset)) {
          blankFieldset(fieldset);
        }
      });

      applyGenderVisibility();
      positionGenderToggle();
      syncButtons();
    });
  }

  /**
   * gear-rent-sboard-boots（單板鞋組）只有單一 variant，整個頁面完全不會渲染
   * <variant-picker>，setupPicker() 從來沒機會對它跑——但業主仍需要身高／體重／
   * 鞋子尺寸這三個數字才知道要準備多長的板、多大的鞋，比照 Stage3 加購表單裡
   * 單板鞋組已經在用的同一組欄位跟同一組合理區間（assets/course-stage2-module.js
   * 的 GEAR_ITEMS，身高 100~220cm／體重 20~150kg／鞋子尺寸 15~35cm，這裡刻意
   * 沿用同一組數字，不重新定義一套，確保兩邊標準一致）。這個商品沒有 variant
   * 可選，這三個欄位純粹透過 line item properties 送出，不影響送出的 variant id。
   * 也因為沒有 variant-picker，這個頁面上完全不會觸發任何 fetch/morph 循環，
   * 插入的欄位不會有 gender-pair 那套邏輯要處理的「morph 移除節點」風險。
   *
   * 用網址路徑（商品 handle）判斷是不是這個商品，不是用「有沒有 variant-picker」
   * 這個 DOM 特徵來判斷——同一個模板下的其他 4 個商品理論上都有 variant-picker，
   * 但這裡还是選最明確的訊號（商品本身），避免未來模板結構變化時誤判。
   */
  function setupSboardBootsFields() {
    if (window.location.pathname.indexOf('gear-rent-sboard-boots') === -1) return;
    if (document.querySelector('variant-picker')) return;

    var form = document.querySelector('product-form-component');
    var mainButton = form && form.querySelector('[ref="addToCartButton"]');
    var htmlForm = form && form.querySelector('form');
    var productFormButtons = htmlForm && htmlForm.querySelector('.product-form-buttons');
    if (!mainButton || !htmlForm || !productFormButtons) return;

    var productId = form.dataset.productId;
    var stickyButton = document.querySelector(
      'sticky-add-to-cart[data-product-id="' + productId + '"] [ref="addToCartButton"]'
    );

    // Same keys, units and min/max as Stage3's GEAR_ITEMS entry for 單板鞋組 -
    // deliberately kept in sync so a customer sees the same acceptable range
    // whichever path (this page or Stage3's add-on flow) they book through.
    var FIELDS = [
      { key: '身高', unit: 'cm', min: 100, max: 220 },
      { key: '體重', unit: 'kg', min: 20, max: 150 },
      { key: '鞋子尺寸', unit: 'cm', min: 15, max: 35 },
    ];

    injectSboardBootsStylesOnce();

    var container = document.createElement('div');
    container.className = 'gear-sboard-boots-fields';

    var warning = document.createElement('p');
    warning.className = 'gear-sboard-boots-fields__warning';
    warning.hidden = true;

    var entries = FIELDS.map(function (field) {
      var fieldId = 'SboardBoots-' + field.key + '-' + (productId || '');

      var wrapper = document.createElement('div');
      wrapper.className = 'gear-sboard-boots-fields__field';

      var label = document.createElement('label');
      label.className = 'gear-sboard-boots-fields__label';
      label.setAttribute('for', fieldId);
      label.textContent = field.key + '(' + field.unit + ')';

      var fieldBox = document.createElement('div');
      fieldBox.className = 'field';

      var input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'decimal';
      input.step = 'any';
      input.id = fieldId;
      input.className = 'field__input';
      input.name = 'properties[' + field.key + '(' + field.unit + ')]';
      input.min = String(field.min);
      input.max = String(field.max);
      input.required = true;
      input.placeholder = field.min + '~' + field.max;

      fieldBox.appendChild(input);
      wrapper.appendChild(label);
      wrapper.appendChild(fieldBox);
      container.appendChild(wrapper);

      return { field: field, input: input };
    });

    container.appendChild(warning);
    htmlForm.insertBefore(container, productFormButtons);

    function fieldValid(entry) {
      var raw = entry.input.value.trim();
      if (!raw) return false;
      var num = Number(raw);
      if (isNaN(num)) return false;
      return num >= entry.field.min && num <= entry.field.max;
    }

    function sync() {
      var outOfRangeMessages = [];
      entries.forEach(function (entry) {
        var raw = entry.input.value.trim();
        if (!raw) return; // empty just keeps the button disabled, no need to nag yet
        if (!fieldValid(entry)) {
          outOfRangeMessages.push(
            entry.field.key + '需介於 ' + entry.field.min + '~' + entry.field.max + entry.field.unit
          );
        }
      });

      var ready = entries.every(fieldValid);
      mainButton.disabled = !ready;
      if (stickyButton) stickyButton.disabled = !ready;

      if (outOfRangeMessages.length > 0) {
        warning.textContent = outOfRangeMessages.join('；');
        warning.hidden = false;
      } else {
        warning.hidden = true;
      }
    }

    entries.forEach(function (entry) {
      entry.input.addEventListener('input', sync);
    });

    sync();
  }

  /**
   * 需求3（2026-09-14）：業主要求「查看尺寸對照表」從商品描述文字之後移到
   * variant-picker（尺寸選單）上方，讓客人先看懂尺寸區間、再選尺寸。這張表格
   * 是 body_html（Admin 商品描述）內容的一部分，CC 沒有 body_html 寫入權限，
   * 沒辦法直接搬動 Admin 端內容順序——改用 DOM 搬移：伺服器渲染出來的
   * <details><summary>查看尺寸對照表</summary>...</details> 本來就在商品描述
   * 區塊（rte-formatter）裡，頁面載入後直接把這個節點整個搬到 variant-picker
   * 前面，商品描述本文（rte-formatter 剩下的段落）留在原位不動。只搬移既有
   * DOM 節點本身，不複製/改寫任何文字內容，Admin 端 body_html 完全沒被動到。
   * 單板鞋組（gear-rent-sboard-boots）沒有這張表（尺寸改用身高/體重/鞋碼數字
   * 欄位呈現）、也沒有 variant-picker，兩個 guard 都會讓它直接跳過。
   */
  function moveSizeChartAboveVariantPicker() {
    var variantPicker = document.querySelector('variant-picker[data-template-product-match="true"]');
    if (!variantPicker || !variantPicker.parentNode) return;

    var summary = Array.prototype.filter
      .call(document.querySelectorAll('summary'), function (el) {
        return el.textContent.indexOf('尺寸對照表') > -1;
      })[0];
    var details = summary && summary.closest('details');
    if (!details) return;

    variantPicker.parentNode.insertBefore(details, variantPicker);
  }

  function injectSboardBootsStylesOnce() {
    if (document.getElementById('gear-sboard-boots-fields-style')) return;
    var style = document.createElement('style');
    style.id = 'gear-sboard-boots-fields-style';
    style.textContent =
      '.gear-sboard-boots-fields{display:flex;flex-direction:column;gap:var(--gap-sm, 12px);margin-block-end:var(--margin-md, 16px);}' +
      '.gear-sboard-boots-fields__label{display:block;font-size:var(--font-paragraph--size, 14px);color:rgb(var(--color-foreground-rgb, 26,46,74) / var(--opacity-80, 0.8));margin-block-end:4px;}' +
      '.gear-sboard-boots-fields__warning{color:var(--color-error, #c0392b);font-size:var(--font-paragraph-small--size, 13px);margin:0;}';
    document.head.appendChild(style);
  }

  function init() {
    document.querySelectorAll('variant-picker[data-template-product-match="true"]').forEach(setupPicker);
    setupSboardBootsFields();
    moveSizeChartAboveVariantPicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
