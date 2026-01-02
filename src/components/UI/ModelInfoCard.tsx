"use client";

import { memo } from "react";

import { ModelDescriptor, ModelStats, SampleModel } from "@/types";

interface ModelInfoCardProps {
  sample?: SampleModel | null;
  model?: ModelDescriptor | null;
  stats?: ModelStats | null;
  errorMessage?: string | null;
  variant?: "full" | "compact";
}

const formatBytes = (bytes?: number) => {
  if (bytes === 0) return "0 B";
  if (!bytes || Number.isNaN(bytes)) return "未知";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatNumber = (value?: number) => {
  if (value === 0) return "0";
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
};

const formatPixels = (pixels?: number) => {
  if (pixels === 0) return "0";
  if (!pixels || Number.isNaN(pixels)) return "—";
  if (pixels < 1_000_000) return `${Math.round(pixels / 1000)} K`;
  return `${(pixels / 1_000_000).toFixed(2)} M`;
};

const getComplexity = (stats?: ModelStats | null) => {
  if (!stats) return "—";
  const meshScore = stats.meshCount * 150;
  const materialScore = stats.materialCount * 300;
  const textureScore = stats.textureCount * 500;
  const texturePixelScore = stats.texturePixels / 1000;
  const textureMemoryScore = stats.textureMemoryBytes / 2048;
  const boneScore = stats.boneCount * 120;
  const boneDepthScore = stats.boneDepth * 240;
  const animationScore = stats.animationCount * 200;
  const score =
    stats.triangleCount +
    meshScore +
    materialScore +
    textureScore +
    texturePixelScore +
    textureMemoryScore +
    boneScore +
    boneDepthScore +
    animationScore;

  if (score < 15000) return "轻量";
  if (score < 60000) return "中等";
  if (score < 140000) return "复杂";
  return "高复杂";
};

const getFormatFromUrl = (url?: string | null) => {
  if (!url) return "未知";
  const suffix = url.split(".").pop()?.toLowerCase();
  if (suffix === "glb" || suffix === "gltf") return suffix.toUpperCase();
  return "未知";
};

const ModelInfoCard = ({
  sample,
  model,
  stats,
  errorMessage,
  variant = "full",
}: ModelInfoCardProps) => {
  const title = sample?.name || model?.name || "外部模型";
  const summary = sample?.summary || "外部模型，请留意跨域与资源大小。";
  const tags = sample?.tags || [];
  const sizeLabel = formatBytes(sample?.sizeBytes);
  const formatLabel =
    sample?.format.toUpperCase() || getFormatFromUrl(model?.url);
  const isCompact = variant === "compact";
  const complexity = getComplexity(stats);
  const textureStatsPending =
    stats != null &&
    stats.textureCount > 0 &&
    stats.texturePixels === 0 &&
    stats.textureMemoryBytes === 0 &&
    stats.maxTextureWidth === 0 &&
    stats.maxTextureHeight === 0;
  const maxTextureLabel = textureStatsPending
    ? "计算中"
    : stats && stats.maxTextureWidth && stats.maxTextureHeight
      ? `${stats.maxTextureWidth}×${stats.maxTextureHeight}`
      : "—";
  const texturePixelsLabel = textureStatsPending
    ? "计算中"
    : formatPixels(stats?.texturePixels);
  const textureMemoryLabel = textureStatsPending
    ? "计算中"
    : formatBytes(stats?.textureMemoryBytes);

  const fullItems = [
    { label: "文件大小", value: sizeLabel },
    { label: "Mesh 数量", value: formatNumber(stats?.meshCount) },
    { label: "材质数量", value: formatNumber(stats?.materialCount) },
    { label: "贴图数量", value: formatNumber(stats?.textureCount) },
    { label: "最大贴图", value: maxTextureLabel },
    { label: "贴图像素", value: texturePixelsLabel },
    { label: "纹理占用", value: textureMemoryLabel },
    { label: "三角面", value: formatNumber(stats?.triangleCount) },
    { label: "骨骼数量", value: formatNumber(stats?.boneCount) },
    { label: "骨骼深度", value: formatNumber(stats?.boneDepth) },
    { label: "动画数量", value: formatNumber(stats?.animationCount) },
    { label: "复杂度", value: complexity },
  ];

  const compactItems = [
    { label: "文件大小", value: sizeLabel },
    { label: "三角面", value: formatNumber(stats?.triangleCount) },
    { label: "贴图数量", value: formatNumber(stats?.textureCount) },
    { label: "纹理占用", value: textureMemoryLabel },
    { label: "动画数量", value: formatNumber(stats?.animationCount) },
    { label: "复杂度", value: complexity },
  ];

  const items = isCompact ? compactItems : fullItems;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/80 ${
        isCompact ? "px-4 py-3" : "p-4"
      } shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            {summary}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {formatLabel}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        className={`mt-4 grid ${
          isCompact ? "grid-cols-2 gap-3" : "grid-cols-3 gap-3"
        }`}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-slate-100/70 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-200"
          >
            <div className="text-[11px] text-slate-400 dark:text-slate-400">
              {item.label}
            </div>
            <div className="font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-100">
          加载异常：{errorMessage}
        </div>
      )}
    </div>
  );
};

export default memo(ModelInfoCard);
