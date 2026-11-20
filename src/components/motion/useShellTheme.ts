"use client";

import { useEffect, useState } from "react";

export type ShellTheme = {
  dark: boolean;
  bg: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
};

const dark: ShellTheme = {
  dark: true,
  bg: "#080808",
  text: "#F9F9F9",
  muted: "#999999",
  line: "#252525",
  accent: "#ef4444",
};

const light: ShellTheme = {
  dark: true,
  bg: "#080808",
  text: "#F9F9F9",
  muted: "#999999",
  line: "#252525",
  accent: "#ef4444",
};

export function useShellTheme(): ShellTheme {
  const [theme, setTheme] = useState<ShellTheme>(dark);

  useEffect(() => {
    const root = window.parent === window ? document.documentElement : window.parent.document.documentElement;
    const apply = () => {
      const next = root.getAttribute("data-theme") === "light" ? light : dark;
      setTheme(next);
      document.documentElement.style.background = next.bg;
      document.body.style.background = next.bg;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
