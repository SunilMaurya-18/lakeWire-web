"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { classicMonthly, costScroll, costVersion, costView, formatMetric, formatMoney, lakeMonthly, metricBars, metrics, setMetric, subscribeCost } from "@/lib/cost";
import { clearFocus } from "@/lib/explore";
import { useLake } from "@/store/lake";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

function easeOut(t: number) {
  const c = 1 - t;
  return 1 - c * c * c;
}

export function CostPanel() {
  const version = useSyncExternalStore(subscribeCost, costVersion, costVersion);
  const mobile = useLake((state) => state.mobile);
  const [mbps, setMbps] = useState(costView.mbps);
  const [days, setDays] = useState(costView.days);
  const [zones, setZones] = useState(costView.zones);
  const classicRef = useRef<HTMLParagraphElement>(null);
  const lakeRef = useRef<HTMLParagraphElement>(null);
  const classicShown = useRef(0);
  const lakeShown = useRef(0);
  void version;
  const bars = metricBars(costView.metric);
  const hovered = bars.find((bar) => bar.id === costView.hover);
  const classic = classicMonthly(mbps, days, zones);
  const lake = lakeMonthly(mbps, days, zones);

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#cost",
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 1,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          costScroll.live = self.isActive;
        },
      },
      onUpdate: () => {
        costScroll.p = state.p;
        if (state.p > 0.02) clearFocus();
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      costScroll.p = 0;
      costScroll.live = false;
    };
  }, []);

  useEffect(() => {
    const reduced = useLake.getState().reduced;
    const fromC = classicShown.current;
    const fromL = lakeShown.current;
    if (reduced) {
      classicShown.current = classic;
      lakeShown.current = lake;
      if (classicRef.current) classicRef.current.textContent = formatMoney(classic);
      if (lakeRef.current) lakeRef.current.textContent = formatMoney(lake);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 520);
      const e = easeOut(t);
      classicShown.current = fromC + (classic - fromC) * e;
      lakeShown.current = fromL + (lake - fromL) * e;
      if (classicRef.current) classicRef.current.textContent = formatMoney(classicShown.current);
      if (lakeRef.current) lakeRef.current.textContent = formatMoney(lakeShown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [classic, lake]);

  return (
    <div className="pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-between px-5 pb-6 pt-24 sm:px-10 sm:pb-8">
      <div>
        <div className="pointer-events-auto flex w-full max-w-xl gap-1 rounded-full border border-line bg-raised/80 p-1" role="tablist" aria-label="Cost part">
          {metrics.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === costView.metric}
              onClick={() => setMetric(index)}
              className={`h-10 flex-1 rounded-full text-[12px] transition-colors duration-ui ease-lake ${index === costView.metric ? "bg-white text-ink" : "text-slate"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <a href="/#results" className="pointer-events-auto mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
          Model · public list prices
        </a>
        <p className="mt-2 min-h-6 font-mono text-[13px] uppercase tracking-[0.14em] text-white">{hovered ? `${hovered.name} · ${formatMetric(costView.metric, hovered.value)}` : mobile ? "Tap a bar" : ""}</p>
      </div>
      <div className="pointer-events-auto">
        <div className="mb-4 flex flex-wrap items-end gap-x-12 gap-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate">Classic</p>
            <p ref={classicRef} className="whitespace-nowrap font-mono text-[clamp(1.8rem,4vw,3rem)] leading-none tracking-[-0.04em] text-white tabular-nums">
              {formatMoney(0)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass">LakeWire</p>
            <p ref={lakeRef} className="whitespace-nowrap font-mono text-[clamp(1.8rem,4vw,3rem)] leading-none tracking-[-0.04em] text-white tabular-nums">
              {formatMoney(0)}
            </p>
          </div>
          <p className="pb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate">per month</p>
        </div>
        <div className={`grid gap-3 ${mobile ? "" : "sm:grid-cols-3"}`}>
          <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
            <span className="mb-1 flex justify-between">
              <span>Throughput</span>
              <span className="text-white">{mbps} MB/s</span>
            </span>
            <input
              className="h-11 w-full accent-brass"
              type="range"
              min={10}
              max={200}
              step={5}
              value={mbps}
              aria-label="Throughput"
              onChange={(event) => {
                const next = Number(event.target.value);
                costView.mbps = next;
                setMbps(next);
              }}
            />
          </label>
          <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
            <span className="mb-1 flex justify-between">
              <span>Retention</span>
              <span className="text-white">{days} days</span>
            </span>
            <input
              className="h-11 w-full accent-brass"
              type="range"
              min={1}
              max={30}
              step={1}
              value={days}
              aria-label="Retention days"
              onChange={(event) => {
                const next = Number(event.target.value);
                costView.days = next;
                setDays(next);
              }}
            />
          </label>
          <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
            <span className="mb-1 flex justify-between">
              <span>Zones</span>
              <span className="text-white">{zones}</span>
            </span>
            <input
              className="h-11 w-full accent-brass"
              type="range"
              min={1}
              max={3}
              step={1}
              value={zones}
              aria-label="Zones"
              onChange={(event) => {
                const next = Number(event.target.value);
                costView.zones = next;
                setZones(next);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
