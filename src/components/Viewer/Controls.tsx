"use client";

const Controls = () => {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-slate-100 shadow-inner backdrop-blur">
      <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
        控制提示
      </span>
      <span className="rounded-lg bg-white/12 px-3 py-1">左键：旋转</span>
      <span className="rounded-lg bg-white/12 px-3 py-1">右键：平移</span>
      <span className="rounded-lg bg-white/12 px-3 py-1">滚轮：缩放</span>
      <span className="rounded-lg bg-emerald-500/20 px-3 py-1 text-emerald-100">
        控制逻辑待接入 Three.js
      </span>
    </div>
  );
};

export default Controls;
