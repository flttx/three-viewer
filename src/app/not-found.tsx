"use client";

import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 px-8 py-10 text-center shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          404
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          页面未找到
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          当前地址不存在或已被移除，请返回主页继续浏览。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          返回主页
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
