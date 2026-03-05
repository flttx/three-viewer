# SceneHub 3D Viewer - AGENT.md

欢迎使用 SceneHub 3D Viewer 项目。此文件为 AI Agent 提供项目背景、技术架构及开发准则。

## 🚀 项目概述
SceneHub 是一个高性能、工业级的 3D 模型查看器，支持多种格式（GLB, GLTF, KTX2）的预览、材质编辑与导出。它设计为既可以独立运行，也支持通过 `iframe` 嵌入到其他系统中。

## 🛠 技术栈
- **框架**: Next.js 16.1.1 + React 19
- **核心 3D**: Three.js + @react-three/fiber + @react-three/drei
- **样式**: Tailwind CSS v4 + SCSS (嵌套支持)
- **动画**: Framer Motion (用于 UI 平滑交互)
- **依赖**: 
  - `react-colorful`: 专业材质拾色器
  - `meshopt_decoder`: 高性能模型解压
  - `GLTFExporter`: 模型导出功能

## 📂 核心目录结构
- `/src/components/Viewer`: 3D 核心组件，包含 `ViewerCanvas`、环境光效、控制器等。
- `/src/components/UI`: UI 图层，包括 `Toolbar` (工具栏)、`MaterialInspector` (材质编辑器)、`ModelGallery` (画廊)。
- `/src/lib`: 核心工具库，如 `materialUtils.ts` (材质处理)、`communication.ts` (跨域通讯)。
- `/src/workers`: 统计分析 Worker，负责在后台计算模型的三角面、材质、贴图内存等数据。
- `/public/models`: 预置模型及资源（KTX2 / DRACO 解码器路径均为 `/basis/` 和 `/draco/`）。

## 🔑 核心开发模式
### 1. 材质编辑 (Material Inspector)
- **通讯**: 通过 `useImperativeHandle` 在 `ViewerCanvas` 暴露 `updateMaterial` 方法。
- **状态**: 材质信息通过 `extractMaterials` 提取后传给 UI。支持 **Reset (重置)** 和 **Presets (预设)**。
- **响应式**: 桌面端可自由拖拽 (`framer-motion`)，移动端自动转为底部弹窗。

### 2. 模型加载与内存管理
- **Blob 安全**: 导入本地模型时使用 `URL.createObjectURL`。警告：**撤销 (Revoke) URL 时必须留出 1000ms+ 的延迟**，防止 Three.js 正在加载贴图时请求失败。
- **缓存策略**: 项目已**全局禁用** `Three.Cache` 以防止刷新或 HMR 后出现失效的 Blob URL 导致加载错误（"Couldn't load texture"）。
- **水合安全**: 模型信息展示（三角形数、内存等）需使用 `suppressHydrationWarning` 或在 `useEffect` 后赋值，防止 SSR 冲突。

### 3. Iframe 通讯
- 使用 `CommunicationHub` 类监听来自父页面的指令（如 `load_model`, `set_theme`）。
- 始终通过 `hub.postMessage` 反送状态（`model_loaded`, `error`）。

## ⚠️ 注意事项
- **SCSS**: 全局样式位于 `src/app/globals.scss`，支持嵌套。引入 Tailwind v4 的 `@theme` 模式。
- **Perf**: 高精度分析（如 Stats 分析）必须放在 Worker 中，避免主线程卡顿。
- **GIF**: `Image` 组件加载 `.gif` 缩略图时必须带上 `unoptimized` 属性，且移除 `sizes` 以防 SSR 报错。

## 🤖 对 Agent 的建议
在修改 3D 逻辑时，优先检查 `ViewerCanvas.tsx`。修改 UI 时，请保持 `glass` (毛玻璃) 风格一致。处理本地 Blob 资源时，务必关注 URL 的生命周期管理。
