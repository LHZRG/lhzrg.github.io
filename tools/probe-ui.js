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
/* 逐个量所有元素：有没有谁伸到屏幕右边外面去了。
   （body 上开了 overflow-x: clip，横向滚动条不会出现，
     但内容会变成「看得见却滑不到」，只能这样才查得出来） */
window.__stuckOut = function () {
  var bad = [];
  /* 在「可横向滚动」的盒子里超出去是允许的（宽表格就是这么设计的，
     用户能滑到），只有那些滑不到的才是真的丢了 */
  var inScroller = function (el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  document.querySelectorAll('body *').forEach(function (el) {
    var cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none') return;
    var r = el.getBoundingClientRect();
    if (inScroller(el)) return;
    if (r.width < 1 || r.height < 1) return;
    if (r.right > innerWidth + 2 || r.left < -2) {
      bad.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') +
               ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    }
  });
  return { ok: bad.length === 0, why: bad.slice(0, 4).join(' ｜ ') || '没有伸出去的元素' };
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
      const so = await ev("__stuckOut()");
      check(`[手机420] ${page} 没有内容滑不到（伸出屏幕外）`, so.ok, so.why);
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
      const sop = await ev("__stuckOut()");
      check("[桌面] 文章页没有内容伸出屏幕外", sop.ok, sop.why);

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

    /* ---- 条目式（wiki 体例）文章：宽表格 / 信息卡 / 徽章 / 分类盒 ---- */
    if (go("wiki")) {
      await open("post.html?id=richimaj-", 420, 860, true);
      // 找「正文里带表格」的那篇（也就是 wiki 体例那篇），找不到就退回第一篇
      const wid = await ev("(POSTS.find(p=>/\\|\\s*-{3,}/.test(p.body))||POSTS[0]).id");
      await open("post.html?id=" + wid, 420, 860, true);
      await sleep(500);
      let w = await ev("__overflowX()");
      check("[手机] 条目式文章无横向溢出", w.ok, w.why);
      w = await ev("__stuckOut()");
      check("[手机] 没有元素伸到屏幕右边界之外", w.ok, w.why);
      w = await ev(
        "(()=>{var t=document.querySelector('.tw-wide');if(!t)return{ok:false,why:'没找到宽表格'};" +
          "return {ok:t.scrollWidth>t.clientWidth+10,why:'内容宽'+t.scrollWidth+' 可视宽'+t.clientWidth}})()"
      );
      check("[手机] 宽表格在自己的小盒子里可左右滑", w.ok, w.why);
      w = await ev(
        "(()=>{var b=document.querySelector('.wk-infobox');if(!b)return{ok:false,why:'没找到信息卡'};" +
          "var r=b.getBoundingClientRect(),p=b.parentElement.getBoundingClientRect();" +
          "return {ok:Math.abs(r.width-p.width)<40,why:'卡宽'+Math.round(r.width)+' 容器宽'+Math.round(p.width)}})()"
      );
      check("[手机] 信息卡自动变成整块（不再浮右）", w.ok, w.why);
      w = await ev("document.querySelectorAll('.wk-b').length>0");
      check("[手机] 番数徽章已渲染", w === true, String(w));
      w = await ev("__reach('.wk-cat a')");
      check("[手机] 文末分类标签可点击", w.ok, w.why);
      w = await ev("__reach('.tw-hint')");
      check("[手机] 宽表格有「左右滑动」提示", w.ok, w.why);

      /* 所有配图（含中文路径）都要真的加载成功：
         这一条同时回答了「图片路径里能不能写中文」——能，浏览器会自动做百分号编码 */
      await open("post.html?id=" + wid, 1280, 900, false);
      await sleep(600);
      await ev("document.querySelectorAll('#content img').forEach(i=>i.loading='eager')");
      await ev(
        "(()=>{var h=document.body.scrollHeight;for(var y=0;y<h;y+=700){window.scrollTo(0,y)}})()"
      );
      await sleep(2500);
      w = await ev(
        "(()=>{var im=[...document.querySelectorAll('#content img')];" +
          "var bad=im.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src'));" +
          "return {ok:im.length>0&&bad.length===0,why:'共 '+im.length+' 张，加载失败 '+bad.length+(bad.length?'：'+bad[0]:'')}})()"
      );
      check("[桌面] 正文配图全部加载成功（中文路径）", w.ok, w.why);

      await open("post.html?id=" + wid, 1280, 900, false);
      await sleep(500);
      w = await ev(
        "(()=>{var b=document.querySelector('.wk-infobox');var r=b.getBoundingClientRect()," +
          "p=b.parentElement.getBoundingClientRect();" +
          "return {ok:r.right>p.left+p.width*0.6,why:'卡右缘'+Math.round(r.right)+' 容器右缘'+Math.round(p.right)}})()"
      );
      check("[桌面] 信息卡浮在右上角", w.ok, w.why);
      w = await ev("__overflowX()");
      check("[桌面] 条目式文章无横向溢出", w.ok, w.why);
      w = await ev(
        "(()=>{var h=document.querySelector('.tw-hint');" +
          "return {ok:!!h&&getComputedStyle(h).display==='none',why:h?getComputedStyle(h).display:'没找到提示'}})()"
      );
      check("[桌面] 宽表格不显示滑动提示", w.ok, w.why);
    }

    /* ---- 麻将牌编码 [mj ...]：三种形状必须各自等高、且竖牌与横牌对齐 ---- */
    if (go("mj") || go("wiki")) {
      await open("post.html?id=richimaj-", 1280, 900, true);
      await sleep(300);
      /* 页面里临时注入一组牌，量它们的真实渲染尺寸。
         关键断言：同一形状内尺寸必须完全一致（否则牌会大小不一）；
         竖牌的高 == 横牌的宽（这是「一块牌」的基准边长）。 */
      await ev(
        "(()=>{var d=document.createElement('div');d.id='mjprobe';" +
          "d.className='prose';d.innerHTML=Markdown.render(" +
          "'[mj 1m 2m 3m 9s dong]\\n\\n[mj h1m h2m | k11m]');" +
          "document.body.appendChild(d);" +
          "d.querySelectorAll('img.mj').forEach(i=>i.loading='eager');" +
          "return true})()"
      );
      /* 等到所有牌图真的解码完再量尺寸 —— 固定 sleep 在慢机器上会量到 0 宽。 */
      for (let k = 0; k < 25; k++) {
        const r = await ev(
          "(()=>{var im=[...document.querySelectorAll('#mjprobe img.mj')];" +
            "return im.length>0 && im.every(i=>i.complete && i.naturalWidth>0)})()"
        );
        if (r) break;
        await sleep(300);
      }
      await sleep(200);
      let m = await ev(
        "(()=>{var im=[...document.querySelectorAll('#mjprobe img.mj')];" +
          "if(!im.length)return{ok:false,why:'一张牌都没渲染'};" +
          "var bad=im.filter(i=>!i.complete||i.naturalWidth===0);" +
          "return{ok:bad.length===0,why:'共 '+im.length+' 张，加载失败 '+bad.length}})()"
      );
      check("[牌] 编码渲染出的牌图全部加载成功", m.ok, m.why);

      m = await ev(
        "(()=>{var g={};document.querySelectorAll('#mjprobe img.mj').forEach(i=>{" +
          "var k=i.className.replace('mj mj-','');" +
          "var r=i.getBoundingClientRect();" +
          "(g[k]=g[k]||[]).push(Math.round(r.width*10)/10+'x'+Math.round(r.height*10)/10)});" +
          "var bad=[];for(var k in g){var u=[...new Set(g[k])];" +
          "if(u.length>1)bad.push(k+' 尺寸不齐: '+u.join(' / '))}" +
          "return{ok:bad.length===0,why:bad.length?bad.join('; '):'竖牌/横牌/杠图各形状内尺寸完全一致'}})()"
      );
      check("[牌] 同一形状的牌尺寸完全一致（不会大小不一）", m.ok, m.why);

      m = await ev(
        "(()=>{var vt=document.querySelector('#mjprobe img.mj-vt');" +
          "var hz=document.querySelector('#mjprobe img.mj-hz');" +
          "if(!vt||!hz)return{ok:false,why:'没找到竖牌或横牌'};" +
          "var a=vt.getBoundingClientRect(),b=hz.getBoundingClientRect();" +
          "return{ok:Math.abs(a.height-b.width)<1.5," +
          "why:'竖牌高 '+Math.round(a.height)+' vs 横牌宽 '+Math.round(b.width)}})()"
      );
      check("[牌] 竖牌高 = 横牌宽（一块牌的基准边长一致）", m.ok, m.why);

      /* 只查「同一个 .mj-set 内」的相邻牌 —— 组与组之间（| 分隔的副露）
         是刻意留的分组缝，不算间隙 bug。 */
      m = await ev(
        "(()=>{var gap=0,where='';" +
          "document.querySelectorAll('#mjprobe .mj-set').forEach(s=>{" +
          "var im=[...s.querySelectorAll('img.mj')];" +
          "for(var i=1;i<im.length;i++){" +
          "var p=im[i-1].getBoundingClientRect(),q=im[i].getBoundingClientRect();" +
          "var g=q.left-p.right; if(g>gap){gap=g;where=im[i-1].alt+'|'+im[i].alt}}});" +
          "return{ok:gap<1,why:'同组内最大间隙 '+Math.round(gap*10)/10+'px'+(where?'（'+where+'）':'（紧贴）')}})()"
      );
      check("[牌] 同一组内牌与牌紧贴（无额外间隙）", m.ok, m.why);

      /* 副露分组：| 两侧的组之间要能看出分界 */
      m = await ev(
        "(()=>{var s=[...document.querySelectorAll('#mjprobe .mj-set')];" +
          "if(s.length<2)return{ok:true,why:'本次样例没有副露分组'};" +
          "var a=s[0].getBoundingClientRect(),b=s[1].getBoundingClientRect();" +
          "var row=s[0].parentNode.getBoundingClientRect();" +
          "var info='组1['+Math.round(a.left)+','+Math.round(a.top)+' '+Math.round(a.width)+'x'+Math.round(a.height)+']" +
          " 组2['+Math.round(b.left)+','+Math.round(b.top)+'] 行宽'+Math.round(row.width);" +
          "if(Math.abs(a.top-b.top)>6)return{ok:true,why:'两组换行了（容器窄）— '+info};" +
          "var g=b.left-a.right;" +
          "return{ok:g>3&&g<32,why:'副露分组间距 '+Math.round(g)+'px — '+info}})()"
      );
      check("[牌] 副露分组（| 分隔）有明显但不夸张的间距", m.ok, m.why);

      /* 无损校验：产物像素必须够原图分辨率（防止有人为了体积去降采样） */
      m = await ev(
        "(()=>{var vt=document.querySelector('#mjprobe img.mj-vt');" +
          "if(!vt)return{ok:false,why:'没找到竖牌'};" +
          "return{ok:vt.naturalWidth>=272&&vt.naturalHeight>=389," +
          "why:'竖牌原图 '+vt.naturalWidth+'x'+vt.naturalHeight+'（应为 272x389，未降采样）'}})()"
      );
      check("[牌] 牌图保持原始分辨率（未被降采样）", m.ok, m.why);
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
