import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const binExt = process.platform === "win32" ? ".cmd" : "";
const gltfTransform = path.resolve(
  root,
  "node_modules",
  ".bin",
  `gltf-transform${binExt}`,
);

const ratio = Number(process.env.LOD_RATIO || 0.4);
const errorThreshold = Number(process.env.LOD_ERROR || 0.001);

if (process.env.SKIP_LOD === "1") {
  console.log("已跳过 LOD 预生成（SKIP_LOD=1）");
  process.exit(0);
}

if (!existsSync(gltfTransform)) {
  console.error("未找到 gltf-transform CLI，请先执行 npm install。");
  process.exit(1);
}

const targets = [
  {
    input: path.resolve(root, "public/models/ktx2"),
    output: path.resolve(root, "public/models/lod/ktx2"),
  },
  {
    input: path.resolve(root, "public/models/high"),
    output: path.resolve(root, "public/models/lod/high"),
  },
  {
    input: path.resolve(root, "public/models"),
    output: path.resolve(root, "public/models/lod/raw"),
  },
];

const runSimplify = (input, output) => {
  const result = spawnSync(
    gltfTransform,
    [
      "simplify",
      input,
      output,
      "--ratio",
      ratio.toString(),
      "--error",
      errorThreshold.toString(),
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

for (const target of targets) {
  if (!existsSync(target.input)) continue;
  mkdirSync(target.output, { recursive: true });
  const entries = readdirSync(target.input).filter((file) =>
    file.toLowerCase().endsWith(".glb"),
  );

  for (const file of entries) {
    const input = path.join(target.input, file);
    const output = path.join(target.output, file);

    if (existsSync(output)) {
      const inputTime = statSync(input).mtimeMs;
      const outputTime = statSync(output).mtimeMs;
      if (outputTime >= inputTime) {
        console.log(`跳过 ${file}（LOD 已是最新）`);
        continue;
      }
    }

    console.log(`生成 LOD：${path.relative(root, input)} -> ${path.relative(root, output)}`);
    runSimplify(input, output);
  }
}
