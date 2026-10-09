/* 临时体检脚本：按 data.js 真实字段结构逐项检查 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const src = fs.readFileSync(path.join(root, "assets/js/data.js"), "utf8");
const md = fs.readFileSync(path.join(root, "assets/js/markdown.js"), "utf8");

let D;
try {
  D = new Function(src + "\n" + md + "\nreturn ({SITE,POSTS,QUOTES,GALLERY,LINKS,TIMELINE,NOW,SKILLS,Markdown});")();
} catch (e) {
  console.log("❌ data.js 执行报错：", e.message);
  process.exit(1);
}

const Markdown = D.Markdown;
const { SITE, POSTS, QUOTES, GALLERY, LINKS, TIMELINE, NOW, SKILLS } = D;

const problems = [], warns = [];
const P = (m) => problems.push(m);
const W = (m) => warns.push(m);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const fileOK = (u) => fs.existsSync(path.join(root, String(u).replace(/^\.?\//, "")));

console.log("══════ 数据体检 ══════\n");

/* ---------- SITE ---------- */
console.log("【站点信息】");
[["name", "站名"], ["latin", "英文/拼音"], ["author", "作者"], ["avatar", "头像"],
 ["heroImage", "首页大图"], ["role", "一句话身份"], ["heroQuote", "主标语"], ["since", "开站日期"]]
  .forEach(([k, label]) => { if (!isStr(SITE[k])) P(`SITE.${k}（${label}）缺失或为空`); });
console.log("  ", SITE.name, "|", SITE.author, "|", SITE.role);
console.log("   开站:", SITE.since);

console.log("  bio:", Array.isArray(SITE.bio) ? SITE.bio.length + " 段" : "❌ 不是数组");
if (!Array.isArray(SITE.bio)) P("SITE.bio 不是数组（可能是中括号 [ ] 打掉了）");
else SITE.bio.forEach((b, i) => {
  if (!isStr(b)) P(`SITE.bio 第 ${i + 1} 段无效（空或不是文字）`);
  if (isStr(b) && /["“”]/.test(b.replace(/^[“]|[$”]/g, ""))) W(`SITE.bio 第 ${i + 1} 段含引号，若是半角 " 可能出问题`);
});
console.log("  chips:", Array.isArray(SITE.chips) ? SITE.chips.join(" / ") : "❌");
if (!Array.isArray(SITE.chips)) P("SITE.chips 不是数组");
console.log("  socials:", Array.isArray(SITE.socials) ? SITE.socials.map((s) => s.label).join(" / ") : "❌");
if (!Array.isArray(SITE.socials)) P("SITE.socials 不是数组");
else SITE.socials.forEach((s, i) => {
  if (!isStr(s.label) || !isStr(s.url)) P(`SITE.socials 第 ${i + 1} 项缺 label 或 url`);
});
[["avatar", SITE.avatar], ["heroImage", SITE.heroImage]].forEach(([k, u]) => {
  if (isStr(u) && !/^https?:/.test(u) && !fileOK(u)) P(`SITE.${k} 指向的图片不存在：${u}`);
});

/* ---------- QUOTES ---------- */
console.log("\n【加载页美句】", QUOTES.length, "句");
if (!Array.isArray(QUOTES) || !QUOTES.length) P("QUOTES 为空或不是数组");
QUOTES.forEach((q, i) => {
  if (typeof q !== "object" || !q) { P(`QUOTES 第 ${i + 1} 句结构不对（应为 { text: "...", by: "..." }）`); return; }
  if (!isStr(q.text)) P(`QUOTES 第 ${i + 1} 句缺 text`);
  if (!isStr(q.by)) W(`QUOTES 第 ${i + 1} 句没写出处 by`);
});

/* ---------- POSTS ---------- */
console.log("\n【文章】", POSTS.length, "篇");
const seen = {};
POSTS.forEach((p, i) => {
  const tag = p && p.id ? p.id : `第${i + 1}篇`;
  if (!p || typeof p !== "object") { P(`POSTS 第 ${i + 1} 项不是对象（花括号 { } 可能打掉了）`); return; }
  ["id", "title", "date", "excerpt", "body", "cover", "tags"].forEach((k) => {
    if (p[k] === undefined) P(`${tag} 缺字段 ${k}`);
  });
  if (p.id) { if (seen[p.id]) P(`文章 id 重复：${p.id}`); seen[p.id] = 1; }
  if (isStr(p.date) && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) W(`${tag} 日期应写成 2026-10-09 这种格式，现在是 ${p.date}`);
  if (p.tags && !Array.isArray(p.tags)) W(`${tag} 的 tags 不是 [ ] 数组`);
  if (isStr(p.cover) && !/^https?:/.test(p.cover) && !fileOK(p.cover)) P(`${tag} 封面图不存在：${p.cover}`);
  const body = typeof p.body === "string" ? p.body : Array.isArray(p.body) ? p.body.join("\n") : "";
  if (!body.trim()) { P(`${tag} 正文是空的`); return; }
  const html = Markdown.render(body);
  const ps = (html.match(/<p>/g) || []).length;
  const h2 = (html.match(/<h2/g) || []).length;
  console.log("   " + String(p.id).padEnd(20) + String(ps).padStart(3) + " 段 " + String(h2).padStart(2) + " 小标题  " + (Array.isArray(p.tags) ? p.tags.join(",") : ""));
  // 精确统计纯文字行：排除空行、Markdown 标记行、以及 ``` 代码块内部的行
  let plain = 0, inFence = false;
  body.split("\n").map((s) => s.trim()).forEach((l) => {
    if (/^```/.test(l)) { inFence = !inFence; return; }
    if (inFence || !l) return;
    if (/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|\|)/.test(l)) return;
    plain++;
  });
  if (ps < plain - 1) W(`${tag}：${plain} 行纯文字只渲染出 ${ps} 段，可能漏了段落之间的空字符串 ""`);
  if (html.includes("undefined") || html.includes("[object Object]"))
    P(`${tag} 渲染出现异常内容（可能有引号没配对）`);
});

/* ---------- GALLERY ---------- */
console.log("\n【相册】", GALLERY.length, "张");
GALLERY.forEach((g, i) => {
  if (!g || typeof g !== "object") { P(`GALLERY 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(g.src)) P(`GALLERY 第 ${i + 1} 张缺 src（图片路径）`);
  else if (!/^https?:/.test(g.src) && !fileOK(g.src)) P(`GALLERY 第 ${i + 1} 张图不存在：${g.src}`);
  if (!isStr(g.title)) W(`GALLERY 第 ${i + 1} 张没写 title`);
});

/* ---------- LINKS ---------- */
console.log("【友链】", LINKS.length, "个");
LINKS.forEach((l, i) => {
  if (!l || typeof l !== "object") { P(`LINKS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(l.name)) P(`LINKS 第 ${i + 1} 个缺 name`);
  if (!isStr(l.url)) P(`LINKS 第 ${i + 1} 个缺 url`);
  else if (!/^https?:\/\//.test(l.url)) W(`LINKS 第 ${i + 1} 个网址不完整（要带 https://）：${l.url}`);
  if (!isStr(l.desc)) W(`LINKS 第 ${i + 1} 个没写 desc`);
});

/* ---------- TIMELINE / NOW / SKILLS ---------- */
console.log("【时间轴】", TIMELINE.length, "条");
TIMELINE.forEach((t, i) => {
  if (!t || typeof t !== "object") { P(`TIMELINE 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(t.date)) P(`TIMELINE 第 ${i + 1} 条缺 date`);
  if (!isStr(t.title)) P(`TIMELINE 第 ${i + 1} 条缺 title`);
  if (!isStr(t.desc)) W(`TIMELINE 第 ${i + 1} 条没写 desc`);
});

console.log("【此刻】", NOW.length, "项");
NOW.forEach((n, i) => {
  if (!n || typeof n !== "object") { P(`NOW 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(n.k)) P(`NOW 第 ${i + 1} 项缺 k（左边的标签）`);
  if (!isStr(n.v)) P(`NOW 第 ${i + 1} 项缺 v（右边的内容）`);
});

console.log("【能力条】", SKILLS.length, "项");
SKILLS.forEach((s, i) => {
  if (!s || typeof s !== "object") { P(`SKILLS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(s.name)) P(`SKILLS 第 ${i + 1} 项缺 name`);
  if (typeof s.value !== "number" || s.value < 0 || s.value > 100)
    P(`SKILLS 第 ${i + 1} 项的 value 要填 0~100 的数字，现在是 ${s.value}`);
});

/* ---------- 汇总 ---------- */
console.log("\n══════ 体检结果 ══════");
if (!problems.length) console.log("✅ 没发现错误，数据完好");
else { console.log("❌ " + problems.length + " 个错误："); problems.forEach((m) => console.log("   · " + m)); }
if (warns.length) { console.log("⚠️  " + warns.length + " 个提醒："); warns.forEach((m) => console.log("   · " + m)); }
