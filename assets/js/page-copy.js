/* 将页面配置中的纯文字填入模板；不解释 HTML，避免把文案当作代码。 */
(() => {
  if (typeof PAGE_COPY === "undefined") return;
  document.querySelectorAll("[data-copy]").forEach(el => {
    const key = el.dataset.copy;
    if (Object.prototype.hasOwnProperty.call(PAGE_COPY, key)) el.textContent = PAGE_COPY[key];
  });
})();
