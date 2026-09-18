/**
 * 共用視差捲動（Parallax Scrolling）邏輯。
 * 適用對象：任何帶有 `.js-parallax-bg` class 的容器（容器內第一個 <img> 會被位移），
 * 目前用於首頁 Hero、關於我們頂部banner——兩者都掛在同一顆 scroll 監聽器上，不會各自綁定。
 *
 * 安全機制：
 * - `prefers-reduced-motion: reduce` 或手機寬度（<749px）時完全不啟用，維持原生捲動。
 * - 用 rAF 節流，一次 scroll 只排一次計算，避免掉幀。
 * - 背景圖用 SCALE_FACTOR 預留位移緩衝，位移量夾在每個區塊各自高度的 AMPLITUDE_RATIO
 *   比例內（另有 MAX_SHIFT_PX 全域上限），不會露出圖片邊緣空白。位移量按區塊自己的高度
 *   算比例，是因為 Hero（近全螢幕高）跟關於我們banner（約360px）高度差很多，用同一個固定
 *   px數字，短區塊會太快就頂到上限、幾乎感受不到位移過程；用比例才能兩種高度都感受得到效果。
 */
(function () {
  var SELECTOR = '.js-parallax-bg';
  var SPEED_RATIO = 0.6; // 背景相對前景的移動速度比例（0.5~0.7 為合理範圍）
  var AMPLITUDE_RATIO = 0.08; // 位移振幅 = 該區塊自身高度的 8%
  var MAX_SHIFT_PX = 80; // 位移量全域上限（避免極高區塊位移過度誇張）
  var SCALE_FACTOR = 1.18; // 背景圖放大比例，需提供足夠緩衝給上面的最大位移量，不能露出邊緣
  var MOBILE_QUERY = '(max-width: 749px)';

  var reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMQ = window.matchMedia(MOBILE_QUERY);

  var elements = [];
  var enabled = false;
  var ticking = false;

  function collectElements() {
    elements = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  }

  function resetTransforms() {
    elements.forEach(function (el) {
      var img = el.querySelector('img');
      if (img) img.style.transform = '';
    });
  }

  function updatePositions() {
    ticking = false;
    if (!enabled) return;

    var viewportHeight = window.innerHeight;

    elements.forEach(function (el) {
      // 通用 section 的 .custom-section-background 本身沒有高度（實際尺寸在裡面
      // 絕對定位的 .background-image-container 上），量測時要抓有真實尺寸的那層，
      // 不能直接量 el 自己，否則高度永遠是 0，可視範圍判斷跟位移計算都會算錯。
      var measureEl = el.querySelector('.background-image-container') || el;
      var rect = measureEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportHeight) return; // 不在可視範圍內，略過計算

      var img = el.querySelector('img');
      if (!img) return;

      var elementCenter = rect.top + rect.height / 2;
      var viewportCenter = viewportHeight / 2;
      var offset = elementCenter - viewportCenter;
      var rawShift = offset * (1 - SPEED_RATIO);
      var maxShiftForEl = Math.min(rect.height * AMPLITUDE_RATIO, MAX_SHIFT_PX);
      var shift = Math.max(-maxShiftForEl, Math.min(maxShiftForEl, rawShift));

      img.style.transform = 'scale(' + SCALE_FACTOR + ') translateY(' + shift.toFixed(1) + 'px)';
    });
  }

  function onScroll() {
    if (!enabled || ticking) return;
    ticking = true;
    window.requestAnimationFrame(updatePositions);
  }

  function setEnabled(next) {
    if (next === enabled) return;
    enabled = next;

    if (enabled) {
      window.addEventListener('scroll', onScroll, { passive: true });
      updatePositions();
    } else {
      window.removeEventListener('scroll', onScroll);
      resetTransforms();
    }
  }

  function evaluate() {
    var shouldEnable = elements.length > 0 && !reduceMotionMQ.matches && !mobileMQ.matches;
    setEnabled(shouldEnable);
  }

  function init() {
    collectElements();
    evaluate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  reduceMotionMQ.addEventListener('change', evaluate);
  mobileMQ.addEventListener('change', evaluate);
})();
