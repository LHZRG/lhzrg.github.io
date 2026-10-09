/* 首页
   ⚠ 这个文件只负责「把数据显示出来」，不包含内容本身。
     首页显示的那些东西，去 data.js 改：
       个人介绍 / 标签 / 联系方式 → SITE
       此刻（在读在听在拍）        → NOW
       精选文章的选取规则          → 见下面「精选文章」那一段
       图片墙                     → GALLERY
       友情链接                   → LINKS
 */
(() => {
  const { lightbox } = App.init("home.html");

  /* Hero */
  document.getElementById("heroImg").src = SITE.heroImage;
  document.getElementById("heroLede").textContent = SITE.bio[0] + SITE.bio[1].slice(0, 46) + "…";

  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(SITE.since.replace(/-/g, "/")).getTime()) / 86400000)
  );
  const d = new Date();
  const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
  document.getElementById("heroClock").innerHTML = `
    <span>今天是 <b>${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${week}</b></span>
    <span>已写 <b>${POSTS.length}</b> 篇</span>
    <span>已亮灯 <b>${days}</b> 天</span>
    <span>收藏了 <b>${GALLERY.length}</b> 张光</span>`;

  /* 个人介绍 */
  document.getElementById("profile").innerHTML = `
    <div class="profile-avatar">
      <img src="${App.esc(SITE.avatar)}" alt="${App.esc(SITE.author)}">
      <div class="profile-badge">${App.esc(SITE.latin)}</div>
    </div>
    <div>
      <h3 class="profile-name">${App.esc(SITE.author)}</h3>
      <div class="profile-role">${App.esc(SITE.role)}</div>
      ${SITE.bio.map((t) => `<p class="profile-bio">${App.esc(t)}</p>`).join("")}
      <div class="chips">${SITE.chips.map((c) => `<span class="chip">${App.esc(c)}</span>`).join("")}</div>
      <div class="profile-stats">
        <div class="stat"><b>${POSTS.length}</b><span>篇文章</span></div>
        <div class="stat"><b>${GALLERY.length}</b><span>张照片</span></div>
        <div class="stat"><b>${LINKS.length}</b><span>位邻居</span></div>
        <div class="stat"><b>${days}</b><span>天亮灯</span></div>
      </div>
      <div class="social-row">
        ${SITE.socials
          .map(
            (s) =>
              `<a class="btn ghost" style="padding:8px 16px;font-size:13px" href="${App.esc(
                s.url
              )}" target="_blank" rel="noopener">${App.esc(s.icon)} ${App.esc(s.label)}</a>`
          )
          .join("")}
      </div>
    </div>`;

  /* 此刻 */
  document.getElementById("nowGrid").innerHTML = NOW.map(
    (n) => `
    <div class="now-card reveal">
      <div class="now-k">${App.esc(n.k)}</div>
      <div class="now-v">${App.esc(n.v)}</div>
      <p class="now-note">${App.esc(n.note)}</p>
    </div>`
  ).join("");

  /* 精选文章：置顶优先，其次按时间，取 4 篇
     ★改这里：想把首页显示的文章变多一点 / 少一点，改下面的 .slice(0, 4) 数字即可 */
  const picks = App.sortedPosts()
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    .slice(0, 4);
  document.getElementById("postGrid").innerHTML = picks.map(App.postCard).join("");

  /* 图片墙 */
  const shots = [...GALLERY, { placeholder: true, title: "光影待续", place: "下一张由你来拍" }];
  document.getElementById("homeMasonry").innerHTML = shots
    .map(
      (g, i) =>
        g.placeholder
          ? `<div class="shot placeholder reveal"><div style="text-align:center;color:var(--wood-500);font-family:var(--font-serif)">
               <div style="font-size:26px">光影待续</div>
               <div style="font-size:12px;opacity:.7;letter-spacing:.18em">TO BE CONTINUED</div></div></div>`
          : `<figure class="shot reveal" data-i="${i}">
               <img src="${App.esc(g.src)}" alt="${App.esc(g.title)}" loading="lazy">
               <figcaption class="shot-cap">${App.esc(g.title)}<small>${App.esc(
                 [g.place, g.date].filter(Boolean).join(" · ")
               )}</small></figcaption>
             </figure>`
    )
    .join("");

  document.getElementById("homeMasonry").addEventListener("click", (e) => {
    const f = e.target.closest(".shot[data-i]");
    if (f) lightbox.open(GALLERY, Number(f.dataset.i));
  });

  /* 友链（首页取前 4）
     ★改这里：想在首页多显示几个邻居，改下面 LINKS.slice(0, 4) 的数字 */
  const linkCard = (l) => `
    <a class="link-card reveal" href="${App.esc(l.url)}" target="_blank" rel="noopener">
      <span class="link-status"></span>
      <span class="link-ava" style="background:${App.esc(l.color)}">${App.esc(l.initial)}</span>
      <span class="link-info"><b>${App.esc(l.name)}</b><span>${App.esc(l.desc)}</span></span>
    </a>`;
  document.getElementById("homeLinks").innerHTML = LINKS.slice(0, 4).map(linkCard).join("");

  App.reveal();
})();
