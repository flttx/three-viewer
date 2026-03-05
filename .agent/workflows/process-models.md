---
description: 处理原始 GLB 模型，生成 KTX2 压缩纹理和多级 LOD 模型。
---

此工作流用于优化模型加载速度和渲染性能。

// turbo
1. **生成 KTX2 压缩纹理** (需要系统安装有 gltf-pipeline 或相关工具):
   ```powershell
   pnpm models:ktx2
   ```

// turbo
2. **生成多级 LOD 模型**:
   ```powershell
   pnpm models:lod
   ```

完成后，优化的模型将存放在 `public/models/ktx2` 和 `public/models/lod` 目录下。
