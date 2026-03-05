"use client";

import { ThemeOption } from "@/types";
import { useMemo } from "react";

interface StandaloneHeaderProps {
  theme: ThemeOption;
  onToggleTheme: () => void;
}

const StandaloneHeader = ({ theme, onToggleTheme }: StandaloneHeaderProps) => {
  const themeLabel = useMemo(
    () => (theme === "dark" ? "浅色模式" : "深色模式"),
    [theme],
  );

  return (
    <header className="sticky top-0 z-30 pt-4">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-4 shadow-lg ring-1 ring-white/60 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60 dark:ring-slate-800/60">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_40%_80%,rgba(56,189,248,0.1),transparent_30%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 shadow-xl shadow-indigo-200/60 ring-4 ring-white/40 dark:shadow-indigo-900/30 dark:ring-slate-800/70" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    SceneHub 3D Viewer
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100">
                    运行中
                  </span>
                </div>
                <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                  独立模式
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  支持 Three.js 渲染、模型导入导出与嵌入通信。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                当前主题：{theme === "dark" ? "深色" : "浅色"}
              </span>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-105 active:translate-y-[1px] dark:from-indigo-400 dark:via-sky-400 dark:to-cyan-300 dark:text-slate-900"
              >
                切换至{themeLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StandaloneHeader;
