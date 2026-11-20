export type ExplainChip = {
  label: string;
  detail?: string;
  danger?: boolean;
};

export type ExplainConfig = {
  id: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  chips: ExplainChip[];
  checklist?: boolean;
  defaultActive: number;
  proof: string;
  replay: string;
  href: string;
  link: string;
  badge: string;
  scrim: string[];
  wire?: boolean;
  caption?: string;
  embed?: string;
  embedTitle?: string;
};

export const sections = {
  leases: {
    id: "leases",
    eyebrow: "Leases & epochs",
    headline: "A paused broker cannot ack when it wakes.",
    subhead: "A dead lease cannot commit.",
    chips: [
      { label: "01 LIVE", detail: "commit accepted" },
      { label: "02 EXPIRED", detail: "commit refused", danger: true },
    ],
    defaultActive: 0,
    proof: "heartbeat 2s",
    replay: "Replay lease",
    href: "/docs#epoch",
    link: "Read fencing →",
    badge: "LIVE · LEASES",
    scrim: ["LIVE", "EXPIRED"],
    embed: "/animations/leases.html?scene=leases",
    embedTitle: "LakeWire leases animation",
    caption: "2s heartbeat, 18s lease. Tunable. Timeline compressed.",
  },
  coordinator: {
    id: "coordinator",
    eyebrow: "Postgres",
    headline: "The offset, the lease, and the fence.",
    subhead: "One transaction checks the epoch, drops a duplicate sequence, then assigns offsets.",
    caption: "A stale epoch cannot commit. This coordinator is specified, not in this repository.",
    chips: [
      { label: "epoch matches" },
      { label: "sequence seen" },
      { label: "offsets in order" },
      { label: "intent open" },
    ],
    checklist: true,
    defaultActive: 0,
    proof: "one Postgres transaction",
    replay: "Replay commit",
    href: "/docs#coordinator",
    link: "Read the coordinator →",
    badge: "LIVE · COORDINATOR",
    scrim: ["EPOCH", "SEQUENCE", "OFFSETS", "INTENT"],
    embed: "/animations/write-path.html?scene=coordinator",
    embedTitle: "LakeWire coordinator animation",
  },
  lkw1: {
    id: "lkw1",
    eyebrow: "LKW1",
    headline: "Kafka batches, stored verbatim.",
    subhead: "Header, batches, index, footer. baseOffset is patched on read.",
    chips: [
      { label: "HEADER", detail: "LKW1" },
      { label: "BATCHES", detail: "RecordBatch v2" },
      { label: "INDEX", detail: "topic·partition" },
      { label: "FOOTER", detail: "magic" },
    ],
    defaultActive: 0,
    proof: "crc32c",
    replay: "Replay object",
    href: "/docs#objects",
    link: "Read the object →",
    badge: "LIVE · LKW1",
    scrim: ["HEADER", "BATCHES", "INDEX", "FOOTER"],
    embed: "/animations/leases.html?scene=lkw1",
    embedTitle: "LakeWire LKW1 verify animation",
    caption: "Quarantine here is illustrative, not a product feature.",
  },
  architecture: {
    id: "architecture",
    eyebrow: "The log",
    headline: "Client, broker, bucket, and coordinator.",
    subhead: "Brokers route bytes. The log stays in the bucket.",
    caption: "An upload stays invisible until Postgres commits the high watermark.",
    chips: [
      { label: "CLIENT", detail: ":9092" },
      { label: "BROKER", detail: "no disk" },
      { label: "BUCKET", detail: ".lkw S3 PUT" },
      { label: "POSTGRES", detail: "offsets·epochs" },
    ],
    defaultActive: 1,
    proof: "produce · put · commit",
    replay: "Replay path",
    href: "/docs#write",
    link: "Read the write path →",
    badge: "LIVE · THE LOG",
    scrim: ["CLIENT", "BROKER", "BUCKET", "POSTGRES"],
    embed: "/animations/leases.html?scene=log",
    embedTitle: "LakeWire log animation",
  },
} satisfies Record<string, ExplainConfig>;
