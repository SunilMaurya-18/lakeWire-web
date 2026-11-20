"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { papers, tags, type Tag } from "@/components/research/papers";

const ease = [0.22, 1, 0.36, 1] as const;

export function Board() {
  const [tag, setTag] = useState<Tag | "All">("All");
  const [toast, setToast] = useState("");
  const shown = useMemo(() => (tag === "All" ? papers : papers.filter((paper) => paper.tags.includes(tag))), [tag]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setToast("Copied");
    window.setTimeout(() => setToast(""), 1600);
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brass">Research</p>
      <h1 className="mt-3 max-w-[16ch] text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.12] tracking-[-0.03em]">Why these papers.</h1>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Topics">
        {(["All", ...tags] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tag === item}
            onClick={() => setTag(item)}
            className={`h-10 shrink-0 rounded-full border px-4 text-[13px] transition-colors duration-ui ease-lake ${tag === item ? "border-brass bg-brass text-ink" : "border-line text-white"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <motion.ul className="mt-6 grid gap-4 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {shown.map((paper) => (
            <motion.li
              key={paper.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.52, ease }}
              className="flex flex-col rounded-[10px] border border-line bg-raised p-5"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brass">
                {paper.venue} · {paper.year}
              </p>
              <h2 className="mt-3 text-lg font-semibold leading-[1.12] tracking-[-0.03em]">{paper.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">{paper.why}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate">{paper.authors}</p>
              <div className="mt-5 flex gap-2">
                <a href={paper.href} className="inline-flex h-11 items-center rounded-full border border-line px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-white" target="_blank" rel="noreferrer">
                  Open
                </a>
                {paper.bibtex ? (
                  <button type="button" onClick={() => copy(paper.bibtex!)} className="h-11 rounded-full border border-line px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-brass">
                    BibTeX
                  </button>
                ) : null}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      <AnimatePresence>
        {toast ? (
          <motion.p role="status" initial={{ opacity: 0, y: 8, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="fixed bottom-6 left-1/2 z-50 rounded-full border border-line bg-raised px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-brass">
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
