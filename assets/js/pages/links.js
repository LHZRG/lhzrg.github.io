/* 友链页
   ⚠ 这个文件只负责卡片的显示逻辑，不含友链本身。
     加删友链去 data.js 的 LINKS。
     右下角「复制邮箱」按钮读的是 data.js 里 SITE.socials 中邮箱那一项。
 */
(() => {
  App.init("links.html");

  const grid = document.getElementById("linkGrid");
  document.getElementById("linkNum").textContent = LINKS.length;

  grid.innerHTML = LINKS.map(
    (l) => `
    <a class="link-card reveal" href="${App.esc(l.url)}" target="_blank" rel="noopener">
      <span class="link-status"></span>
      <span class="link-ava" style="background:${App.esc(l.color)}">${App.esc(l.initial)}</span>
      <span class="link-info"><b>${App.esc(l.name)}</b><span>${App.esc(l.desc)}</span></span>
    </a>`
  ).join("");

  document.getElementById("randLink").onclick = () => {
    const l = LINKS[Math.floor(Math.random() * LINKS.length)];
    window.open(l.url, "_blank", "noopener");
  };

  const mail = (SITE.socials.find((s) => s.url.startsWith("mailto:")) || {}).url || "";
  const addr = mail.replace("mailto:", "");
  const btn = document.getElementById("mailBtn");
  btn.href = mail || "#";
  btn.innerHTML = `✉ ${App.esc(addr || "还没填邮箱")}`;
  btn.onclick = (e) => {
    if (!addr) return;
    e.preventDefault();
    navigator.clipboard?.writeText(addr);
    btn.innerHTML = "✓ 已复制邮箱";
    setTimeout(() => (btn.innerHTML = `✉ ${addr}`), 1800);
  };

  App.reveal();
})();
