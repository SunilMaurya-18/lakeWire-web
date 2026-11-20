import { create } from "zustand";
import type { SectionId } from "@/content/site";

export type DeviceTier = "high" | "mid" | "low";

type Pointer = { x: number; y: number };

type LakeState = {
  scrollProgress: number;
  activeSection: SectionId;
  deviceTier: DeviceTier;
  pointer: Pointer;
  mobile: boolean;
  reduced: boolean;
  loaded: boolean;
  falling: boolean;
  loadProgress: number;
  setScrollProgress: (value: number) => void;
  setActiveSection: (value: SectionId) => void;
  setDeviceTier: (value: DeviceTier) => void;
  setPointer: (value: Pointer) => void;
  setMobile: (value: boolean) => void;
  setReduced: (value: boolean) => void;
  setFalling: (value: boolean) => void;
  setLoadProgress: (value: number) => void;
  setLoaded: (value: boolean) => void;
};

export const useLake = create<LakeState>((set) => ({
  scrollProgress: 0,
  activeSection: "lake",
  deviceTier: "mid",
  pointer: { x: 0, y: 0 },
  mobile: false,
  reduced: false,
  loaded: false,
  falling: false,
  loadProgress: 0,
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setDeviceTier: (deviceTier) => set({ deviceTier }),
  setPointer: (pointer) => set({ pointer }),
  setMobile: (mobile) => set({ mobile }),
  setReduced: (reduced) => set({ reduced }),
  setFalling: (falling) => set({ falling }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setLoaded: (loaded) => set({ loaded }),
}));
