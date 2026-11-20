import { Vector3 } from "three";

export const volumes = [
  { id: "research", title: "Research", href: "/research" },
  { id: "docs", title: "Docs", href: "/docs" },
] as const;

export type VolumeId = (typeof volumes)[number]["id"];

export const hubScroll = { p: 0, live: false };

export const library = {
  hover: null as VolumeId | null,
  open: null as VolumeId | null,
  cover: 0,
};

export function openVolume(id: VolumeId) {
  if (library.open) return;
  library.open = id;
}

export function resetLibrary() {
  library.hover = null;
  library.open = null;
  library.cover = 0;
}

export function hubPose(mobile: boolean, pos: Vector3, look: Vector3) {
  if (mobile) {
    pos.set(0, -7.55, -67.4);
    look.set(0, -9.15, -72);
    return;
  }
  pos.set(0.45, -7.85, -68.15);
  look.set(0, -8.95, -72);
}
