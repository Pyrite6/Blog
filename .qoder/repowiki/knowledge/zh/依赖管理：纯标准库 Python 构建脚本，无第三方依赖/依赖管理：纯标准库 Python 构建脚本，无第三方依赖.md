---
kind: dependency_management
name: 依赖管理：纯标准库 Python 构建脚本，无第三方依赖
category: dependency_management
scope:
    - '**'
source_files:
    - tools/build_posts.py
    - tools/watch_posts.py
    - tools/start_post_watch.bat
---

本仓库的依赖管理策略极为简单：整个站点由静态 HTML/CSS/JS 页面与一组 Python 构建脚本组成，**未引入任何第三方包**。所有依赖均为 Python 标准库模块，无需 `requirements.txt`、`pyproject.toml`、`poetry.lock`、`go.mod`、`package.json` 等任何依赖清单或锁文件。

### 1. 使用的系统/方法
- **Python 标准库**：构建脚本仅使用 `json`、`re`、`pathlib`、`shutil`、`math`、`subprocess`、`sys`、`time` 等内置模块。
- **无包管理器**：不存在 pip、Poetry、Conda、Node.js、Go modules 等工具链；直接通过 `python tools/build_posts.py` 和 `python tools/watch_posts.py` 运行。
- **无 vendoring / lockfile**：没有 `vendor/`、`node_modules/`、`go.sum`、`package-lock.json` 等锁定或缓存目录。

### 2. 关键文件
- `tools/build_posts.py` — 扫描 `posts/*.md`，解析 Front Matter，生成 `data/*.js`、`data/*.json` 以及 `data/articles/*` 下的文章数据。
- `tools/watch_posts.py` — 基于轮询（`time.sleep(1)`）监听 `posts/` 下 `.md` 文件的增删改，自动重跑构建。
- `tools/start_post_watch.bat` — Windows 下启动 watch 进程的批处理入口。

### 3. 架构与约定
- 构建产物（`data/`、`data/articles/`）作为“已编译”输出随源码一起提交，浏览器直接 `<script src="data/posts.js">` 加载，无需运行时再解析 Markdown。
- 增量开发流程：`watch_posts.py` → `build_posts.py` → 刷新浏览器，形成本地热更新体验。
- 前端渲染层完全零依赖，仅使用原生 DOM API 读取 `window.__BLOG_POSTS__` 等全局变量。

### 4. 开发者应遵循的规则
- **禁止新增第三方依赖**：如需新能力，优先用正则/字符串处理自行实现，或在 `tools/` 中内联代码，避免引入外部包。
- **保持 Python 版本兼容**：脚本使用 `from __future__ import annotations` 与类型注解，建议以 Python 3.8+ 环境运行。
- **构建产物需提交**：修改 `posts/` 后必须运行 `python tools/build_posts.py` 并同步提交生成的 `data/` 文件，否则线上站点会缺少数据。
- **Windows 用户可用 `start_post_watch.bat`** 启动 watcher，Linux/macOS 直接 `python tools/watch_posts.py`。