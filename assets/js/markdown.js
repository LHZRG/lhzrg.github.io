/* ============================================================
   极简 Markdown 渲染器（零依赖，够用就好）
   支持：标题 / 段落 / 粗斜体 / 行内代码 / 代码块 / 列表 /
        引用 / 分割线 / 链接 / 图片 / 表格
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

  /* 行内解析 */
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
    // 链接
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => {
      const safe = url.replace(/"/g, "");
      const out = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${safe}"${out}>${t}</a>`;
    });
    // 粗体 / 斜体
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
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
        const cells = (r) =>
          r
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim());
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i++;
        }
        out.push(
          `<table><thead><tr>${head
            .map((c) => `<th>${inline(c)}</th>`)
            .join("")}</tr></thead><tbody>${rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
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
        !/^(#{1,4}\s|```|\s*>|\s*[-*+]\s|\s*\d+[.)]\s|\s*\|)/.test(lines[i])
      ) {
        buf.push(lines[i].trim());
        i++;
      }
      if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
    }

    return out.join("\n");
  }

  /* 提取目录（h2 / h3） */
  function toc(src) {
    const lines = String(src || "").split("\n");
    const res = [];
    let inCode = false;
    for (const l of lines) {
      if (/^```/.test(l.trim())) inCode = !inCode;
      if (inCode) continue;
      const m = l.match(/^(#{2,3})\s+(.*)$/);
      if (m) res.push({ level: m[1].length, text: m[2].trim(), id: slug(m[2]) });
    }
    return res;
  }

  /* 纯文本（用于字数统计 / 搜索） */
  function plain(src) {
    return String(src || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*`|\-[\]()!]/g, " ")
      .replace(/\s+/g, " ");
  }

  return { render, toc, plain, slug, esc };
})();
