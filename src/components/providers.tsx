"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteBar } from "@/components/ui/site-bar";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const library = pathname === "/docs" || pathname.startsWith("/research");

  useEffect(() => {
    document.documentElement.classList.toggle("site", library);
    return () => document.documentElement.classList.remove("site");
  }, [library]);

  return (
    <>
      {library ? <SiteBar /> : null}
      <div className="relative z-10">{children}</div>
    </>
  );
}
