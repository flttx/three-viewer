---
description: 构建生产环境版本的应用程序。
---

在生产部署前，确保所有 LOD 模型已生成。

// turbo
1. 执行生产构建：
   ```powershell
   pnpm build
   ```

2. 构建完成后，可以使用 `pnpm start` 在本地验证生产包。
