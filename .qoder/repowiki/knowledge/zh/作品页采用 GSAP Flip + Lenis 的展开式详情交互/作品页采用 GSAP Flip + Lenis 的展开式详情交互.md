---
kind: design
name: 作品页采用 GSAP Flip + Lenis 的展开式详情交互
source: session
category: adr
---

# 作品页采用 GSAP Flip + Lenis 的展开式详情交互

_来源：9d7b929 → 79bed6b 提交周期内记录的编码计划——内容为规划时意图，实现可能滞后或有出入。_

**状态：** accepted

## 背景
作品页面需要从封面网格平滑过渡到单张作品的详情视图，同时保持滚动体验一致。传统路由跳转会丢失上下文和动画连贯性。

## 决策驱动
- 视觉连贯性（卡片位置到详情的无缝过渡）
- 滚动体验一致性（全局平滑滚动）
- 开发效率（利用成熟库而非手写复杂动画）

## 备选方案
- **GSAP Flip + Lenis 方案** — 优点：Flip 自动计算 DOM 变换实现卡片→详情的空间过渡；Lenis 提供全局统一平滑滚动；ScrollTrigger 驱动视差效果；CDN 引入零构建成本；缺点：依赖外部库增加包体；Flip 对 DOM 结构变化敏感需手动管理状态
- **纯 CSS transition/transform 方案** — 优点：无额外依赖；性能开销小；缺点：无法实现跨容器元素的空间过渡；视差效果需大量手写代码；难以维护
- **SPA 路由切换（如 Vue Router）** — 优点：组件化清晰；状态管理方便；缺点：需要重构整个站点为 SPA；迁移成本高；与现有 script.js 共享 header/footer 架构不兼容

## 决策
选择 GSAP（Flip + ScrollTrigger）+ Lenis 组合：用 Flip.getState/from 实现封面卡片到详情容器的空间过渡动画，用 Lenis 接管全局滚动，ScrollTrigger 驱动图片视差缩放和标题位移。

## 影响
works.html 通过 CDN 引入 GSAP 和 Lenis，works.js 封装 PreviewItem 类管理每个卡片的 ScrollTrigger 时间线；展开时调用 lenis.stop() 防止滚动冲突，收起后恢复；isAnimating 锁防止快速点击导致动画错乱。需在后续页面复用该模式时需评估 CDN 加载策略。