/* 首页
   ⚠ 这个文件只负责「把数据显示出来」，不包含内容本身。
     首页显示的那些东西，去 data.js 改：
       个人介绍 / 标签 / 联系方式 → SITE
       此刻（在读在听在拍）        → NOW
       文章                       → POSTS
       图片墙                     → GALLERY
       友情链接                   → LINKS

   ★ 首页每个栏目显示几条、按什么顺序排 → data.js 第 9 段 HOME_LAYOUT
     （posts / gallery / links / now 四个数字 + order 排序方式）
     本文件只是照着 HOME_LAYOUT 的数字切一刀，想改数量别来这里改。
 */
(() => {
  const { lightbox, linkModal } = App.init("home.html");

  /* 读取首页栏目设置：每个栏目显示几条
     ★ 想改数量请去 data.js 第 9 段 HOME_LAYOUT，不要在下面改数字 */
  const LAY = typeof HOME_LAYOUT === "object" && HOME_LAYOUT ? HOME_LAYOUT : {};
  const num = (key, fallback) => {
    const v = Number(LAY[key]);
    return v > 0 ? v : fallback;
  };
  /* 友链的时间取 added（加上的日期），没写就退回 known（认识于） */
  const linkTime = (l) => l.added || l.known || "";

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

  /* 此刻（显示几条 = HOME_LAYOUT.now） */
  document.getElementById("nowGrid").innerHTML = NOW.slice(0, num("now", NOW.length))
    .map(
      (n) => `
    <div class="now-card reveal">
      <div class="now-k">${App.esc(n.k)}</div>
      <div class="now-v">${App.esc(n.v)}</div>
      <p class="now-note">${App.esc(n.note)}</p>
    </div>`
    )
    .join("");

  /* 精选文章：按 HOME_LAYOUT 的排序规则（置顶 + 时间）排好，再取前 N 篇
     ★ 想改显示几篇 → data.js 第 9 段 HOME_LAYOUT.posts
     ★ 想改排序方式 → data.js 第 9 段 HOME_LAYOUT.order */
  const picks = App.sortItems(POSTS).slice(0, num("posts", 4));
  document.getElementById("postGrid").innerHTML = picks.map(App.postCard).join("");

  /* 图片墙：同样按置顶 + 时间排，取前 N 张
     ★ 想改显示几张 → data.js 第 9 段 HOME_LAYOUT.gallery
     ★ 照片置顶：在 GALLERY 里给那张照片写 pinned: true
     末尾那张「光影待续」只是装饰，只有当首页把所有照片都显示完时才出现 */
  const homeShots = App.sortItems(GALLERY).slice(0, num("gallery", 6));
  const showMore = num("gallery", 6) >= GALLERY.length;
  const shots = showMore
    ? [...homeShots, { placeholder: true, title: "光影待续", place: "下一张由你来拍" }]
    : homeShots;
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
    if (f) lightbox.open(homeShots, Number(f.dataset.i));
  });

  /* 实用工具：三张入口卡，点进去是 tools.html 对应的那个工具
     工具的名字 / 图标 / 说明来自 data.js 第 10-1 段 TOOLS
     ★ 想改首页显示几个 → data.js 第 9 段 HOME_LAYOUT.tools */
  document.getElementById("homeTools").innerHTML = (TOOLS || [])
    .slice(0, num("tools", 3))
    .map(
      (t) => `
    <a class="tool-entry reveal" href="./tools.html${App.esc(t.anchor || "")}">
      <span class="te-icon">${App.esc(t.icon || "")}</span>
      <span>
        <b>${App.esc(t.name || "")}</b>
        <span class="te-desc">${App.esc(t.desc || "")}</span>
        <span class="te-go">去用用 →</span>
      </span>
    </a>`
    )
    .join("");

  /* 友链：按置顶 + 加入时间排，取前 N 个
     ★ 想改显示几个 → data.js 第 9 段 HOME_LAYOUT.links
     点卡片会弹出详情窗格（和友链页一样），不直接跳转 */
  const linkCard = (l, i) => `
    <a class="link-card reveal" href="${App.esc(l.url)}" target="_blank" rel="noopener" data-i="${i}">
      <span class="link-status"></span>
      <span class="link-ava" style="background:${App.esc(l.color)}">${App.esc(l.initial)}</span>
      <span class="link-info"><b>${App.esc(l.name)}</b><span>${App.esc(l.desc)}</span></span>
      <span class="link-peek" aria-hidden="true">→</span>
    </a>`;
  const homeLinkList = App.sortItems(LINKS, linkTime).slice(0, num("links", 4));
  document.getElementById("homeLinks").innerHTML = homeLinkList.map(linkCard).join("");
  document.getElementById("homeLinks").addEventListener("click", (e) => {
    const card = e.target.closest(".link-card[data-i]");
    if (!card) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    linkModal.open(homeLinkList[Number(card.dataset.i)]);
  });

  App.reveal();
})();
