/*
 * LCS 首頁區塊動效（原生 JS）
 *   [data-lcs-reveal]  進入視窗時淡入上移；可選 data-lcs-reveal-delay="毫秒"
 *   [data-lcs-count]   數字滾動到目標值；可選 data-lcs-decimals="小數位"
 * 預設內容可見；只有 JS 加上 html.lcs-motion 後才會隱藏待進場元素。
 * prefers-reduced-motion: reduce 或寬度 < 750px 時不做動畫，直接顯示最終內容。
 */
(function () {
  'use strict';

  var doc = document;

  function formatNumber(value, decimals) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function finalValue(el) {
    var target = parseFloat(el.getAttribute('data-lcs-count'));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute('data-lcs-decimals'), 10) || 0;
    el.textContent = formatNumber(target, decimals);
  }

  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-lcs-count'));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute('data-lcs-decimals'), 10) || 0;
    var duration = 1400;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNumber(target * eased, decimals);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        finalValue(el);
      }
    }
    requestAnimationFrame(step);
  }

  function init() {
    var reveals = doc.querySelectorAll('[data-lcs-reveal]');
    var counts = doc.querySelectorAll('[data-lcs-count]');
    if (!reveals.length && !counts.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var narrow = window.matchMedia && window.matchMedia('(max-width: 749px)').matches;

    if (reduce || narrow || !('IntersectionObserver' in window)) {
      counts.forEach(finalValue);
      return; // 未加 .lcs-motion，內容維持可見
    }

    doc.documentElement.classList.add('lcs-motion');

    counts.forEach(function (el) {
      el.textContent = formatNumber(0, parseInt(el.getAttribute('data-lcs-decimals'), 10) || 0);
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          io.unobserve(el);
          if (el.hasAttribute('data-lcs-reveal')) {
            var delay = parseInt(el.getAttribute('data-lcs-reveal-delay'), 10);
            if (!isNaN(delay)) el.style.setProperty('--lcs-reveal-delay', delay + 'ms');
            el.classList.add('is-revealed');
          }
          if (el.hasAttribute('data-lcs-count')) runCount(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    reveals.forEach(function (el) { io.observe(el); });
    counts.forEach(function (el) { if (!el.hasAttribute('data-lcs-reveal')) io.observe(el); });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
