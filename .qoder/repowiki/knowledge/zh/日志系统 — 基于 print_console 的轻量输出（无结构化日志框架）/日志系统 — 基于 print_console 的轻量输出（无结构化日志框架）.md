---
kind: logging_system
name: 日志系统 — 基于 print/console 的轻量输出（无结构化日志框架）
category: logging_system
scope:
    - '**'
source_files:
    - tools/build_posts.py
    - tools/watch_posts.py
    - Blog/article.js
    - Blog/script.js
---

本仓库未引入任何专用日志框架或结构化日志库，所有“日志”输出均通过 Python 标准 `print` 与浏览器原生 `console.error` 完成，属于最轻量的开发期/构建期输出方式。

- 构建脚本 `tools/build_posts.py`：仅在最终汇总阶段使用一次 `print(...)` 输出构建统计信息，中间处理过程无任何日志记录。
- 增量监视器 `tools/watch_posts.py`：使用带 `[watch]` 前缀的 `print` 输出文件变更事件、重建状态与退出提示，作为本地开发时的唯一反馈渠道。
- 前端页面 `article.js`、`script.js`：在数据加载失败等异常路径中使用 `console.error(...)` 向浏览器控制台输出错误堆栈或消息，用于调试静态站点渲染问题。

设计决策与约束
- 没有统一的 logger 初始化、日志级别（debug/info/warn/error）、日志轮转或持久化机制。
- 没有集中式日志配置或环境变量控制开关。
- 所有输出均为面向人的可读文本，不具备机器可解析的结构化字段。

开发者应遵循的规则
- 如需新增构建期或运行期诊断信息，直接在相应位置追加 `print` / `console.error`，保持现有风格一致。
- 避免在生产环境依赖这些输出做任何业务逻辑判断；它们仅用于开发与调试。
- 若未来需要结构化日志，建议引入独立 logger 模块并统一替换现有 `print`/`console.error` 调用。