---
kind: frontend_style
name: 原生 CSS + CSS 变量主题系统
category: frontend_style
scope:
    - '**'
source_files:
    - styles.css
    - article.css
---

## 样式体系概览

站点采用**纯原生 CSS（无预处理器、无框架）**，通过 CSS 自定义属性（CSS Variables）集中管理设计令牌，配合 `body[data-theme="dark"]` 实现明暗双主题切换。所有页面共享同一套视觉语言，风格偏向现代玻璃拟态（glassmorphism）与柔和渐变。

## 核心文件与职责
- `styles.css`：全局样式与设计令牌主入口，包含根变量、布局、首页卡片、归档侧栏、碎片时间线等全部通用样式。
- `article.css`：文章详情页专用样式，覆盖 Markdown 渲染产物（标题、引用、代码块、图片等）的排版。
- 各 HTML 页面（`index.html`、`about.html`、`fragments.html`、`works.html`、`shelf.html`、`article.html`）通过 `<link>` 引入上述 CSS。
- 资源目录 `assets/` 存放背景图、封面图、SVG 插图等静态素材。

## 设计令牌（Design Tokens）
所有颜色、圆角、阴影、内容宽度均定义在 `:root` 中，并通过 `body[data-theme="dark"]` 覆盖，形成一套完整的 token 体系：
- 色彩：`--bg` / `--panel` / `--text` / `--muted` / `--accent` / `--accent-soft` / `--olive` 等
- 尺寸：`--radius-lg` / `--radius-md` / `--radius-sm` / `--content-width`
- 阴影：`--shadow`（深浅主题分别定义不同深度）

## 架构与约定
1. **命名规范**：使用 BEM 风格的单连字符类名（如 `.site-header`、`.post-card`、`.fragment-timeline`），语义清晰且避免嵌套过深。
2. **主题切换**：通过 JS 切换 `body` 上的 `data-theme="dark"` 属性，CSS 以 `body[data-theme="dark"]` 选择器覆盖对应变量或显式样式。
3. **响应式策略**：基于 `@media (max-width: ...)` 断点（1180px / 860px / 768px / 560px），结合 `clamp()` 函数实现流体字号与间距；头部导航在小屏下折叠为汉堡菜单（`.nav-toggle` + `.main-nav.is-open`）。
4. **布局模式**：大量使用 CSS Grid（`.post-grid`、`.archive-layout`、`.archive-sidebar`）和 Flexbox（`.site-header`、`.tag-cloud`），卡片组件统一采用 `border-radius` + `backdrop-filter: blur()` + 半透明背景的玻璃拟态风格。
5. **字体栈**：英文优先 `Aptos` / `Segoe UI`，中文回退 `PingFang SC` / `Microsoft YaHei`；标题与品牌文字使用衬线体 `STSong` / `Songti SC` / `SimSun` 营造人文感。
6. **交互细节**：统一的 `transition: ... 180ms ease` 缓动曲线，悬停时轻微上浮（`translateY(-1px)`）与缩放（`scale(1.03)`）增强反馈。

## 开发者应遵循的规则
- 新增颜色必须先在 `:root` 中声明 CSS 变量，并在 `body[data-theme="dark"]` 中提供暗色映射，禁止硬编码十六进制值。
- 组件类名保持扁平语义化，不嵌套超过两层，避免与现有 `.post-*`、`.archive-*`、`.fragment-*` 前缀冲突。
- 响应式调整优先通过修改 `--content-width` 与 `clamp()` 表达式，其次才写 `@media` 覆盖。
- 文章正文样式仅扩展 `article.css` 中的 `.article-detail-body > *` 规则，不要污染全局样式。
- 图标统一使用内联 SVG，通过 `stroke` / `fill: none` 继承当前文本颜色，保持主题一致性。