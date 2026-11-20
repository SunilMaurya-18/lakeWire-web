export type ArchStatus = "planned-v0.1" | "planned-v0.2" | "planned-v0.3" | "experimental" | "later";

export type ChapterId = "overview" | "produce" | "fetch" | "retry" | "fence" | "lifecycle" | "later";

export type ArchNode = {
  id: string;
  title: string;
  status: ArchStatus;
  kind: "clients" | "broker" | "module" | "external" | "later";
  summary: string;
  detail: string;
};

export const statusLabel: Record<ArchStatus, string> = {
  "planned-v0.1": "Planned v0.1",
  "planned-v0.2": "Planned v0.2",
  "planned-v0.3": "Planned v0.3",
  experimental: "Experimental",
  later: "Later",
};

export const chapters: { id: ChapterId; title: string }[] = [
  { id: "overview", title: "System overview" },
  { id: "produce", title: "Produce through durable ACK" },
  { id: "fetch", title: "Fetch and visibility" },
  { id: "retry", title: "Retry and deduplication" },
  { id: "fence", title: "Stale epoch" },
  { id: "lifecycle", title: "Retention and orphans" },
  { id: "later", title: "Planned advanced layers" },
];

export const nodes: ArchNode[] = [
  {
    id: "clients",
    title: "Kafka clients",
    status: "planned-v0.1",
    kind: "clients",
    summary: "Producers and consumers using the planned protocol subset.",
    detail: "The v0.1 draft lists ApiVersions, Metadata, Produce, Fetch, ListOffsets, InitProducerId, CreateTopics, and DeleteTopics. Consumer groups and transactions are not in that subset. No Kafka client is served by this repository.",
  },
  {
    id: "broker",
    title: "Stateless broker",
    status: "planned-v0.1",
    kind: "broker",
    summary: "A Java 21 process that routes requests. It does not own the log.",
    detail: "Buffer, uploader, commit, fetch, and workers are modules inside the broker, not extra infrastructure. The draft says any broker may write or read any partition. Leadership would be a routing hint, not exclusive ownership. The Netty server is not in this repository.",
  },
  {
    id: "buffer",
    title: "Write buffer",
    status: "planned-v0.1",
    kind: "module",
    summary: "Memory inside the broker. Not a separate service, and not durable.",
    detail: "The draft batches records here before one object upload. Unacknowledged bytes in this buffer are lost if the process stops. The proposed flush triggers are not configuration in this repository.",
  },
  {
    id: "uploader",
    title: "Uploader",
    status: "planned-v0.1",
    kind: "module",
    summary: "Builds one immutable LKW1 object and writes it to object storage.",
    detail: "The upload follows an intent row in PostgreSQL. An uploaded object is not visible to readers until the commit succeeds. The LKW1 codec is not implemented here.",
  },
  {
    id: "commit",
    title: "Commit handler",
    status: "planned-v0.1",
    kind: "module",
    summary: "Asks PostgreSQL to validate the epoch and intent, then assign offsets.",
    detail: "Designed acks=1 and acks=all both wait for durable object storage and the PostgreSQL commit. acks=0 is best-effort. Duplicate sequences are meant to return the original offset. This is not a Kafka transaction.",
  },
  {
    id: "fetch",
    title: "Fetch handler",
    status: "planned-v0.1",
    kind: "module",
    summary: "Returns only committed records, from cache or from a range read.",
    detail: "The visibility boundary is the committed high watermark. baseOffset is patched on the way out. Uploaded-but-uncommitted objects stay invisible. A local cache is not a second durable store.",
  },
  {
    id: "workers",
    title: "Workers",
    status: "planned-v0.1",
    kind: "module",
    summary: "Retention, orphan cleanup, and reference checks, running with a broker.",
    detail: "The draft runs these inside a broker process. Reference auditing reports mismatches. It does not delete objects on its own authority. None of these jobs are in this repository.",
  },
  {
    id: "postgres",
    title: "PostgreSQL",
    status: "planned-v0.1",
    kind: "external",
    summary: "External source of truth for offsets, watermarks, epochs, and leases.",
    detail: "One of the two required infrastructure dependencies. Commit, fencing, and LISTEN/NOTIFY are specified here. The checked-in compose file can start Postgres. It does not contain the coordinator functions.",
  },
  {
    id: "storage",
    title: "Object storage",
    status: "planned-v0.1",
    kind: "external",
    summary: "External durable store for immutable objects.",
    detail: "Any S3 API, or a local directory in the planned dev mode. Objects are not the visibility boundary. A peer cache planned for v0.2 would only share ranges. It would not become another durable store.",
  },
  {
    id: "groups",
    title: "Consumer groups",
    status: "planned-v0.2",
    kind: "later",
    summary: "Membership, assignment, and committed consumer offsets.",
    detail: "Kept off the core path. Not part of the v0.1 subset, and not implemented.",
  },
  {
    id: "peer",
    title: "Zone peer cache",
    status: "planned-v0.2",
    kind: "later",
    summary: "Brokers in a zone share cached object ranges.",
    detail: "A cache lookup only. PostgreSQL and object storage remain the durable stores.",
  },
  {
    id: "jepsen",
    title: "Jepsen workload",
    status: "planned-v0.3",
    kind: "later",
    summary: "A later verification run. Not a certification.",
    detail: "The draft hopes to run an existing Jepsen Kafka workload. No report has been published.",
  },
  {
    id: "shard",
    title: "Coordinator sharding",
    status: "experimental",
    kind: "later",
    summary: "An experiment for splitting coordination across Postgres instances.",
    detail: "Marked experimental in the draft. Not part of the core scene, and not built.",
  },
];

export function nodeById(id: string) {
  return nodes.find((node) => node.id === id) ?? nodes[0];
}

export const chapterCopy: Record<ChapterId, string> = {
  overview: "Clients talk only to brokers. Brokers use PostgreSQL for coordination and object storage for the bytes. The modules drawn inside each broker are not separate services.",
  produce: "Produce is buffered, an intent is recorded, the object is uploaded, then PostgreSQL commits. The durable acknowledgement waits for the object and that commit. acks=0 does not.",
  fetch: "Fetch reads the committed high watermark first. A range may come from a broker cache or from object storage. Records at or beyond the watermark stay invisible.",
  retry: "The same producer sequence is meant to resolve to the original offset. That dedupe is per partition. It is not a transaction and not cross-partition exactly-once.",
  fence: "A broker registers an epoch in PostgreSQL. A commit with a stale epoch is rejected. This fences that broker incarnation. It does not transfer partition ownership.",
  lifecycle: "Retention drops segment references. An unreferenced object becomes DELETE_PENDING, then leaves storage after a grace period. Orphan cleanup removes the intent before the object so a late commit fails.",
  later: "Groups, the peer cache, a Jepsen workload, and coordinator sharding stay outside the core path. Their labels are the draft status, not shipped features.",
};
