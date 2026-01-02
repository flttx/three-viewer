import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputArg = process.argv[2] || "public/models";
const outputArg = process.argv[3] || "public/models/ktx2";
const inputDir = path.resolve(root, inputArg);
const outputDir = path.resolve(root, outputArg);
const binExt = process.platform === "win32" ? ".cmd" : "";
const toktxName = process.platform === "win32" ? "toktx.exe" : "toktx";
const gltfTransform = path.resolve(
  root,
  "node_modules",
  ".bin",
  `gltf-transform${binExt}`,
);

const resolveToktxDir = (candidate) => {
  if (!candidate) return null;
  const resolved = path.resolve(candidate);
  if (!existsSync(resolved)) return null;
  const stats = statSync(resolved);
  if (stats.isFile()) {
    return path.basename(resolved).toLowerCase() === toktxName.toLowerCase()
      ? path.dirname(resolved)
      : null;
  }
  if (stats.isDirectory()) {
    const direct = path.join(resolved, toktxName);
    if (existsSync(direct)) return resolved;
    const binDir = path.join(resolved, "bin");
    if (existsSync(path.join(binDir, toktxName))) return binDir;
  }
  return null;
};

const buildEnvWithToktx = () => {
  const env = { ...process.env };
  const candidates = [
    resolveToktxDir(process.env.TOKTX_PATH),
    resolveToktxDir(process.env.KTX2_TOOLS),
    resolveToktxDir(path.join(root, ".tools", "ktx", "bin")),
  ].filter(Boolean);

  for (const candidate of candidates) {
    env.PATH = `${candidate}${path.delimiter}${env.PATH || ""}`;
    return { env, found: true, dir: candidate };
  }

  const probe = spawnSync(toktxName, ["--version"], {
    env,
    stdio: "ignore",
  });
  return { env, found: probe.status === 0, dir: null };
};

if (!existsSync(gltfTransform)) {
  console.error("未找到 gltf-transform CLI，请先执行 npm install。");
  process.exit(1);
}

if (!existsSync(inputDir)) {
  console.error(`输入目录不存在：${inputDir}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const { env, found, dir } = buildEnvWithToktx();
if (!found) {
  console.error(
    "未检测到 toktx，可安装 KTX-Software 并将 toktx 加入 PATH，或设置 TOKTX_PATH/KTX2_TOOLS。",
  );
  process.exit(1);
}

if (dir) {
  console.log(`已检测到 toktx：${dir}`);
}

const entries = readdirSync(inputDir).filter((file) =>
  file.toLowerCase().endsWith(".glb"),
);

if (entries.length === 0) {
  console.log("未找到可转换的 .glb 文件。");
  process.exit(0);
}

for (const file of entries) {
  const input = path.join(inputDir, file);
  const output = path.join(outputDir, file);
  if (input === output) continue;

  if (existsSync(output)) {
    const inputTime = statSync(input).mtimeMs;
    const outputTime = statSync(output).mtimeMs;
    if (outputTime >= inputTime) {
      console.log(`跳过 ${file}（已是最新）`);
      continue;
    }
  }

  console.log(`转换 ${file} -> ${path.relative(root, output)}`);
  const result = spawnSync(
    gltfTransform,
    ["etc1s", input, output, "--quality", "128", "--compression", "1"],
    { env, stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
