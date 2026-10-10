/* 实用工具页 · 骰子 / 硬币 / 今天吃什么
   ---------------------------------------------------------------------------
   ⚠ 这个文件只管「工具怎么转起来」，内容都在 data.js 第 10 段：
       工具名字 / 图标 / 说明        → TOOLS
       骰子几颗、硬币几枚、动画多长  → TOOLS_CONFIG
       地区 + 校内校外               → FOOD_AREAS
       餐厅卡片（照片、评价……）      → FOOD_SPOTS
   ⚠ 想改界面上的按钮文字、提示语，去 tools.html，那里标了 ★改这里。
   ---------------------------------------------------------------------------
   下面这段是「硬币两面的图案」，用 SVG 画的：
     HEAD_SVG —— 正面：一朵盛开的花，花心一个数字 1
     TAIL_SVG —— 反面：卡通的女皇侧面像（戴小皇冠、后面一个发髻）
   想换成别的图案，直接替换这两段 SVG 就行（保持 viewBox="0 0 100 100"）。
   ============================================================================ */
(() => {
  App.init("tools.html");

  const esc = App.esc;
  const $ = (s) => document.querySelector(s);

  /* ---------- 读配置（都来自 data.js 第 10-2 段 TOOLS_CONFIG） ---------- */
  const CFG = TOOLS_CONFIG || {};
  const DICE_MAX = Math.max(1, Number(CFG.diceMax) || 10); // 骰子最多几颗
  const DICE_FACES = Math.max(2, Number(CFG.diceFaces) || 6); // 骰子几面
  const COIN_MAX = Math.max(1, Number(CFG.coinMax) || 10); // 硬币最多几枚
  const ROLL_MS = Number(CFG.rollMs) || 900; // 骰子动画时长
  const FLIP_MS = Number(CFG.flipMs) || 1100; // 硬币动画时长
  const DRAW_MS = Number(CFG.foodDrawMs) || 700; // 抽卡动画时长

  /* ---------- 把 data.js 里的工具名字 / 图标填到页面上 ---------- */
  const TOOL = {};
  (TOOLS || []).forEach((t) => (TOOL[t.id] = t));
  [["dice", "#diceIcon", "#diceName", "#diceDesc"], ["coin", "#coinIcon", "#coinName", "#coinDesc"], ["food", "#foodIcon", "#foodName", "#foodDesc"]].forEach(
    ([id, iSel, nSel, dSel]) => {
      const t = TOOL[id];
      if (!t) return;
      const i = $(iSel), n = $(nSel), d = $(dSel);
      if (i) i.textContent = t.icon || "";
      if (n) n.textContent = t.name || "";
      if (d && t.desc) d.textContent = t.desc;
    }
  );

  /* ==========================================================================
     通用：一排数字按钮（1 ~ max），用来选「扔几个」
     ========================================================================== */
  function buildPicks(box, max, onPick) {
    if (!box) return;
    box.innerHTML = "";
    for (let n = 1; n <= max; n++) {
      const b = document.createElement("button");
      b.className = "num-pick" + (n === 1 ? " on" : "");
      b.type = "button";
      b.textContent = n;
      b.onclick = () => {
        [...box.children].forEach((c) => c.classList.remove("on"));
        b.classList.add("on");
        onPick(n);
      };
      box.appendChild(b);
    }
  }

  const rnd = (n) => Math.floor(Math.random() * n); // 0 ~ n-1 的随机数

  /* ==========================================================================
     ① 骰子点数生成器
     ========================================================================== */
  /* 六面骰的点位：把骰面想成 3×3 的九个格子，下面写几号格子有点 */
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  function dieMarkup(v) {
    if (DICE_FACES !== 6) return `<div class="die-face die-num">${v}</div>`;
    const on = PIPS[v] || [];
    let cells = "";
    for (let i = 0; i < 9; i++) cells += `<i class="${on.indexOf(i) >= 0 ? "on" : ""}"></i>`;
    return `<div class="die-face">${cells}</div>`;
  }

  let diceN = 1;
  const diceTray = $("#diceTray");
  const diceResult = $("#diceResult");

  buildPicks($("#dicePick"), DICE_MAX, (n) => (diceN = n));

  $("#diceRoll").onclick = () => {
    const n = diceN;
    diceTray.innerHTML = "";
    diceResult.innerHTML = '<span class="tool-pending">正在滚…</span>';

    const vals = [];
    for (let i = 0; i < n; i++) vals.push(1 + rnd(DICE_FACES)); // 每颗骰子的点数

    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "die rolling";
      d.style.animationDuration = ROLL_MS + "ms"; // 动画时长读的是 TOOLS_CONFIG.rollMs
      d.style.animationDelay = i * 70 + "ms";
      d.innerHTML = '<div class="die-face die-mid">?</div>';
      diceTray.appendChild(d);
    }
    const dies = [...diceTray.children];

    setTimeout(() => {
      dies.forEach((d, i) => {
        d.classList.remove("rolling");
        d.classList.add("settled");
        d.innerHTML = dieMarkup(vals[i]);
        d.style.animationDelay = i * 45 + "ms";
      });
      const sum = vals.reduce((a, b) => a + b, 0);
      const detail = n > 1 ? vals.join(" + ") + " = " + sum : String(sum);
      diceResult.innerHTML =
        `<span class="tool-sum">总和 <b>${sum}</b></span>` +
        `<span class="tool-detail">${esc(detail)}</span>` +
        (n > 1 ? `<span class="tool-detail">平均 ${(sum / n).toFixed(1)}</span>` : "");
    }, ROLL_MS + n * 70);
  };

  $("#diceClear").onclick = () => {
    diceTray.innerHTML = "";
    diceResult.textContent = "收起来了，想扔再点一次。";
  };

  /* ==========================================================================
     ② 扔硬币
     ★ 硬币两面的图案就在这两个常量里，想换图案直接改 SVG
     ========================================================================== */
  /* 正面：一朵盛开的花，花心写着一个 1 */
  const HEAD_SVG = `
    <svg viewBox="0 0 100 100" class="coin-art" aria-hidden="true">
      <g transform="translate(50 50)">
        <g fill="#dcb877">
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(0)"/>
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(60)"/>
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(120)"/>
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(180)"/>
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(240)"/>
          <ellipse rx="10" ry="21" cy="-23" transform="rotate(300)"/>
        </g>
        <circle r="15" fill="#f3dfb4"/>
        <circle r="15" fill="none" stroke="#c19a5c" stroke-width="1.5"/>
        <text y="8" text-anchor="middle" font-size="23" font-family="Georgia, serif" font-weight="bold" fill="#7d4a1c">1</text>
      </g>
    </svg>`;

  /* 反面：卡通女皇侧面像（小皇冠 + 后脑一个发髻） */
  const TAIL_SVG = `
    <svg viewBox="0 0 100 100" class="coin-art" aria-hidden="true">
      <path d="M28 100c2-15 11-22 24-26h20c9 5 13 13 14 26z" fill="#98a0a9"/>
      <circle cx="57" cy="48" r="24" fill="#bcc3cb"/>
      <path d="M34 45 L23 54 L35 57 Z" fill="#bcc3cb"/>
      <path d="M57 24a24 24 0 0 1 24 24c0 9-4 16-11 20-4-15-8-25-13-31z" fill="#79818b"/>
      <circle cx="83" cy="33" r="10.5" fill="#79818b"/>
      <path d="M37 27 L43 11 L53 22 L63 11 L71 27 Z" fill="#e0a93f"/>
      <path d="M37 27 L71 27" stroke="#bd8626" stroke-width="2.5" fill="none"/>
      <circle cx="47" cy="45" r="2.8" fill="#474e56"/>
      <path d="M35 63 q5 4 10 0" stroke="#474e56" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    </svg>`;

  let coinN = 1;
  const coinTray = $("#coinTray");
  const coinResult = $("#coinResult");

  buildPicks($("#coinPick"), COIN_MAX, (n) => (coinN = n));

  $("#coinRoll").onclick = () => {
    const n = coinN;
    coinTray.innerHTML = "";
    coinResult.innerHTML = '<span class="tool-pending">正在翻…</span>';

    const vals = [];
    for (let i = 0; i < n; i++) vals.push(rnd(2) === 0); // true = 正面（花），false = 反面（女皇）

    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "coin flipping";
      c.style.animationDelay = i * 90 + "ms";
      c.innerHTML = '<div class="coin-inner"><div class="coin-face coin-blank"></div></div>';
      coinTray.appendChild(c);
    }
    const coins = [...coinTray.children];

    const stopAt = FLIP_MS + n * 90;
    coins.forEach((c, i) => {
      setTimeout(() => {
        c.classList.remove("flipping");
        c.classList.add("settled");
        const face = c.querySelector(".coin-face");
        face.classList.remove("coin-blank");
        face.innerHTML = vals[i] ? HEAD_SVG : TAIL_SVG;
        c.querySelector(".coin-inner").classList.add(vals[i] ? "is-head" : "is-tail");
        c.title = vals[i] ? "正面" : "反面";
      }, stopAt + i * 60);
    });

    setTimeout(() => {
      const head = vals.filter(Boolean).length;
      const tail = n - head;
      coinResult.innerHTML =
        `<span class="tool-sum">正面 <b>${head}</b> 枚 · 反面 <b>${tail}</b> 枚</span>` +
        `<span class="tool-detail">${vals.map((v) => (v ? "正" : "反")).join(" ")}</span>`;
    }, stopAt + n * 60 + 200);
  };

  $("#coinClear").onclick = () => {
    coinTray.innerHTML = "";
    coinResult.textContent = "收起来了，想扔再点一次。";
  };

  /* ==========================================================================
     ③ 今天吃什么
     ========================================================================== */
  const foodAreaBox = $("#foodArea");
  const foodZoneBox = $("#foodZone");
  const foodCount = $("#foodCount");
  const foodSlot = $("#foodSlot");

  let curArea = (FOOD_AREAS[0] || {}).id || "";
  let curZone = ((FOOD_AREAS[0] || {}).zones || [])[0] || "";
  let curSpot = null; // 当前抽到的餐厅
  let shotIdx = 0; // 当前看到第几张照片

  /* 一级：地区按钮 */
  function renderAreas() {
    foodAreaBox.innerHTML = (FOOD_AREAS || [])
      .map(
        (a) =>
          `<button class="seg-btn${a.id === curArea ? " on" : ""}" data-area="${esc(a.id)}" type="button">${esc(a.name)}</button>`
      )
      .join("");
  }

  /* 二级：校内 / 校外（跟着选中的地区变） */
  function renderZones() {
    const area = (FOOD_AREAS || []).find((a) => a.id === curArea);
    const zones = (area && area.zones) || [];
    if (zones.indexOf(curZone) < 0) curZone = zones[0] || "";
    foodZoneBox.innerHTML = zones
      .map((z) => `<button class="seg-btn${z === curZone ? " on" : ""}" data-zone="${esc(z)}" type="button">${esc(z)}</button>`)
      .join("");
  }

  const spotsIn = (area, zone) =>
    (FOOD_SPOTS || []).filter((s) => (area ? s.area === area : true) && (zone ? s.zone === zone : true));

  function renderCount() {
    const n = spotsIn(curArea, curZone).length;
    const area = (FOOD_AREAS || []).find((a) => a.id === curArea);
    foodCount.textContent = n
      ? `${area ? area.name : ""} · ${curZone} 一共有 ${n} 家，抽到哪家算哪家。`
      : `${area ? area.name : ""} · ${curZone} 这个范围还没填餐厅，去 data.js 第 10-4 段加一家吧。`;
  }

  foodAreaBox.onclick = (e) => {
    const b = e.target.closest("[data-area]");
    if (!b) return;
    curArea = b.dataset.area;
    renderAreas();
    renderZones();
    renderCount();
  };
  foodZoneBox.onclick = (e) => {
    const b = e.target.closest("[data-zone]");
    if (!b) return;
    curZone = b.dataset.zone;
    renderZones();
    renderCount();
  };

  /* ---------- 餐厅卡片 ---------- */
  function foodCardHTML(s) {
    const photos = (s.photos || []).filter(Boolean);
    const area = (FOOD_AREAS || []).find((a) => a.id === s.area);
    const review = Array.isArray(s.review) ? s.review : [s.review || ""];

    const shots = photos.length
      ? `<div class="food-shots">
           <div class="shot-track" id="shotTrack">
             ${photos.map((p) => `<img src="${esc(p)}" alt="${esc(s.name)}" loading="lazy">`).join("")}
           </div>
           ${photos.length > 1
             ? `<button class="shot-nav prev" id="shotPrev" type="button" aria-label="上一张">‹</button>
                <button class="shot-nav next" id="shotNext" type="button" aria-label="下一张">›</button>
                <div class="shot-dots" id="shotDots">${photos
                  .map((_, i) => `<i class="${i === 0 ? "on" : ""}" data-dot="${i}"></i>`)
                  .join("")}</div>
                <span class="shot-count" id="shotCount">1 / ${photos.length}</span>`
             : ""}
         </div>`
      : `<div class="food-shots is-empty"><div class="food-nophoto">还没有照片<br><small>把图片丢进 assets/img/food/ 再写进 photos</small></div></div>`;

    return `
      <div class="food-card pop-in">
        ${shots}
        <div class="food-body">
          <div class="food-title">
            <h3>${esc(s.name)}</h3>
            <span class="food-scope">${esc(area ? area.name : "")} · ${esc(s.zone || "")}</span>
          </div>
          ${(s.tags || []).length ? `<div class="food-tags">${(s.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
          <dl class="food-info">
            <div><dt>地址</dt><dd>${esc(s.address || "—")}</dd></div>
            <div><dt>口味</dt><dd>${esc(s.taste || "—")}</dd></div>
            <div><dt>价格</dt><dd>${esc(s.price || "—")}</dd></div>
          </dl>
          <div class="food-review">
            <h4>我的评价</h4>
            ${review.map((r) => `<p>${esc(r)}</p>`).join("")}
          </div>
        </div>
        <div class="food-actions">
          <button class="btn" id="foodShot" type="button">📷 存成图片</button>
          <button class="btn ghost" id="foodAgain2" type="button">换一家</button>
        </div>
      </div>`;
  }

  /* 切换照片（左右滑动 / 点箭头 / 点圆点 / 手机滑动都走这里） */
  function goShot(i) {
    const s = curSpot;
    const n = (s && (s.photos || []).length) || 0;
    if (!n) return;
    shotIdx = (i + n) % n;
    const track = $("#shotTrack");
    if (track) track.style.transform = `translateX(${-shotIdx * 100}%)`;
    App.$$("#shotDots i").forEach((d, k) => d.classList.toggle("on", k === shotIdx));
    const c = $("#shotCount");
    if (c) c.textContent = `${shotIdx + 1} / ${n}`;
  }

  function bindCard() {
    const prev = $("#shotPrev"), next = $("#shotNext");
    if (prev) prev.onclick = () => goShot(shotIdx - 1);
    if (next) next.onclick = () => goShot(shotIdx + 1);
    const dots = $("#shotDots");
    if (dots)
      dots.onclick = (e) => {
        const d = e.target.closest("[data-dot]");
        if (d) goShot(Number(d.dataset.dot));
      };
    $("#foodShot").onclick = () => saveCard();
    $("#foodAgain2").onclick = () => draw();

    /* 手机上左右滑动翻照片 */
    const shots = document.querySelector(".food-shots");
    if (shots && (curSpot.photos || []).length > 1) {
      let x0 = null;
      shots.addEventListener("pointerdown", (e) => (x0 = e.clientX));
      shots.addEventListener("pointerup", (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 40) goShot(shotIdx + (dx < 0 ? 1 : -1));
        x0 = null;
      });
      shots.addEventListener("pointercancel", () => (x0 = null));
    }
  }

  /* 抽一张 */
  function draw() {
    const pool = spotsIn(curArea, curZone);
    if (!pool.length) {
      foodSlot.innerHTML = `<div class="food-empty">这个范围还没有餐厅。去 data.js 第 10-4 段 FOOD_SPOTS 加一家（注意 area / zone 要和这里的选项对得上）。</div>`;
      return;
    }
    /* 洗牌动画：三张卡背轮流飞一下 */
    foodSlot.innerHTML = `<div class="food-shuffling"><i></i><i></i><i></i></div>`;
    setTimeout(() => {
      curSpot = pool[rnd(pool.length)];
      shotIdx = 0;
      foodSlot.innerHTML = foodCardHTML(curSpot);
      bindCard();
    }, DRAW_MS);
  }

  $("#foodDraw").onclick = draw;
  $("#foodAgain").onclick = draw;

  /* ==========================================================================
     存成图片：把当前餐厅卡画到 canvas 上再下载
     （不依赖任何外部库，离线也能用）
     ========================================================================== */
  function wrapLines(ctx, text, maxW) {
    const out = [];
    let line = "";
    for (const ch of String(text || "")) {
      if (ch === "\n") { out.push(line); line = ""; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch; }
      else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function saveCard() {
    const s = curSpot;
    if (!s) return;
    const FONT_SANS = '22px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    const FONT_SERIF = 'bold 40px "Noto Serif SC","Songti SC",Georgia,serif';
    const W = 900, PAD = 44, PH = 470;

    /* 先量一下评价要占多高，再决定画布多长 */
    const m = document.createElement("canvas").getContext("2d");
    m.font = FONT_SANS;
    const review = Array.isArray(s.review) ? s.review : [s.review || ""];
    const lines = [];
    review.forEach((p) => wrapLines(m, p, W - PAD * 2).forEach((l) => lines.push(l)));
    const H = 96 + PH + 78 + 46 + 3 * 54 + 66 + lines.length * 38 + 40 + 96;

    const cv = document.createElement("canvas");
    cv.width = W * 2;
    cv.height = H * 2;
    const ctx = cv.getContext("2d");
    ctx.scale(2, 2);

    const draw = (img) => {
      /* 纸底 */
      ctx.fillStyle = "#fdf8ef";
      ctx.fillRect(0, 0, W, H);
      /* 顶部一条木色细边 */
      ctx.fillStyle = "#c99a63";
      ctx.fillRect(0, 0, W, 8);

      /* 眉头 */
      ctx.fillStyle = "#a97c4e";
      ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText("语林集 · 今天吃什么", PAD, 58);
      ctx.fillStyle = "#9c8a78";
      ctx.textAlign = "right";
      ctx.fillText(new Date().toLocaleDateString("zh-CN"), W - PAD, 58);
      ctx.textAlign = "left";

      /* 照片 */
      const px = PAD, py = 96, pw = W - PAD * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, PH);
      ctx.clip();
      if (img) {
        const ir = img.width / img.height, tr = pw / PH;
        let sw, sh, sx, sy;
        if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, PH);
      } else {
        ctx.fillStyle = "#f2e6d3";
        ctx.fillRect(px, py, pw, PH);
        ctx.fillStyle = "#a97c4e";
        ctx.textAlign = "center";
        ctx.fillText("（没有照片）", px + pw / 2, py + PH / 2);
        ctx.textAlign = "left";
      }
      ctx.restore();

      /* 店名 */
      let y = py + PH + 62;
      ctx.fillStyle = "#3b3029";
      ctx.font = FONT_SERIF;
      ctx.fillText(s.name || "", PAD, y);

      /* 三行信息 */
      y += 46;
      const rows = [["地址", s.address], ["口味", s.taste], ["价格", s.price]];
      rows.forEach(([k, v], i) => {
        const ry = y + 20 + i * 54;
        ctx.fillStyle = "#f2e6d3";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(PAD, ry - 22, 74, 32, 8) : ctx.rect(PAD, ry - 22, 74, 32);
        ctx.fill();
        ctx.fillStyle = "#7a5636";
        ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(k, PAD + 14, ry);
        ctx.fillStyle = "#3b3029";
        ctx.font = FONT_SANS;
        ctx.fillText(v || "—", PAD + 92, ry + 1);
      });

      /* 我的评价 */
      y += 3 * 54 + 40;
      ctx.fillStyle = "#a97c4e";
      ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText("我的评价", PAD, y);
      y += 36;
      ctx.fillStyle = "#4a3d33";
      ctx.font = FONT_SANS;
      lines.forEach((l) => { ctx.fillText(l, PAD, y); y += 38; });

      /* 落款 */
      ctx.fillStyle = "#c0b09c";
      ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText("—— 语林集 · 午后斜阳里的一间小馆", PAD, H - 40);

      try {
        cv.toBlob((blob) => {
          if (!blob) throw new Error("empty");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `今天吃-${(s.name || "餐厅").replace(/[\\/:*?"<>|]/g, "")}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          flash("已保存到下载文件夹");
        }, "image/png");
      } catch (err) {
        flash("这个浏览器不让保存图片，换 Chrome / Edge 再试试");
      }
    };

    /* 载入当前这张照片（没有照片就直接画占位） */
    const photos = (s.photos || []).filter(Boolean);
    if (!photos.length) return draw(null);
    const img = new Image();
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = photos[Math.min(shotIdx, photos.length - 1)];
  }

  /* 按钮点完给个小反馈 */
  function flash(msg) {
    const b = $("#foodShot");
    if (!b) return;
    const old = b.textContent;
    b.textContent = "✓ " + msg;
    b.disabled = true;
    setTimeout(() => { b.textContent = old; b.disabled = false; }, 2200);
  }

  /* ---------- 启动 ---------- */
  renderAreas();
  renderZones();
  renderCount();
  App.reveal();
})();
