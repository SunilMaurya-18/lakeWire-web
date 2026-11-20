"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CostPanel } from "@/components/ui/cost";
import { Library } from "@/components/ui/library";
import { Gap } from "@/components/ui/gap";
import { Journey } from "@/components/ui/journey";
import { Hero } from "@/components/ui/hero";
import { Problem } from "@/components/ui/problem";
import { SystemPanel } from "@/components/ui/system";
import { sections } from "@/content/site";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

function sectionHeight(id: string, mobile: boolean) {
  if (mobile && (id === "problem" || id === "journey" || id === "cost")) return "relative h-[100svh]";
  if (id === "problem") return "relative h-[300svh]";
  if (id === "journey") return "relative h-[500svh]";
  if (id === "cost") return "relative h-[200svh]";
  return "relative h-[100svh]";
}

export default function WorldPage() {
  const mobile = useLake((state) => state.mobile);

  useEffect(() => {
    const triggers = sections.map((section) =>
      ScrollTrigger.create({
        trigger: `#${section.id}`,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) useLake.getState().setActiveSection(section.id);
        },
      }),
    );
    ScrollTrigger.refresh();
    return () => triggers.forEach((trigger) => trigger.kill());
  }, [mobile]);

  return (
    <main>
      {sections.map((section) => (
        <section
          id={section.id}
          key={section.id}
          aria-label={section.label}
          className={sectionHeight(section.id, mobile)}
        >
          {section.id === "lake" ? <Hero /> : null}
          {section.id === "problem" ? <Problem /> : null}
          {section.id === "gap" ? <Gap /> : null}
          {section.id === "system" ? <SystemPanel /> : null}
          {section.id === "journey" ? <Journey /> : null}
          {section.id === "cost" ? <CostPanel /> : null}
          {section.id === "library" ? <Library /> : null}
        </section>
      ))}
    </main>
  );
}
