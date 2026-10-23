# 语林集 · YU LIN JI
# 本站持续装修中，文字内容由人工智能工具智创占位，不具有现实意义。
### 本站命名灵感源自浙江工业大学屏峰校区语林楼
### “想说却还没说的，还很多。”

> 午后斜阳里的一间小馆。

🌐 **在线访问**：https://lhzrg.github.io

## ✨ 这是什么

**语林集**是一个纯静态的个人博客。

## 📁 目录结构

```text
.
├── index.html              # 加载页（推门而入）
├── home.html               # 首页
├── blog.html               # 文章列表
├── post.html               # 文章详情
├── gallery.html            # 图片墙
├── tools.html              # 实用工具（骰子 / 硬币 / 今天吃什么）
├── links.html              # 友链
├── about.html              # 关于
├── content/                # ★ 日常修改入口，详见 content/README.md
│   ├── shared/             # 站点、个人介绍、导航、页脚
│   ├── pages/              # 首页、加载页、关于页及各页文案
│   ├── posts/              # 一篇文章一个文件
│   ├── gallery/            # 图片墙数据
│   ├── links/              # 友链数据
│   ├── tools/              # 工具配置、抽取地区、餐厅
│   └── files.json          # 内容脚本清单
├── assets/
│   ├── css/
│   │   ├── loading.css     # 加载页样式
│   │   └── main.css        # 全站样式（配色变量在顶部 :root）
│   ├── js/
│   │   ├── page-copy.js    # 将页面文案配置填入模板
│   │   ├── pages/          # 各页面渲染逻辑
│   │   ├── app.js          # 导航、页脚、搜索、灯箱、主题
│   │   ├── loading.js      # 加载页交互
│   │   └── markdown.js     # 极简 Markdown 渲染器
│   └── img/                # 所有图片
│       ├── avatar.jpg
│       ├── hero.jpg
│       ├── loading.jpg
│       ├── snap-placeholder.jpg   # 友链弹窗的快照占位图
│       ├── gallery-*.jpg
│       └── food/           # ★「今天吃什么」的餐厅照片
├── tools/
│   ├── sync-content.py     # 新增/删除文章后，同步脚本引用
│   ├── load-content.js     # 测试用内容加载器
│   ├── compress_images.py  # 图片压缩脚本
│   ├── check-data.js       # 数据体检：查漏逗号、坏路径、段落被合并
│   └── smoke.js            # 全站冒烟测试：模拟打开 10 个页面
├── .nojekyll               # 告诉 GitHub Pages 不要用 Jekyll
└── README.md
```

## 修改内容

从 [内容修改指南](content/README.md) 开始，按页面查找要改的文件。原来的 `assets/js/data.js` 已拆分，不再使用。

- 改首页文字：`content/pages/home.js`。
- 改文章：`content/posts/` 中对应文章的文件。
- 改其他页面：`content/pages/` 中对应页面的文件。
- 改全站共用设置：`content/shared/`。

编辑已有内容，保存并刷新即可；新增或删除文章文件后，在仓库根目录运行 `python tools/sync-content.py`，并将同步修改一起提交。网站仍是纯静态文件，无需构建即可部署 GitHub Pages。

## 发布与浏览器缓存更新

仓库的 `.github/workflows/deploy.yml` 会在推送到 `main` 后自动打包并发布：

- 复制所有 HTML、`assets/` 与 `content/` 到 `_site/`（输出目录不提交）。
- 以 Git 提交 SHA 生成 `version.json`，给发布产物里的 JS/CSS 地址添加 `?v=版本号`。
- 页面打开时、重新回到前台时及前台每分钟检查一次版本；发现新版后保留查询参数和锚点，自动重新导航一次。
- 无网络或检查失败时保持当前页面；同一新版设有防循环刷新保护。

在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，然后推送并等待部署工作流成功。直接从分支目录发布不会运行这个打包步骤，也就不会自动注入更新检测。

本地验证：`python tools/test-build-site.py`、`node tools/test-update-check.js`。本地预览发布版：`python tools/build-site.py`，然后 `python -m http.server 8123 --directory _site`。

注意：

- 首次上线本机制前，已经打开且没有检测代码的旧页面不会自行更新，需要手动刷新一次；旧 HTML 缓存也可能要等 GitHub Pages 的缓存重新验证。
- 检测不能强行清除浏览器全部缓存，也无法跳过 GitHub Pages/CDN 的发布传播时间；不是上传文件后立即全球可见。
- 当前自动换版本覆盖 JS/CSS（包括所有内容配置与文章脚本）；若替换同路径图片，建议使用新文件名并修改引用，以免图片仍命中旧缓存。
- 自动更新会重置当前工具操作状态；文章 ID、网址查询参数及锚点会保留，但不保证保留滚动位置。

慢慢写，别着急。光好的时候再更新。
