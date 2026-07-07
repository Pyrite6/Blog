---
kind: configuration_system
name: 基于 Front Matter 与构建脚本的博客配置系统
category: configuration_system
scope:
    - '**'
source_files:
    - tools/build_posts.py
    - tools/watch_posts.py
    - tools/start_post_watch.bat
    - data/posts.js
    - data/categories.js
    - data/fragments.js
---

本仓库没有传统意义上的集中式配置文件（如 .env、config.yaml、settings.json 等），而是采用以 Markdown 为单一事实源加 Python 构建脚本生成运行时数据的配置体系。所有站点行为与内容元数据通过 posts/ 下的 Markdown 文件及其 Front Matter 声明，由 tools/build_posts.py 在构建期解析并产出 data/*.js / data/*.json 供浏览器直接消费。

## 系统与工具链
- Front Matter 自定义格式：使用 --- 包裹的键值对作为文章级配置，支持标量、布尔、数字、数组及多行列表语法，由 parse_front_matter / parse_scalar 自实现解析器处理，不依赖外部 YAML/JSON 库。
- 构建脚本：tools/build_posts.py 扫描 posts/ 目录树，解析每篇文章的 Front Matter，计算阅读时间、字数、摘要、路径等信息，输出 data/posts.js、data/categories.js、data/fragments.js 以及 data/articles/<folder>/<slug>.js 单篇文章数据。
- 增量监视器：tools/watch_posts.py 轮询 posts/ 下 .md 文件的 mtime/size，变化时自动调用构建脚本重建。
- Windows 快捷启动：tools/start_post_watch.bat 用于一键启动 watch 模式。

## 关键文件与位置
- tools/build_posts.py：核心构建逻辑，定义 Front Matter 字段契约与数据模型
- tools/watch_posts.py：增量构建 watcher
- tools/start_post_watch.bat：Windows 启动脚本
- data/posts.js / data/categories.js / data/fragments.js：构建产物，被前端通过 script 标签加载
- data/articles/<category>/<slug>.js：单篇文章数据，由 article.html 动态按需加载
- posts/：唯一的事实源目录，Markdown 即配置

## 架构与约定
- 单一事实源：posts/ 下的 Markdown 是唯一的配置入口；任何站点结构变更都应修改对应 Markdown 或新增目录，而非直接编辑 data/ 下的 JS/JSON。
- Front Matter 字段契约（由 build_posts.py 硬编码）：必需/常用包括 title、date、tags、cover；可选包括 excerpt、summary、description、category、categoryOrder、featured、pinned、showInRecent、recentOrder、showInArchive、archiveOrder、wordCount、readingTime 等。布尔字段接受 true/false/1/0 字符串或字面量。
- 分类组织：posts/<category>/ 每个子目录视为一个分类，categoryOrder 控制排序；未指定 category 时回退到目录名。
- 碎片笔记：posts/fragments/ 中的 Markdown 按 ## YYYY-MM-DD HH:MM:SS 二级标题切分段落，自动生成时间戳与 ID。
- 输出命名空间：构建产物挂载到全局 window.__BLOG_POSTS__、__BLOG_CATEGORIES__、__BLOG_FRAGMENTS__、__BLOG_ARTICLE__，前端通过同名变量读取。
- 路径约定：文章图片存放于 image/<category>/<slug>/，封面图引用相对 assets/ 目录。

## 开发者应遵循的规则
- 不要手动编辑 data/ 下的 JS/JSON：这些文件由构建脚本生成，会被覆盖。所有变更应在 posts/ 中完成。
- Front Matter 必须用 --- 包裹，且位于文件最顶部；键值对使用 key: value 格式，列表项以 - 开头。
- 新增分类：在 posts/ 下新建目录即可，无需修改其他配置；如需调整显示顺序，设置 categoryOrder。
- 碎片日期格式：建议使用 YYYY-MM-DD HH:MM:SS，否则将回退为原始字符串。
- 图片资源：文章配图放在 image/<category>/<slug>/，封面图放在 assets/ 并通过 cover 字段引用。
- 运行构建：开发时使用 python tools/watch_posts.py 监听变更；部署前执行 python tools/build_posts.py 生成最终数据。

该系统本质上是一个 Markdown-as-configuration 的轻量静态站点方案，通过严格的字段约定和单向构建流程保证数据一致性，适合个人博客这种内容驱动、低复杂度的场景。