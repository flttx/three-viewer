"use client";

import { memo } from "react";
import Image from "next/image";

import { SampleModel } from "@/types";

interface ModelGalleryProps {
  items: SampleModel[];
  activeUrl?: string | null;
  layout?: "grid" | "row";
  onSelect: (item: SampleModel) => void;
}

const ModelGallery = ({
  items,
  activeUrl,
  layout = "grid",
  onSelect,
}: ModelGalleryProps) => {
  const isRow = layout === "row";
  const imageSizes = isRow ? "128px" : "(min-width: 1024px) 160px, 45vw";
  const previewSizes = "240px";
  const previewPosition = isRow
    ? "left-1/2 top-full mt-2 -translate-x-1/2"
    : "left-1/2 top-0 -translate-x-1/2 -translate-y-[110%]";
  const isAnimatedImage = (src: string) =>
    src.split("?")[0]?.toLowerCase().endsWith(".gif");

  const formatBytes = (bytes: number) => {
    if (!bytes) return "未知";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className={
        isRow
          ? "flex gap-3 overflow-x-auto overflow-y-visible pb-2"
          : "grid grid-cols-2 gap-3"
      }
    >
      {items.map((item) => {
        const isActive = activeUrl === item.url;
        const tagPreview = item.tags.slice(0, 2).join(" · ");
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`group relative flex flex-col gap-2 overflow-hidden rounded-2xl border px-2 py-2 text-left shadow-sm ring-1 ring-transparent transition ${
              isRow ? "w-32 flex-shrink-0" : "w-full"
            } ${
              isActive
                ? "border-indigo-300/90 bg-gradient-to-br from-indigo-50/90 via-white to-cyan-50/80 shadow-md ring-indigo-200/80 dark:border-indigo-400/50 dark:from-indigo-500/10 dark:via-slate-900 dark:to-cyan-500/10 dark:ring-indigo-400/40"
                : "border-slate-200/80 bg-white/80 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-indigo-500/40 dark:hover:ring-indigo-500/30"
            }`}
          >
            <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-0 transition group-hover:opacity-100 dark:via-indigo-500/40" />
            <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <Image
                src={item.thumbnail}
                alt={`${item.name} 缩略图`}
                fill
                sizes={imageSizes}
                unoptimized={isAnimatedImage(item.thumbnail)}
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            </span>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="line-clamp-1 font-semibold text-slate-800 dark:text-slate-100">
                {item.name}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {formatBytes(item.sizeBytes)}
              </span>
            </div>
            <span className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-300">
              {tagPreview || item.summary}
            </span>
            <span
              className={`pointer-events-none absolute z-20 hidden w-56 group-hover:block ${previewPosition}`}
            >
              <span className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <span className="relative block aspect-[4/3] w-full">
                  <Image
                    src={item.thumbnail}
                    alt={`${item.name} 预览`}
                    fill
                    sizes={previewSizes}
                    unoptimized={isAnimatedImage(item.thumbnail)}
                    className="object-cover"
                  />
                </span>
                <span className="block space-y-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-200">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-300">
                    {item.summary}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    文件大小：{formatBytes(item.sizeBytes)}
                  </span>
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(ModelGallery);
