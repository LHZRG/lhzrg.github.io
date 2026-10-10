/* ============================================================
   语林集 · 加载页交互（index.html 用）
   想改的东西基本不在这里：
     · 轮播的美言美句    → assets/js/data.js 的 QUOTES
     · 站名 / 英文名      → index.html 的 .t1 / .t2
     · 按钮、光晕、句子样式 → assets/css/loading.css
   这里只有两处文案值得改（下面已标注 ★）
   ============================================================ */
(() => {
  const $ = (s) => document.querySelector(s);

  /* ---------- 浮尘 ---------- */
  const dust = $("#dust");
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("i");
    const size = 2 + Math.random() * 3;
    p.style.width = p.style.height = size + "px";
    p.style.left = 8 + Math.random() * 84 + "%";
    p.style.top = 20 + Math.random() * 90 + "%";
    p.style.setProperty("--dx", (Math.random() * 90 - 45).toFixed(0) + "px");
    p.style.animationDuration = 12 + Math.random() * 16 + "s";
    p.style.animationDelay = (-Math.random() * 20).toFixed(1) + "s";
    p.style.opacity = 0.3 + Math.random() * 0.5;
    dust.appendChild(p);
  }

  /* ---------- 美句轮播 ---------- */
  const qBox = $("#quote");
  const qText = $("#qText");
  const qBy = $("#qBy");
  let qi = Math.floor(Math.random() * QUOTES.length);

  const showQuote = (i, first = false) => {
    const q = QUOTES[i % QUOTES.length];
    qText.textContent = q.text;
    qBy.textContent = q.by;
    qBox.classList.remove("out");
    void qBox.offsetWidth;
    qBox.classList.add("in");
    if (first) setTimeout(() => qBox.classList.remove("in"), 2000);
  };
  showQuote(qi, true);
  setInterval(() => {
    qBox.classList.add("out");
    qBox.classList.remove("in");
    setTimeout(() => {
      qi++;
      qText.textContent = QUOTES[qi % QUOTES.length].text;
      qBy.textContent = QUOTES[qi % QUOTES.length].by;
      qBox.classList.remove("out");
      void qBox.offsetWidth;
      qBox.classList.add("in");
    }, 760);
  }, 5600);

  /* ---------- 预加载 & 进度 ---------- */
  const IMAGES = [...new Set([SITE.heroImage, SITE.avatar, ...GALLERY.map((g) => g.src)])];
  /* ★改这里：进度条下方的加载提示文案。
     格式：[进度百分比, 该进度时显示的文字]，随意增删，句子不用押韵 */
  const STATUS = [
    [0, "正在擦亮玻璃…"],
    [22, "把椅子搬到光里…"],
    [46, "先泡一杯茉莉花茶…"],
    [70, "摊开今天的小说…"],
    [92, "正在组织麻雀…"],
    [100, "光线刚好，可以进来了喵"],
  ];
  const T0 = performance.now();
  const MIN_MS = 3000; // ★改这里：加载页最短停留时间（毫秒），2400 = 2.4 秒

  const fill = $("#barFill");
  const pct = $("#pct");
  const status = $("#status");
  const door = $("#door");
  const hint = $("#hint");

  let done = 0;
  let cur = 0;
  let target = 4;
  let finished = false;

  const bump = () => {
    done++;
    target = Math.min(96, 8 + (done / IMAGES.length) * 88);
    if (done >= IMAGES.length) finish();
  };
  IMAGES.forEach((src) => {
    const im = new Image();
    im.onload = bump;
    im.onerror = bump;
    im.src = src;
  });
  // 保险：最迟 6 秒放行
  setTimeout(() => !finished && finish(), 6000);

  const tick = setInterval(() => {
    cur += (target - cur) * 0.14 + 0.35;
    if (cur > target) cur = target;
    const v = Math.min(100, Math.round(cur));
    fill.style.width = v + "%";
    pct.textContent = v + "%";
    status.textContent = (STATUS.filter((s) => v >= s[0]).pop() || STATUS[0])[1];
  }, 70);

  function finish() {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, MIN_MS - (performance.now() - T0));
    setTimeout(() => {
      target = 100;
      setTimeout(() => {
        clearInterval(tick);
        fill.style.width = "100%";
        pct.textContent = "100%";
        status.textContent = "光线刚好，可以进来了喵";
        door.disabled = false;
        door.classList.add("ready");
        hint.textContent = "尝试越过最后的门扉"; // ★改这里：按钮下方那行小提示
      }, 420);
    }, wait);
  }

  /* ---------- 推门 ---------- */
  let leaving = false;
  function enter(e) {
    if (leaving || door.disabled) return;
    leaving = true;
    // 从点击处扩散暖光
    const wipe = $("#wipe");
    if (e && e.clientX) {
      wipe.style.setProperty("--wx", e.clientX + "px");
      wipe.style.setProperty("--wy", e.clientY + "px");
    }
    wipe.classList.add("go");
    document.querySelector(".stage").classList.add("leave");
    sessionStorage.setItem("ylj-entered", "1");
    setTimeout(() => (location.href = "./home.html"), 780);
  }
  door.addEventListener("click", enter);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!door.disabled) enter();
    }
  });
})();
