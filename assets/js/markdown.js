/* ============================================================
   极简 Markdown 渲染器（零依赖，够用就好）
   支持：标题 / 段落 / 粗斜体 / 行内代码 / 代码块 / 列表 /
        引用 / 分割线 / 链接 / 图片 / 表格
        + Wiki 体例三件套：
          :::lead / :::infobox / :::tip / :::warn / :::cat  容器块
          {{1番}} {{役满}}                                   行内徽章
          [mj 123m h456p k11z ...]                           麻将牌（按编码拼牌姿）
          表格自动包一层可横向滑动的外壳（手机不会撑破版面）
   ============================================================ */

const Markdown = (() => {
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const slug = (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[`*_~\[\]()#!]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "");

  /* ---------- 麻将牌编码 ----------
     正文里写 [mj ...] 就会渲染成一串牌图。空格分组，| 分隔手牌与副露。
       普通：  1m 2s 7z 0p        数字+花色（m 万 / p 筒 / s 索 / z 字）
       连写：  123m = 1m 2m 3m    一串数字共用一个花色字母
       横牌：  h1m h123s          前缀 h（副露/杠里的横放牌）
       加杠：  k11m k55z          前缀 k（竖着叠两张横牌）
       牌背：  b hb kb            竖版/横版/杠版
       花牌：  dong ju lan mei qiu xia zu chun
       通配：  any anym anyp anys anyz
     缩略重复：2*3m = 2m2m2m ；也可以写 2m*3（数字在后）
     —— 尺寸由 CSS 的 --mj-h 控制，牌与牌之间零间隙，靠 .mj-set 的 flex 排列。 */
  const MJ_ZI = ["", "dong", "ju", "lan", "mei", "qiu", "xia", "zu", "chun"];
  const MJ_HUA = ["dong", "ju", "lan", "mei", "qiu", "xia", "zu", "chun"];
  const MJ_WILD = ["any", "anym", "anyp", "anys", "anyz"];
  /* ★改这里：三种形状的原始像素（与 tools/compress_tiles.py 的画布上限一致）。
     写进 img 的 width/height，让浏览器在图片到达前就占好位置，页面不会跳。 */
  const MJ_WH = { vt: [272, 389], hz: [360, 302], kan: [360, 569] };

  /* 单个牌码 -> 文件名（不含扩展名）；认不出返回 null。
     竖牌/横牌/杠图/花牌在 assets/img/tiles/ 下；
     通配牌与牌背在 assets/img/tiles/other/ 下（见 mjDir）。 */
  function mjFile(code) {
    const c = String(code).toLowerCase();
    if (!c) return null;
    if (c === "b") return "b"; // 牌背（竖版）
    if (c === "hb") return "hb"; // 牌背（横版）
    if (c === "kb") return "b_03"; // 牌背（杠版，就是那张竖着叠的）
    if (MJ_HUA.indexOf(c) >= 0) return c;
    if (MJ_WILD.indexOf(c) >= 0) return c;
    // 一位数：1m 2s 7z 0p（红五）
    if (/^\d[mpsz]$/.test(c)) return c;
    // 两位数字：11m 22p 55z 00s 05m…… 杠图（两张横牌叠起来）
    if (/^\d\d[mpsz]$/.test(c)) return c;
    // h 前缀：横牌 → h1m 等文件名本身带 h
    if (/^h\d[mpsz]$/.test(c)) return c;
    // k 前缀：加杠 k11m / k555z（与 mjExpand 里一致，支持任意位数）
    if (/^k\d+[mpsz]$/.test(c)) return c.slice(1);
    return null;
  }

  // 文件所在子目录：通配牌、牌背在 other/
  function mjDir(f) {
    if (f === "b" || f === "hb") return "other/";
    if (MJ_WILD.indexOf(f) >= 0) return "other/";
    return "";
  }

  // 展开一个「块」，如 "123m456m789m" / "h123s" / "2*3m" / "7z"
  // 支持：前缀 h/k/b、任意多段「数字串+花色」、重复写法 a*tok 或 tok*a
  function mjExpand(tok, out) {
    let t = tok.toLowerCase();

    // 前缀：h（横）/ k（杠）/ b（背）。只在「去掉后仍能解析」时才当后缀用。
    let pre = "";
    const pm = t.match(/^([hkb])(?=.)/);
    if (pm) {
      const rest = t.slice(1);
      if (rest !== "" && (mjFile(rest) || /^[\d\*]/.test(rest) || /^[a-z]{2,6}$/.test(rest))) {
        pre = pm[1];
        t = rest;
      }
    }

    // 重复写法：2*123m / 123m*2
    let times = 1;
    let rm = t.match(/^(\d)\*(.+)$/);
    if (rm) {
      times = +rm[1];
      t = rm[2];
    } else if ((rm = t.match(/^(.+?)\*(\d)$/))) {
      t = rm[1];
      times = +rm[2];
    }

    const bases = [];
    /* k 前缀（杠图）整体不拆：k11m 就是那一张杠图，文件名回落成 11m。
       ⚠️ 必须支持任意位数：k555z 是「五筒的杠」，不能按 2 位截断（那样 5z 会认不出）。 */
    if (pre === "k") {
      const km = t.match(/^(\d+)([mpsz])$/);
      bases.push(km ? km[1] + km[2] : t);
    } else {
      // 数字串 + 花色（123m → 1m 2m 3m）；或独立词（b / hb / dong / any…）
      const re = /(\d+)([mpsz])|([a-z]{1,6})/g;
      let mm;
      while ((mm = re.exec(t))) {
        if (mm[1]) mm[1].split("").forEach((d) => bases.push(d + mm[2]));
        else bases.push(mm[3]);
      }
    }
    if (!bases.length) return;

    for (let k = 0; k < times; k++) {
      for (const b of bases) {
        let f = null;
        if (pre === "h") f = mjFile("h" + b) || mjFile(b);
        else if (pre === "k") f = b === "b" ? mjFile("kb") : mjFile(b);
        else f = mjFile(b);
        if (f) out.push(f);
      }
    }
  }

  // [mj ...] -> HTML；返回 null 表示语法不成立（交回原样）
  function mjSet(src) {
    // 去掉首尾的 [mj ... ]：开头的 "[mj" + 空白，结尾的 "]"
    const body = src
      .replace(/^\s*\[mj\s*/i, "")
      .replace(/\]\s*$/, "")
      .trim();
    if (!body) return null;
    /* 形状决定缩放方式（这是全篇最关键的一点）：
         vt  竖牌   —— 按「高度」缩放到 --mj-h
         hz  横牌   —— 按「宽度」缩放到 --mj-h（它的长边 = 竖牌的高）
         kan 杠图   —— 按「宽度」缩放到 --mj-h（220 宽 × 2 张横牌叠起来）
       三种原图长宽比不同，若统一用 height 缩放，横牌会比竖牌大出 40%。 */
    const shapeOf = (f) => {
      if (f === "b_03") return "kan"; // 杠版牌背（竖着叠的两张）
      if (f === "kb" || /^k/.test(f)) return "kan"; // k11m、kb → 杠形状
      if (f === "hb" || /^h/.test(f)) return "hz"; // h1m、hb → 横牌形状
      if (/^\d\d[mpsz]$/.test(f)) return "kan"; // 兜底：两位数字只可能来自 k 前缀
      return "vt";
    };
    const groups = body.split("|").map((g) => g.trim());
    const sets = groups.map((g) => {
      const files = [];
      g.split(/\s+/)
        .filter(Boolean)
        .forEach((tok) => mjExpand(tok, files));
      return files;
    });
    if (!sets.some((s) => s.length)) return null;
    /* 加载优化三件套（都不损画质）：
         width/height  —— 先把位置占住，图片到达时页面不会跳（零 CLS）
         loading=lazy  —— 滚到才下载，首屏不为看不见的牌付流量
         decoding=async—— 解码不占主线程，滚动不掉帧。
       画质由 compress_tiles.py 保证：无损 WebP + 原始分辨率。 */
    const html = sets
      .filter((s) => s.length)
      .map(
        (files) =>
          `<span class="mj-set">${files
            .map((f) => {
              const sh = shapeOf(f);
              const wh = MJ_WH[sh] || MJ_WH.vt;
              return (
                `<img class="mj mj-${sh}" src="assets/img/tiles/${mjDir(f)}${f}.webp" ` +
                `alt="${f}" width="${wh[0]}" height="${wh[1]}" loading="lazy" decoding="async">`
              );
            })
            .join("")}</span>`
      )
      .join("");
    return `<span class="mj-row">${html}</span>`;
  }

  function inline(text) {
    let s = esc(text);
    // 行内代码先占位，避免被后续规则误伤
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return "\u0000C" + (codes.length - 1) + "\u0000";
    });
    // 图片
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const safe = url.replace(/"/g, "");
      return `<img src="${safe}" alt="${alt}" loading="lazy">`;
    });
    // 麻将牌 [mj ...]：必须排在链接规则前面，否则会被 [..](..) 误判成链接
    s = s.replace(/\[mj\s+[^\]]*\]/gi, (m) => mjSet(m) || m);
    // 链接
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => {
      const safe = url.replace(/"/g, "");
      const out = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${safe}"${out}>${t}</a>`;
    });
    // 粗体 / 斜体
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    // {{徽章}}：写条目式长文时标「1番 / 役满 / 满贯」这类小标签用。
    // 含「役满 / 双倍役满 / 倍满 / 跳满 / 满贯」会自动换配色，其它一律走「番」的样式。
    s = s.replace(/\{\{([^{}]+)\}\}/g, (_, t) => {
      const k = /双倍/.test(t)
        ? "ym2"
        : /役[満满]/.test(t)
        ? "ym"
        : /倍[満满]/.test(t)
        ? "bm"
        : /跳[満满]/.test(t)
        ? "tm"
        : /[満满]貫|[満满]贯/.test(t)
        ? "mg"
        : "fan";
      return `<span class="wk-b wk-b-${k}">${t}</span>`;
    });
    // 还原代码
    s = s.replace(/\u0000C(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
    return s;
  }

  /* 主渲染 */
  function render(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      if (/^```/.test(line.trim())) {
        const lang = line.trim().slice(3).trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          buf.push(esc(lines[i]));
          i++;
        }
        i++;
        out.push(
          `<pre data-lang="${esc(lang)}"><button class="copy-code" type="button">复制</button><code>${buf.join(
            "\n"
          )}</code></pre>`
        );
        continue;
      }

      /* Wiki 容器块：
         :::infobox      ← 开头这一行写容器名
           里面正常写 Markdown
         :::             ← 单独一行 ::: 表示结束
         已知容器：lead（导语）/ infobox（信息卡）/ tip（提示）/ warn（注意）/ cat（分类盒） */
      const box = line.trim().match(/^:::([a-z][a-z0-9]*)\s*$/i);
      if (box) {
        const name = box[1].toLowerCase();
        const buf = [];
        i++;
        while (i < lines.length && lines[i].trim() !== ":::") {
          buf.push(lines[i]);
          i++;
        }
        i++; // 吃掉结尾的 :::
        out.push(`<div class="wk wk-${name}">${render(buf.join("\n"))}</div>`);
        continue;
      }

      // 空行
      if (!line.trim()) {
        i++;
        continue;
      }

      // 分割线
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push("<hr>");
        i++;
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const lv = h[1].length;
        const txt = h[2].trim();
        out.push(`<h${lv} id="${slug(txt)}">${inline(txt)}</h${lv}>`);
        i++;
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
        continue;
      }

      // 表格
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        /* 按 | 切出每一格。
           ⚠️ 不能直接 split("|")：牌姿编码 [mj 234m | 567p | 55p] 里的 |
           是「面子之间的分隔」，不是列分隔，一刀切会把一格拆成五列。
           所以逐字符扫，遇到 [mj ...] 就整段跳过，里面的 | 原样保留。 */
        const cells = (r) => {
          const s = r.trim().replace(/^\||\|$/g, "");
          const out = [];
          let cur = "";
          let inMj = false;
          for (let k = 0; k < s.length; k++) {
            const c = s[k];
            if (!inMj && c === "[" && /^\[mj\s/i.test(s.slice(k))) { inMj = true; cur += c; continue; }
            if (inMj && c === "]") { inMj = false; cur += c; continue; }
            if (!inMj && c === "|") { out.push(cur); cur = ""; continue; }
            cur += c;
          }
          out.push(cur);
          return out.map((c) => c.trim());
        };
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i++;
        }
        /* ---- 合并单元格（像 Excel 那样）----
             ^ 单独一格 = 和「上一行同一列」的格子合成一格（跨行合并）
             < 单独一格 = 和「左边一格」合成一格（跨列合并）
           典型用法：一个役占两行，前三列各写一个 ^，第四列上行写文字、下行放图。
           另外：表格里想在一个格子内部换行，写 <br> 即可。 */
        const UP = (t) => t === "^";
        const LEFT = (t) => t === "<";
        const all = [head, ...rows];
        const meta = all.map((r) =>
          r.map(() => ({ rs: 1, cs: 1, hide: false, up: false, left: false }))
        );
        // 找到某一格真正的主人（可能被合并掉了，要顺着标记往上/往左追）
        const owner = (r, c) => {
          let rr = r, cc = c, guard = 0;
          while (meta[rr] && meta[rr][cc] && meta[rr][cc].hide && guard++ < 1000) {
            if (meta[rr][cc].up) rr--;
            else if (meta[rr][cc].left) cc--;
            else break;
          }
          return [rr, cc];
        };
        for (let r = 0; r < all.length; r++) {
          for (let c = 0; c < all[r].length; c++) {
            const t = all[r][c].trim();
            if (UP(t) && r > 0) {
              const [orr, occ] = owner(r - 1, c);
              if (meta[orr] && meta[orr][occ] && !meta[orr][occ].hide) {
                meta[orr][occ].rs += 1;
                meta[r][c] = { rs: 1, cs: 1, hide: true, up: true, left: false };
              }
            } else if (LEFT(t) && c > 0) {
              const [orr, occ] = owner(r, c - 1);
              if (orr === r && !meta[orr][occ].hide) {
                meta[orr][occ].cs += 1;
                meta[r][c] = { rs: 1, cs: 1, hide: true, up: false, left: true };
              }
            }
          }
        }
        // 单元格里的 <br> 要还原成真换行（inline() 为了安全会把尖括号转义掉）
        const cellHtml = (t) =>
          inline(t).replace(/&lt;br\s*\/?&gt;/gi, "<br>");
        const rowHtml = (ri, tag) =>
          `<tr${rowCls[ri]}>` +
          all[ri]
            .map((t, c) => {
              const m = meta[ri][c];
              if (m.hide) return "";
              const sp =
                (m.rs > 1 ? ` rowspan="${m.rs}"` : "") +
                (m.cs > 1 ? ` colspan="${m.cs}"` : "");
              return `<${tag}${sp}>${cellHtml(t)}</${tag}>`;
            })
            .join("") +
          "</tr>";
        /* 一组（比如一个役占的两行）要同一个底色。
           判断依据：第 0 列没有被向上合并掉，说明这是新的一组的开头。
           不这么做的话，浏览器按「第几行」做斑马纹，一个役会被切成两个颜色。 */
        let gid = -1;
        const rowCls = all.map((_, ri) => {
          if (ri === 0) return "";
          if (!meta[ri][0] || !meta[ri][0].hide) gid++;
          return gid % 2 === 1 ? ' class="alt"' : "";
        });
        const hasSpan = meta.some((r) => r.some((m) => m.rs > 1 || m.cs > 1));
        /* 外面包一层 .tw：列多的表（比如役种表）在手机上不会把版面撑破，
           而是在这个小盒子里左右滑动，页面本身不会横向滚动条。
           4 列及以上再加 tw-wide：手机上保留一个好读的最小宽度、允许滑动。 */
        const isWide = head.length >= 4;
        const cls = "tw" + (isWide ? " tw-wide" : "") + (hasSpan ? " tw-merge" : "");
        const table =
          `<div class="${cls}"><table><thead>${rowHtml(0, "th")}</thead><tbody>${rows
            .map((_, k) => rowHtml(k + 1, "td"))
            .join("")}</tbody></table></div>`;
        /* 手机上宽表只能看到前几列，给一句提示，免得以为内容就这么多 */
        out.push(
          isWide
            ? `<div class="twbox"><span class="tw-hint">← 左右滑动看整行 →</span>${table}</div>`
            : table
        );
        continue;
      }

      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
          i++;
        }
        out.push(`<ul>${buf.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`);
        continue;
      }

      // 有序列表
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
          i++;
        }
        out.push(`<ol>${buf.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`);
        continue;
      }

      // 独立图片行
      if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
        out.push(`<p>${inline(line.trim())}</p>`);
        i++;
        continue;
      }

      // 段落（连续非空行合并）
      const buf = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{1,4}\s|```|\s*>|\s*[-*+]\s|\s*\d+[.)]\s|\s*\||\s*:::)/.test(lines[i])
      ) {
        buf.push(lines[i].trim());
        i++;
      }
      if (buf.length) {
        out.push(`<p>${inline(buf.join(" "))}</p>`);
      } else {
        /* 兜底：走到这里说明这一行以 | / # / > / ::: 之类开头，
           但上面所有的分支都没接住它（典型情况：表格缺了分隔行，
           或者表格被写进了容器块导致「下一行不是分隔行」）。
           此时必须至少前进一行，否则外层 while 会在原地死循环。 */
        out.push(`<p>${inline(line.trim())}</p>`);
        i++;
      }
    }

    return out.join("\n");
  }

  /* 提取目录（h2 / h3） */
  function toc(src) {
    const lines = String(src || "").split("\n");
    const res = [];
    let inCode = false;
    let inBox = false; // 信息卡、提示条里的标题不进目录
    for (const l of lines) {
      if (/^```/.test(l.trim())) inCode = !inCode;
      if (inCode) continue;
      if (/^:::[a-z]/i.test(l.trim())) {
        inBox = true;
        continue;
      }
      if (/^:::\s*$/.test(l.trim())) {
        inBox = false;
        continue;
      }
      if (inBox) continue;
      const m = l.match(/^(#{2,3})\s+(.*)$/);
      if (m) res.push({ level: m[1].length, text: m[2].trim(), id: slug(m[2]) });
    }
    return res;
  }

  /* 纯文本（用于字数统计 / 搜索） */
  function plain(src) {
    return String(src || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^:::[a-z]*\s*$/gim, " ") // 容器块的开合标记不算字数
      .replace(/\{\{|\}\}/g, " ") // 徽章的括号不算字数
      .replace(/[#>*`|\-[\]()!]/g, " ")
      .replace(/\s+/g, " ");
  }

  return { render, toc, plain, slug, esc };
})();
