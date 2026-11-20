import type { Metadata } from "next";
import { ArchitectureWalkthrough } from "@/components/architecture/walkthrough";

export const metadata: Metadata = {
  title: "LakeWire — architecture walkthrough",
  description: "A static design simulation of the LakeWire architecture from PRD v2.0. Implementation is unverified.",
};

export default function ArchitecturePage() {
  return <ArchitectureWalkthrough />;
}
