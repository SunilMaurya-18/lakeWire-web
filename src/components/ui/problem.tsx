"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { captionOpacity, captions, costAt, formatCost, problemScroll } from "@/lib/problem";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function Problem() {
  const mobile = useLake((state) => state.mobile);
  const costRef = useRef<HTMLParagraphElement>(null);
  const linesRef = useRef<Array<HTMLParagraphElement | null>>([]);

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#problem",
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 1,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        problemScroll.p = state.p;
        if (costRef.current) costRef.current.textContent = formatCost(costAt(state.p));
        const stacked = useLake.getState().mobile;
        linesRef.current.forEach((line, index) => {
          if (line) line.style.opacity = stacked ? "1" : String(captionOpacity(state.p, index));
        });
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      problemScroll.p = 0;
    };
  }, []);

  return (
    <div className="pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-between px-6 pb-16 pt-28 sm:px-10 sm:pb-20">
      <div>
        <p ref={costRef} className="font-mono text-[clamp(3.4rem,8vw,6.6rem)] leading-none tracking-[-0.04em] text-white tabular-nums">
          $4.80
        </p>
        <a href="/#results" className="pointer-events-auto mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
          Model · public list prices
        </a>
      </div>
      <div className={mobile ? "flex flex-col gap-3" : "relative h-24 sm:h-16"}>
        {captions.map((line, index) => (
          <p
            key={line}
            ref={(node) => {
              linesRef.current[index] = node;
            }}
            className={
              mobile
                ? "max-w-[18ch] text-[clamp(1.35rem,5vw,1.8rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white opacity-100"
                : `absolute inset-x-0 bottom-0 max-w-[14ch] text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:max-w-[18ch] ${index === 0 ? "opacity-100" : "opacity-0"}`
            }
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
