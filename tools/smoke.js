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
    eval(src.replace(/^const /gm, "var ")); // const 换成 var 才能被这里读到
    const tags = new Set();
    POSTS.forEach((p) => (p.tags || []).forEach((t) => tags.add(t)));
    return {
      ok: true,
      posts: POSTS.length,
      tags: tags.size,
      gallery: GALLERY.length,
      links: LINKS.length,
      skills: SKILLS.length,
      timeline: TIMELINE.length,
      now: NOW.length,
      socials: SITE.socials.length,
    };
  } catch (e) {
    console.log("❌ data.js 读不了：" + e.message + "\n   先把 data.js 修好再跑测试。\n");
    return { ok: false };
  }
})();
if (!DATA.ok) process.exit(1);
console.log(
  "数据体检：" + DATA.posts + " 篇文章 / " + DATA.gallery + " 张照片 / " +
    DATA.links + " 个友链 / " + DATA.socials + " 项联系方式\n"
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
    ["导航链接", d.querySelectorAll("#nav .nav-links a").length, 5],
    ["精选文章卡", d.querySelectorAll("#postGrid .post-card").length, Math.min(4, DATA.posts)],
    ["首页图片墙", d.querySelectorAll("#homeMasonry .shot").length, DATA.gallery + 1],
    ["个人介绍", d.querySelector("#profile").textContent.trim().length > 50, true],
    ["此刻卡片", d.querySelectorAll("#nowGrid .now-card").length, DATA.now],
    ["首页友链", d.querySelectorAll("#homeLinks .link-card").length, Math.min(4, DATA.links)],
  ]],
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
  ["links.html", (d) => [
    ["友链卡片", d.querySelectorAll("#linkGrid .link-card").length, DATA.links],
    ["邮箱按钮", d.querySelector("#mailBtn").textContent.includes("@"), true],
  ]],
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
  for (const [page, checks] of PAGES) {
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
    for (const [name, got, want] of checks(d)) {
      const ok = got === want || (want === true && got === true);
      if (!ok) fail++;
      console.log(`   ${ok ? "✓" : "✗"} ${name}: ${got}${ok ? "" : `  (期望 ${want})`}`);
    }
    dom.window.close();
  }
  console.log(fail ? `\n❌ 有 ${fail} 项未通过` : "\n✅ 全部通过");
  process.exit(fail ? 1 : 0);
})();
