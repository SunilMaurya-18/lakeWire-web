"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#desks", label: "Path" },
  { href: "/#results", label: "Cost" },
  { href: "/#faq", label: "FAQ" },
];

const pages = [
  { href: "/research", label: "Research" },
  { href: "/docs", label: "Docs" },
  { href: "https://github.com/SunilMaurya-18/lakewire", label: "GitHub" },
];

export function SiteBar() {
  const pathname = usePathname();
  return (
    <header className="site-bar">
      <div className="site-bar-row">
        <Link className="site-logo" href="/" aria-label="LakeWire home">
          <img src="/brand/lakewire-logo.svg" alt="LakeWire" />
        </Link>
        <nav className="site-nav" aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <nav className="site-nav site-nav-end" aria-label="Library">
          {pages.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
