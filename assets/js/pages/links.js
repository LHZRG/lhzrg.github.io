/* 友链页
   ⚠ 这个文件只负责卡片的显示逻辑，不含友链本身。
     加删友链去 data.js 的 LINKS（那里也写着每个字段是干什么的）。
     右下角「复制邮箱」按钮读的是 data.js 里 SITE.socials 中邮箱那一项。

   交互：点卡片 → 弹出详情窗格（快照 / 评价 / 跳转按钮）
         卡片刻意不直接跳转，避免误点；想跳转就点弹窗底部的按钮，
         或者对卡片右键「在新标签页打开」。
 */
(() => {
  const { linkModal } = App.init("links.html");

  const grid = document.getElementById("linkGrid");
  document.getElementById("linkNum").textContent = LINKS.length;

  /* 卡片。用 <a> 是为了：① 右键能复制/新标签打开 ② 没开 JS 时还能直接跳转 */
  const cardHTML = (l, i) => `
    <a class="link-card reveal" href="${App.esc(l.url)}" target="_blank" rel="noopener" data-i="${i}">
      <span class="link-status"></span>
      <span class="link-ava" style="background:${App.esc(l.color)}">${App.esc(l.initial)}</span>
      <span class="link-info"><b>${App.esc(l.name)}</b><span>${App.esc(l.desc)}</span></span>
      <span class="link-peek" aria-hidden="true">→</span>
    </a>`;

  /* 排序规则和首页一致：置顶在前，其余按 added（加入时间）排。
     ★ 想改顺序 → data.js 第 9 段 HOME_LAYOUT.order / dateDesc
     ★ 想让某个友链排最前 → LINKS 里给它写 pinned: true
     这个页面显示全部友链，不受 HOME_LAYOUT.links 数量限制 */
  const list = App.sortItems(LINKS, (l) => l.added || l.known || "");
  grid.innerHTML = list.map(cardHTML).join("");

  /* 点卡片：不跳转，弹出详情
     Ctrl / ⌘ / Shift + 点击时不拦截，照旧让浏览器在新标签页打开 */
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".link-card[data-i]");
    if (!card) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    linkModal.open(list[Number(card.dataset.i)]);
  });

  /* 随机串门 */
  document.getElementById("randLink").onclick = () => {
    const l = list[Math.floor(Math.random() * list.length)];
    window.open(l.url, "_blank", "noopener");
  };

  /* 复制邮箱 */
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
