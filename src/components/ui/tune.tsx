"use client";

import { Leva } from "leva";

export function Tune() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Leva hidden />;
}
