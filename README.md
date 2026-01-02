# SceneHub 3D Viewer

基于 Next.js（App Router）+ TypeScript + Tailwind CSS 的三维查看器骨架，支持独立模式与 iframe 嵌入模式切换，并预置 postMessage 通信封装、URL 参数接入、主题切换等能力。

## 快速开始

```bash
npm install
npm run dev
# 默认端口 5401，如已被占用会自动递增端口
```

## 核心能力

- 嵌入/独立自适应：`window.self !== window.top` 与 `?embedded=true` 双重检测，自动隐藏非核心 UI。
- 通信封装：`src/lib/communication.ts` 中的 `CommunicationHub` 封装 postMessage 安全校验、事件分发。
- 参数优先级：URL 参数 > 父页面消息 > 本地缓存 > 默认示例模型。
- 主题同步：支持 `?theme=dark|light`、父页面 `set_theme` 消息、本地存储回退。
- 目录骨架：`src/components/Viewer` 预留 Three.js 相关组件，占位提示后续接入 Loader/Controls。

## 目录速览

- `src/components/ClientWrapper.tsx`：模式检测、参数解析、消息监听的主容器。
- `src/components/UI`：独立/嵌入头部与工具栏。
- `src/components/Viewer`：Scene/Controls 相关组件。
- `src/lib/communication.ts` & `src/lib/constants.ts`：消息协议常量与安全校验。
- `src/types/index.ts`：消息与模型类型定义。

## 示例模型

示例模型默认使用 `public/models/ktx2`（KTX2 压缩版），原始模型保留在 `public/models`。当前已内置：
- `DamagedHelmet.glb`
- `Avocado.glb`
- `BoomBox.glb`
- `Lantern.glb`
- `Duck.glb`
- `Fox.glb`
- `VirtualCity.glb`（`public/models/high`）
- `CarConcept.glb`（`public/models/high`）

缩略图资源位于 `public/models/thumbs`，应用内已提供示例模型选择器。
支持标签筛选、悬停预览与模型信息卡片（网格/三角面/材质/贴图/动画/骨骼/纹理占用统计）。
已接入 Draco/Meshopt 解码与画质档位控制（自动/高/中/低）。

## 模型导入

工具栏新增“导入模型”，支持：

- `glb` 直接导入
- `gltf` + 贴图/`bin` 等资源文件一起选择（多选）

本地导入模型不会写入本地缓存。

## 模型来源与许可

- `VirtualCity` / `CarConcept`：来源 `KhronosGroup/glTF-Sample-Assets`，许可文件已保存至 `public/models/high/*.LICENSE.md`。

## 父页面模拟器

用于验证 iframe 通信与白名单策略：

1. 启动开发服务器：`npm run dev`
2. 打开 `http://localhost:5401/parent-simulator.html`
3. 在模拟器中发送 `load_model` / `set_theme`，观察 `export_complete` 等回传日志

## Vercel 环境与 CSP

- `NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS`：逗号分隔的允许嵌入域名（例如 `https://portal.example.com,https://app.example.com`）
- 头部注入：`next.config.ts` 会自动生成 `Content-Security-Policy: frame-ancestors ...`，部署前请确认域名完整

## Draco 解码器

`public/draco` 中包含 `draco_decoder.js` / `draco_decoder.wasm` / `draco_wasm_wrapper.js`，确保部署时静态资源可访问。

## KTX2/Basis 贴图压缩

`public/basis` 中包含 `basis_transcoder.js` / `basis_transcoder.wasm`，用于 KTX2 贴图解码（加载带 KHR_texture_basisu 的 glTF 时需要）。

## KTX2 转换脚本

需要安装 KTX-Software 的 `toktx`（加入 PATH，或设置 `TOKTX_PATH` / `KTX2_TOOLS`），然后执行：

```bash
npm run models:ktx2
# 可选：node scripts/ktx2.mjs public/models public/models/ktx2
```

## LOD 预生成

构建前会自动生成 LOD（简化版模型）：

```bash
npm run models:lod
# 或在 build 阶段自动执行 prebuild
```

默认输出到：
- `public/models/lod/ktx2`
- `public/models/lod/high`
- `public/models/lod/raw`

如需跳过 LOD 预生成，可设置 `SKIP_LOD=1`。

## 嵌入通信约定

消息结构：`{ type: "SCENEHUB_EVENT", action, data, source: "scenehub-3d-viewer" }`

动作示例：
- 父 → 子：`load_model`、`set_theme`
- 子 → 父：`model_loaded`、`export_requested`（后续可扩展 `export_complete`、`error`）

允许嵌入域配置：`NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS`（逗号分隔，默认 `*`）。

## 部署提示

- 目标：Vercel（Serverless）。
- 建议配置 `Content-Security-Policy: frame-ancestors ...` 控制可嵌入域。
- 公共模型资源可放在 `public/models`，借助 Vercel CDN 加速。
