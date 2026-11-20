"use client";

import { useEffect, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { tiles } from "@/content/gap";
import { explore, exploreVersion, gapScroll, subscribeExplore } from "@/lib/explore";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function Gap() {
  const version = useSyncExternalStore(subscribeExplore, exploreVersion, exploreVersion);
  const open = tiles.find((tile) => tile.id === explore.openTile);
  void version;

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#gap",
        start: "top bottom",
        end: "top 30%",
        scrub: reduced ? true : 1,
      },
      onUpdate: () => {
        gapScroll.p = state.p;
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gapScroll.p = 0;
    };
  }, []);

  return (
    <div className="pointer-events-none sticky top-0 h-[100svh]">
      <p className="sr-only" aria-live="polite">
        {open ? `${open.title}. ${open.problem} ${open.answer}` : "Six research gaps."}
      </p>
      <div className="absolute bottom-8 left-6 max-w-sm sm:left-10">
        {open ? (
          <>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-brass">{open.title}</p>
            <p className="mt-3 max-w-[18ch] text-[clamp(1.35rem,2.4vw,1.9rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">{open.problem}</p>
            <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-slate">{open.answer}</p>
          </>
        ) : (
          <p className="max-w-[16ch] text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">Six places the bill grows.</p>
        )}
      </div>
    </div>
  );
}
