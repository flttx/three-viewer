"use client";

import { ReactNode } from "react";

interface SceneProps {
  children?: ReactNode;
}

const Scene = ({ children }: SceneProps) => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(34,197,94,0.15),transparent_40%)]" />
      <div className="relative z-10 flex h-full w-full flex-col">
        {children}
      </div>
    </div>
  );
};

export default Scene;
