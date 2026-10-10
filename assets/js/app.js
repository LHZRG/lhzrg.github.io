/* ============================================================
   语林集 · 公共逻辑
   导航 / 页脚 / 主题 / 搜索 / 灯箱 / 光影 / 进场动画

   ⚠ 这个文件是「管长相和结构」的，不是管内容的。
     网站内容（文章、照片、友链、自我介绍）都在 assets/js/data.js 里改。
   ⚠ 全站只有两个地方写了硬编码文字：下面的【导航菜单】和【页脚】，
     因为它们每个页面都一样、几乎不用改。已标 ★改这里。
   ⚠ 改配色请去 assets/css/main.css 顶部的 :root 变量，不要来这里。

   各段落索引（想改什么找哪一段）：
     ① mountAmbient   背景的两团柔光、从加载页过来的那一道光
     ② mountNav       ★导航菜单（站名、菜单项、图标）
     ③ 主题           日光 / 灯下切换
     ④ mountFooter    ★页脚三栏内容
     ⑤ mountSearch    Ctrl+K 全站搜索面板
     ⑥ mountLightbox  图片点开看大图
     ⑦ mountToTop     回到顶部按钮 + 顶部阅读进度条
     ⑧ reveal         往下滚动时内容浮现的动画
     ⑨ sortItems      栏目排序（置顶 + 时间），首页 / 图片页 / 友链页共用
     ⑩ postCard       文章卡片的样式模板
   ============================================================ */

const App = (() => {
  /* ---------- 小工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const pad = (n) => String(n).padStart(2, "0");

  function fmtDate(s, style = "long") {
    const d = new Date(String(s).replace(/-/g, "/"));
    if (isNaN(d)) return s;
    if (style === "short") return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  const wordsOf = (p) => Markdown.plain(p.body || "").replace(/\s/g, "").length;
  const readTime = (p) => Math.max(1, Math.round(wordsOf(p) / 350));
  const byId = (id) => POSTS.find((p) => p.id === id);
  const postUrl = (id) => `./post.html?id=${encodeURIComponent(id)}`;
  const sortedPosts = () => [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allTags = () => {
    const m = new Map();
    POSTS.forEach((p) => (p.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  /* ---------- 环境光影 ---------- */
  function mountAmbient() {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div class="sunwash" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>'
    );
    // 刚从加载页推门进来时，来一次暖光扫过
    if (sessionStorage.getItem("ylj-entered") === "1") {
      sessionStorage.removeItem("ylj-entered");
      const b = document.createElement("div");
      b.className = "sunburst";
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1600);
    }
  }

  /* ---------- ② 导航 ---------- */
  /* 右上角三个按钮的图标图案（SVG 画的，一般不用改） */
  const ICON = {
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    moon:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>',
    menu:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  };

  function mountNav(active) {
    /* ★改这里：导航菜单。
       格式：["页面文件名", "菜单上显示的字"]
       · 想加一项：在这个数组里加一行，同时要在项目里新建一个同名 html 文件
       · 想减一项：删掉那一行
       · 想改顺序：调整行的先后顺序 */
    const items = [
      ["home.html", "首页"],
      ["blog.html", "文章"],
      ["gallery.html", "图片"],
      ["links.html", "友链"],
      ["about.html", "关于"],
    ];
    const el = $("#nav");
    if (!el) return;
    el.innerHTML = `
      <div class="nav-inner">
        <a class="brand" href="./home.html" aria-label="${esc(SITE.name)}">
          <span class="brand-mark"><span>语</span></span>${esc(SITE.name)}
        </a>
        <nav class="nav-links" id="navLinks">
          ${items
            .map(
              ([h, t]) =>
                `<a href="./${h}" class="${active === h ? "active" : ""}">${t}</a>`
            )
            .join("")}
        </nav>
        <div class="nav-tools">
          <button class="icon-btn" id="searchBtn" title="搜索文章 (Ctrl+K)" aria-label="搜索">${ICON.search}</button>
          <button class="icon-btn" id="themeBtn" title="切换日光 / 灯下" aria-label="切换主题"></button>
          <button class="icon-btn burger" id="burger" aria-label="菜单">${ICON.menu}</button>
        </div>
      </div>`;

    const links = $("#navLinks");
    $("#burger").addEventListener("click", () => links.classList.toggle("open"));
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
    $("#searchBtn").addEventListener("click", openSearch);
    $("#themeBtn").addEventListener("click", toggleTheme);
    syncThemeIcon();
  }

  /* ---------- 主题 ---------- */
  function currentTheme() {
    return localStorage.getItem("ylj-theme") || "day";
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t === "night" ? "night" : "day");
    localStorage.setItem("ylj-theme", t);
    syncThemeIcon();
  }
  function syncThemeIcon() {
    const b = $("#themeBtn");
    if (b) b.innerHTML = currentTheme() === "night" ? ICON.moon : ICON.sun;
  }
  function toggleTheme() {
    applyTheme(currentTheme() === "night" ? "day" : "night");
  }

  /* ---------- ④ 页脚 ---------- */
  function mountFooter() {
    const el = $("#footer");
    if (!el) return;
    // 「本站已亮灯 X 天」是按 data.js 里 SITE.since 的日期自动算出来的
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(SITE.since.replace(/-/g, "/")).getTime()) / 86400000)
    );
    /* ★ 外面这层 class="footer" 不能删：页脚的留白、那条细分割线、
         从上往下淡出的暖色底，全都挂在它身上（见 main.css「15. 页脚」）。
         想改「最后一个栏目到页脚之间留多少空」→ 搜 main.css 里的 .footer */
    el.innerHTML = `
      <div class="footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <h4>${esc(SITE.name)} · ${esc(SITE.latin)}</h4><!-- 左栏：站名 + 英文名，来自 data.js 的 SITE -->
            <p>${esc(SITE.heroQuote)}</p><!-- 主标语，来自 data.js 的 SITE.heroQuote -->
            <p style="font-size:13px;color:var(--ink-3)">午后斜阳里的小馆</p><!-- ★改这里：站名下那行小字 -->
          </div>
          <div>
            <h4>栏目</h4><!-- ★改这里：中栏标题 -->
            <ul><!-- ★改这里：中栏链接，和导航菜单保持一致比较好 -->
              <li><a href="./home.html">回到首页</a></li>
              <li><a href="./blog.html">全部文章</a></li>
              <li><a href="./gallery.html">图片墙</a></li>
              <li><a href="./links.html">友情链接</a></li>
              <li><a href="./about.html">关于我</a></li>
            </ul>
          </div>
          <div>
            <h4>找到我</h4><!-- ★改这里：右栏标题 -->
            <ul>
              <!-- 联系方式自动生成，改地址去 data.js 的 SITE.socials -->
              ${SITE.socials
                .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`)
                .join("")}
              <li><a href="./links.html#apply">交换友链</a></li><!-- ★改这里：右栏最后一项 -->
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${esc(SITE.author)} · 本站已亮灯 ${days} 天</span><!-- 年份和天数自动算 -->
          <span>由木头、阳光和一点点 JavaScript 搭成</span><!-- ★改这里：右下角一句话 -->
        </div>
      </div>
      </div>`;
  }

  /* ---------- ⑤ 全站搜索（Ctrl+K 或点放大镜） ---------- */
  // 搜的是 data.js 里所有文章的标题 / 摘要 / 标签 / 正文，加文章会自动被搜到
  function mountSearch() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="search-panel" id="searchPanel">
        <div class="search-box">
          <div class="search-input">
            ${ICON.search}
            <input id="searchInput" type="text" placeholder="搜文章标题、正文、标签…" autocomplete="off"><!-- ★改这里：搜索框提示语 -->
            <span style="font-size:12px;color:var(--ink-3)">ESC 关闭</span>
          </div>
          <div class="search-results" id="searchResults"></div>
        </div>
      </div>`
    );
    const panel = $("#searchPanel");
    const input = $("#searchInput");
    const box = $(".search-box", panel);

    panel.addEventListener("click", (e) => {
      if (e.target === panel) closeSearch();
    });
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const res = $("#searchResults");
      if (!q) {
      res.innerHTML = `<div class="search-empty">输入点什么吧，比如「光」「咖啡」「博客」</div>`; // ★改这里：刚打开搜索面板时的提示语
      return;
      }
      const hits = POSTS.map((p) => {
        const hay = (p.title + " " + p.excerpt + " " + (p.tags || []).join(" ") + " " + Markdown.plain(p.body)).toLowerCase();
        if (!hay.includes(q)) return null;
        // 命中片段
        const pl = Markdown.plain(p.body).toLowerCase();
        const at = pl.indexOf(q);
        const snip = at < 0 ? p.excerpt : (at > 24 ? "…" : "") + Markdown.plain(p.body).slice(at - 12, at + 60) + "…";
        const titleScore = p.title.toLowerCase().includes(q) ? 100 : 0;
        return { p, snip, score: titleScore + (p.tags || []).filter((t) => t.toLowerCase().includes(q)).length * 10 };
      })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || new Date(b.p.date) - new Date(a.p.date))
        .slice(0, 8);

      res.innerHTML = hits.length
        ? hits
            .map(
              ({ p, snip }) =>
                `<a class="search-hit" href="${postUrl(p.id)}"><b>${hi(p.title, q)}</b><span>${fmtDate(p.date, "short")} · ${hi(esc(snip), q)}</span></a>`
            )
            .join("")
        : `<div class="search-empty">没有找到相关的内容。要不换个词？</div>`; // ★改这里：搜不到时的提示语
    });
    box.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") closeSearch();
    });
  }
  const hi = (s, q) =>
    esc(s).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");

  function openSearch() {
    const p = $("#searchPanel");
    if (!p) return;
    p.classList.add("open");
    const inp = $("#searchInput");
    inp.value = "";
    $("#searchResults").innerHTML = `<div class="search-empty">输入点什么吧，比如「光」「咖啡」「博客」</div>`;
    setTimeout(() => inp.focus(), 60);
  }
  function closeSearch() {
    $("#searchPanel")?.classList.remove("open");
  }

  /* ---------- ⑥ 看大图的灯箱（图片页 / 首页点照片时用） ---------- */
  function mountLightbox() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="lightbox" id="lightbox">
        <button class="lb-close" aria-label="关闭">✕</button>
        <button class="lb-prev" aria-label="上一张">‹</button>
        <button class="lb-next" aria-label="下一张">›</button>
        <img alt="">
        <div class="lb-cap"></div>
      </div>`
    );
    const lb = $("#lightbox");
    let list = [],
      idx = 0;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      const it = list[idx];
      $("img", lb).src = it.src;
      $("img", lb).alt = it.title || "";
      $(".lb-cap", lb).innerHTML = `${esc(it.title || "")}<small>${esc(
        [it.place, it.date].filter(Boolean).join(" · ")
      )}</small>`;
    };

    $(".lb-close", lb).onclick = () => lb.classList.remove("open");
    $(".lb-prev", lb).onclick = (e) => {
      e.stopPropagation();
      show(idx - 1);
    };
    $(".lb-next", lb).onclick = (e) => {
      e.stopPropagation();
      show(idx + 1);
    };
    lb.onclick = (e) => {
      if (e.target === lb) lb.classList.remove("open");
    };
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "Escape") lb.classList.remove("open");
    });

    return {
      open(items, start = 0) {
        list = items;
        show(start);
        lb.classList.add("open");
      },
    };
  }

  /* ---------- ⑦ 友链详情弹窗（点击友链卡片时弹出） ----------
     左侧：站点快照 + 快照日期
     右侧：站名 / 站长 / 评价 / 标签 / 认识时间 / 状态
     底部：「点击跳转」按钮
     关闭：点窗格外、点右上角叉、按 ESC
     数据结构见 data.js 第 5 段 LINKS
  ------------------------------------------------------------------ */
  function mountLinkModal() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="link-modal" id="linkModal" role="dialog" aria-modal="true" aria-label="友链详情">
        <div class="lm-panel">
          <button class="lm-x" type="button" aria-label="关闭">✕</button>

          <div class="lm-shot">
            <div class="lm-chrome">
              <span class="lm-dots"><i></i><i></i><i></i></span>
              <span class="lm-url"></span>
            </div>
            <div class="lm-shotimg" id="lmShot"></div>
            <div class="lm-snapdate" id="lmSnapDate"></div>
          </div>

          <div class="lm-body">
            <div class="lm-head">
              <span class="link-ava" id="lmAva"></span>
              <div class="lm-headtxt">
                <h3 id="lmName"></h3>
                <div class="lm-owner" id="lmOwner"></div>
              </div>
            </div>

            <p class="lm-label">我的评价</p>
            <div class="lm-review" id="lmReview"></div>

            <div class="lm-tags" id="lmTags"></div>

            <dl class="lm-meta" id="lmMeta"></dl>

            <div class="lm-foot">
              <a class="btn lm-go" id="lmGo" href="#" target="_blank" rel="noopener">
                <span>点击跳转</span><i>→</i>
              </a>
            </div>
          </div>
        </div>
      </div>`
    );

    const modal = $("#linkModal");
    let lastFocus = null;

    const close = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    modal.addEventListener("click", (e) => {
      // 点窗格外的暗色区域才关闭；点窗格内部不关
      if (!e.target.closest(".lm-panel")) close();
    });
    $(".lm-x", modal).onclick = close;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    function open(l) {
      lastFocus = document.activeElement;

      // 网址：去掉协议头，显示更干净
      const pretty = String(l.url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
      $(".lm-url", modal).textContent = pretty;
      $("#lmGo", modal).href = l.url || "#";

      // 快照：没填 snap 就显示一个虚线占位框
      const shot = $("#lmShot", modal);
      shot.innerHTML = l.snap
        ? `<img src="${esc(l.snap)}" alt="${esc(l.name)} 的首页快照" loading="lazy">`
        : `<div class="lm-noshot"><b>还没有快照</b><span>截图后填进 data.js 的 snap 字段</span></div>`;
      shot.classList.toggle("is-empty", !l.snap);

      $("#lmSnapDate", modal).innerHTML = l.snapDate
        ? `快照于 <b>${esc(l.snapDate)}</b>`
        : "";

      // 头像
      const ava = $("#lmAva", modal);
      ava.textContent = l.initial || (l.name || "?").slice(0, 1);
      ava.style.background = l.color || "var(--wood-500)";

      $("#lmName", modal).textContent = l.name || "未命名";
      $("#lmOwner", modal).innerHTML = l.owner ? `站长 · ${esc(l.owner)}` : "";

      // 评价：支持字符串或字符串数组
      const rev = Array.isArray(l.review) ? l.review : l.review ? [l.review] : [];
      $("#lmReview", modal).innerHTML = rev.length
        ? rev.map((t) => `<p>${esc(t)}</p>`).join("")
        : `<p class="lm-muted">${esc(l.desc || "还没写评价。")}</p>`;

      // 标签
      const tags = Array.isArray(l.tags) ? l.tags : [];
      $("#lmTags", modal).innerHTML = tags
        .map((t) => `<span class="chip">${esc(t)}</span>`)
        .join("");

      // 右侧下方的小信息表
      const meta = [
        ["网址", l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(pretty)}</a>` : ""],
        ["认识于", l.known],
        ["状态", l.status ? `<span class="lm-state"><i></i>${esc(l.status)}</span>` : ""],
      ].filter(([, v]) => v);
      $("#lmMeta", modal).innerHTML = meta
        .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`)
        .join("");

      document.body.style.overflow = "hidden";
      modal.classList.add("open");
      // 让动画从点击处稍微展开的感觉：把焦点交给关闭按钮，键盘用户也好操作
      $(".lm-x", modal).focus?.();
    }

    return { open, close };
  }

  /* ---------- ⑧ 回到顶部按钮 + 顶部阅读进度条 ---------- */
  function mountToTop() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<button class="to-top" id="toTop" aria-label="回到顶部">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>`
    );
    const b = $("#toTop");
    b.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const onScroll = () => b.classList.toggle("show", window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 阅读进度条（文章页用）
    const bar = document.createElement("div");
    bar.className = "read-progress";
    bar.id = "readProgress";
    document.body.appendChild(bar);
    const prog = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? Math.min(100, (window.scrollY / h) * 100) + "%" : "0";
    };
    window.addEventListener("scroll", prog, { passive: true });
    prog();
  }

  /* ---------- ⑧ 进场动画（滚动到某个区块时，它慢慢浮现出来） ---------- */
  let _io = null;
  function reveal(root = document) {
    _io =
      _io ||
      new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              _io.unobserve(e.target);
            }
          }),
        { threshold: 0.08, rootMargin: "0px 0px -40px" }
      );
    $$(".reveal", root).forEach((el, i) => {
      if (el.classList.contains("in")) return;
      if (!el.style.transitionDelay) el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms";
      _io.observe(el);
    });
  }

  /* ---------- ⑨ 栏目排序：置顶 + 时间（首页 / 图片页 / 友链页共用） ----------
     怎么排由 data.js 第 9 段 HOME_LAYOUT 决定，不用改这里：
       order:    "pinned-first"   置顶的排最前，其余按时间排（默认）
                 "unpinned-first" 未置顶的排最前，置顶的排后面
                 "date-first"     只看时间，不管置顶与否
       dateDesc: true = 新的在前（默认），false = 旧的在前

     第二个参数 getTime 用来说明「这一项的时间取哪个字段」；
     不传就默认按顺序找 date → added → known。 */
  function sortItems(list, getTime) {
    const cfg = typeof HOME_LAYOUT === "object" && HOME_LAYOUT ? HOME_LAYOUT : {};
    const order = cfg.order || "pinned-first";
    const desc = cfg.dateDesc !== false;
    const time = (x) => String((getTime ? getTime(x) : x.date || x.added || x.known) || "");
    return [...list].sort((a, b) => {
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) {
        if (order === "pinned-first") return pb - pa; // 置顶的靠前
        if (order === "unpinned-first") return pa - pb; // 未置顶的靠前
      }
      const ta = time(a);
      const tb = time(b);
      if (ta === tb) return 0;
      return (ta > tb ? -1 : 1) * (desc ? 1 : -1);
    });
  }

  /* ---------- ⑩ 文章卡片模板（首页、文章列表页共用） ---------- */
  // 里面用到的数据全都来自 data.js 里那一篇文章的字段：cover / date / title / excerpt / tags
  function postCard(p) {
    return `
      <a class="post-card reveal" href="${postUrl(p.id)}">
        ${p.pinned ? '<span class="pinned-flag">置顶</span>' : ""}
        <div class="post-thumb"><img src="${esc(p.cover)}" alt="${esc(p.title)}" loading="lazy"></div>
        <div class="post-body">
          <div class="post-meta"><span>${fmtDate(p.date, "short")}</span><span class="dot">·</span><span>约 ${readTime(p)} 分钟</span></div>
          <h3 class="post-title">${esc(p.title)}</h3>
          <p class="post-excerpt">${esc(p.excerpt)}</p>
          <div class="post-tags">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </a>`;
  }

  /* ---------- 启动 ---------- */
  function init(active) {
    applyTheme(currentTheme());
    mountAmbient();
    mountNav(active);
    mountFooter();
    mountSearch();
    mountToTop();
    const lb = mountLightbox();
    const linkModal = mountLinkModal();
    reveal();
    document.addEventListener("click", (e) => {
      const c = e.target.closest(".copy-code");
      if (c) {
        const pre = c.closest("pre");
        const txt = $("code", pre)?.innerText || "";
        navigator.clipboard?.writeText(txt).then(
          () => ((c.textContent = "已复制"), setTimeout(() => (c.textContent = "复制"), 1600)),
          () => (c.textContent = "复制失败")
        );
      }
    });
    return { lightbox: lb, linkModal };
  }

  return {
    init,
    $,
    $$,
    esc,
    fmtDate,
    wordsOf,
    readTime,
    byId,
    postUrl,
    sortedPosts,
    allTags,
    sortItems,
    postCard,
    openSearch,
    reveal,
  };
})();
