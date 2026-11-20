"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sections, type ExplainConfig } from "./explain";
import { useShellTheme } from "./useShellTheme";
import { StepRail } from "./StepRail";

const EASE = [0.22, 1, 0.36, 1] as const;
const LOOP = 8000;

export function MotionExplainSection({ config, fill = false, reverse = false }: { config: ExplainConfig; fill?: boolean; reverse?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(false);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState(config.defaultActive);
  const [run, setRun] = useState(0);
  const [load, setLoad] = useState(false);
  const [paused, setPaused] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const wire = Boolean(config.wire);
  const framed = wire || Boolean(config.embed);

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
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) {
      setActive(config.defaultActive);
      videoRef.current?.pause();
      return;
    }
    const start = performance.now();
    const span = LOOP / config.chips.length;
    const offset = run === 0 ? config.defaultActive * span : 0;
    let last = -1;
    let frame = 0;
    const tick = (now: number) => {
      const phase = Math.floor((((now - start + offset) % LOOP) / LOOP) * config.chips.length);
      if (phase !== last) {
        last = phase;
        setActive(phase);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, run, config.defaultActive, config.chips.length]);

  useEffect(() => {
    if (wire) return;
    const video = videoRef.current;
    if (!video || !seen || reduce) return;
    video.play().catch(() => undefined);
  }, [seen, reduce, run, wire]);

  useEffect(() => {
    if (!wire) return;
    const node = root.current;
    if (!node) return;
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = (on: boolean) => {
      setOnscreen(on);
      if (on && !reduced()) setLoad(true);
    };
    if (window.parent === window) {
      const observer = new IntersectionObserver(([entry]) => apply(entry.isIntersecting && entry.intersectionRatio >= 0.2), { threshold: [0, 0.2, 0.6] });
      observer.observe(node);
      return () => observer.disconnect();
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; id?: string; on?: boolean } | null;
      if (!data || data.type !== "explain-visible" || data.id !== config.id) return;
      apply(Boolean(data.on));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "explain-ready", id: config.id }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [wire, config.id]);

  useEffect(() => {
    if (!wire) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const allow = load && onscreen && !paused && (!reduce || started);
    if (!allow) {
      video.pause();
      return;
    }
    video.play().catch(() => undefined);
  }, [wire, load, onscreen, paused, reduce, started, run]);

  useEffect(() => {
    if (!wire || run === 0) return;
    const video = videoRef.current;
    setPaused(false);
    setStarted(true);
    setLoad(true);
    if (!video) return;
    video.currentTime = 0;
  }, [wire, run]);

  useEffect(() => {
    if (!fill || window.parent === window) return;
    const send = () => {
      window.parent.postMessage({ type: "explain-height", id: config.id, height: document.body.scrollHeight }, window.location.origin);
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [fill, config.id]);

  function replay() {
    const video = videoRef.current;
    if (video && !reduce) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
    }
    setActive(0);
    setRun((value) => value + 1);
  }

  function togglePlay() {
    if (reduce && !started) {
      setStarted(true);
      setLoad(true);
      setPaused(false);
      return;
    }
    setPaused((value) => !value);
  }

  const playing = wire && load && onscreen && !paused && (!reduce || started);

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
      className={`grid grid-cols-1 lg:grid-cols-2 lg:items-center ${framed ? "h-auto" : fill ? "h-full max-lg:h-auto" : "min-h-[50svh]"}`}
      style={{ fontFamily: "var(--font-inter), Inter, sans-serif", background: theme.bg, color: theme.text }}
    >
      <div className={`flex flex-col justify-center px-6 py-8 sm:px-10 lg:sticky lg:top-0 lg:px-12 ${reverse ? "lg:order-2" : ""}`}>
        <motion.p {...enter(0)} className="font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
          {config.eyebrow}
        </motion.p>
        <motion.h2 {...enter(0.06)} className="mt-3 max-w-[18ch] text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
          {config.headline}
        </motion.h2>
        <motion.p {...enter(0.12)} className="mt-4 max-w-[46ch] text-[13px] leading-[1.6]" style={{ color: theme.muted }}>
          {config.subhead}
        </motion.p>
        <motion.div {...enter(0.18)} className="mt-6">
          <StepRail active={active} items={config.chips.map((chip) => ({ label: chip.label, value: chip.detail, danger: chip.danger }))} />
        </motion.div>
        <motion.p {...enter(0.24)} className="mt-4 font-mono text-[11px] tracking-[0.04em]" style={{ color: theme.muted }}>
          {config.proof}
        </motion.p>
        <motion.div {...enter(0.3)} className="mt-6 flex flex-wrap items-center gap-5">
          <button type="button" onClick={replay} className="rounded-full border px-4 py-2 text-[13px] font-medium transition duration-ui ease-lake" style={{ borderColor: theme.accent, color: theme.accent }}>
            {config.replay}
          </button>
          <a href={config.href} target="_top" className="text-[14px] transition duration-ui ease-lake" style={{ color: theme.text }}>
            {config.link}
          </a>
        </motion.div>
      </div>
      <div className={`px-6 pb-8 sm:px-10 lg:px-12 lg:py-8 ${reverse ? "lg:order-1" : ""}`}>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: show || reduce ? 1 : 0 }}
          transition={{ duration: 0.52, ease: EASE, delay: 0.12 }}
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.accent }}>{config.badge}</p>
          {config.embed ? (
            <iframe
              key={run}
              src={config.embed}
              title={config.embedTitle ?? "LakeWire animation"}
              loading="lazy"
              style={{ width: "100%", aspectRatio: "4 / 3", border: 0, display: "block" }}
            />
          ) : null}
          {config.embed ? null : (
          <div
            className={`relative aspect-video border ${wire ? "" : "overflow-hidden rounded-2xl transition duration-ui ease-lake hover:scale-[1.01]"}`}
            style={{
              aspectRatio: "16 / 9",
              borderColor: wire ? "#252525" : theme.line,
              background: "#080808",
            }}
          >
            {!wire || load ? (
              <video
                ref={videoRef}
                className={`h-full w-full ${wire ? "object-contain" : "object-cover"}`}
                muted
                loop
                playsInline
                preload={wire ? "none" : "metadata"}
                aria-label={config.headline}
              />
            ) : null}
          </div>
          )}
          {wire ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-pressed={playing}
                aria-label={playing ? `Pause ${config.eyebrow}` : `Play ${config.eyebrow}`}
                className="rounded-full border px-4 py-2 text-[13px] font-medium"
                style={{ borderColor: theme.line, color: theme.text }}
              >
                {playing ? "Pause" : "Play"}
              </button>
            </div>
          ) : null}
          {config.caption ? (
            <p className="mt-2 max-w-[62ch] text-[12px] leading-[1.6]" style={{ color: theme.muted }}>
              {config.caption}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
            {config.scrim.map((label, index) => (
              <span key={label} style={{ color: active === index ? (config.chips[index]?.danger ? "#ef4444" : theme.accent) : theme.muted }}>
                {label}
                {index < config.scrim.length - 1 ? <span className="ml-3" style={{ color: theme.line }}>→</span> : null}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LeasesSection({ fill = false }: { fill?: boolean }) {
  return <MotionExplainSection config={sections.leases} fill={fill} />;
}

export function CoordinatorSection({ fill = false }: { fill?: boolean }) {
  return <MotionExplainSection config={sections.coordinator} fill={fill} />;
}

export function Lkw1Section({ fill = false }: { fill?: boolean }) {
  return <MotionExplainSection config={sections.lkw1} fill={fill} />;
}

export function ArchitectureSection({ fill = false }: { fill?: boolean }) {
  return <MotionExplainSection config={sections.architecture} fill={fill} />;
}
