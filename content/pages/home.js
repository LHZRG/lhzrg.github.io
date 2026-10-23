/* 首页：首屏与栏目文案；图片路径相对于网站根目录。 */
const HOME = {
  heroImage: "assets/img/hero.jpg", // ★改这里：首页右侧那张大图的路径
  heroTag: "午后三时 ，此处见",
  // 仅此字段允许 HTML：<em> 高亮，<br> 换行，请不要粘贴不可信代码。
  titleHtml: "把日子摊开在<em>桌上</em>，<br />让阳光替我读一遍。",
  readButton: "读读新的篇",
  galleryButton: "看看照的片",
  imageAlt: "午后阳光斜照的木桌一角",
  imageCaption: "西窗 · 15:20",
  imageSubtitle: "A ROOM WITH AFTERNOON",
  sections: ["关 于 我 的", "此 刻", "写 的 话", "拍 的 光", "实 用 工 具", "友 情 链 接"],
  headings: ["最近的文章", "图片墙", "随手的小工具", "友情链接"],
  moreLinks: ["全部文章 →", "进入相册 →", "全部工具 →", "全部友链 →"],
};

/* 此刻卡片：k 标签、v 内容、note 备注。 */
const NOW = [
  { k: "在读", v: "《2024级折工大本科生交流群群精华》", note: "群友怎么都这么扫啊" },
  { k: "在听", v: "《コネクト》", note: "あいしてるよ" },
  { k: "在拍", v: "《Love ZJUT》", note: "项目已新建文件夹，发展态势稳中向好" },
];

/* 首页展示数量和排序；排序规则也供图片页、友链页使用。 */
const HOME_LAYOUT = {
  posts: 4, // ★改这里：首页显示几篇文章
  gallery: 5, // ★改这里：首页图片墙显示几张照片
  links: 4, // ★改这里：首页显示几个友链
  now: 3, // ★改这里：首页「此刻」显示几项
  tools: 3, // ★改这里：首页「实用工具」显示几个入口（就是骰子/硬币/今天吃什么那三张卡）
  order: "pinned-first", // ★改这里："pinned-first" / "unpinned-first" / "date-first"
  dateDesc: true, // ★改这里：true = 新的在前，false = 旧的在前
};
