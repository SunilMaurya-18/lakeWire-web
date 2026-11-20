import type { Metadata } from "next";
import { Board } from "@/components/research/board";

export const metadata: Metadata = {
  title: "LakeWire — diskless Kafka on S3 and Postgres",
  description: "The papers, KIPs, and reports this log is built from.",
};

export default function ResearchPage() {
  return (
    <main className="min-h-[100svh] bg-ink px-6 pb-20 pt-10 sm:px-10">
      <Board />
    </main>
  );
}
