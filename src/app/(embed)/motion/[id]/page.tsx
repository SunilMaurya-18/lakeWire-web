import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { MotionExplainSection } from "@/components/motion/MotionExplainSection";
import { sections, type ExplainConfig } from "@/components/motion/explain";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });

const ids = Object.keys(sections);

export function generateStaticParams() {
  return ids.map((id) => ({ id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const config = (sections as Record<string, ExplainConfig>)[params.id];
  return { title: config ? `${config.eyebrow} · LakeWire` : "LakeWire" };
}

export default function MotionPage({ params, searchParams }: { params: { id: string }; searchParams: { flip?: string } }) {
  const config = (sections as Record<string, ExplainConfig>)[params.id];
  if (!config) notFound();
  const framed = Boolean(config.wire || config.embed);
  return (
    <main className={`${inter.variable} ${framed ? "h-auto" : "h-[100svh] max-lg:h-auto"}`}>
      <MotionExplainSection config={config} fill reverse={searchParams.flip === "1"} />
    </main>
  );
}
