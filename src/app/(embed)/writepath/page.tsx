import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { WritePathSection } from "@/components/motion/WritePathSection";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Write path · LakeWire",
  description: "The ack waits for the object and the commit.",
};

export default function WritePathPage() {
  return (
    <main className={`${inter.variable} h-[100svh] max-lg:h-auto`}>
      <WritePathSection fill />
    </main>
  );
}
