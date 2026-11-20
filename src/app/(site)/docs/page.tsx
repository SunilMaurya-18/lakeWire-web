import type { Metadata } from "next";
import { DocsManual } from "@/components/docs/manual";

export const metadata: Metadata = {
  title: "LakeWire — diskless Kafka on S3 and Postgres",
  description: "Write path, LKW1 objects, the Postgres coordinator, fetch, and the checks.",
};

export default function DocsPage() {
  return (
    <main className="min-h-[100svh] bg-ink">
      <DocsManual />
    </main>
  );
}
