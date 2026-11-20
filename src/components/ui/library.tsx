"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clearFocus } from "@/lib/explore";
import { hubScroll, openVolume, volumes } from "@/lib/library";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function Library() {
  const router = useRouter();

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#library",
        start: "top bottom",
        end: "top top",
        scrub: reduced ? true : 1,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          hubScroll.live = self.isActive;
        },
      },
      onUpdate: () => {
        hubScroll.p = state.p;
        if (state.p > 0.2) clearFocus();
      },
    });
    const onOpen = (event: Event) => {
      const href = (event as CustomEvent<string>).detail;
      if (href) window.setTimeout(() => router.push(href), 80);
    };
    window.addEventListener("lakewire-open", onOpen);
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      window.removeEventListener("lakewire-open", onOpen);
      hubScroll.p = 0;
      hubScroll.live = false;
    };
  }, [router]);

  return (
    <div className="pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-end px-6 pb-10 sm:px-10">
      <p className="max-w-md text-base leading-relaxed text-slate">
        <Link href="/docs" className="pointer-events-auto text-white">
          Docs
        </Link>{" "}
        is the design.{" "}
        <Link href="/#results" className="pointer-events-auto text-white">
          The cost model
        </Link>{" "}
        uses public list prices.{" "}
        <a href="https://github.com/SunilMaurya-18/lakewire" className="pointer-events-auto text-white">
          GitHub
        </a>{" "}
        holds the code.
      </p>
      <div className="pointer-events-auto mt-5 flex flex-wrap gap-2">
        {volumes.map((volume) => (
          <Link
            key={volume.id}
            href={volume.href}
            className="inline-flex h-11 items-center rounded-full border border-line px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white"
            onClick={(event) => {
              event.preventDefault();
              openVolume(volume.id);
              window.setTimeout(() => router.push(volume.href), 640);
            }}
          >
            {volume.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
