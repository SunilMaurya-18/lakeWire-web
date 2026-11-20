"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useShellTheme } from "@/components/motion/useShellTheme";
import { StepRail } from "@/components/motion/StepRail";

const EASE = [0.22, 1, 0.36, 1] as const;
const LOOP = 8000;

const steps = [
  { id: "01", title: "PRODUCE", detail: ":9092" },
  { id: "02", title: "PUT", detail: "one object" },
  { id: "03", title: "ACK", detail: "Postgres" },
];

export function WritePathSection({ fill = false }: { fill?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [reduce, setReduce] = useState(false);
  const [seen, setSeen] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const on = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        setOnscreen(on);
        if (on) setSeen(true);
      },
      { threshold: [0, 0.2, 0.6] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionOn = !reduce && onscreen;
    if (!motionOn) {
      if (reduce) setActive(2);
      return;
    }
    const start = performance.now();
    let last = -1;
    let frame = 0;
    const tick = (now: number) => {
      const phase = Math.floor((((now - start) % LOOP) / LOOP) * 3);
      if (phase !== last) {
        last = phase;
        setActive(phase);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, onscreen, run]);

  useEffect(() => {
    if (!fill || window.parent === window) return;
    const send = () => {
      window.parent.postMessage({ type: "writepath-height", height: document.body.scrollHeight }, window.location.origin);
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [fill]);

  function replay() {
    setActive(0);
    setRun((value) => value + 1);
  }

  const theme = useShellTheme();
  const show = !reduce && seen;
  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: show || reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.52, ease: EASE, delay: reduce ? 0 : delay },
  });

  return (
    <section
      ref={root}
      className="grid grid-cols-1 lg:grid-cols-2 lg:items-center h-auto"
      style={{ fontFamily: "var(--font-inter), Inter, sans-serif", background: theme.bg, color: theme.text }}
    >
      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:sticky lg:top-0 lg:h-full lg:px-12">
        <motion.p {...enter(0)} className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
          Write path
        </motion.p>
        <motion.h2 {...enter(0.06)} className="mt-3 max-w-[16ch] text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
          The ack waits for the object and the commit.
        </motion.h2>
        <motion.p {...enter(0.12)} className="mt-4 max-w-[42ch] text-[13px] leading-[1.6]" style={{ color: theme.muted }}>
          One object in S3. Postgres assigns the offset after the PUT. acks=1 and acks=all wait for both. acks=0 is best-effort. Uploads use a conditional PUT (If-None-Match: *).
        </motion.p>
        <motion.div {...enter(0.18)} className="mt-6">
          <StepRail active={active} items={steps.map((step) => ({ label: `${step.id} ${step.title}`, value: step.detail }))} />
        </motion.div>
        <motion.p {...enter(0.24)} className="mt-4 font-mono text-[11px] tracking-[0.04em]" style={{ color: theme.muted }}>
          no broker disk
        </motion.p>
        <motion.div {...enter(0.3)} className="mt-6 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={replay}
            className="rounded-full border px-4 py-2 text-[13px] font-medium transition duration-ui ease-lake"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            Replay write
          </button>
          <a href="/docs#coordinator" target="_top" className="text-[14px] transition duration-ui ease-lake" style={{ color: theme.text }}>
            Read the coordinator →
          </a>
        </motion.div>
      </div>

      <div className="px-6 pb-8 sm:px-10 lg:px-12 lg:py-8">
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: show || reduce ? 1 : 0 }}
          transition={{ duration: 0.52, ease: EASE, delay: 0.12 }}
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.accent }}>LIVE · WRITE PATH</p>
          {seen ? (
          <iframe
            key={run}
            src="/animations/write-path.html?scene=write-path"
            title="LakeWire write path animation"
            loading="lazy"
            style={{ width: "100%", aspectRatio: "4 / 3", border: 0, display: "block" }}
          />
          ) : (
            <div style={{ width: "100%", aspectRatio: "4 / 3", background: theme.bg }} />
          )}
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
            {steps.map((step, index) => (
              <span key={step.id} style={{ color: active === index ? theme.accent : theme.muted }}>
                {step.title}
                {index < steps.length - 1 ? <span className="ml-3" style={{ color: theme.line }}>→</span> : null}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
