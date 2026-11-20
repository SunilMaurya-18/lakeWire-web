"use client";

import { useEffect, useMemo, useState } from "react";
import { manual, type Block, searchManual } from "@/components/docs/manual-data";
import { getLenis } from "@/lib/scroll";

function jump(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(node, { offset: 0, duration: 0.7, force: true });
  else node.scrollIntoView({ block: "start" });
}

function CodeBlock({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setState("copied");
      } else {
        throw new Error("clipboard unavailable");
      }
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setState(ok ? "copied" : "failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }

  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";

  return (
    <div className="relative mt-5">
      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-[#252525] bg-[#080808] p-4 pr-24 font-mono text-[13px] leading-relaxed text-[#F5F5F5]">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        data-state={state}
        className="absolute right-2 top-2 z-10 rounded border border-[#252525] bg-[#080808] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5]"
      >
        {label}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </div>
  );
}

function ManualBlock({ block, index }: { block: Block; index: number }) {
  if (block.type === "h2") {
    return (
      <h3 id={block.id} data-heading={block.id} className="mt-8 scroll-mt-24 text-xl font-semibold leading-[1.2] tracking-[-0.03em] text-[#F5F5F5]">
        {block.text}
      </h3>
    );
  }
  if (block.type === "code") return <CodeBlock key={index} text={block.text} />;
  if (block.type === "note") {
    const warn = block.tone === "warn";
    return (
      <aside className={`mt-5 max-w-[54ch] border-l py-1 pl-4 ${warn ? "border-[#EF4444]" : "border-[#252525]"}`}>
        {warn ? <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#EF4444]">Warning</p> : null}
        <p className="mt-1 text-[15px] leading-[1.65] text-[#A3A3A3]">{block.text}</p>
      </aside>
    );
  }
  if (block.type === "table") {
    return (
      <div className="mt-5 max-w-full overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header} className="border-b border-[#252525] py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-[#A3A3A3]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, cellIndex) => (
                  <td key={`${row[0]}-${cellIndex}`} className="border-b border-[#252525] py-3 pr-4 align-top leading-relaxed text-[#A3A3A3]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p className="mt-5 max-w-[54ch] text-base leading-[1.7] text-[#A3A3A3]">{block.text}</p>;
}

export function DocsManual() {
  const [current, setCurrent] = useState(manual[0].id);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchManual(query), [query]);

  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-heading]")];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setCurrent(visible.target.id);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: [0.25, 0.6] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-16 px-6 pb-24 pt-10 sm:px-10">
      <aside className="sticky top-20 hidden h-fit w-56 shrink-0 md:block">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3]">Manual</p>
        <nav className="mt-4" aria-label="Contents">
          {manual.map((section) => (
            <div key={section.id} className="mb-4">
              <a
                href={`#${section.id}`}
                onClick={(event) => { event.preventDefault(); jump(section.id); }}
                aria-current={current === section.id ? "true" : undefined}
                className={`block border-l-2 py-1 pl-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5] ${current === section.id ? "border-[#EF4444] text-[#F5F5F5]" : "border-transparent text-[#A3A3A3]"}`}
              >
                {section.title}
              </a>
              {section.blocks.map((block) =>
                block.type === "h2" ? (
                  <a
                    key={block.id}
                    href={`#${block.id}`}
                    onClick={(event) => { event.preventDefault(); jump(block.id); }}
                    aria-current={current === block.id ? "true" : undefined}
                    className={`block border-l-2 py-1 pl-3 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5] ${current === block.id ? "border-[#EF4444] text-[#F5F5F5]" : "border-transparent text-[#A3A3A3]"}`}
                  >
                    {block.text}
                  </a>
                ) : null,
              )}
            </div>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 max-w-[66ch] flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-between rounded border border-[#252525] bg-[#080808] px-4 text-sm text-[#A3A3A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5] md:max-w-sm"
        >
          <span>Search the manual</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em]">Ctrl K</span>
        </button>
        {manual.map((section, index) => {
          const Heading = index === 0 ? "h1" : "h2";
          return (
            <section key={section.id} className={index === 0 ? "mt-8" : "mt-14 border-t border-[#252525] pt-10"}>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3]">{String(index + 1).padStart(2, "0")}</p>
              <Heading id={section.id} data-heading={section.id} className="mt-2 scroll-mt-24 text-[clamp(1.75rem,3vw,2.15rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-[#F5F5F5]">
                {section.title}
              </Heading>
              {section.blocks.map((block, blockIndex) => (
                <ManualBlock key={`${section.id}-${blockIndex}`} block={block} index={blockIndex} />
              ))}
            </section>
          );
        })}
      </article>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#080808]/80 px-4 pt-28" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" aria-label="Close search" className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded border border-[#252525] bg-[#080808] p-3">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the manual"
              className="h-11 w-full bg-transparent px-3 text-[#F5F5F5] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5]"
              aria-label="Search the manual"
            />
            <ul className="mt-2 max-h-80 overflow-auto">
              {hits.length === 0 ? <li className="px-3 py-3 text-sm text-[#A3A3A3]">No matches.</li> : null}
              {hits.map((hit) => (
                <li key={`${hit.section}-${hit.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-4 rounded px-3 py-3 text-left text-[#F5F5F5] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F5F5]"
                    onClick={() => {
                      setOpen(false);
                      jump(hit.id);
                    }}
                  >
                    <span>{hit.title}</span>
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-[#A3A3A3]">{hit.section}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
