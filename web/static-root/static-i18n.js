(function () {
  function preferredLocale() {
    var params = new URLSearchParams(window.location.search);
    var queryLang = params.get('lang');
    if (queryLang) return queryLang.indexOf('zh') === 0 ? 'zh-CN' : 'en-US';
    try {
      var stored = window.localStorage.getItem('agentfleet-static-lang');
      if (stored) return stored.indexOf('zh') === 0 ? 'zh-CN' : 'en-US';
    } catch (_) {}
    return navigator.language && navigator.language.indexOf('zh') === 0 ? 'zh-CN' : 'en-US';
  }

  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  }

  function applyLocale(locale) {
    var normalized = locale.indexOf('zh') === 0 ? 'zh-CN' : 'en-US';
    document.documentElement.lang = normalized;
    document.querySelectorAll('[data-locale]').forEach(function (el) {
      el.classList.toggle('active-locale', el.getAttribute('data-locale') === normalized);
    });
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-set-lang') === normalized));
    });
    var body = document.body;
    document.title = normalized === 'zh-CN' ? body.dataset.titleZh : body.dataset.titleEn;
    setMeta('meta[name="description"]', normalized === 'zh-CN' ? body.dataset.descriptionZh : body.dataset.descriptionEn);
    setMeta('meta[property="og:title"]', normalized === 'zh-CN' ? body.dataset.ogTitleZh : body.dataset.ogTitleEn);
    setMeta('meta[property="og:description"]', normalized === 'zh-CN' ? body.dataset.ogDescriptionZh : body.dataset.ogDescriptionEn);
    try { window.localStorage.setItem('agentfleet-static-lang', normalized); } catch (_) {}
  }

  window.AgentFleetStaticI18n = { applyLocale: applyLocale };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      button.addEventListener('click', function () { applyLocale(button.getAttribute('data-set-lang') || 'en-US'); });
    });
    applyLocale(preferredLocale());
  });
})();
