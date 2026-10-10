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
├── links.html              # 友链
├── about.html              # 关于
├── assets/
│   ├── css/
│   │   ├── loading.css     # 加载页样式
│   │   └── main.css        # 全站样式（配色变量在顶部 :root）
│   ├── js/
│   │   ├── data.js         # ★ 全站内容：文章、相册、友链、站名
│   │   ├── app.js          # 导航、页脚、搜索、灯箱、主题
│   │   ├── loading.js      # 加载页交互
│   │   └── markdown.js     # 极简 Markdown 渲染器
│   └── img/                # 所有图片
│       ├── avatar.jpg
│       ├── hero.jpg
│       ├── loading.jpg
│       ├── snap-placeholder.jpg   # 友链弹窗的快照占位图
│       └── gallery-*.jpg
├── tools/
│   ├── compress_images.py  # 图片压缩脚本
│   ├── check-data.js       # 数据体检：查漏逗号、坏路径、段落被合并
│   └── smoke.js            # 全站冒烟测试：模拟打开 9 个页面
├── .nojekyll               # 告诉 GitHub Pages 不要用 Jekyll
└── README.md

慢慢写，别着急。光好的时候再更新。

