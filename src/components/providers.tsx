"use client";

import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { getGPUTier } from "detect-gpu";
import { Loader } from "@/components/ui/loader";
import { Nav } from "@/components/ui/nav";
import { SiteBar } from "@/components/ui/site-bar";
import { Tune } from "@/components/ui/tune";
import { getLenis, scrollToId, setLenis } from "@/lib/scroll";
import { tierFromGpu } from "@/lib/tier";
import { sections, type SectionId } from "@/content/site";
import { useLake } from "@/store/lake";

const Stage = dynamic(() => import("@/components/three/stage").then((mod) => mod.Stage), { ssr: false });

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lake = pathname === "/world";
  const library = pathname === "/docs" || pathname.startsWith("/research");

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const mobile = mobileQuery.matches;
      useLake.getState().setMobile(mobile);
      useLake.getState().setReduced(reducedQuery.matches);
    };
    apply();
    mobileQuery.addEventListener("change", apply);
    reducedQuery.addEventListener("change", apply);

    let cancel = false;
    getGPUTier()
      .then((gpu) => {
        if (!cancel) useLake.getState().setDeviceTier(tierFromGpu(gpu.tier, mobileQuery.matches));
      })
      .catch(() => {
        if (!cancel) useLake.getState().setDeviceTier(mobileQuery.matches ? "low" : "mid");
      });

    const onPointer = (event: PointerEvent) => {
      useLake.getState().setPointer({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -((event.clientY / window.innerHeight) * 2 - 1),
      });
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancel = true;
      mobileQuery.removeEventListener("change", apply);
      reducedQuery.removeEventListener("change", apply);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/world") {
      setLenis(null);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({ lerp: reduced ? 1 : 0.08, smoothWheel: !reduced });
    setLenis(lenis);
    lenis.on("scroll", (event) => {
      useLake.getState().setScrollProgress(event.progress || 0);
      ScrollTrigger.update();
    });
    if (useLake.getState().loaded) lenis.start();
    else lenis.stop();
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const unsub = useLake.subscribe((state) => {
      document.body.style.overflow = state.loaded ? "" : "hidden";
      const lenis = getLenis();
      if (!lenis) return;
      if (state.loaded) lenis.start();
      else lenis.stop();
    });
    return () => {
      unsub();
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || pathname !== "/world") return;
    const known = sections.some((section) => section.id === hash);
    if (!known) return;
    const timer = window.setTimeout(() => {
      scrollToId(hash);
      useLake.getState().setActiveSection(hash as SectionId);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/world") useLake.getState().setLoaded(true);
    document.documentElement.classList.toggle("site", library);
    return () => document.documentElement.classList.remove("site");
  }, [pathname, library]);

  return (
    <>
      {lake ? <Stage /> : null}
      {lake ? <Loader /> : null}
      {lake ? <Nav /> : null}
      {lake ? <Tune /> : null}
      {library ? <SiteBar /> : null}
      <div className="relative z-10">{children}</div>
    </>
  );
}
