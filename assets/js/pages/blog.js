/* 文章列表页
   ⚠ 这个文件只负责卡片 / 年表 / 筛选的显示逻辑，不含文章内容。
     加删改文章去 data.js 的 POSTS。
     下面的「4」是首页同款、这里展示的文章数量之类的小设定。
 */
(() => {
  App.init("blog.html");

  const grid = document.getElementById("postGrid");
  const arch = document.getElementById("archive");
  const empty = document.getElementById("empty");
  const tagBar = document.getElementById("tagBar");
  const q = document.getElementById("q");

  let tag = "全部";
  let view = "grid";
  let kw = "";

  document.getElementById("totalNum").textContent = POSTS.length;

  /* 标签条 */
  const tags = App.allTags();
  tagBar.innerHTML = [
    `<button class="filter-chip on" data-tag="全部">全部<small>${POSTS.length}</small></button>`,
    ...tags.map(
      ([t, n]) => `<button class="filter-chip" data-tag="${App.esc(t)}">${App.esc(t)}<small>${n}</small></button>`
    ),
  ].join("");

  tagBar.addEventListener("click", (e) => {
    const b = e.target.closest(".filter-chip");
    if (!b) return;
    tag = b.dataset.tag;
    App.$$("#tagBar .filter-chip").forEach((x) => x.classList.toggle("on", x === b));
    render();
  });

  document.querySelector(".view-switch").addEventListener("click", (e) => {
    const b = e.target.closest(".filter-chip");
    if (!b) return;
    view = b.dataset.view;
    App.$$(".view-switch .filter-chip").forEach((x) => x.classList.toggle("on", x === b));
    render();
  });

  q.addEventListener("input", () => {
    kw = q.value.trim().toLowerCase();
    render();
  });

  function match(p) {
    if (tag !== "全部" && !(p.tags || []).includes(tag)) return false;
    if (!kw) return true;
    const hay = (p.title + " " + p.excerpt + " " + (p.tags || []).join(" ") + " " + Markdown.plain(p.body)).toLowerCase();
    return hay.includes(kw);
  }

  function render() {
    const list = App.sortedPosts()
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      .filter(match);

    empty.hidden = list.length > 0;
    grid.hidden = !(view === "grid" && list.length);
    arch.hidden = !(view === "year" && list.length);

    if (view === "grid") {
      grid.innerHTML = list.map(App.postCard).join("");
    } else {
      const byYear = {};
      list.forEach((p) => {
        const y = String(p.date).slice(0, 4);
        (byYear[y] = byYear[y] || []).push(p);
      });
      arch.innerHTML = Object.keys(byYear)
        .sort((a, b) => b - a)
        .map(
          (y) => `
          <div class="year-group reveal">
            <h3>${y}<small>${byYear[y].length} 篇</small></h3>
            ${byYear[y]
              .map(
                (p) => `
              <a class="arch-item" href="${App.postUrl(p.id)}">
                <span class="arch-date">${App.fmtDate(p.date, "short").slice(5)}</span>
                <span class="arch-title">${App.esc(p.title)}</span>
                <span class="arch-tag">${(p.tags || [])[0] || "随笔"}</span>
              </a>`
              )
              .join("")}
          </div>`
        )
        .join("");
    }
    App.reveal();
  }

  render();
})();
