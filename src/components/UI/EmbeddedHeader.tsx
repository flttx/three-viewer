"use client";

import { ViewerMode } from "@/types";

interface EmbeddedHeaderProps {
  mode: ViewerMode;
}

const EmbeddedHeader = ({ mode }: EmbeddedHeaderProps) => {
  if (mode !== "embedded") return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200/80 bg-white/80 px-4 py-3 text-xs shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_30%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_90%_0%,rgba(52,211,153,0.12),transparent_38%)]" />
      <div className="relative flex items-center justify-between gap-3 text-slate-600 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-[11px] font-semibold text-white shadow-sm dark:from-indigo-400 dark:to-sky-300">
            EMB
          </span>
          <span className="text-sm font-semibold">嵌入模式（仅核心 UI）</span>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100">
          iframe 环境已激活
        </span>
      </div>
    </div>
  );
};

export default EmbeddedHeader;
