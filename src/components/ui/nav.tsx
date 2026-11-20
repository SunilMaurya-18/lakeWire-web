"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { sections, type SectionId } from "@/content/site";
import { scrollToId } from "@/lib/scroll";
import { useLake } from "@/store/lake";

const ease = [0.22, 1, 0.36, 1] as const;

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = useLake((state) => state.activeSection);
  const loaded = useLake((state) => state.loaded);
  const [open, setOpen] = useState(false);
  if (!loaded) return null;

  function go(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
    setOpen(false);
    if (pathname !== "/world") {
      event.preventDefault();
      router.push(`/world#${id}`);
      return;
    }
    event.preventDefault();
    scrollToId(id);
    useLake.getState().setActiveSection(id);
  }

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
        <div className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border border-line bg-raised/80 px-2 backdrop-blur-md sm:gap-3 sm:px-3">
          <Link href="/world" className="px-2" aria-label="LakeWire home" onClick={() => setOpen(false)}>
            <img src="/brand/lakewire-logo.svg" alt="LakeWire" className="h-7 w-auto" />
          </Link>
          <nav className="hidden items-center md:flex" aria-label="Primary">
            {sections.map((section) => {
              const on = pathname === "/world" && active === section.id;
              return (
                <Link
                  key={section.id}
                  href={`/world#${section.id}`}
                  aria-current={on ? "true" : undefined}
                  aria-label={section.label}
                  onClick={(event) => go(event, section.id)}
                  className="group relative grid h-11 w-9 place-items-center"
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-ui ease-lake ${on ? "bg-brass" : "bg-white/35 group-hover:bg-white"}`} />
                  <span className="pointer-events-none absolute top-[calc(100%+6px)] hidden whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-white group-hover:block group-focus-visible:block">
                    {section.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="hidden h-8 items-center px-2 text-[12px] font-medium text-white md:inline-flex" onClick={() => setOpen(false)}>
            Product
          </Link>
          <Link
            href="/docs"
            className={`hidden h-8 items-center rounded-full border px-3 text-[12px] font-medium md:inline-flex ${pathname.startsWith("/docs") ? "border-brass text-brass" : "border-line text-white"}`}
          >
            Docs
          </Link>
          <a href="https://github.com/SunilMaurya-18/lakewire" className="hidden h-8 items-center px-2 text-[12px] font-medium text-white md:inline-flex">
            GitHub
          </a>
          <button type="button" className="grid h-11 w-11 place-items-center text-white md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-px w-4 bg-white transition-transform duration-ui ease-lake ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-px w-4 bg-white transition-opacity duration-ui ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 h-px w-4 bg-white transition-transform duration-ui ease-lake ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open ? (
          <motion.nav
            aria-label="Mobile"
            className="fixed inset-0 z-30 flex flex-col justify-end bg-ink px-6 pb-10 pt-24 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease }}
          >
            {sections.map((section, index) => (
              <motion.div key={section.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay: 0.05 + index * 0.06, ease }}>
                <Link href={`/world#${section.id}`} onClick={(event) => go(event, section.id)} className="flex min-h-[44px] items-center py-3 text-[clamp(2rem,8vw,3rem)] font-semibold tracking-[-0.04em]">
                  {section.label}
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay: 0.4, ease }} className="mt-4 flex flex-wrap gap-2">
              <Link href="/" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm">
                Product
              </Link>
              <Link href="/docs" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm">
                Docs
              </Link>
              <a href="https://github.com/SunilMaurya-18/lakewire" className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm">
                GitHub
              </a>
            </motion.div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </>
  );
}
