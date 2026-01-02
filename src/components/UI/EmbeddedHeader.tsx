"use client";

import { ViewerMode } from "@/types";

interface EmbeddedHeaderProps {
  mode: ViewerMode;
}

const EmbeddedHeader = ({ mode }: EmbeddedHeaderProps) => {
  if (mode !== "embedded") return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
      <span>嵌入模式（仅核心 UI）</span>
      <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200">
        iframe 环境已激活
      </span>
    </div>
  );
};

export default EmbeddedHeader;
