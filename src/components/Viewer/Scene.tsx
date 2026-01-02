"use client";

import { ReactNode } from "react";

interface SceneProps {
  children?: ReactNode;
}

const Scene = ({ children }: SceneProps) => {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900/80 to-slate-800 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.2),transparent_35%),radial-gradient(circle_at_50%_70%,rgba(56,189,248,0.18),transparent_32%)]" />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {children}
      </div>
    </div>
  );
};

export default Scene;
