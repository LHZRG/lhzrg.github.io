# 语林集 · YU LIN JI

午后斜阳 × 现代原木的个人小站。纯静态，零依赖，零构建，推到 GitHub Pages 就能跑。

```
打开 index.html → 加载页（氛围图 + 美言美句 + 进度条）→ 点「推门而入」→ 主站
```

---

## 一、本地预览

```bash
# 任选一种
python -m http.server 8000
npx serve .
```

然后浏览器打开 <http://localhost:8000>。

> 直接双击 `index.html` 也能跑（所有资源都是相对路径），但用本地服务器更接近线上效果。

---

## 二、部署到 GitHub Pages

### 方式 A：最简单（推荐）

1. 在 GitHub 新建仓库，比如 `yulinji`，把本目录所有文件推上去（`main` 分支）
2. 仓库 → **Settings → Pages → Build and deployment**
3. Source 选 **Deploy from a branch**，分支选 `main`，目录选 `/ (root)`
4. 保存，等一两分钟，访问 `https://你的用户名.github.io/yulinji/`

### 方式 B：用 GitHub Actions

仓库里已经放好了 `.github/workflows/deploy.yml`。把 Pages 的 Source 改成 **GitHub Actions**，之后每次 `git push` 会自动部署。

> 根目录的 `.nojekyll` 不要删，否则 Jekyll 可能吃掉部分文件。

---

## 三、改内容：只动 `assets/js/data.js`

所有内容都集中在这一个文件里，改完刷新即可，不用碰 HTML。

> **找改动位置的小技巧**：所有可以改的地方，代码里都写了中文注释，
> 且统一用 `★改这里` 标记。在编辑器里全局搜索 **`★改这里`**，
> 就能列出全站所有可改的点；`data.js` 顶部还有一张「修改速查表」，
> 写着「想改什么 → 翻到哪一段」。

| 变量       | 作用                                                       |
| ---------- | ---------------------------------------------------------- |
| `SITE`     | 站名、作者、头像、简介、标签、开站日期、社交链接、评论配置 |
| `QUOTES`   | 加载页轮播的美言美句（建议 5–8 句，太长会看不完）          |
| `POSTS`    | 全部文章                                                   |
| `GALLERY`  | 图片墙的照片                                               |
| `LINKS`    | 友情链接                                                   |
| `TIMELINE` | 关于页的时间轴                                             |
| `SKILLS`   | 关于页的技能条（纯装饰）                                   |
| `NOW`      | 首页「此刻」在读 / 在听 / 在拍                             |

### 加一篇文章

往 `POSTS` 数组里塞一个对象就行（`id` 不要重复）：

```js
{
  id: "my-new-post",              // 唯一，英文，会变成网址 ?id=my-new-post
  title: "新文章标题",
  date: "2026-10-01",             // 格式 YYYY-MM-DD
  tags: ["随笔", "生活"],          // 首页和列表页会自动生成标签筛选
  cover: "assets/img/gallery-02.jpg",
  pinned: false,                  // true 会显示在最前并带「置顶」角标
  excerpt: "一句话摘要，会显示在卡片上",
  body: [
    "第一段。",
    "## 小标题",
    "正文支持 Markdown：**粗体**、*斜体*、`代码`、列表、引用、表格、代码块。",
    "> 引用一句话",
  ].join("\n"),
}
```

首页、文章列表、搜索、标签筛选、上下篇、相关文章、阅读时长，全部自动更新。

### 换图片

把图片丢进 `assets/img/`，改 `data.js` 里的路径即可。图片建议压缩后再传：

```bash
pip install Pillow
python tools/compress_images.py     # 缩到最大边 1600px 并转 JPG，通常能压掉 90%
```

---

## 四、开启评论（Giscus）

评论区已经预留好位置，默认关闭。启用只要三步：

1. 打开 <https://giscus.app>，输入你的仓库名（需公开 + 已开启 Discussions）
2. 页面会自动生成 `repoId` 和 `categoryId`，复制下来
3. 填进 `data.js` 的 `SITE.giscus`，并把 `enabled` 改成 `true`

```js
giscus: {
  enabled: true,
  repo: "yourname/yulinji",
  repoId: "R_xxxxxxxxxx",
  category: "Announcements",
  categoryId: "DIC_xxxxxxxxxx",
}
```

不想要评论也无妨，评论区会显示一段说明文字，删掉对应区块即可。

---

## 五、RSS

`rss.xml` 里的链接目前是占位域名 `https://yourname.github.io/yulinji/`。
部署后全局替换成你自己的地址即可（顺便把 `data.js` 里 `SITE.socials` 的 RSS 项也确认一下）。

---

## 六、站点里已经做好的功能

**加载页**

- 全屏氛围图 + 缓慢推镜（Ken Burns）+ 斜射光带 + 飘浮尘埃
- 美句轮播（淡入淡出，每 5.6 秒换一句）
- 真实预加载进度条（预载主站图片，同时有最短展示时长，不会一闪而过）
- 进度满后「推门而入」按钮亮起，回车也能进；点击后暖光从点击处扩散转场

**主站**

- 首页：Hero + 个人介绍 + 此刻（在读/在听/在拍）+ 精选文章 + 图片墙 + 友链
- 文章：标签筛选、页内搜索、卡片 / 年表双视图
- 文章详情：目录（滚动高亮）、阅读进度条、字数与阅读时长、代码块一键复制、上下篇、相关文章
- 图片：瀑布流 + 灯箱（← → 翻页、ESC 退出、随机看一张）
- 友链：卡片墙、随机串门、申请友链说明（含一键复制邮箱）
- 关于：简介、技能条、时间轴、联系方式
- 全局：日光 / 灯下夜话主题切换（会记住）、Ctrl+K 全站搜索、移动端菜单、回到顶部、404 页

---

## 七、目录结构

```
.
├── index.html          加载页（入口）
├── home.html           首页
├── blog.html           文章列表
├── post.html           文章详情（?id=xxx）
├── gallery.html        图片墙
├── links.html          友链
├── about.html          关于
├── 404.html            走丢页
├── rss.xml             订阅源（记得换域名）
├── .nojekyll           给 GitHub Pages 的标记，别删
├── assets/
│   ├── css/main.css       设计系统（改配色、字体、圆角都在这）
│   ├── css/loading.css    加载页样式
│   ├── js/data.js         ★ 你唯一需要改的文件
│   ├── js/markdown.js     极简 Markdown 渲染（零依赖）
│   ├── js/app.js          导航 / 搜索 / 灯箱 / 主题 / 光影
│   ├── js/loading.js      加载页交互
│   ├── js/pages/*.js      各页面渲染逻辑
│   └── img/               图片
└── tools/compress_images.py
```

配色变量在 `assets/css/main.css` 顶部的 `:root` 里，想换色调改那几行就够。

---

慢慢写，别着急。光好的时候再更新。
