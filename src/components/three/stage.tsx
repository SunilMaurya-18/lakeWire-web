"use client";

import { Canvas } from "@react-three/fiber";
import { World } from "@/components/three/world";
import { dprFor } from "@/lib/tier";
import { useLake } from "@/store/lake";

export function Stage() {
  const tier = useLake((state) => state.deviceTier);
  const mobile = useLake((state) => state.mobile);
  return (
    <Canvas
      flat
      dpr={dprFor(tier, mobile)}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: true }}
      camera={{ position: [0, 0.08, 6.2], fov: mobile ? 52 : 42, near: 0.1, far: 140 }}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <World />
    </Canvas>
  );
}
