import type { DeviceTier } from "@/store/lake";

export function dprFor(tier: DeviceTier, mobile: boolean) {
  const cap = mobile ? 1.5 : 2;
  if (tier === "low") return 1;
  if (tier === "mid") return Math.min(1.25, cap);
  return Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, cap);
}

export function tierFromGpu(gpuTier: number | undefined, mobile: boolean): DeviceTier {
  let tier: DeviceTier = "mid";
  if ((gpuTier ?? 2) >= 3) tier = "high";
  else if ((gpuTier ?? 2) <= 1) tier = "low";
  if (mobile && tier === "high") return "mid";
  if (mobile && tier === "mid") return "low";
  return tier;
}
