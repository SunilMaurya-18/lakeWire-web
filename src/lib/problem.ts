export const problemScroll = { p: 0 };

export const captions = [
  "Every broker stores a copy.",
  "Every copy crosses zones.",
  "LakeWire stores it once.",
] as const;

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

export function visualProgress(reduced: boolean) {
  const p = problemScroll.p;
  if (!reduced) return p;
  if (p < 0.34) return 0.16;
  if (p < 0.67) return 0.5;
  return 0.92;
}

export function costAt(p: number) {
  const climb = smoothstep(0, 0.66, p);
  const drop = smoothstep(0.66, 1, p);
  const peak = 4.8 + (18.6 - 4.8) * climb;
  return peak + (2.4 - peak) * drop;
}

export function formatCost(value: number) {
  return `$${value.toFixed(2)}`;
}

const bands = [
  [0, 0.3],
  [0.38, 0.64],
  [0.8, 1],
] as const;

export function captionOpacity(p: number, index: number) {
  const [a, b] = bands[index];
  const fade = 0.08;
  if (p < a) return Math.min(1, Math.max(0, (p - (a - fade)) / fade));
  if (p > b) return Math.min(1, Math.max(0, (b + fade - p) / fade));
  return 1;
}
