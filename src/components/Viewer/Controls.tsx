"use client";

const Controls = () => {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-xs text-slate-100 backdrop-blur">
      <span className="rounded-md bg-white/10 px-2 py-1">左键：旋转</span>
      <span className="rounded-md bg-white/10 px-2 py-1">右键：平移</span>
      <span className="rounded-md bg-white/10 px-2 py-1">滚轮：缩放</span>
      <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-100">
        控制逻辑待接入 Three.js
      </span>
    </div>
  );
};

export default Controls;
