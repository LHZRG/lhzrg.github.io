/* 友链：首页与友链页共用。review 可分段，snap 为首页截图，added 为排序日期。 */
const LINKS = [
  {
    name: "言一",
    desc: "源于同一场幻想。",
    url: "https://esahc-shen.github.io/FIRSTWEB/", // ← 改：换成真实网址
    color: "#c98f4e",
    initial: "言一",
    added: "2026-10-10", // ← 改：什么时候加上的（排序用）
    pinned: true, // ← 改：true = 首页置顶，false / 删掉这行 = 不置顶
    snap: "assets/img/yanyi.jpg", // ← 改：换成对方首页的截图
    snapDate: "2026-10-10",
    owner: "总设计师谢先生",
    review: [
      "这里幻想的时间似乎更长，",
      "但也结束地更早。",
    ],
    tags: ["个人博客", "时间", "天气预报（?）"],
    known: "2026-09",
    status: "保持现状",
  },
  {
    name: "小和山猫虫阁",
    desc: "萨莉亚品鉴专家杀手兔倾情呈现。",
    url: "https://hildassd.github.io/",
    color: "#5ac9e8",
    initial: "猫虫",
    added: "2026-10-10",
    pinned: false,
    snap: "assets/img/xhsmcg.jpg",
    snapDate: "2026-10-10",
    owner: "杀手兔",
    review: ["应当说此处是本站的灵感源头", "喜欢猫猫虫的普遍智慧。"],
    tags: ["个人博客", "萨莉亚", "猫猫虫"],
    known: "2026-08",
    status: "常来常新",
  },
];
