/* 文章详情页：Giscus 评论设置，开启前需配置仓库 Discussions。 */
const POST_CONFIG = {
  giscus: {
    enabled: true, // ← 改成 true 才会出现评论区
    repo: "LHZRG/lhzrg.github.io", // ← 改成「你的用户名/仓库名」
    repoId: "R_kgDOUVOJgA", // ← giscus.app 给你的那串
    category: "Announcements", // ← 分类名，一般不用改
    categoryId: "DIC_kwDOUVOJgM4DHfwz", // ← giscus.app 给你的那串
  },
};
