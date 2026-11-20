import { gsap } from "gsap";
import { Vector3 } from "three";

export const gapScroll = { p: 0 };
export const systemScroll = { p: 0 };

export const ringOrigin = new Vector3(0, -6.25, -16);
export const cityOrigin = new Vector3(0, -7.4, -34);

export const focus = {
  active: false,
  position: new Vector3(),
  look: new Vector3(),
};

export const explore = {
  openTile: null as string | null,
  openPart: null as string | null,
  mode: 1,
  speed: 1,
  spin: 0,
  spinV: 0,
  stack: 0,
  stackV: 0,
  dragging: false,
  orbitYaw: 0.62,
  orbitPitch: 0.46,
  orbitRadius: 16,
};

let version = 0;
const listeners = new Set<() => void>();

export function subscribeExplore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function exploreVersion() {
  return version;
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function setOpenTile(id: string | null) {
  if (explore.openTile === id) return;
  explore.openTile = id;
  emit();
}

export function setOpenPart(id: string | null) {
  if (explore.openPart === id) return;
  explore.openPart = id;
  if (!id) focus.active = false;
  emit();
}

const lakeOnly = new Set(["agents", "batcher", "storage", "coordinator"]);

export function setMode(mode: number) {
  explore.mode = mode;
  if (mode < 0.5 && explore.openPart && lakeOnly.has(explore.openPart)) setOpenPart(null);
  else emit();
}

const lookTarget = new Vector3();
const eye = new Vector3();

export function flyToPart(from: Vector3, fromLook: Vector3, x: number, y: number, z: number) {
  lookTarget.set(cityOrigin.x + x, cityOrigin.y + y, cityOrigin.z + z);
  eye.set(lookTarget.x + 1.45, lookTarget.y + 0.72, lookTarget.z + 2.5);
  if (!focus.active) {
    focus.position.copy(from);
    focus.look.copy(fromLook);
  }
  focus.active = true;
  gsap.killTweensOf([focus.position, focus.look]);
  gsap.to(focus.position, { x: eye.x, y: eye.y, z: eye.z, duration: 0.9, ease: "power3.out" });
  gsap.to(focus.look, { x: lookTarget.x, y: lookTarget.y, z: lookTarget.z, duration: 0.9, ease: "power3.out" });
}

export function clearFocus() {
  focus.active = false;
  if (explore.openPart) setOpenPart(null);
}
