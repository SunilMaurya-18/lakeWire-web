"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { parts } from "@/content/system";
import { clearFocus, explore, exploreVersion, setMode, setOpenPart, subscribeExplore, systemScroll } from "@/lib/explore";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function SystemPanel() {
  const version = useSyncExternalStore(subscribeExplore, exploreVersion, exploreVersion);
  const mobile = useLake((state) => state.mobile);
  const [speed, setSpeed] = useState(1);
  const [mode, setLocalMode] = useState(1);
  const open = parts.find((part) => part.id === explore.openPart);
  void version;

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#system",
        start: "top bottom",
        end: "top 30%",
        scrub: reduced ? true : 1,
      },
      onUpdate: () => {
        systemScroll.p = state.p;
        if (state.p < 0.65) clearFocus();
      },
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      systemScroll.p = 0;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const listed = parts.filter((part) => (mode >= 0.5 ? part.lake : part.classic));

  return (
    <div className="pointer-events-none sticky top-0 h-[100svh]">
      <div className="pointer-events-auto absolute left-6 right-6 top-24 flex flex-col gap-3 sm:left-10 sm:right-auto sm:w-72">
        <div className="flex h-11 rounded-full border border-line bg-raised p-1">
          <button
            type="button"
            className={`flex-1 rounded-full text-sm ${mode < 0.5 ? "bg-white text-ink" : "text-slate"}`}
            onClick={() => {
              setLocalMode(0);
              setMode(0);
            }}
          >
            Classic Kafka
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full text-sm ${mode >= 0.5 ? "bg-white text-ink" : "text-slate"}`}
            onClick={() => {
              setLocalMode(1);
              setMode(1);
            }}
          >
            LakeWire
          </button>
        </div>
        <label className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
          <span className="w-14">{speed.toFixed(1)}×</span>
          <input
            className="h-11 w-full accent-brass"
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={speed}
            aria-label="Event speed"
            onChange={(event) => {
              const next = Number(event.target.value);
              setSpeed(next);
              explore.speed = next;
            }}
          />
        </label>
      </div>
      {open ? (
        <aside className="pointer-events-auto absolute bottom-6 left-6 right-6 max-w-sm rounded-[10px] border border-line bg-raised p-4 sm:left-10">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.16em] text-brass">{open.name}</h2>
            <button type="button" className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate" onClick={() => setOpenPart(null)}>
              Back
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white">{open.line}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate">{open.detail}</p>
          <pre className="mt-3 overflow-hidden font-mono text-[12px] text-white">{open.code}</pre>
        </aside>
      ) : null}
      {mobile && !open ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto px-4 pb-4">
          {listed.map((part) => (
            <button
              key={part.id}
              type="button"
              className="h-11 shrink-0 rounded-full border border-line bg-raised px-4 text-sm text-white"
              onClick={() => {
                setOpenPart(part.id);
                window.dispatchEvent(new CustomEvent("lakewire-focus", { detail: { at: part.at } }));
              }}
            >
              {part.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
