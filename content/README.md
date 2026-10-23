# 网站内容修改指南

原来集中在 `assets/js/data.js` 的内容，现在按「全站 → 页面 → 具体条目」拆分在这个目录中。

## 想改什么，就打开哪个文件

| 要修改的内容 | 文件（相对于仓库根目录） |
| --- | --- |
| 站名、作者、开站日期、联系方式、页脚主标语 | `content/shared/site.js` |
| 首页与关于页共用的个人介绍、头像、身份、小标签 | `content/shared/profile.js` |
| 全站导航名称和顺序 | `content/shared/navigation.js` |
| 页脚栏目、链接、介绍小字 | `content/shared/footer.js` |
| 首页首屏标题、按钮、大图说明、栏目标题 | `content/pages/home.js` 的 `HOME` |
| 首页「此刻」卡片 | `content/pages/home.js` 的 `NOW` |
| 首页文章/图片/友链/工具显示数量及排序 | `content/pages/home.js` 的 `HOME_LAYOUT` |
| 进站页轮播句、加载进度提示、停留时间 | `content/pages/loading.js` |
| 进站页其他静态文案 | `content/pages/loading-copy.js` |
| 关于页时间轴、能力条 | `content/pages/about.js` |
| 关于页栏目与说明文字 | `content/pages/about-copy.js` |
| 文章列表页的标题、提示 | `content/pages/blog.js` |
| 一篇文章的标题、摘要、正文、标签、封面、日期 | `content/posts/文章ID.js` |
| 文章详情页评论配置 | `content/pages/post.js` |
| 图片页标题和说明 | `content/pages/gallery.js` |
| 照片标题、地点、日期、置顶 | `content/gallery/photos.js` |
| 友链页说明、申请提示 | `content/pages/links.js` |
| 友链站点、截图、评价、标签 | `content/links/friends.js` |
| 工具页静态标题和按钮 | `content/pages/tools.js` |
| 工具入口名称、说明、图标，骰子/硬币数量与动画参数 | `content/tools/config.js` |
| 餐厅抽取地区和校内/校外范围 | `content/tools/food-areas.js` |
| 餐厅名称、照片、地址、价格、评价 | `content/tools/food-spots.js` |
| 404 页文案 | `content/pages/not-found.js` |

### 内容与程序分开

- `content/`：日常维护的内容与配置。
- `assets/js/pages/`：把数据渲染到页面的程序，通常不用修改。
- 根目录 `*.html`：页面结构、SEO 标题/描述以及少量带链接、代码等格式的混合文案；文本副本同时作为 JavaScript 加载前的占位。**带 `data-copy` 的文字以对应页面配置为准，不要只改 HTML 中的占位文字。**
- `assets/css/`：外观样式。
- `assets/img/`：图片本体，图片路径仍写 `assets/img/xxx.jpg`，不要写成相对于 `content/` 的路径。

页面的 `PAGE_COPY` 中，`text01` 等键与 HTML 的 `data-copy="text01"` 对应；只改右边的文字即可，键名不要随意改。每页的键独立，不会互相影响。首页的 `HOME` 则按首屏、按钮、栏目等语义字段组织。

共享介绍只维护一份，修改后首页和关于页一起更新；首页主标题与页脚标语已经独立，不会联动。

> 边界：搜索提示、工具结果统计等少量与逻辑紧密相关的动态短句仍在 `assets/js/app.js` 或 `assets/js/pages/` 中；页面 `<title>`、SEO 描述与复杂混合文案仍在对应 HTML。并非每一个界面字词都已抽取。

## 修改已有文章

直接打开对应的 `content/posts/文章ID.js`，一篇文章一个文件，不必再翻整站数据。

```js
POSTS.push({
  id: "my-new-post", // 网址 post.html?id=my-new-post；发布后尽量不改
  title: "文章标题",
  date: "2026-10-23",
  tags: ["随笔"],
  cover: "assets/img/hero.jpg",
  pinned: false,
  excerpt: "一句话摘要。",
  body: [
    "第一段。",
    "", // 两段之间加空行
    "## 小标题",
    "第二段，支持 **加粗** 和 [链接](https://example.com)。",
  ].join("\n"),
});
```

- `id` 必须唯一，使用英文、数字、连字符；`pinned: true` 表示首页置顶。
- Markdown 写法与原来一致，Wiki 组件、表格、麻将牌码均保留。
- 编辑已有文章或已有配置：**保存、刷新即可，无需运行脚本**。

## 新增 / 删除文章

1. 在 `content/posts/` 新建文章文件，例如 `my-new-post.js`，照上方模板填写。
2. 在仓库根目录执行一次：

   ```sh
   python tools/sync-content.py
   ```

   脚本会更新 `content/files.json` 与所有 HTML 的脚本引用；不会重写文章内容。删除文章文件后也运行一次即可。
3. 将新增文章、更新后的 HTML 与 `content/files.json` 一起提交到 GitHub。

`content/posts/index.js` 只负责初始化集合，不要在里面写正文。`content/files.json` 是文件清单，不是另一个大内容文件；已存在文章的顺序会保留，同一天文章的顺序与上下篇可能受它影响。

如果不运行 Python，也可以手动修改清单并同步每个 HTML 的内容脚本区；必须先加载 `posts/index.js`，再加载每篇文章，最后加载渲染程序，不要使用 `async`。

## 检查与预览

- 可以双击 HTML 预览；更推荐在根目录运行 `python -m http.server 8123` 后访问 `http://localhost:8123/home.html`。
- 修改后按 `Ctrl + F5` 强制刷新。
- 有 Node.js 时运行 `node tools/check-data.js`，检查语法、重复文章 ID、图片路径与数据字段。
- 已安装 `jsdom` 且本地服务器已启动时，运行 `node tools/smoke.js`，检查各页面与主要交互。

网站仍然是纯静态文件，GitHub Pages 不需要安装框架、Node.js 或执行构建。
