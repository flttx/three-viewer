"use client";

import { memo } from "react";

import {
  AnimationClipInfo,
  AnimationLoopMode,
  QualityLevel,
  QualityMode,
  ThemeOption,
  ViewerMode,
} from "@/types";

interface ToolbarProps {
  mode: ViewerMode;
  theme: ThemeOption;
  qualityMode: QualityMode;
  resolvedQuality: QualityLevel;
  modelName?: string;
  animationAvailable: boolean;
  animationPlaying: boolean;
  animationClips: AnimationClipInfo[];
  activeAnimationIndex: number;
  animationLoop: AnimationLoopMode;
  animationSpeed: number;
  onLoadSample: () => void;
  onImportFiles: (files: FileList | null) => void;
  onExport: (format: "glb" | "gltf") => void;
  onToggleTheme: () => void;
  onQualityChange: (mode: QualityMode) => void;
  onToggleAnimation: () => void;
  onAnimationSelect: (index: number) => void;
  onAnimationLoopChange: (mode: AnimationLoopMode) => void;
  onAnimationSpeedChange: (speed: number) => void;
  onToggleMaterialInspector?: () => void;
}

const Toolbar = ({
  mode,
  theme,
  qualityMode,
  resolvedQuality,
  modelName,
  animationAvailable,
  animationPlaying,
  animationClips,
  activeAnimationIndex,
  animationLoop,
  animationSpeed,
  onLoadSample,
  onImportFiles,
  onExport,
  onToggleTheme,
  onQualityChange,
  onToggleAnimation,
  onAnimationSelect,
  onAnimationLoopChange,
  onAnimationSpeedChange,
  onToggleMaterialInspector,
}: ToolbarProps) => {
  const qualityLabelMap: Record<QualityLevel, string> = {
    low: "低",
    medium: "中",
    high: "高",
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-2 py-1">

      <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">

        {/* Quality Selector */}
        <div className="group relative flex items-center">
          <span className="absolute left-3 text-[10px] font-bold text-slate-400 pointer-events-none uppercase tracking-wider group-hover:text-blue-500 transition-colors">Quality</span>
          <div className="relative">
            <select
              value={qualityMode}
              onChange={(event) => onQualityChange(event.target.value as QualityMode)}
              className="h-9 pl-16 pr-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all cursor-pointer hover:bg-white hover:shadow-md dark:hover:bg-white/10 appearance-none min-w-[140px]"
            >
              <option value="auto">Auto ({resolvedQuality})</option>
              <option value="high">High Fidelity</option>
              <option value="medium">Balanced</option>
              <option value="low">Performance</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Animation Controls Group */}
        {animationAvailable && (
          <div className="flex items-center gap-2 p-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 pr-3">
            <button
              type="button"
              onClick={onToggleAnimation}
              className={`h-7 w-7 flex items-center justify-center rounded-full transition-all duration-300 ${animationPlaying ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:scale-110'}`}
              title={animationPlaying ? "Pause Animation" : "Play Animation"}
            >
              {animationPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              )}
            </button>

            <select
              value={activeAnimationIndex}
              onChange={(e) => onAnimationSelect(Number(e.target.value))}
              className="bg-transparent text-[11px] font-medium text-slate-600 dark:text-slate-300 outline-none max-w-[120px] truncate cursor-pointer hover:text-blue-500 transition-colors"
            >
              {animationClips.map((clip) => (
                <option key={clip.index} value={clip.index}>{clip.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions Group */}
        <div className="flex items-center gap-2">

          {/* Reset */}
          <button
            type="button"
            onClick={onLoadSample}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 hover:text-rose-500 dark:hover:text-rose-400 hover:shadow-md transition-all active:scale-95 glow-hover"
            title="Reset Scene"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>

          {/* Import */}
          <label className="cursor-pointer h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 hover:text-blue-500 dark:hover:text-blue-400 hover:shadow-md transition-all active:scale-95 glow-hover" title="Import File">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
            <input
              type="file"
              multiple
              accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2"
              className="sr-only"
              onChange={(e) => {
                onImportFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>

          {/* Export */}
          <div className="flex items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl p-0.5 ring-2 ring-slate-900/10 dark:ring-white/10">
            <button
              onClick={() => onExport("glb")}
              className="h-8 px-3 rounded-full text-[10px] font-bold hover:bg-white/20 dark:hover:bg-black/10 transition"
            >
              GLB
            </button>
            <div className="w-[1px] h-3 bg-white/20 dark:bg-black/10" />
            <button
              onClick={() => onExport("gltf")}
              className="h-8 px-3 rounded-full text-[10px] font-bold hover:bg-white/20 dark:hover:bg-black/10 transition"
            >
              GLTF
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/10 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-yellow-300 active:rotate-12"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2" /><path d="M12 21v2" /><path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" /><path d="M1 12h2" /><path d="M21 12h2" /><path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>

          {/* Material Logic */}
          <button
            onClick={onToggleMaterialInspector}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20 hover:text-purple-500 hover:shadow-md transition-all active:scale-95 glow-hover"
            title="Material Inspector"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 2.5-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(Toolbar);
