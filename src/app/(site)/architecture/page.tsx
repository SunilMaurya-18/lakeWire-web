import type { Metadata } from "next";
import { ArchitectureWalkthrough } from "@/components/architecture/walkthrough";

export const metadata: Metadata = {
  title: "LakeWire — architecture walkthrough",
  description: "Architecture walkthrough of the LakeWire v0.1 core path (pre-alpha) from PRD v2.0.",
};

export default function ArchitecturePage() {
  return <ArchitectureWalkthrough />;
}
