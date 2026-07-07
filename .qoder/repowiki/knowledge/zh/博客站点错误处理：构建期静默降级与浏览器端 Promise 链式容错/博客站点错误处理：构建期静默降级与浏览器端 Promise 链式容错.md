---
kind: error_handling
name: 博客站点错误处理：构建期静默降级与浏览器端 Promise 链式容错
category: error_handling
scope:
    - '**'
source_files:
    - tools/build_posts.py
    - tools/watch_posts.py
    - script.js
---

本仓库是一个纯静态博客，错误处理贯穿“构建脚本（Python）+ 浏览器客户端（JS）”两层，整体风格偏向静默降级与控制台日志，未引入统一错误类型或中间件。

1. 构建期（Python）
- tools/build_posts.py 没有显式 try/except，解析 Front Matter、正则匹配、文件读写等异常会直接抛出，导致构建中断；对缺失字段采用默认值回退（如 metadata.get("title") or slug），属于数据层静默降级。
- tools/watch_posts.py 通过 subprocess.run(..., check=False) 调用构建脚本，仅根据 returncode 打印 [watch] rebuild failed with exit code N，不捕获具体异常；KeyboardInterrupt 被捕获后优雅退出。
- 结论：构建阶段无自定义错误类型，失败即抛异常或返回非零退出码，由外部（watcher / CI）感知。

2. 浏览器端（JavaScript）
- 所有异步加载均基于 Promise + .catch((error) => console.error(error)) 模式，例如 loadDataScript、loadSharedHeader、loadSharedFooter、loadPosts 等调用链末端统一 catch 并输出到控制台。
- 资源加载失败时拒绝 Promise 并附带语义化消息（如 Failed to load data script: ...、Missing data payload: __BLOG_POSTS__、Failed to load shared header.），但页面不会崩溃，渲染函数内部对空数组做空状态兜底（empty-state）。
- 共享模块 BlogShared 暴露 escapeHtml、sanitizeSegment、normalizePath 等工具，用于防止 XSS 和路径注入，属于输入校验型防御而非运行时错误恢复。
- 未发现 throw new Error 之外的自定义错误类、错误码枚举或全局错误处理器。

3. 架构与约定
- 构建期：以“默认值回退 + 正则宽松匹配”为主，遇到不可恢复错误直接中断。
- 运行期：以“Promise 链式 .catch + console.error + 空数据渲染”为统一模式，保证页面在部分资源缺失时仍可展示骨架内容。
- 无中间件、无全局 try/catch、无 Sentry 等上报系统。

4. 开发者应遵循的规则
- 新增异步加载逻辑时，沿用 new Promise((resolve, reject) => { ... onerror: reject(new Error(msg)) }) 模式，并在调用处追加 .catch(console.error)。
- 构建脚本中尽量使用 dict.get(key, default) 与正则 fallback，避免对可选字段做强断言；若确需报错，保持抛出原生 Exception 以便 watcher 捕获退出码。
- 不要依赖 console.error 作为用户可见的错误提示；如需 UI 反馈，应在对应渲染函数内提供空状态文案。