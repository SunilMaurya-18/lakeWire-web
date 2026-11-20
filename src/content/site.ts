export const sections = [
  { id: "lake", label: "Lake" },
  { id: "problem", label: "Problem" },
  { id: "gap", label: "Gap" },
  { id: "system", label: "System" },
  { id: "journey", label: "Journey" },
  { id: "cost", label: "Cost" },
  { id: "library", label: "Library" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
