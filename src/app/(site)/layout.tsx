import type { ReactNode } from "react";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";

const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-tight", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${tight.variable} ${mono.variable} ${inter.variable} font-sans`}>
      <Providers>{children}</Providers>
    </div>
  );
}
