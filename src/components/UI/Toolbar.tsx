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
}: ToolbarProps) => {
  const qualityLabelMap: Record<QualityLevel, string> = {
    low: "低",
    medium: "中",
    high: "高",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {modelName || "尚未加载模型"}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          {mode === "embedded" ? "嵌入模式：隐藏全局导航" : "独立模式：完整界面"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          画质
          <select
            value={qualityMode}
            onChange={(event) =>
              onQualityChange(event.target.value as QualityMode)
            }
            className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-100"
          >
            <option value="auto">
              自动（{qualityLabelMap[resolvedQuality]}）
            </option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        {animationAvailable && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="text-xs font-semibold">动画</span>
            <select
              value={activeAnimationIndex}
              onChange={(event) =>
                onAnimationSelect(Number(event.target.value))
              }
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-100"
            >
              {animationClips.map((clip) => (
                <option key={clip.index} value={clip.index}>
                  {clip.name}
                </option>
              ))}
            </select>
            <select
              value={animationLoop}
              onChange={(event) =>
                onAnimationLoopChange(event.target.value as AnimationLoopMode)
              }
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-100"
            >
              <option value="repeat">循环</option>
              <option value="once">单次</option>
              <option value="pingpong">往返</option>
            </select>
            <select
              value={animationSpeed}
              onChange={(event) =>
                onAnimationSpeedChange(Number(event.target.value))
              }
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-100"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={onLoadSample}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          加载示例模型
        </button>
        <label className="relative cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          导入模型
          <input
            type="file"
            multiple
            accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2"
            className="sr-only"
            onChange={(event) => {
              onImportFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => onExport("glb")}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-100 dark:text-slate-900"
        >
          导出 GLB
        </button>
        <button
          type="button"
          onClick={() => onExport("gltf")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          导出 glTF
        </button>
        <button
          type="button"
          onClick={onToggleAnimation}
          disabled={!animationAvailable}
          className={`rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
            animationAvailable
              ? "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
          }`}
          title={animationAvailable ? "切换动画播放" : "当前模型无动画"}
        >
          {animationPlaying ? "暂停动画" : "播放动画"}
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          切换为{theme === "dark" ? "浅色" : "深色"}
        </button>
      </div>
    </div>
  );
};

export default memo(Toolbar);
