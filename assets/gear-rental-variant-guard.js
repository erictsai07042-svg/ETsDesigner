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
 * dimension (e.g. jacket size) makes the picker look like the other
 * dimension (e.g. pants size) was chosen as well. This script tracks which
 * dimensions the customer has genuinely clicked (by fieldset index, via
 * native 'change' events - which only fire on real interaction, never from
 * the morph rewriting `checked`), re-blanks any dimension that isn't
 * genuinely picked after every server update, and keeps Add to Cart (both
 * the main button and the sticky bar's proxy button) disabled until every
 * dimension has a real, user-made selection.
 *
 * Scoped to the main product page's own variant picker only
 * (data-template-product-match="true"), so quick-add cards and product
 * recommendation widgets elsewhere on the page are never touched.
 */
(function () {
  function setupPicker(picker) {
    var productId = picker.dataset.productId;

    function getFieldsets() {
      return Array.prototype.slice.call(picker.querySelectorAll('fieldset.variant-option'));
    }

    var initialFieldsets = getFieldsets();
    if (initialFieldsets.length === 0) return;

    var section = picker.closest('.shopify-section');
    var form = section && section.querySelector('product-form-component');
    var mainButton = form && form.querySelector('[ref="addToCartButton"]');
    if (!mainButton) return;

    var stickyButton = document.querySelector(
      'sticky-add-to-cart[data-product-id="' + productId + '"] [ref="addToCartButton"]'
    );

    // Fieldset indices the customer has genuinely clicked at least once.
    // Keyed by data-fieldset-index (stable across re-renders) rather than
    // DOM node identity, since morph() may replace fieldset nodes.
    var userSelectedIndexes = {};

    function blankFieldset(fieldset) {
      var checkedInputs = fieldset.querySelectorAll('input:checked');
      checkedInputs.forEach(function (input) {
        input.checked = false;
        input.dataset.currentChecked = 'false';
      });
    }

    // Clear the server-rendered default selection.
    initialFieldsets.forEach(blankFieldset);

    function allDimensionsSelected() {
      var fieldsets = getFieldsets();
      return (
        fieldsets.length > 0 &&
        fieldsets.every(function (fieldset) {
          return Object.prototype.hasOwnProperty.call(userSelectedIndexes, fieldset.dataset.fieldsetIndex);
        })
      );
    }

    function syncButtons() {
      var ready = allDimensionsSelected();
      mainButton.disabled = !ready;
      if (stickyButton) stickyButton.disabled = !ready;
    }

    syncButtons();

    // A native 'change' event only ever fires from real user interaction -
    // never when morph() rewrites the `checked` property/attribute - so this
    // is a reliable signal that this specific dimension was genuinely picked.
    picker.addEventListener('change', function (event) {
      var fieldset = event.target && event.target.closest && event.target.closest('fieldset.variant-option');
      if (fieldset) {
        userSelectedIndexes[fieldset.dataset.fieldsetIndex] = true;
      }
      syncButtons();
    });

    // After every server-driven update, undo Shopify's silent fallback
    // selection on any dimension the customer hasn't actually picked yet,
    // and re-assert the real "every dimension picked" button state.
    // Listening on document guarantees this runs after product-form.js's
    // own section-level VariantUpdateEvent handler, since both sit on the
    // bubble path of the same event and a document listener always fires
    // last.
    document.addEventListener('variant:update', function (event) {
      if (event.detail && event.detail.data && event.detail.data.productId !== productId) return;

      getFieldsets().forEach(function (fieldset) {
        if (!Object.prototype.hasOwnProperty.call(userSelectedIndexes, fieldset.dataset.fieldsetIndex)) {
          blankFieldset(fieldset);
        }
      });

      syncButtons();
    });
  }

  function init() {
    document.querySelectorAll('variant-picker[data-template-product-match="true"]').forEach(setupPicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
