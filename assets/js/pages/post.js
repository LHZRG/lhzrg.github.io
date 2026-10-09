/* 文章详情页
   ⚠ 这个文件不含任何文章内容 —— 文章都在 data.js 的 POSTS 里，
     打开 post.html?id=文章id 时自动去取那篇。
     想改某一篇的文字 / 封面 / 标签：data.js 第 3 段。
     想开评论区：data.js 第 1 段 SITE.giscus。
 */
(() => {
  App.init("blog.html");

  const id = new URLSearchParams(location.search).get("id");
  const p = App.byId(id);
  const art = document.getElementById("article");

  if (!p) {
    art.innerHTML = `
      <div class="nf">
        <div>
          <div class="nf-num">404</div>
          <h2 style="font-size:24px;margin-bottom:10px">这篇文章不在架上</h2>
          <p>可能它还没写完，或者地址敲错了。</p>
          <a class="btn" href="./blog.html">回到文章列表</a>
        </div>
      </div>`;
    return;
  }

  document.title = `${p.title} · 语林集`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.excerpt);

  /* 头部 */
  document.getElementById("title").textContent = p.title;
  const w = App.wordsOf(p);
  document.getElementById("topMeta").innerHTML =
    `<span>${App.fmtDate(p.date)}</span><span class="dot">·</span><span>${(p.tags || []).join(" / ")}</span>`;
  document.getElementById("subMeta").innerHTML =
    `<span>约 ${w} 字</span><span class="dot">·</span><span>读完约 ${App.readTime(p)} 分钟</span>
     <span class="dot">·</span><button id="copyLink" style="font:inherit;color:var(--wood-500);border-bottom:1px dashed var(--wood-300)">复制链接</button>`;
  document.getElementById("cover").innerHTML = `<img src="${App.esc(p.cover)}" alt="${App.esc(p.title)}">`;

  document.getElementById("copyLink").onclick = (e) => {
    navigator.clipboard?.writeText(location.href);
    e.target.textContent = "已复制 ✓";
    setTimeout(() => (e.target.textContent = "复制链接"), 1600);
  };

  /* 正文 */
  document.getElementById("content").innerHTML = Markdown.render(p.body);

  /* 目录 */
  const tocList = Markdown.toc(p.body);
  const tocEl = document.getElementById("toc");
  if (tocList.length >= 2) {
    tocEl.innerHTML = `<b>目 录</b>${tocList
      .map((t) => `<a href="#${t.id}" class="l${t.level}" data-id="${t.id}">${App.esc(t.text)}</a>`)
      .join("")}`;
    const links = App.$$("a", tocEl);
    const heads = tocList.map((t) => document.getElementById(t.id)).filter(Boolean);
    const sync = () => {
      const y = window.scrollY + 130;
      let cur = 0;
      heads.forEach((h, i) => {
        if (h.offsetTop <= y) cur = i;
      });
      links.forEach((a, i) => a.classList.toggle("active", i === cur));
    };
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  } else {
    tocEl.remove();
  }

  /* 标签 */
  document.getElementById("tags").innerHTML =
    `<div class="chips">${(p.tags || [])
      .map((t) => `<a class="chip" href="./blog.html"># ${App.esc(t)}</a>`)
      .join("")}</div>`;

  /* 上下篇 */
  const all = App.sortedPosts();
  const i = all.findIndex((x) => x.id === p.id);
  const prev = all[i + 1];
  const next = all[i - 1];
  document.getElementById("postNav").innerHTML = [
    prev
      ? `<a href="${App.postUrl(prev.id)}"><small>← 上一篇</small><b>${App.esc(prev.title)}</b></a>`
      : `<a href="./blog.html"><small>← 已是最早一篇</small><b>回到文章列表</b></a>`,
    next
      ? `<a class="next" href="${App.postUrl(next.id)}"><small>下一篇 →</small><b>${App.esc(next.title)}</b></a>`
      : `<a class="next" href="./blog.html"><small>已是最新一篇 →</small><b>回到文章列表</b></a>`,
  ].join("");

  /* 相关文章 */
  const rel = all
    .filter((x) => x.id !== p.id && (x.tags || []).some((t) => (p.tags || []).includes(t)))
    .slice(0, 3);
  if (rel.length) {
    document.getElementById("related").innerHTML = `
      <div class="divider-leaf">接 着 读</div>
      <div class="post-grid">${rel.map(App.postCard).join("")}</div>`;
  }

  /* 评论 */
  const g = SITE.giscus;
  document.getElementById("giscus").innerHTML = g.enabled && g.repoId
    ? `<script src="https://giscus.app/client.js"
         data-repo="${App.esc(g.repo)}" data-repo-id="${App.esc(g.repoId)}"
         data-category="${App.esc(g.category)}" data-category-id="${App.esc(g.categoryId)}"
         data-mapping="pathname" data-strict="0" data-reactions-enabled="1"
         data-emit-metadata="0" data-input-position="bottom" data-theme="light"
         data-lang="zh-CN" crossorigin="anonymous" async><\/script>`
    : `<div class="note-card">
         <h3>评论区还没通电</h3>
         <p style="margin:0">这个位置预留给了 Giscus（基于 GitHub Discussions，静态站免后端）。启用方法：</p>
         <ul>
           <li>去 <a href="https://giscus.app" target="_blank" rel="noopener" style="color:var(--wood-500)">giscus.app</a> 填写你的仓库，拿到 repoId 和 categoryId</li>
           <li>打开 <code>assets/js/data.js</code>，把 <code>SITE.giscus</code> 里的几项填上，并把 <code>enabled</code> 改成 <code>true</code></li>
         </ul>
       </div>`;

  App.reveal();
})();
