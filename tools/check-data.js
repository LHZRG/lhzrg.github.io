/* 临时体检脚本：按 data.js 真实字段结构逐项检查 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const src = fs.readFileSync(path.join(root, "assets/js/data.js"), "utf8");
const md = fs.readFileSync(path.join(root, "assets/js/markdown.js"), "utf8");

let D;
try {
  D = new Function(src + "\n" + md + "\nreturn ({SITE,POSTS,QUOTES,GALLERY,LINKS,TIMELINE,NOW,SKILLS,HOME_LAYOUT,TOOLS,TOOLS_CONFIG,FOOD_AREAS,FOOD_SPOTS,Markdown});")();
} catch (e) {
  console.log("❌ data.js 执行报错：", e.message);
  process.exit(1);
}

const Markdown = D.Markdown;
const { SITE, POSTS, QUOTES, GALLERY, LINKS, TIMELINE, NOW, SKILLS, HOME_LAYOUT, TOOLS, TOOLS_CONFIG, FOOD_AREAS, FOOD_SPOTS } = D;

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
  if (!isStr(g.date)) W(`GALLERY 第 ${i + 1} 张没写 date（拍摄日期），首页排序时它会排在最后`);
});

/* ---------- LINKS ---------- */
console.log("【友链】", LINKS.length, "个");
LINKS.forEach((l, i) => {
  if (!l || typeof l !== "object") { P(`LINKS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(l.name)) P(`LINKS 第 ${i + 1} 个缺 name`);
  if (!isStr(l.url)) P(`LINKS 第 ${i + 1} 个缺 url`);
  else if (!/^https?:\/\//.test(l.url)) W(`LINKS 第 ${i + 1} 个网址不完整（要带 https://）：${l.url}`);
  if (!isStr(l.desc)) W(`LINKS 第 ${i + 1} 个没写 desc（卡片上的一行小字）`);
  if (!isStr(l.initial)) W(`LINKS 第 ${i + 1} 个没写 initial（头像上那个字）`);
  if (!isStr(l.color) || !/^#[0-9a-fA-F]{3,8}$/.test(String(l.color)))
    W(`LINKS 第 ${i + 1} 个的 color 不像颜色值：${l.color}`);
  // 弹窗用到的字段
  if (l.snap && !/^https?:/.test(l.snap) && !fileOK(l.snap)) P(`LINKS 第 ${i + 1} 个的快照图不存在：${l.snap}`);
  if (!l.snap) W(`LINKS 第 ${i + 1} 个还没放快照（弹窗左侧会显示虚线占位框）`);
  if (l.review && !Array.isArray(l.review) && typeof l.review !== "string")
    P(`LINKS 第 ${i + 1} 个的 review 只能是文字或文字数组`);
  if (!l.review) W(`LINKS 第 ${i + 1} 个还没写评价 review（弹窗右侧会空着）`);
  if (l.snapDate && !/^\d{4}-\d{2}-\d{2}$/.test(l.snapDate))
    W(`LINKS 第 ${i + 1} 个的 snapDate 建议写成 2026-10-09 这种格式：${l.snapDate}`);
  if (l.tags && !Array.isArray(l.tags)) W(`LINKS 第 ${i + 1} 个的 tags 不是 [ ] 数组`);
  if (!l.added && !l.known)
    W(`LINKS 第 ${i + 1} 个既没写 added（加入日期）也没写 known，排序时它会排在最后`);
  const revLen = Array.isArray(l.review) ? l.review.join("").length : (l.review || "").length;
  console.log("   " + String(l.name).padEnd(12) + (l.snap ? "有快照" : "无快照") + "  评价 " + String(revLen).padStart(3) + " 字");
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

/* ---------- 第 10 段：实用工具（骰子 / 硬币 / 今天吃什么） ---------- */
console.log("\n【实用工具】", (TOOLS || []).length, "个工具");
(TOOLS || []).forEach((t, i) => {
  if (!t || typeof t !== "object") { P(`TOOLS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(t.id)) P(`TOOLS 第 ${i + 1} 个缺 id（要和 tools.html 里的工具对得上）`);
  if (!isStr(t.name)) P(`TOOLS 第 ${i + 1} 个缺 name`);
  if (!isStr(t.desc)) W(`TOOLS 第 ${i + 1} 个没写 desc（卡片上的一句话说明）`);
  if (!isStr(t.icon)) W(`TOOLS 第 ${i + 1} 个没写 icon`);
  console.log("   " + String(t.id).padEnd(8) + String(t.icon || "").padEnd(4) + String(t.name || ""));
});
if (!(TOOLS || []).length) W("TOOLS 是空的，首页和工具页都不会显示工具入口");

const CFG = TOOLS_CONFIG || {};
if (!TOOLS_CONFIG) W("没找到 TOOLS_CONFIG，工具会用默认值：骰子 10 颗 / 硬币 10 枚");
["diceMax", "coinMax", "diceFaces"].forEach((k) => {
  const v = CFG[k];
  if (v !== undefined && (!Number.isInteger(v) || v < 1)) P(`TOOLS_CONFIG.${k} 要填大于 0 的整数，现在是 ${v}`);
});
["rollMs", "flipMs", "foodDrawMs"].forEach((k) => {
  const v = CFG[k];
  if (v !== undefined && (!Number.isInteger(v) || v < 100 || v > 6000))
    W(`TOOLS_CONFIG.${k} 建议填 100~6000（毫秒），现在是 ${v}`);
});

console.log("【抽取范围】", (FOOD_AREAS || []).length, "个地区");
const areaIds = [];
(FOOD_AREAS || []).forEach((a, i) => {
  if (!a || typeof a !== "object") { P(`FOOD_AREAS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(a.id)) P(`FOOD_AREAS 第 ${i + 1} 个缺 id`);
  else areaIds.push(a.id);
  if (!isStr(a.name)) P(`FOOD_AREAS 第 ${i + 1} 个缺 name（地区名）`);
  if (!Array.isArray(a.zones) || !a.zones.length)
    P(`FOOD_AREAS 第 ${i + 1} 个的 zones 要是数组，比如 ["校内", "校外"]`);
});

console.log("【餐厅卡片】", (FOOD_SPOTS || []).length, "家");
(FOOD_SPOTS || []).forEach((s, i) => {
  const tag = `FOOD_SPOTS 第 ${i + 1} 家「${s && s.name ? s.name : "?"}」`;
  if (!s || typeof s !== "object") { P(`FOOD_SPOTS 第 ${i + 1} 项不是对象`); return; }
  if (!isStr(s.name)) P(`${tag} 缺 name（门面名称）`);
  if (!isStr(s.area)) P(`${tag} 缺 area（属于哪个地区，要写 FOOD_AREAS 里的 id）`);
  else if (areaIds.length && areaIds.indexOf(s.area) < 0)
    P(`${tag} 的 area="${s.area}" 在 FOOD_AREAS 里找不到（可填的 id：${areaIds.join(" / ")}）`);
  if (!isStr(s.zone)) P(`${tag} 缺 zone（"校内" 或 "校外"）`);
  else {
    const a = (FOOD_AREAS || []).find((x) => x.id === s.area);
    if (a && Array.isArray(a.zones) && a.zones.indexOf(s.zone) < 0)
      P(`${tag} 的 zone="${s.zone}" 不在「${a.name}」的范围里（它只有：${a.zones.join(" / ")}）`);
  }
  if (!isStr(s.address)) W(`${tag} 没写 address（门面地址）`);
  if (!isStr(s.taste)) W(`${tag} 没写 taste（口味偏好）`);
  if (!isStr(s.price)) W(`${tag} 没写 price（价格区间）`);
  if (!s.review) W(`${tag} 还没写 review（我的评价）`);
  else if (!Array.isArray(s.review) && typeof s.review !== "string")
    P(`${tag} 的 review 只能是文字或文字数组`);
  const photos = Array.isArray(s.photos) ? s.photos.filter(Boolean) : [];
  if (!photos.length) W(`${tag} 还没放照片，抽到它时照片区会是空的`);
  photos.forEach((p) => {
    if (!/^https?:/.test(p) && !fileOK(p)) P(`${tag} 的照片不存在：${p}`);
  });
  if (s.tags && !Array.isArray(s.tags)) W(`${tag} 的 tags 不是 [ ] 数组`);
  console.log("   " + String(s.name).padEnd(14) + String(s.area || "").padEnd(9) + String(s.zone || "").padEnd(6) + photos.length + " 张照片");
});

/* ---------- HOME_LAYOUT（首页每个栏目显示几条 + 排序方式） ---------- */
console.log("\n【首页栏目设置 HOME_LAYOUT】");
const LAY = HOME_LAYOUT || {};
const ORDERS = ["pinned-first", "unpinned-first", "date-first"];
if (!HOME_LAYOUT) W("没找到 HOME_LAYOUT（data.js 第 9 段），首页会按默认值显示：文章 4 / 照片 6 / 友链 4 / 此刻 3");
[
  ["posts", POSTS.length, "文章"],
  ["gallery", GALLERY.length, "照片"],
  ["links", LINKS.length, "友链"],
  ["now", NOW.length, "此刻"],
].forEach(([key, total, label]) => {
  const v = LAY[key];
  if (v === undefined) { W(`HOME_LAYOUT.${key} 没填，${label}会显示全部 ${total} 条`); return; }
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1)
    P(`HOME_LAYOUT.${key} 要填一个大于 0 的整数，现在是 ${v}`);
  else console.log(`   ${label}：首页显示 ${Math.min(v, total)} / 共 ${total} 条`);
});
if (LAY.order !== undefined && !ORDERS.includes(LAY.order))
  P(`HOME_LAYOUT.order 只能填这三个之一：${ORDERS.join(" / ")}，现在是 "${LAY.order}"`);
else console.log("   排序：" + (LAY.order || "pinned-first") + "（置顶在前）· " + (LAY.dateDesc === false ? "旧的在前" : "新的在前"));
const pinnedPosts = POSTS.filter((p) => p.pinned).length;
const pinnedShots = GALLERY.filter((g) => g.pinned).length;
const pinnedLinks = LINKS.filter((l) => l.pinned).length;
console.log(`   已置顶：文章 ${pinnedPosts} 篇 / 照片 ${pinnedShots} 张 / 友链 ${pinnedLinks} 个`);
if (pinnedPosts >= POSTS.length && POSTS.length > 0) W("所有文章都置顶了，置顶就失去意义了");
if (pinnedLinks >= LINKS.length && LINKS.length > 0) W("所有友链都置顶了，置顶就失去意义了");

/* ---------- 汇总 ---------- */
console.log("\n══════ 体检结果 ══════");
if (!problems.length) console.log("✅ 没发现错误，数据完好");
else { console.log("❌ " + problems.length + " 个错误："); problems.forEach((m) => console.log("   · " + m)); }
if (warns.length) { console.log("⚠️  " + warns.length + " 个提醒："); warns.forEach((m) => console.log("   · " + m)); }
