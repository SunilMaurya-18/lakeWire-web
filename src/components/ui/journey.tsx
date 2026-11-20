"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { steps } from "@/content/journey";
import { clearFocus } from "@/lib/explore";
import { journeyFrame, journeyScroll } from "@/lib/journey";
import { scrollToY } from "@/lib/scroll";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

function jump(index: number) {
  if (useLake.getState().mobile) {
    journeyScroll.p = Math.min(0.999, (index + 0.45) / steps.length);
    return;
  }
  const node = document.getElementById("journey");
  if (!node) return;
  const travel = Math.max(1, node.offsetHeight - window.innerHeight);
  scrollToY(node.offsetTop + travel * ((index + 0.45) / steps.length));
}

export function Journey() {
  const mobile = useLake((state) => state.mobile);
  const [step, setStep] = useState(0);
  const [code, setCode] = useState(false);
  const current = steps[step];

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    let shown = 0;
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#journey",
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 1,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          journeyScroll.live = self.isActive;
        },
      },
      onUpdate: () => {
        if (useLake.getState().mobile) return;
        journeyScroll.p = state.p;
        if (state.p > 0.02) clearFocus();
        const next = journeyFrame(state.p).index;
        if (next !== shown) {
          shown = next;
          setStep(next);
        }
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      journeyScroll.p = 0;
      journeyScroll.live = false;
    };
  }, []);

  return (
    <div className="pointer-events-none sticky top-0 h-[100svh]">
      <p className="sr-only" aria-live="polite">
        {`0${step + 1}. ${current.label}`}
      </p>
      {mobile ? (
      <div className="pointer-events-auto absolute inset-x-5 top-20 flex items-center gap-2">
        <span className="h-px flex-1 bg-white/15" />
        {steps.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={index === step ? "step" : undefined}
            onClick={() => {
              jump(index);
              if (mobile) setStep(index);
            }}
            className="grid h-11 w-8 shrink-0 place-items-center"
          >
            <span className={`block rounded-full transition-all duration-ui ease-lake ${index === step ? "h-2.5 w-2.5 bg-brass" : "h-1.5 w-1.5 bg-white/35"}`} />
          </button>
        ))}
        <span className="h-px flex-1 bg-white/15" />
      </div>
      ) : null}
      <ol className="pointer-events-auto absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-1 md:flex">
        {steps.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              aria-label={item.label}
              aria-current={index === step ? "step" : undefined}
              onClick={() => jump(index)}
              className="grid h-11 w-11 place-items-center"
            >
              <span className={`block rounded-full transition-all duration-ui ease-lake ${index === step ? "h-2.5 w-2.5 bg-brass" : index < step ? "h-1.5 w-1.5 bg-brass/70" : "h-1.5 w-1.5 bg-white/35"}`} />
            </button>
          </li>
        ))}
      </ol>
      <div className="absolute bottom-8 left-6 max-w-md sm:left-10">
        <p className="font-mono text-[clamp(3.2rem,7vw,5.4rem)] leading-none tracking-[-0.06em] text-white tabular-nums">{String(step + 1).padStart(2, "0")}</p>
        <p className="mt-3 max-w-[16ch] text-[clamp(1.35rem,2.4vw,1.9rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">{current.label}</p>
        {mobile ? null : (
          <button
            type="button"
            aria-expanded={code}
            onClick={() => setCode((open) => !open)}
            className="pointer-events-auto mt-5 h-11 rounded-full border border-line px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-brass"
          >
            {code ? "Hide code" : "Show code"}
          </button>
        )}
        {mobile || code ? (
          <div className="pointer-events-auto mt-3 max-w-sm rounded-[10px] border border-line bg-raised p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass">{current.lang}</p>
            <pre className="mt-3 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-white">{current.code}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
