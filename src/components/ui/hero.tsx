"use client";

import type { PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { hero } from "@/content/hero";
import { useLake } from "@/store/lake";

const ease = [0.22, 1, 0.36, 1] as const;
const words = hero.title.split(" ");

function nudge(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const dx = ((event.clientX - box.left) / box.width - 0.5) * 10;
  const dy = ((event.clientY - box.top) / box.height - 0.5) * 8;
  event.currentTarget.style.transform = `translate(${dx}px, ${dy}px)`;
}

function release(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.transform = "";
}

export function Hero() {
  const loaded = useLake((state) => state.loaded);
  const reduced = useReducedMotion();
  if (!loaded) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end px-6 pb-20 sm:px-10 sm:pb-16">
      <div className="w-full">
        <h1 className="max-w-[10ch] text-[clamp(2.7rem,6.4vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.04em]">
          {words.map((word, index) => (
            <span key={word} className="mr-[0.22em] inline-block overflow-hidden align-bottom">
              <motion.span
                className="metal inline-block"
                initial={reduced ? false : { y: "110%" }}
                animate={loaded || reduced ? { y: "0%" } : { y: "110%" }}
                transition={{ duration: 0.52, delay: reduced ? 0 : 0.12 + index * 0.08, ease }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brass">{hero.status}</p>
        <p className="mt-4 max-w-[36rem] text-[15px] leading-relaxed text-slate sm:text-base">{hero.kicker}</p>
        <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
          <a
            className="inline-flex h-11 items-center rounded-full bg-white px-4 text-sm font-medium text-ink transition-transform duration-ui ease-lake"
            href={hero.costHref}
            onPointerMove={nudge}
            onPointerLeave={release}
          >
            {hero.cost}
          </a>
          <a
            className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm text-white transition-transform duration-ui ease-lake"
            href={hero.designHref}
            onPointerMove={nudge}
            onPointerLeave={release}
          >
            {hero.design}
          </a>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center" aria-hidden>
        <span className="drip-line" />
      </div>
    </div>
  );
}
