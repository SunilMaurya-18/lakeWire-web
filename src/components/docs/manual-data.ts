export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "code"; text: string }
  | { type: "note"; tone: "note" | "warn"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type ManualSection = {
  id: string;
  title: string;
  blocks: Block[];
};

const REPO = "https://github.com/SunilMaurya-18/LakeWire";
const I1 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I1AckedReadableChecker.java`;
const I2 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I2ContiguityChecker.java`;
const I3 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I3SequenceOrderChecker.java`;
const I4 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I4PhantomChecker.java`;
const I5 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I5NoDuplicateChecker.java`;
const I7 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I7NoDanglingRefChecker.java`;
const I8 = `${REPO}/blob/main/verify/src/main/java/lakewire/verify/checker/I8NoLeakChecker.java`;
const GUARANTEES = `${REPO}/blob/main/GUARANTEES.md`;
const REPORT = `${REPO}/blob/main/docs/reports/correctness-v0.1.0.md`;
const COMPAT = `${REPO}/blob/main/docs/reference/compatibility.md`;
const QUICK = `${REPO}/blob/main/docs/tutorials/quickstart.md`;

export const manual: ManualSection[] = [
  {
    id: "overview",
    title: "Overview",
    blocks: [
      { type: "p", text: "LakeWire is a diskless log that speaks a pinned Kafka protocol subset. Stateless Java 21 brokers write record batches to S3-compatible object storage. PostgreSQL is the source of truth for offsets, the committed high watermark, producer state, and broker epochs. A high watermark is the next offset that readers are allowed to see. Brokers keep no partition data on disk. Status: v0.1 pre-alpha, 0.1.0-SNAPSHOT. License: Apache-2.0." },
      { type: "note", tone: "note", text: "This site is the docs UI. The implementation is github.com/SunilMaurya-18/LakeWire." },
      { type: "h2", id: "clients", text: "Clients" },
      { type: "p", text: "v0.1 APIs on :9092: ApiVersions, Metadata, Produce, Fetch, ListOffsets, InitProducerId, CreateTopics, DeleteTopics. Not in v0.1: consumer groups, transactions, SASL/TLS, fetch sessions. Consumers must use assign(), not subscribe(). Compatibility matrix: docs/reference/compatibility.md." },
      { type: "p", text: `See [${COMPAT}](${COMPAT}) and [${QUICK}](${QUICK}).` },
      { type: "h2", id: "deps", text: "Two dependencies" },
      { type: "p", text: "PostgreSQL and any S3 API (AWS S3, GCS, SeaweedFS, MinIO, or a local directory in lakewire dev). Compose (deploy/compose/compose.yaml) starts 3 brokers (9092/9192/9292), Postgres, SeaweedFS, admin :8080, Prometheus, and Grafana. No Redis. Zone-aware Metadata is v0.1. Zone peer cache (gRPC) is v0.2." },
    ],
  },
  {
    id: "write",
    title: "Write path",
    blocks: [
      { type: "p", text: "Implemented in v0.1 (pre-alpha). Problem: a classic produce waits on disk replicas across zones. Mechanism: the broker buffers batches, writes one immutable object, then commits metadata in Postgres before it acknowledges. Trade-off: the caller waits for linger, the PUT, and the commit. PRD 12 targets (not measured): produce P50 ≤ 300 ms, P99 ≤ 800 ms, end-to-end P99 ≤ 1.5 s." },
      { type: "h2", id: "acks", text: "Acknowledgement" },
      { type: "p", text: "acks=1 and acks=all both mean the object is durable and the Postgres commit has returned. acks=0 is best-effort and may be lost." },
      { type: "h2", id: "buffer", text: "Buffer" },
      { type: "p", text: "Each broker buffers every partition it receives. Flush triggers: linger.ms, default 200 ms, or object.max.bytes, default 8 MiB. One object may hold chunks from many partitions." },
      { type: "h2", id: "put", text: "Put" },
      { type: "p", text: "The upload is an immutable object. An upload_intents row is recorded so a later commit cannot acknowledge an object that orphan cleanup already removed. Uploads use a conditional PUT (If-None-Match: * where the store supports it). Object key:" },
      { type: "code", text: "s3://{bucket}/{prefix}/v2/{yyyy}/{mm}/{dd}/{hh}/{broker}-{epoch}-{uuidv7}.lkw" },
      { type: "h2", id: "commit", text: "Commit" },
      { type: "p", text: "sl_commit_object() runs in one transaction. It locks partition rows in topic and partition order, checks the broker epoch, drops a repeated idempotent sequence, assigns offsets, and publishes the high watermark." },
    ],
  },
  {
    id: "objects",
    title: "Objects",
    blocks: [
      { type: "p", text: "Implemented in v0.1 (pre-alpha). The on-object format is LKW1. The body is Kafka RecordBatch v2, stored verbatim, with baseOffset 0. Real offsets are assigned at commit and patched when the batch is read. The Kafka batch CRC does not cover baseOffset, which is why the patch is safe." },
      { type: "h2", id: "index", text: "Index" },
      { type: "p", text: "The footer points at an index of topic, partition, byte range, record count, and crc32c. A worker can read an object without asking Postgres." },
      { type: "h2", id: "lifecycle", text: "Lifecycle" },
      { type: "p", text: "States: INTENT, COMMITTED, DELETE_PENDING, and GONE. An object moves to DELETE_PENDING only when live_refs hits 0, in the same transaction that drops the last segment. A grace period lets an in-flight fetch finish. Orphan GC deletes an old intent before the object, so a late commit finds no intent and fails." },
    ],
  },
  {
    id: "coordinator",
    title: "Coordinator",
    blocks: [
      { type: "p", text: "Implemented in v0.1 (pre-alpha). Postgres holds topics, partitions, the high watermark (partitions.next_offset), the segment index, object refcounts, broker epochs, and idempotent producer state. A topic is a named log. A partition is one ordered slice of that log. An offset is the position of a record in that slice." },
      { type: "h2", id: "epoch", text: "Epoch" },
      { type: "p", text: "A broker registers with epoch = epoch + 1, heartbeats every 2 seconds, and holds a 10 second lease. The clock is Postgres now(), so broker clock skew does not decide the lease. A stale epoch cannot commit. That fences a broker that paused past its lease and then tries to finish an old upload." },
      { type: "h2", id: "idempotence", text: "Idempotence" },
      { type: "p", text: "Idempotent produce (single-partition dedupe) is implemented in v0.1. Producer id, epoch, and per-partition sequence are checked inside the commit transaction. A retry returns the original offset. An out-of-order sequence is rejected. Transactions and exactly-once are not in v0.1." },
      { type: "note", tone: "note", text: "Consumer groups and SASL/TLS are v0.2 and v0.3. v0.1 consumers use assign() and track offsets themselves. Coordinator sharding is an experiment for v1.0." },
    ],
  },
  {
    id: "read",
    title: "Read path",
    blocks: [
      { type: "p", text: "Implemented in v0.1 (pre-alpha). Problem: a reader must not see a batch that was uploaded and then never committed. Mechanism: visible means committed. The high watermark is partitions.next_offset. Fetch looks up the segment index, then range-GETs the object and patches baseOffset. Trade-off: a fetch can wait for the commit instead of reading the newest uploaded bytes." },
      { type: "h2", id: "fetch", text: "Fetch" },
      { type: "p", text: "Uploaded-but-uncommitted data stays invisible because the broker does not serve an offset at or above the watermark it read from Postgres. NOTIFY fires only after the transaction commits, so a long-poll wakeup cannot announce an open commit. If a cached watermark is stale, the broker re-reads Postgres before choosing to wait or to return an error. A stale cache can delay data. It must not invent it." },
      { type: "h2", id: "routing", text: "Routing" },
      { type: "p", text: "Metadata lists a live broker in the client zone as the leader. Leadership is a routing hint, not ownership. Any broker can write or read any partition. Zone-aware Metadata is v0.1. Zone peer cache (gRPC) is v0.2." },
    ],
  },
  {
    id: "guarantees",
    title: "Guarantees",
    blocks: [
      { type: "p", text: "Design invariants I1–I8. v0.1 checkers exist for I1–I5, I7 and I8. I6 (group offsets) is v0.2. Pre-alpha: evidence from the test harness, not a proof. Cost figures on the homepage are a price model. Latency numbers in PRD 12 are targets, not measured." },
      { type: "h2", id: "invariants", text: "Invariants" },
      { type: "table", headers: ["ID", "Intended property", "Evidence"], rows: [
        ["I1", "An acknowledged record stays readable at that offset, with the same bytes.", `[I1AckedReadableChecker](${I1}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I2", "Offsets in a partition are unique and contiguous up to the high watermark.", `[I2ContiguityChecker](${I2}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I3", "Per producer, per partition, order is preserved.", `[I3SequenceOrderChecker](${I3}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I4", "A reader never observes an uncommitted or unacked offset that later disappears.", `[I4PhantomChecker](${I4}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I5", "An idempotent retry does not create a second copy.", `[I5NoDuplicateChecker](${I5}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I6", "Group offsets are monotonic per generation.", "v0.2 (consumer groups)"],
        ["I7", "No object referenced by a segment is deleted.", `[I7NoDanglingRefChecker](${I7}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
        ["I8", "An object without a row is younger than the orphan TTL plus the GC period.", `[I8NoLeakChecker](${I8}) · [GUARANTEES.md](${GUARANTEES}) · [correctness-v0.1.0.md](${REPORT})`],
      ] },
      { type: "h2", id: "faults", text: "Faults" },
      { type: "p", text: "The harness uses kill, pause, partition, slow S3, and Postgres restart. A paused broker that outlives its lease must not commit when it wakes. Run: lakewire verify --nemesis kill,pause,partition-pg --duration 3m --seed 42." },
    ],
  },
  {
    id: "run",
    title: "Run",
    blocks: [
      { type: "p", text: "Implementation lives in the LakeWire repo. Auto-create is off. CLI: lakewire dev, topics create|list|describe|delete, cost, verify, inspect." },
      { type: "h2", id: "dev", text: "Compose" },
      { type: "p", text: "Needs Docker Desktop. Ports: brokers 9092 / 9192 / 9292, admin 8080, Prometheus 9090, Grafana 3000." },
      { type: "code", text: "git clone https://github.com/SunilMaurya-18/LakeWire.git\ncd lakewire\ncopy deploy\\compose\\.env.example deploy\\compose\\.env\ndocker compose -f deploy\\compose\\compose.yaml --env-file deploy\\compose\\.env up -d" },
      { type: "h2", id: "produce", text: "Topics and kcat" },
      { type: "code", text: "bin/lakewire.cmd topics create orders -p 1 --retention 7d --bootstrap localhost:9092\necho hello | kcat -P -b localhost:9092 -t orders\nkcat -C -b localhost:9092 -t orders -e" },
      { type: "h2", id: "solo", text: "lakewire dev" },
      { type: "p", text: "One process, no Docker. Java 21. Prints ready bootstrap=localhost:9092." },
      { type: "code", text: ".\\mvnw.cmd -pl lakewire-cli -am package -DskipTests\nbin\\lakewire.cmd dev" },
      { type: "h2", id: "cost", text: "Cost and verify" },
      { type: "code", text: "lakewire cost --gib-per-day 500 --zones 3 --retention 7d\nlakewire verify --nemesis kill,pause,partition-pg --duration 3m --seed 42" },
      { type: "h2", id: "trouble", text: "If it does not connect" },
      { type: "p", text: "Confirm compose is up and a topic exists (auto-create is off). Helm and SASL/TLS are not in v0.1. Helm is on the v0.2 roadmap." },
    ],
  },
];

export type SearchHit = { id: string; title: string; section: string };

function blockText(block: Block): string {
  if (block.type === "table") return [...block.headers, ...block.rows.flat()].join(" ");
  return block.text;
}

export function searchManual(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return manual.map((section) => ({ id: section.id, title: section.title, section: "Manual" }));
  const hits: SearchHit[] = [];
  const push = (id: string, title: string, section: string) => {
    if (hits.some((hit) => hit.id === id)) return;
    hits.push({ id, title, section });
  };
  manual.forEach((section) => {
    const blob = [section.title, ...section.blocks.map(blockText)].join(" ").toLowerCase();
    if (blob.includes(needle)) push(section.id, section.title, "Manual");
    section.blocks.forEach((block) => {
      if (block.type !== "h2") return;
      if (block.text.toLowerCase().includes(needle)) push(block.id, block.text, section.title);
    });
  });
  return hits.slice(0, 12);
}
