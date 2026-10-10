/**
 * 本地冒烟测试：用 jsdom 跑一遍所有页面，检查有没有运行时报错、关键区块有没有渲染出来。
 * 用法：
 *   1) 先起服务器：python -m http.server 8123
 *   2) node tools/smoke.js
 */
const { JSDOM, VirtualConsole } = require("jsdom");

/* ---- 先读一遍 data.js，所有期望值都跟着数据走 ----
   这样你增删文章 / 照片 / 友链 / 联系方式之后，测试不会误报。
   如果 data.js 本身有语法错误（漏逗号之类），这里会直接告诉你。 */
const DATA = (() => {
  try {
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "..", "assets", "js", "data.js"),
      "utf8"
    );
    // 用 new Function 包一层，比 eval + 替换 const 更稳（也不会误伤文件内容）
    const D = new Function(
      src +
        "\nreturn ({SITE,POSTS,QUOTES,GALLERY,LINKS,TIMELINE,NOW,SKILLS,HOME_LAYOUT,TOOLS,TOOLS_CONFIG,FOOD_AREAS,FOOD_SPOTS});"
    )();
    const tags = new Set();
    D.POSTS.forEach((p) => (p.tags || []).forEach((t) => tags.add(t)));
    const L = D.HOME_LAYOUT || {};
    const cnt = (k, all) => {
      const v = Number(L[k]);
      return v > 0 ? Math.min(v, all) : all;
    };
    return {
      ok: true,
      posts: D.POSTS.length,
      tags: tags.size,
      gallery: D.GALLERY.length,
      links: D.LINKS.length,
      skills: D.SKILLS.length,
      timeline: D.TIMELINE.length,
      now: D.NOW.length,
      socials: D.SITE.socials.length,
      /* 首页每个栏目按 HOME_LAYOUT 的数字显示几条 */
      homePosts: cnt("posts", D.POSTS.length),
      homeGallery: cnt("gallery", D.GALLERY.length),
      homeLinks: cnt("links", D.LINKS.length),
      homeNow: cnt("now", D.NOW.length),
      homeTools: cnt("tools", (D.TOOLS || []).length),
      tools: (D.TOOLS || []).length,
      areas: (D.FOOD_AREAS || []).length,
      spots: (D.FOOD_SPOTS || []).length,
      /* 实用工具的参数（骰子最多几颗、动画多长），测试按它来等动画 */
      cfg: D.TOOLS_CONFIG || { diceMax: 10, coinMax: 10, rollMs: 900, flipMs: 1100, foodDrawMs: 700 },
      /* 首页图片墙末尾那张「光影待续」占位卡，只在照片全部显示完时才出现 */
      galleryPlaceholder: Number(L.gallery) > 0 && Number(L.gallery) < D.GALLERY.length ? 0 : 1,
    };
  } catch (e) {
    console.log("❌ data.js 读不了：" + e.message + "\n   先把 data.js 修好再跑测试。\n");
    return { ok: false };
  }
})();
if (!DATA.ok) process.exit(1);
console.log(
  "数据体检：" + DATA.posts + " 篇文章 / " + DATA.gallery + " 张照片 / " +
    DATA.links + " 个友链 / " + DATA.socials + " 项联系方式"
);
console.log(
  "首页显示：" + DATA.homePosts + " 篇文章 / " + DATA.homeGallery + " 张照片 / " +
    DATA.homeLinks + " 个友链 / " + DATA.homeNow + " 项此刻 / " + DATA.homeTools + " 个工具\n"
);

const BASE = process.env.BASE || "http://127.0.0.1:8123";
const PAGES = [
  ["index.html", (d) => [
    ["门按钮", d.querySelector("#door") !== null, true],
    ["美句已渲染", d.querySelector("#qText").textContent.trim().length > 6, true],
    ["进度条", d.querySelector("#barFill") !== null, true],
    ["浮尘粒子", d.querySelectorAll(".dust i").length, 18],
    ["转场层", d.querySelector("#wipe") !== null, true],
  ]],
  ["home.html", (d) => [
    ["搜索面板", d.querySelector("#searchPanel") !== null, true],
    ["回到顶部", d.querySelector("#toTop") !== null, true],
    ["导航链接", d.querySelectorAll("#nav .nav-links a").length, 6],
    ["精选文章卡", d.querySelectorAll("#postGrid .post-card").length, DATA.homePosts],
    ["首页图片墙", d.querySelectorAll("#homeMasonry .shot").length, DATA.homeGallery + DATA.galleryPlaceholder],
    ["个人介绍", d.querySelector("#profile").textContent.trim().length > 50, true],
    ["此刻卡片", d.querySelectorAll("#nowGrid .now-card").length, DATA.homeNow],
    ["首页工具入口", d.querySelectorAll("#homeTools .tool-entry").length, DATA.homeTools],
    ["工具入口有链接", /tools\.html#/.test(d.querySelector("#homeTools .tool-entry").getAttribute("href") || ""), true],
    ["首页友链", d.querySelectorAll("#homeLinks .link-card").length, DATA.homeLinks],
  ], async (d, w) => {
    /* 首页的友链卡片也应该弹出同一个详情窗格 */
    const card = d.querySelector("#homeLinks .link-card[data-i]");
    const modal = d.querySelector("#linkModal");
    card.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(120);
    const out = [
      ["首页点友链也弹窗", modal.classList.contains("open"), true],
      ["弹的是这张卡的内容", d.querySelector("#lmName").textContent.trim().length > 0, true],
    ];
    modal.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    await sleep(100);
    return out;
  }],
  ["blog.html", (d) => [
    ["文章卡总数", d.querySelectorAll("#postGrid .post-card").length, DATA.posts],
    ["标签按钮(全部+去重标签)", d.querySelectorAll("#tagBar .filter-chip").length, DATA.tags + 1],
    ["文章总数", d.querySelector("#totalNum").textContent, String(DATA.posts)],
  ]],
  ["post.html?id=afternoon-light", (d) => [
    ["标题", d.querySelector("#title").textContent.includes("下午三点"), true],
    ["正文段落", d.querySelectorAll("#content p").length > 4, true],
    ["目录项", d.querySelectorAll("#toc a").length, 3],
    ["上下篇", d.querySelectorAll("#postNav a").length, 2],
    ["相关文章", d.querySelectorAll("#related .post-card").length > 0, true],
    ["评论区", d.querySelector("#giscus").textContent.trim().length > 10, true],
  ]],
  ["post.html?id=not-exist", (d) => [
    ["不存在的文章显示 404", d.querySelector(".nf") !== null, true],
  ]],
  ["gallery.html", (d) => [
    ["相册张数", d.querySelectorAll("#galleryGrid .shot").length, DATA.gallery + 1],
    ["计数文案", d.querySelector("#shotNum").textContent, String(DATA.gallery)],
  ]],
  ["tools.html", (d) => [
    ["工具面板", d.querySelectorAll(".tool-panel").length, DATA.tools],
    ["骰子数量按钮", d.querySelectorAll("#dicePick .num-pick").length, DATA.cfg.diceMax],
    ["硬币数量按钮", d.querySelectorAll("#coinPick .num-pick").length, DATA.cfg.coinMax],
    ["地区选项", d.querySelectorAll("#foodArea .seg-btn").length, DATA.areas],
    ["范围选项", d.querySelectorAll("#foodZone .seg-btn").length > 0, true],
    ["范围提示", d.querySelector("#foodCount").textContent.trim().length > 0, true],
  ], async (d, w) => {
    const out = [];
    const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    const cfg = DATA.cfg;

    /* ① 骰子：选 3 颗扔一把 */
    click(d.querySelectorAll("#dicePick .num-pick")[2]);
    click(d.querySelector("#diceRoll"));
    await sleep(cfg.rollMs + 3 * 70 + 300);
    out.push(["骰子落下 3 颗", d.querySelectorAll("#diceTray .die").length, 3]);
    out.push(["骰面已定点数", d.querySelectorAll("#diceTray .die-face i.on").length > 0, true]);
    out.push(["输出了总和", /总和/.test(d.querySelector("#diceResult").textContent), true]);

    /* ② 硬币：选 4 枚扔一把 */
    click(d.querySelectorAll("#coinPick .num-pick")[3]);
    click(d.querySelector("#coinRoll"));
    await sleep(cfg.flipMs + 4 * 90 + 4 * 60 + 500);
    out.push(["硬币落下 4 枚", d.querySelectorAll("#coinTray .coin").length, 4]);
    out.push(["两面图案已画上", d.querySelectorAll("#coinTray .coin-art").length, 4]);
    out.push(["输出了正反面", /正面/.test(d.querySelector("#coinResult").textContent), true]);

    /* ③ 今天吃什么：抽一张，翻照片，再换一家 */
    click(d.querySelector("#foodDraw"));
    await sleep(cfg.foodDrawMs + 300);
    out.push(["抽出餐厅卡", d.querySelector(".food-card") !== null, true]);
    out.push(["有店名", d.querySelector(".food-card .food-title h3").textContent.trim().length > 0, true]);
    out.push(["照片可翻页", d.querySelectorAll(".food-card .shot-track img").length, 2]);
    out.push(["有存图按钮", d.querySelector("#foodShot") !== null, true]);
    const track = d.querySelector("#shotTrack");
    click(d.querySelector("#shotNext"));
    await sleep(100);
    out.push(["翻到第二张", /-100%/.test(track.style.transform), true]);
    out.push(["张数提示更新", d.querySelector("#shotCount").textContent.trim(), "2 / 2"]);
    click(d.querySelector("#foodAgain"));
    await sleep(cfg.foodDrawMs + 300);
    out.push(["换一家仍抽到卡", d.querySelector(".food-card") !== null, true]);
    return out;
  }],
  ["links.html", (d) => [
    ["友链卡片", d.querySelectorAll("#linkGrid .link-card").length, DATA.links],
    ["卡片都带下标", d.querySelectorAll("#linkGrid .link-card[data-i]").length, DATA.links],
    ["悬停箭头", d.querySelectorAll("#linkGrid .link-peek").length, DATA.links],
    ["弹窗容器", d.querySelector("#linkModal") !== null, true],
    ["邮箱按钮", d.querySelector("#mailBtn").textContent.includes("@"), true],
  ], async (d, w) => {
    /* 模拟点开第一个友链卡片，检查弹窗是否正确填充，再测关闭 */
    const out = [];
    const card = d.querySelector("#linkGrid .link-card[data-i]");
    const modal = d.querySelector("#linkModal");
    card.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(120);
    out.push(["点卡片后弹窗打开", modal.classList.contains("open"), true]);
    /* 锁是加在 <html> 上的（锁 body 会和 body 上的 overflow-x:clip 打架） */
    out.push([
      "背景锁定滚动",
      d.documentElement.style.overflow || d.body.style.overflow,
      "hidden",
    ]);
    out.push(["站名已填入", d.querySelector("#lmName").textContent.trim().length > 0, true]);
    out.push(["快照区有图或占位", d.querySelector("#lmShot").children.length > 0, true]);
    out.push(["评价已渲染", d.querySelectorAll("#lmReview p").length > 0, true]);
    out.push(["跳转按钮有链接", /^https?:/.test(d.querySelector("#lmGo").getAttribute("href") || ""), true]);
    // 点窗格外 → 关闭
    modal.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    await sleep(120);
    out.push(["点窗外可关闭", modal.classList.contains("open"), false]);
    // 再开一次，测 ESC
    card.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(120);
    d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(120);
    out.push(["ESC 可关闭", modal.classList.contains("open"), false]);
    // 再开一次，测右上角叉号
    card.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(120);
    d.querySelector(".lm-x").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    await sleep(120);
    out.push(["叉号可关闭", modal.classList.contains("open"), false]);
    return out;
  }],
  ["about.html", (d) => [
    ["技能条", d.querySelectorAll("#skillList .skill").length, DATA.skills],
    ["时间轴", d.querySelectorAll("#timeline .tl-item").length, DATA.timeline],
    ["联系方式", d.querySelectorAll("#contactRow a").length, DATA.socials],
  ]],
  ["404.html", (d) => [
    ["404 区块", d.querySelector(".nf-num") !== null, true],
  ]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let fail = 0;
  for (const [page, checks, interact] of PAGES) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => errors.push(e.message));
    vc.on("error", (...a) => errors.push(String(a[0])));

    const dom = await JSDOM.fromURL(`${BASE}/${page}`, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(w) {
        w.IntersectionObserver = class {
          constructor(cb) {
            this.cb = cb;
          }
          observe(el) {
            this.cb([{ isIntersecting: true, target: el }]);
          }
          unobserve() {}
          disconnect() {}
        };
      },
    });
    await sleep(700);
    const d = dom.window.document;
    const title = d.title;
    console.log(`\n── ${page}  「${title}」`);
    if (errors.length) {
      fail++;
      errors.forEach((e) => console.log(`   ✗ 运行时错误: ${e.slice(0, 200)}`));
    }
    const staticChecks = checks(d);
    const liveChecks = interact ? await interact(d, dom.window) : [];
    for (const [name, got, want] of [...staticChecks, ...liveChecks]) {
      const ok = got === want || (want === true && got === true);
      if (!ok) fail++;
      console.log(`   ${ok ? "✓" : "✗"} ${name}: ${got}${ok ? "" : `  (期望 ${want})`}`);
    }
    dom.window.close();
  }
  console.log(fail ? `\n❌ 有 ${fail} 项未通过` : "\n✅ 全部通过");
  process.exit(fail ? 1 : 0);
})();
