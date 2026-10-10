/**
 * 真实浏览器探针（Chrome + CDP）
 * ------------------------------------------------------------
 * jsdom 只能测 DOM，测不出「谁盖在谁上面」。这个脚本用真 Chrome 做：
 *   1) 命中测试：算出元素的中心点，用 elementFromPoint 看那个位置真正被谁占着
 *      —— 如果点不到（被别的东西盖住），就会直接报出来。
 *   2) 吸顶测试：滚动后导航栏是否还贴在顶部
 *   3) 溢出测试：窄屏下有没有横向滚动条
 *   4) 弹层测试：搜索 / 灯箱 / 友链弹窗打开后，按钮是不是真的点得到
 *
 * 用法：node tools/probe-ui.js            （跑全部）
 *       node tools/probe-ui.js home       （只跑名字里含 home 的用例）
 * 退出码：0 = 全过；1 = 有问题
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = 9333;
const CHROME =
  process.env.CHROME_PATH ||
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((p) => fs.existsSync(p));

const url = (f) => "file:///" + path.join(ROOT, f).replace(/\\/g, "/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 极简 CDP 客户端（不依赖任何 npm 包） ---------------- */
function makeSession(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => pending.has(i) && (pending.delete(i), reject(new Error(method + " 超时"))), 15000);
    });
}

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch (e) {}
    await sleep(250);
  }
  throw new Error("Chrome 调试端口没起来");
}

/* ---------------- 页面里的探针函数 ---------------- */
const PROBE = `
window.__hit = function (sel, nth) {
  var els = document.querySelectorAll(sel);
  var el = els[nth || 0];
  if (!el) return { ok: false, why: '找不到元素 ' + sel };
  var r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { ok: false, why: '尺寸为 0', rect: [r.x, r.y, r.width, r.height] };
  var cs = getComputedStyle(el);
  if (cs.pointerEvents === 'none') return { ok: false, why: '元素自己 pointer-events:none（多半是还没显示出来）' };
  if (cs.visibility === 'hidden') return { ok: false, why: '元素 visibility:hidden' };
  if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth)
    return { ok: false, why: '不在可视区域内', rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
  var x = r.left + r.width / 2, y = r.top + r.height / 2;
  var top = document.elementFromPoint(x, y);
  if (!top) return { ok: false, why: '该点没有任何元素' };
  var ok = top === el || el.contains(top) || top.contains(el);
  return {
    ok: ok,
    why: ok ? '' : '被 <' + top.tagName.toLowerCase() + ' class="' + (top.className || '') + '"> 盖住了',
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]
  };
};
window.__reach = function (sel, nth) {   // 先滚到元素附近再命中测试
  var el = document.querySelectorAll(sel)[nth || 0];
  if (!el) return { ok: false, why: '找不到元素 ' + sel };
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  return window.__hit(sel, nth);
};
window.__visible = function (sel) {
  var el = document.querySelector(sel);
  if (!el) return { ok: false, why: '找不到 ' + sel };
  var cs = getComputedStyle(el);
  var r = el.getBoundingClientRect();
  var shown = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 &&
              cs.pointerEvents !== 'none' && r.width > 0 && r.height > 0;
  return { ok: shown, why: shown ? '' : 'display=' + cs.display + ' opacity=' + cs.opacity + ' pe=' + cs.pointerEvents };
};
window.__overflowX = function () {
  return { ok: document.documentElement.scrollWidth <= innerWidth + 1,
           why: document.documentElement.scrollWidth + ' > ' + innerWidth };
};
`;

/* ---------------- 用例 ---------------- */
const results = [];
function check(name, ok, extra) {
  results.push({ name, ok, extra });
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}${ok || !extra ? "" : "  →  " + extra}`);
}

async function main() {
  if (!CHROME) throw new Error("没找到 Chrome / Edge");
  const only = process.argv[2] || "";
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "ylj-cdp-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--window-size=420,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    await waitForDevtools();
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const target = list.find((t) => t.type === "page");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.addEventListener("open", r, { once: true });
      ws.addEventListener("error", j, { once: true });
    });
    const send = makeSession(ws);
    await send("Page.enable");
    await send("Runtime.enable");

    /* 收集页面自己报的错（脚本异常 + console.error） */
    let pageErrors = [];
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails || {};
        pageErrors.push("脚本异常：" + ((d.exception && d.exception.description) || d.text || "未知"));
      } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
        const a = (m.params.args || [])[0] || {};
        pageErrors.push("console.error：" + (a.value || a.description || ""));
      }
    });

    const ev = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "页面脚本报错");
      return r.result.value;
    };

    async function open(file, w, h, mobile) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile,
      });
      pageErrors = [];
      await send("Page.navigate", { url: url(file) });
      for (let i = 0; i < 80; i++) {
        await sleep(120);
        const st = await ev("document.readyState").catch(() => "loading");
        if (st === "complete") break;
      }
      await sleep(600); // 等进场动画
      await ev(PROBE);
      if (go("console")) {
        check(`${file} 控制台无报错`, pageErrors.length === 0, pageErrors.slice(0, 3).join(" ｜ "));
      }
    }
    /* 发一个真实的鼠标滚轮事件（等价于用户用手指划 / 滚轮滑） */
    const wheel = (x, y, dy) =>
      send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: dy });

    const go = (n) => !only || n.includes(only);

    /* ========== 手机端 420×860 ========== */
    for (const page of ["home.html", "blog.html", "gallery.html", "tools.html", "links.html", "about.html"]) {
      if (!go("mobile")) break;
      await open(page, 420, 860, true);
      const ov = await ev("__overflowX()");
      check(`[手机420] ${page} 无横向溢出`, ov.ok, ov.why);
    }

    if (go("nav")) {
      /* --- 汉堡菜单展开后，每一项都要能点到 --- */
      await open("home.html", 420, 860, true);
      await ev("document.querySelector('#burger').click()");
      await sleep(400);
      const names = await ev(
        "[...document.querySelectorAll('#navLinks a')].map(a=>a.textContent.trim())"
      );
      const vis = await ev("__visible('#navLinks')");
      check("[手机] 汉堡菜单展开后可见", vis.ok, vis.why);
      for (let i = 0; i < names.length; i++) {
        const h = await ev(`__hit('#navLinks a', ${i})`);
        check(`[手机] 菜单项「${names[i]}」可点击`, h.ok, h.why);
      }
      /* --- 点外面 / 按 ESC 要收起 --- */
      await ev("document.elementFromPoint(210, 700)?.dispatchEvent(new MouseEvent('click',{bubbles:true}))");
      await sleep(350);
      let closed = await ev("!document.querySelector('#navLinks').classList.contains('open')");
      check("[手机] 点菜单外面能收起", closed);
      await ev("document.querySelector('#burger').click()");
      await sleep(300);
      await ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
      await sleep(350);
      closed = await ev("!document.querySelector('#navLinks').classList.contains('open')");
      check("[手机] 按 ESC 能收起菜单", closed);

      /* --- 滚动后导航栏要吸顶 --- */
      await ev("window.scrollTo(0, 1200)");
      await sleep(500);
      const stick = await ev("(()=>{var n=document.querySelector('.nav')||document.querySelector('#nav');var r=n.getBoundingClientRect();return {top:Math.round(r.top),h:Math.round(r.height)}})()");
      check("[手机] 滚动 1200px 后导航栏仍吸顶", Math.abs(stick.top) <= 1, "top=" + stick.top);
      await ev("window.scrollTo(0,0)");
      await sleep(300);

      /* --- 桌面端：菜单是横排的，也要点得到 --- */
      await open("home.html", 1280, 860, false);
      const dn = await ev("[...document.querySelectorAll('#navLinks a')].map(a=>a.textContent.trim())");
      for (let i = 0; i < dn.length; i++) {
        const h = await ev(`__hit('#navLinks a', ${i})`);
        check(`[桌面] 菜单项「${dn[i]}」可点击`, h.ok, h.why);
      }
      await ev("window.scrollTo(0, 1500)");
      await sleep(500);
      const s2 = await ev("(()=>{var n=document.querySelector('.nav')||document.querySelector('#nav');return Math.round(n.getBoundingClientRect().top)})()");
      check("[桌面] 滚动后导航栏吸顶", Math.abs(s2) <= 1, "top=" + s2);
    }

    if (go("search")) {
      await open("home.html", 420, 860, true);
      await ev("App.openSearch()");
      await sleep(400);
      let h = await ev("__hit('#searchInput')");
      check("[手机] 搜索框可点击", h.ok, h.why);
      await ev("document.querySelector('#searchInput').value='光';document.querySelector('#searchInput').dispatchEvent(new Event('input'))");
      await sleep(300);
      h = await ev("__hit('.search-hit')");
      check("[手机] 搜索结果可点击", h.ok, h.why);
      await ev("document.querySelector('#searchPanel').click()");
      await sleep(350);
      check("[手机] 点暗处关闭搜索", await ev("!document.querySelector('#searchPanel').classList.contains('open')"));
    }

    if (go("links")) {
      await open("links.html", 420, 860, true);
      await ev("document.querySelector('.link-card')?.click()");
      await sleep(500);
      check("[手机] 友链弹窗打开", await ev("document.querySelector('#linkModal').classList.contains('open')"));
      let h = await ev("__hit('#lmGo')");
      check("[手机] 「点击跳转」按钮可点击", h.ok, h.why);
      h = await ev("__hit('.lm-x')");
      check("[手机] 弹窗右上角叉号可点击", h.ok, h.why);
      h = await ev("__visible('.lm-shotimg')");
      check("[手机] 快照区可见", h.ok, h.why);
      await ev("document.querySelector('.lm-x').click()");
      await sleep(350);
      check("[手机] 叉号能关掉弹窗", await ev("!document.querySelector('#linkModal').classList.contains('open')"));

      await open("links.html", 1280, 860, false);
      await ev("document.querySelector('.link-card')?.click()");
      await sleep(500);
      h = await ev("__hit('#lmGo')");
      check("[桌面] 「点击跳转」按钮可点击", h.ok, h.why);
    }

    if (go("lightbox")) {
      await open("gallery.html", 420, 860, true);
      await ev("document.querySelector('.shot')?.click()");
      await sleep(500);
      check("[手机] 灯箱打开", await ev("document.querySelector('#lightbox').classList.contains('open')"));
      let h = await ev("__hit('.lb-next')");
      check("[手机] 灯箱「下一张」可点击", h.ok, h.why);
      h = await ev("__hit('.lb-close')");
      check("[手机] 灯箱关闭键可点击", h.ok, h.why);
      await ev("document.querySelector('.lb-close').click()");
      await sleep(350);
      check("[手机] 灯箱能关掉", await ev("!document.querySelector('#lightbox').classList.contains('open')"));
    }

    if (go("totop")) {
      await open("home.html", 420, 860, true);
      await ev("window.scrollTo(0, 2000)");
      await sleep(600);
      let h = await ev("__hit('#toTop')");
      check("[手机] 回到顶部按钮可点击", h.ok, h.why);
      await ev("window.scrollTo(0, document.body.scrollHeight)");
      await sleep(600);
      h = await ev("__hit('#toTop')");
      check("[手机] 滚到最底部时回到顶部按钮没被页脚盖住", h.ok, h.why);
    }

    if (go("tools")) {
      await open("tools.html", 420, 860, true);
      let h = await ev("__reach('#diceRoll')");
      check("[手机] 骰子「扔一把」按钮可点击", h.ok, h.why);
      h = await ev("__reach('#coinRoll')");
      check("[手机] 硬币「扔一把」按钮可点击", h.ok, h.why);
      /* 选地区 → 选校内/校外 → 抽一张，一路都要点得到 */
      h = await ev("__reach('#foodArea button')");
      check("[手机] 餐厅地区按钮可点击", h.ok, h.why);
      h = await ev("__reach('#foodZone button')");
      check("[手机] 校内/校外按钮可点击", h.ok, h.why);
      h = await ev("__reach('#foodDraw')");
      check("[手机] 「今天吃什么」抽取按钮可点击", h.ok, h.why);
      await ev("document.querySelector('#foodDraw').click()");
      await sleep(1400);
      h = await ev("__reach('#foodShot')");
      check("[手机] 餐厅卡片「存成图片」按钮可点击", h.ok, h.why);
      h = await ev("__reach('#shotNext')");
      check("[手机] 餐厅照片「下一张」可点击", h.ok, h.why);
      const ov = await ev("__overflowX()");
      check("[手机] 工具页无横向溢出", ov.ok, ov.why);
    }

    /* ---- 入口页（加载页）的「推门」按钮 ---- */
    if (go("index")) {
      await open("index.html", 420, 860, true);
      /* 加载页要等进度条走完，按钮才会解锁（.ready），这是设计好的 */
      for (let i = 0; i < 100; i++) {
        if (await ev("document.querySelector('#door')?.classList.contains('ready')")) break;
        await sleep(200);
      }
      let h = await ev("__hit('#door')");
      check("[手机] 加载页「推门」按钮可点击", h.ok, h.why);
      h = await ev("__visible('#qText')");
      check("[手机] 加载页美句已显示", h.ok, h.why);
      const ov = await ev("__overflowX()");
      check("[手机] 加载页无横向溢出", ov.ok, ov.why);
      await open("404.html", 420, 860, true);
      const ov4 = await ev("__overflowX()");
      check("[手机] 404 页无横向溢出", ov4.ok, ov4.why);
    }

    /* ---- 首页各栏目里的卡片，手机上都要点得到 ---- */
    if (go("home")) {
      await open("home.html", 420, 860, true);
      for (const [sel, label] of [
        [".post-card", "文章卡片"],
        [".shot[data-i]", "首页照片"],
        [".tool-entry", "工具入口卡"],
        [".link-card", "友链卡片"],
        [".more-link", "栏目右上角的「全部」链接"],
      ]) {
        const h = await ev(`__reach('${sel}')`);
        check(`[手机] 首页 ${label} 可点击`, h.ok, h.why);
      }
      /* 滚到一半再展开菜单（此时导航是吸顶状态），菜单仍要能点 */
      await ev("window.scrollTo(0, 1500)");
      await sleep(500);
      await ev("document.querySelector('#burger').click()");
      await sleep(400);
      const h = await ev("__hit('#navLinks a', 1)");
      check("[手机] 滚动后展开菜单，「文章」仍可点击", h.ok, h.why);
    }

    /* ---- 弹层打开时，背景不该跟着滚 ---- */
    if (go("lock")) {
      await open("home.html", 420, 860, true);
      await ev("window.scrollTo(0, 600)");
      await sleep(400);
      const y0 = await ev("Math.round(window.scrollY)");
      await ev("App.openSearch()");
      await sleep(350);
      /* ⚠ 必须用真的滚轮事件来测：overflow:hidden 只挡「用户滚动」，
         脚本里的 window.scrollBy 照样能滚，用它测会误判。 */
      await wheel(210, 500, 500);
      await sleep(350);
      const y1 = await ev("Math.round(window.scrollY)");
      check("[手机] 搜索面板打开时背景锁住不滚", Math.abs(y1 - y0) <= 2, `${y0} → ${y1}`);
      await ev("document.querySelector('#searchPanel').click()");
      await sleep(400);
      const y2 = await ev("Math.round(window.scrollY)");
      check("[手机] 关掉搜索后滚动位置没跑掉", Math.abs(y2 - y0) <= 2, `${y0} → ${y2}`);

      /* 灯箱 / 友链弹窗同理 */
      await open("gallery.html", 420, 860, true);
      await ev("window.scrollTo(0, 600)");
      await sleep(400);
      const g0 = await ev("Math.round(window.scrollY)");
      await ev("document.querySelector('.shot').click()");
      await sleep(500);
      await wheel(210, 500, 500);
      await sleep(350);
      const g1 = await ev("Math.round(window.scrollY)");
      check("[手机] 灯箱打开时背景锁住不滚", Math.abs(g1 - g0) <= 2, `${g0} → ${g1}`);
      await ev("document.querySelector('.lb-close').click()");
      await sleep(400);
      check("[手机] 关掉灯箱后滚动位置没跑掉", Math.abs((await ev("Math.round(window.scrollY)")) - g0) <= 2);

      await open("links.html", 420, 860, true);
      await ev("window.scrollTo(0, 600)");
      await sleep(400);
      const l0 = await ev("Math.round(window.scrollY)");
      await ev("document.querySelector('.link-card').click()");
      await sleep(500);
      await wheel(210, 500, 500);
      await sleep(350);
      const l1 = await ev("Math.round(window.scrollY)");
      check("[手机] 友链弹窗打开时背景锁住不滚", Math.abs(l1 - l0) <= 2, `${l0} → ${l1}`);
      await ev("document.querySelector('.lm-x').click()");
      await sleep(400);
      check("[手机] 关掉友链弹窗后滚动位置没跑掉", Math.abs((await ev("Math.round(window.scrollY)")) - l0) <= 2);
    }

    /* ---- 文章列表页 / 文章详情页 ---- */
    if (go("blog")) {
      await open("blog.html", 420, 860, true);
      let h = await ev("__reach('.post-card')");
      check("[手机] 文章列表页卡片可点击", h.ok, h.why);
      h = await ev("__reach('#tagBar button')");
      check("[手机] 文章页标签筛选可点击", h.ok, h.why);

      await open("post.html?id=" + (await (async () => {
        await open("blog.html", 1280, 860, false);
        return ev("POSTS[0].id");
      })()), 1280, 860, false);
      await sleep(400);
      h = await ev("__hit('#toc a')");
      check("[桌面] 文章页目录链接可点击", h.ok, h.why);
      await ev("window.scrollTo(0, 1500)");
      await sleep(600);
      h = await ev("__hit('#toTop')");
      check("[桌面] 文章页回到顶部可点击", h.ok, h.why);
      const ovp = await ev("__overflowX()");
      check("[桌面] 文章页无横向溢出", ovp.ok, ovp.why);

      /* 吸顶的导航不能把「跳过去的标题」压住 */
      await ev("document.querySelector('#toc a').click()");
      await sleep(1000);
      const anc = await ev(
        "(()=>{var id=document.querySelector('#toc a').getAttribute('href').slice(1);" +
          "var t=document.getElementById(id);if(!t)return{skip:true};" +
          "return {navBottom:Math.round(document.querySelector('.nav').getBoundingClientRect().bottom),top:Math.round(t.getBoundingClientRect().top)}})()"
      );
      check(
        "[桌面] 点目录跳转后，标题没被吸顶导航压住",
        anc.skip || anc.top >= anc.navBottom - 1,
        JSON.stringify(anc)
      );

      await open("links.html#apply", 420, 860, true);
      await sleep(700);
      const ap = await ev(
        "(()=>{var t=document.getElementById('apply');var n=document.querySelector('.nav').getBoundingClientRect();" +
          "return {navBottom:Math.round(n.bottom),top:Math.round(t.getBoundingClientRect().top)}})()"
      );
      check("[手机] 页脚「交换友链」跳转后没被导航压住", ap.top >= ap.navBottom - 1, JSON.stringify(ap));
    }

    ws.close();
  } finally {
    chrome.kill();
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  }

  const bad = results.filter((r) => !r.ok);
  console.log("\n" + "=".repeat(56));
  console.log(`共 ${results.length} 项，通过 ${results.length - bad.length}，失败 ${bad.length}`);
  if (bad.length) {
    console.log("\n失败清单：");
    bad.forEach((b) => console.log("  · " + b.name + (b.extra ? "  → " + b.extra : "")));
  }
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error("探针跑挂了：", e.message);
  process.exit(2);
});
