/* 发布输出专用：版本变化后重新导航一次；不清除用户数据，不使用 Service Worker。 */
(() => {
  const current = document.querySelector('meta[name="site-version"]')?.content;
  if (!current || !/^https?:$/.test(location.protocol)) return;
  const root = new URL('../../', document.currentScript.src);
  const endpoint = new URL('version.json', root);
  const key = 'ylj-update:' + root.pathname;
  let busy = false;
  let lastCheck = 0;

  async function check() {
    if (busy || document.visibilityState === 'hidden' || Date.now() - lastCheck < 15000) return;
    busy = true;
    lastCheck = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL(endpoint);
      url.searchParams.set('_', Date.now());
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const { version } = await response.json();
      if (typeof version !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(version)) return;
      if (version === current) {
        // 清理本功能的导航参数，不改变文章 id、工具锚点等其他状态。
        const clean = new URL(location.href);
        if (clean.searchParams.get('_sitev') === current) {
          clean.searchParams.delete('_sitev');
          history.replaceState(history.state, '', clean);
        }
        return;
      }
      // CDN 尚未同步或网络返回旧 HTML 时，同一版本最多自动导航一次。
      const next = new URL(location.href);
      if (next.searchParams.get('_sitev') === version) return;
      try {
        if (sessionStorage.getItem(key) === version) return;
        sessionStorage.setItem(key, version);
      } catch (_) { /* 隐私模式仍由 URL 参数阻止循环。 */ }
      next.searchParams.set('_sitev', version);
      location.replace(next.href);
    } catch (_) {
      // 离线、请求超时、发布暂不可用时保留当前页面。
    } finally {
      clearTimeout(timeout);
      busy = false;
    }
  }

  check();
  setInterval(check, 60000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
})();
