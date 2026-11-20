"use client";

import { Component, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArchitectureCanvas } from "@/components/architecture/scene";
import { chapterCopy, chapters, nodeById, statusLabel, type ChapterId } from "@/components/architecture/content";
import { fetchSteps, type CacheBranch } from "@/components/architecture/fetch-scenario";
import { PRODUCE_STEP_MS, produceSteps } from "@/components/architecture/produce-scenario";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5]";
const PANEL_KEY = "lakewire-architecture-panel";
const PANEL_DEFAULT = 360;
const PANEL_MIN = 280;
const PANEL_MAX = 600;
const SCENE_MIN = 480;
const DIVIDER = 12;

function limitsFor(viewerWidth: number) {
  const room = viewerWidth - SCENE_MIN - DIVIDER;
  if (room < PANEL_MIN) return { stack: true, min: PANEL_MIN, max: PANEL_MAX };
  const max = Math.min(PANEL_MAX, Math.floor(viewerWidth * 0.5), room);
  return { stack: false, min: PANEL_MIN, max: Math.max(PANEL_MIN, max) };
}

function clampWidth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function leadOf(text: string) {
  const split = text.indexOf(". ");
  if (split === -1 || split > 180) return { lead: text, detail: "" };
  return { lead: text.slice(0, split + 1), detail: text.slice(split + 2) };
}

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center px-8">
          <p className="max-w-md text-sm leading-relaxed text-[#A3A3A3]">
            WebGL is unavailable. The map is still Kafka clients, two stateless brokers, PostgreSQL, and object storage. Buffer, upload, commit, and fetch stay inside each broker. The explanation panel remains the source for each step.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ArchitectureWalkthrough() {
  const [chapter, setChapter] = useState<ChapterId>("overview");
  const [selected, setSelected] = useState("broker");
  const [resetToken, setResetToken] = useState(0);
  const [mode, setMode] = useState<"produce" | "fetch">("produce");
  const [produceStep, setProduceStep] = useState(0);
  const [fetchStep, setFetchStep] = useState(0);
  const [branch, setBranch] = useState<CacheBranch>("miss");
  const [playing, setPlaying] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [guided, setGuided] = useState(true);
  const [home, setHome] = useState(false);
  const [compact, setCompact] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [stack, setStack] = useState(false);
  const [bounds, setBounds] = useState({ min: PANEL_MIN, max: PANEL_MAX });
  const [resizing, setResizing] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const widthRef = useRef(PANEL_DEFAULT);
  const dragRef = useRef<{ x: number; width: number } | null>(null);
  const clickRef = useRef({ time: 0, x: 0 });
  const bodyStyle = useRef({ userSelect: "", cursor: "" });
  const node = nodeById(selected);
  const steps = mode === "produce" ? produceSteps : fetchSteps(branch);
  const step = mode === "produce" ? produceStep : fetchStep;
  const current = step > 0 ? steps[step - 1] : null;
  const narrative = current?.body ?? (mode === "produce"
    ? "One designed produce. The broker buffers the records and assembles an LKW1 object, records an upload intent before the upload, then acknowledges only after PostgreSQL validates the commit and assigns offsets."
    : "One designed fetch. The broker reads the committed high watermark and segment index, uses its local cache or a range read, patches baseOffset, and returns only records below that watermark. An upload without a commit stays invisible.");
  const narrativeParts = leadOf(narrative);

  function setStep(next: number) {
    if (mode === "produce") setProduceStep(next);
    else setFetchStep(next);
  }

  useEffect(() => {
    setHome(false);
  }, [step, chapter]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const next = limitsFor(root.clientWidth);
      setStack((prev) => (prev === next.stack ? prev : next.stack));
      setBounds((prev) => (prev.min === next.min && prev.max === next.max ? prev : { min: next.min, max: next.max }));
      setCompact((prev) => (prev === next.stack ? prev : next.stack));
      if (!next.stack && !dragRef.current) {
        const raw = window.localStorage.getItem(PANEL_KEY);
        const saved = raw == null ? Number.NaN : Number(raw);
        const basis = Number.isFinite(saved) ? saved : widthRef.current;
        const clamped = clampWidth(basis, next.min, next.max);
        widthRef.current = clamped;
        setPanelWidth(clamped);
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  function remember(next: number) {
    const clamped = clampWidth(next, bounds.min, bounds.max);
    widthRef.current = clamped;
    setPanelWidth(clamped);
    window.localStorage.setItem(PANEL_KEY, String(clamped));
    return clamped;
  }

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    aside.style.width = stack ? "" : `${widthRef.current}px`;
  });

  function onDividerDown(event: PointerEvent<HTMLDivElement>) {
    if (stack) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, width: widthRef.current };
    bodyStyle.current = { userSelect: document.body.style.userSelect, cursor: document.body.style.cursor };
    setResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  function onDividerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !asideRef.current) return;
    const next = clampWidth(drag.width + (drag.x - event.clientX), bounds.min, bounds.max);
    widthRef.current = next;
    asideRef.current.style.width = `${next}px`;
    event.currentTarget.setAttribute("aria-valuenow", String(next));
  }

  function onDividerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.userSelect = bodyStyle.current.userSelect;
    document.body.style.cursor = bodyStyle.current.cursor;
    setResizing(false);
    const moved = Math.abs(event.clientX - drag.x) > 3;
    const now = performance.now();
    const repeat = now - clickRef.current.time < 500 && Math.abs(event.clientX - clickRef.current.x) < 8;
    clickRef.current = { time: now, x: event.clientX };
    remember(!moved && repeat ? PANEL_DEFAULT : widthRef.current);
  }

  function onDividerKey(event: KeyboardEvent<HTMLDivElement>) {
    const stepSize = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      remember(widthRef.current + stepSize);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      remember(widthRef.current - stepSize);
    } else if (event.key === "Home") {
      event.preventDefault();
      remember(bounds.min);
    } else if (event.key === "End") {
      event.preventDefault();
      remember(bounds.max);
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing || chapter !== mode || step === 0) return;
    const timer = window.setTimeout(() => {
      if (step >= steps.length) setPlaying(false);
      else {
        const next = step + 1;
        setStep(next);
        setSelected(steps[next - 1].focus[0]);
      }
    }, PRODUCE_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, chapter, mode, step, steps]);

  function showStep(next: number) {
    setChapter(mode);
    setStep(next);
    if (next > 0) setSelected(steps[next - 1].focus[0]);
  }

  function choose(next: "produce" | "fetch") {
    setPlaying(false);
    setFrozen(true);
    setMode(next);
    setChapter(next);
  }

  function play() {
    setFrozen(false);
    if (step === 0 || step >= steps.length) showStep(1);
    else setChapter(mode);
    setPlaying(true);
  }

  function nextStep() {
    if (step >= steps.length) return;
    setPlaying(false);
    setFrozen(false);
    showStep(step + 1);
  }

  return (
    <main ref={rootRef} className={`fixed inset-0 z-20 flex overflow-hidden bg-[#080808] text-[#F5F5F5] ${stack ? "flex-col" : "flex-row"}`}>
      <section className={`relative min-w-0 overflow-hidden ${stack ? "flex h-[min(460px,54vh)] min-h-[300px] shrink-0 flex-col" : "min-h-0 flex-1"}`} aria-label="Architecture map">
        <div className={stack ? "relative min-h-0 w-full flex-1" : "absolute inset-0"}>
          <StageBoundary>
            <ArchitectureCanvas
              chapter={chapter}
              selected={selected}
              step={chapter === "produce" ? produceStep : chapter === "fetch" ? fetchStep : 0}
              branch={branch}
              frozen={frozen || chapter !== mode}
              reduced={reduced}
              guided={guided}
              home={home}
              compact={compact}
              onInteract={() => setGuided(false)}
              onSelect={setSelected}
              resetToken={resetToken}
              controlsEnabled={!resizing}
            />
          </StageBoundary>
        </div>
        <div className={stack ? "order-first flex shrink-0 items-center justify-between gap-2 border-b border-[#252525] px-3 py-2" : "pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4"}>
          <div className={stack ? "min-w-0" : "pointer-events-auto max-w-xl"}>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#EF4444]">Design simulation</p>
            <p className={`text-[#A3A3A3] ${stack ? "mt-0.5 text-xs leading-snug" : "mt-1 hidden text-sm leading-relaxed md:block"}`}>Based on PRD v2.0. Implementation unverified.</p>
          </div>
          <div className={stack ? "flex shrink-0 gap-2" : "pointer-events-auto flex gap-2"}>
            <Link href="/" className={`inline-flex h-10 items-center border border-[#252525] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}>
              Home
            </Link>
            <button
              type="button"
              onClick={() => {
                setGuided(true);
                setHome(true);
                setResetToken((value) => value + 1);
              }}
              className={`h-10 border border-[#252525] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#F5F5F5] ${focus}`}
            >
              Reset camera
            </button>
          </div>
        </div>
      </section>
      {stack ? null : (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Explanation width"
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          aria-valuenow={panelWidth}
          tabIndex={0}
          onPointerDown={onDividerDown}
          onPointerMove={onDividerMove}
          onPointerUp={onDividerEnd}
          onPointerCancel={onDividerEnd}
          onLostPointerCapture={onDividerEnd}
          onDoubleClick={() => remember(PANEL_DEFAULT)}
          onKeyDown={onDividerKey}
          className={`relative z-30 w-3 shrink-0 cursor-col-resize touch-none select-none ${focus}`}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#252525]" />
          <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3a3a3a]" />
        </div>
      )}
      <aside
        ref={asideRef}
        style={stack ? undefined : { width: panelWidth }}
        className={`flex min-h-0 min-w-0 flex-col bg-[#080808] ${stack ? "w-full flex-1 border-t border-[#252525]" : "shrink-0 border-l border-[#252525]"}`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5" data-scenario={mode} data-cache={mode === "fetch" ? branch : "produce"}>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={mode === "produce"} onClick={() => choose("produce")} className={`h-8 border px-2 font-mono text-[10px] uppercase tracking-[0.12em] ${focus} ${mode === "produce" ? "border-[#F5F5F5] text-[#F5F5F5]" : "border-[#252525] text-[#A3A3A3]"}`}>
              Produce to ACK
            </button>
            <button type="button" aria-pressed={mode === "fetch"} onClick={() => choose("fetch")} className={`h-8 border px-2 font-mono text-[10px] uppercase tracking-[0.12em] ${focus} ${mode === "fetch" ? "border-[#F5F5F5] text-[#F5F5F5]" : "border-[#252525] text-[#A3A3A3]"}`}>
              Fetch
            </button>
          </div>
          {mode === "fetch" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={branch === "miss"} onClick={() => setBranch("miss")} className={`h-8 border px-2 font-mono text-[10px] uppercase tracking-[0.12em] ${focus} ${branch === "miss" ? "border-[#F5F5F5] text-[#F5F5F5]" : "border-[#252525] text-[#A3A3A3]"}`}>
                Cache miss
              </button>
              <button type="button" aria-pressed={branch === "hit"} onClick={() => setBranch("hit")} className={`h-8 border px-2 font-mono text-[10px] uppercase tracking-[0.12em] ${focus} ${branch === "hit" ? "border-[#F5F5F5] text-[#F5F5F5]" : "border-[#252525] text-[#A3A3A3]"}`}>
                Cache hit
              </button>
              <button type="button" disabled aria-pressed={false} className="h-8 cursor-not-allowed border border-[#252525] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5c5c5c]">
                Peer cache off
              </button>
            </div>
          ) : null}
          <div className="mt-4" aria-live="polite" data-produce-step={step}>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#A3A3A3]" data-step-kicker>
              {mode === "produce" ? "Produce to ACK" : "Fetch"}
              {current ? ` · Step ${step} of ${steps.length}` : " · Ready"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-[1.15] tracking-[-0.03em]" data-step-title>
              {current ? current.title : mode === "produce" ? "Produce to acknowledgement" : "Fetch and visibility"}
            </h1>
            <p className="mt-3 text-base leading-[1.7] text-[#F5F5F5]" data-step-lead>
              {narrativeParts.lead}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={playing}
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  setFrozen(true);
                } else play();
              }}
              className={`h-9 border border-[#F5F5F5] px-3 font-mono text-[11px] uppercase tracking-[0.12em] ${focus}`}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={nextStep} disabled={step >= steps.length} className={`h-9 border border-[#252525] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#F5F5F5] disabled:text-[#5c5c5c] ${focus}`}>
              Next step
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setFrozen(false);
                setStep(0);
                setChapter(mode);
              }}
              className={`h-9 border border-[#252525] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}
            >
              Restart
            </button>
          </div>
          {narrativeParts.detail ? (
            <details className="mt-4">
              <summary className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}>Mechanism</summary>
              <p className="mt-2 text-sm leading-[1.7] text-[#A3A3A3]" data-step-body>
                {narrativeParts.detail}
              </p>
            </details>
          ) : null}
          <details className="mt-3">
            <summary className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}>Caveat</summary>
            <p className="mt-2 text-sm leading-[1.7] text-[#A3A3A3]">Playback is paced for reading. It is not a measured latency, and this path is not implemented in this repository.</p>
          </details>
          <details className="mt-3">
            <summary className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}>Source</summary>
            <p className="mt-2 text-sm leading-[1.7] text-[#A3A3A3]">PRD v2.0 and the architecture walkthrough. The design is unverified in this repository.</p>
          </details>
          {chapter !== "produce" && chapter !== "fetch" ? <p className="mt-4 text-sm leading-[1.7] text-[#A3A3A3]">{chapterCopy[chapter]}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {chapters.map((item, index) => {
              const on = item.id === chapter;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (item.id === "produce" || item.id === "fetch") choose(item.id);
                    else {
                      setPlaying(false);
                      setFrozen(true);
                      setChapter(item.id);
                    }
                  }}
                  className={`border px-3 py-2 text-left ${focus} ${on ? "border-[#EF4444]" : "border-[#252525]"}`}
                >
                  <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#A3A3A3]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="mt-1 block text-xs text-[#F5F5F5]">{item.title}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#A3A3A3]">{statusLabel[node.status]}</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.03em]">{node.title}</h2>
          <p className="mt-2 text-base leading-[1.7] text-[#F5F5F5]">{node.summary}</p>
          <details className="mt-3">
            <summary className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[#A3A3A3] ${focus}`}>Component notes</summary>
            <p className="mt-2 text-sm leading-[1.7] text-[#A3A3A3]">{node.detail}</p>
          </details>
          {chapter === "fence" ? (
            <p className="mt-4 border-l border-[#EF4444] pl-3 text-sm leading-[1.7] text-[#A3A3A3]">A stale broker epoch is rejected. The draft does not require partition ownership to move.</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {["clients", "broker", "buffer", "uploader", "commit", "fetch", "workers", "postgres", "storage"].map((id) => {
              const item = nodeById(id);
              const on = selected === id;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => setSelected(id)} className={`border px-2 py-1 text-xs ${focus} ${on ? "border-[#F5F5F5] text-[#F5F5F5]" : "border-[#252525] text-[#A3A3A3]"}`}>
                  {item.title}
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-sm leading-[1.7] text-[#A3A3A3]">Drag to rotate. Scroll or pinch to zoom. Nothing drawn here is a verified running service.</p>
        </div>
      </aside>
    </main>
  );
}
