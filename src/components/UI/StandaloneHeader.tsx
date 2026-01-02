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
    <header className="sticky top-0 z-10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 shadow-lg" />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
              SceneHub 3D Viewer
            </p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              独立模式
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-300">
            {theme === "dark" ? "深色" : "浅色"}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            切换至{themeLabel}
          </button>
        </div>
      </div>
    </header>
  );
};

export default StandaloneHeader;
