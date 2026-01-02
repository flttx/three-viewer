"use client";

const Loading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 px-6 py-8 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 dark:border-slate-700 dark:border-t-indigo-300" />
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          场景资源加载中
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          正在初始化 Three.js 与模型资源，请稍候
        </div>
      </div>
    </div>
  );
};

export default Loading;
