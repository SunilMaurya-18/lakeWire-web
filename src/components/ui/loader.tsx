"use client";

import { useLake } from "@/store/lake";

export function Loader() {
  const progress = useLake((state) => state.loadProgress);
  const falling = useLake((state) => state.falling);
  const loaded = useLake((state) => state.loaded);
  if (loaded) return null;

  return (
    <p
      className="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 font-mono text-[12px] uppercase tracking-[0.16em] text-slate transition-opacity duration-ui ease-lake"
      style={{ opacity: falling ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      {String(progress).padStart(3, "0")}%
    </p>
  );
}
