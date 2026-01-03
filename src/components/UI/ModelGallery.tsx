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
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`group relative flex flex-col gap-2 rounded-xl border px-2 py-2 text-left transition-all duration-300 ${isRow ? "w-32 flex-shrink-0" : "w-full"
              } ${isActive
                ? "border-blue-500/50 bg-blue-50/50 dark:border-blue-400/50 dark:bg-blue-500/10 ring-1 ring-blue-500/20"
                : "border-transparent bg-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:scale-[1.02]"
              }`}
          >
            <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 shadow-inner">
              <Image
                src={item.thumbnail}
                alt={`${item.name} 缩略图`}
                fill
                sizes={imageSizes}
                className="object-cover transition duration-500 group-hover:scale-110"
              />
              {/* Active Indicator Overlay */}
              {isActive && (
                <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none" />
              )}
            </span>
            <span className={`text-xs font-medium transition-colors ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {item.name}
            </span>

            {/* Hover Preview Tooltip (Desktop only) */}
            <span
              className={`pointer-events-none absolute z-50 hidden w-56 opacity-0 group-hover:opacity-100 group-hover:delay-500 transition-opacity duration-300 md:block ${previewPosition}`}
            >
              <span className="block overflow-hidden rounded-xl border border-slate-200/50 bg-white/95 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/95">
                <span className="relative block aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={item.thumbnail}
                    alt={`${item.name} 预览`}
                    fill
                    sizes={previewSizes}
                    className="object-cover"
                  />
                </span>
                <span className="block space-y-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-200">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed">
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
                  <span className="block text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                    Size: {formatBytes(item.sizeBytes)}
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
