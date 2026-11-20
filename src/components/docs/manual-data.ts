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

export const manual: ManualSection[] = [
  {
    id: "overview",
    title: "Overview",
    blocks: [
      { type: "p", text: "LakeWire is a design for a diskless log that speaks a subset of the Kafka wire protocol. Stateless Java 21 brokers are meant to write record batches to S3-compatible object storage. PostgreSQL is the intended source of truth for offsets, the committed high watermark, producer state, and broker epochs. A high watermark is the next offset that readers are allowed to see. Brokers keep no partition data on disk." },
      { type: "note", tone: "warn", text: "This repository has a Spring Boot shell (dev.lakewire.broker) and this site. The protocol server, LKW1 codec, and SQL coordinator below are specified in the v2.0 PRD. They are not in this tree. Verification of those behaviors is pending." },
      { type: "h2", id: "clients", text: "Clients" },
      { type: "p", text: "The v0.1 target is a subset, not full Kafka compatibility. Planned calls on port 9092 are ApiVersions, Metadata, Produce, Fetch, ListOffsets, InitProducerId, CreateTopics, and DeleteTopics. The acceptance target is the Apache Kafka Java client, the console tools, and kcat. Consumer groups, transactions, SASL, TLS, and fetch sessions are not in that subset." },
      { type: "h2", id: "deps", text: "Two dependencies" },
      { type: "p", text: "The design depends on PostgreSQL and any S3 API: AWS S3, GCS, SeaweedFS, MinIO, or a local directory in dev. The checked-in compose.yaml starts Postgres and Redis only. The PRD removes Redis as a requirement and keeps leases in Postgres. The README still describes Redis for cache and leases. That conflict is unresolved. No broker, MinIO, or Kafka listener is defined in compose.yaml. The pom includes Spring Actuator and Micrometer Prometheus. No LakeWire metric names, admin REST API, or gRPC admin service from the PRD exist in this tree." },
    ],
  },
  {
    id: "write",
    title: "Write path",
    blocks: [
      { type: "p", text: "Problem: a classic produce waits on disk replicas across zones. Mechanism: the broker buffers batches, writes one immutable object, then commits metadata in Postgres before it acknowledges. Trade-off: the caller waits for linger, the PUT, and the commit. The PRD targets about a second, not sub-10 ms. Those latency figures are targets, not measurements." },
      { type: "h2", id: "acks", text: "Acknowledgement" },
      { type: "p", text: "Designed semantics: acks=1 and acks=all both mean the object is durable and the Postgres commit has returned. acks=0 is best-effort and may be lost. This is not implemented, so it has not been verified against a client." },
      { type: "h2", id: "buffer", text: "Buffer" },
      { type: "p", text: "Each broker is designed to buffer every partition it receives. The flush triggers are linger.ms, default 200, or object.max.bytes, default 8 MiB. One object may hold chunks from many partitions. These names are design defaults. application.properties in this repo only sets the Spring application name." },
      { type: "h2", id: "put", text: "Put" },
      { type: "p", text: "The upload is an immutable object. An upload_intents row is recorded so a later commit cannot acknowledge an object that orphan cleanup already removed. The designed key is below. No writer in this repository creates it." },
      { type: "code", text: "s3://{bucket}/{prefix}/v2/{yyyy}/{mm}/{dd}/{hh}/{broker}-{epoch}-{uuid}.lkw" },
      { type: "h2", id: "commit", text: "Commit" },
      { type: "p", text: "The designed function sl_commit_object() runs in one transaction. It locks partition rows in topic and partition order, checks the broker epoch, drops a repeated idempotent sequence, assigns offsets, and publishes the high watermark. There is no SQL function in this repository. Group commit within 5 ms is a P0 flag in the PRD, not a measured setting." },
    ],
  },
  {
    id: "objects",
    title: "Objects",
    blocks: [
      { type: "p", text: "The on-object format is LKW1. The body is Kafka RecordBatch v2, stored verbatim, with baseOffset 0. Real offsets are assigned at commit and patched when the batch is read. The Kafka batch CRC does not cover baseOffset, which is why the patch is specified as safe. The codec and that CRC behavior are not tested in this repository." },
      { type: "h2", id: "index", text: "Index" },
      { type: "p", text: "The footer points at an index of topic, partition, byte range, record count, and crc32c. The design lets a worker read an object without asking Postgres. That reader is not in this tree." },
      { type: "h2", id: "lifecycle", text: "Lifecycle" },
      { type: "p", text: "Designed states are INTENT, COMMITTED, DELETE_PENDING, and GONE. An object moves to DELETE_PENDING only when live_refs hits 0, in the same transaction that drops the last segment. A grace period, default 5 minutes, lets an in-flight fetch finish. Orphan GC deletes an old intent before the object, so a late commit finds no intent and fails. None of this state machine is implemented here." },
    ],
  },
  {
    id: "coordinator",
    title: "Coordinator",
    blocks: [
      { type: "p", text: "Postgres is specified to hold topics, partitions, the high watermark (partitions.next_offset), the segment index, object refcounts, broker epochs, and idempotent producer state. A topic is a named log. A partition is one ordered slice of that log. An offset is the position of a record in that slice." },
      { type: "h2", id: "epoch", text: "Epoch" },
      { type: "p", text: "A broker registers with epoch = epoch + 1, heartbeats every 2 seconds, and holds a 10 second lease. The clock is Postgres now(), so broker clock skew does not decide the lease. A stale epoch cannot commit. That fences a broker that paused past its lease and then tries to finish an old upload. The homepage lease animation draws an 18 second lease on a compressed timeline; that drawing is tunable and is not the design default. This registry is not in the repository." },
      { type: "h2", id: "idempotence", text: "Idempotence" },
      { type: "p", text: "Producer id, epoch, and per-partition sequence are checked inside the commit transaction. A retry is designed to return the original offset. An out-of-order sequence is rejected. The PRD includes this because current Kafka clients enable idempotence by default. It is not implemented here." },
      { type: "note", tone: "note", text: "Consumer groups and SASL/TLS are planned for later releases (v0.2 and v0.3 in the PRD). v0.1 consumers, if the protocol ships, would assign partitions and track offsets themselves. Coordinator sharding is an experiment for v1.0, not a current feature." },
    ],
  },
  {
    id: "read",
    title: "Read path",
    blocks: [
      { type: "p", text: "Problem: a reader must not see a batch that was uploaded and then never committed. Mechanism: visible means committed. The high watermark is partitions.next_offset. Fetch looks up the segment index, then range-GETs the object and patches baseOffset. Trade-off: a fetch can wait for the commit instead of reading the newest uploaded bytes." },
      { type: "h2", id: "fetch", text: "Fetch" },
      { type: "p", text: "Uploaded-but-uncommitted data stays invisible because the broker does not serve an offset at or above the watermark it read from Postgres. NOTIFY is specified to fire only after the transaction commits, so a long-poll wakeup cannot announce an open commit. If a cached watermark is stale, the design re-reads Postgres before choosing to wait or to return an error. A stale cache can delay data. It must not invent it. This path is not implemented." },
      { type: "h2", id: "routing", text: "Routing" },
      { type: "p", text: "Metadata is designed to list a live broker in the client zone as the leader. Leadership is a routing hint, not ownership. Any broker can write or read any partition. Zone-aware routing itself is marked v0.2 in the PRD." },
    ],
  },
  {
    id: "guarantees",
    title: "Guarantees",
    blocks: [
      { type: "p", text: "I1–I8 are the properties the design wants a fault harness to check. No checker, nemesis, or report is in this repository. Do not read them as proven guarantees. Cost figures on the homepage are a price model. Latency numbers in the PRD are targets." },
      { type: "h2", id: "invariants", text: "Invariants" },
      { type: "table", headers: ["ID", "Intended property", "Evidence here"], rows: [
        ["I1", "An acknowledged record stays readable at that offset, with the same bytes.", "No checker"],
        ["I2", "Offsets in a partition are unique and contiguous up to the high watermark.", "No checker"],
        ["I3", "Per producer, per partition, order is preserved.", "No checker"],
        ["I4", "A reader never observes an uncommitted or unacked offset that later disappears.", "No checker"],
        ["I5", "An idempotent retry does not create a second copy.", "No checker"],
        ["I6", "Group offsets are monotonic per generation. Specified for v0.2.", "Not in scope yet"],
        ["I7", "No object referenced by a segment is deleted.", "No checker"],
        ["I8", "An object without a row is younger than the orphan TTL plus the GC period.", "No checker"],
      ] },
      { type: "h2", id: "faults", text: "Faults" },
      { type: "p", text: "The PRD plans kill, pause, partition, slow S3, and Postgres restart. A paused broker that outlives its lease must not commit when it wakes. That suite is not in this tree." },
    ],
  },
  {
    id: "run",
    title: "Run",
    blocks: [
      { type: "p", text: "First success, today, is inspecting the shell that is actually in the repository. A Kafka produce and consume loop is the v0.1 plan. It is not a copy-and-paste path yet." },
      { type: "h2", id: "dev", text: "Local" },
      { type: "p", text: "Prerequisite: Java 21, which is what the Maven pom requests. The wrapper is mvnw on Unix and mvnw.cmd on Windows. The only application entry is dev.lakewire.broker.LakewireBrokerApplication. compose.yaml can start Postgres and Redis. It does not start a broker or a bucket. The v2 PRD describes a Gradle multi-module layout and lakewire dev. This repository is one Maven module. Those do not match. The README still mentions gradlew bootRun." },
      { type: "code", text: "mvnw.cmd -v" },
      { type: "p", text: "spring-boot:run is the ordinary Maven goal for this pom. This documentation pass did not verify a successful boot. The shell does not open port 9092." },
      { type: "h2", id: "produce", text: "Produce" },
      { type: "note", tone: "warn", text: "Do not run these. They are the planned v0.1 interface from the PRD. There is no lakewire binary, no topics command, and no Kafka listener in this repository." },
      { type: "code", text: "lakewire dev\nlakewire topics create orders -p 12 --retention 7d\nkcat -b localhost:9092 -t events -P\nkcat -b localhost:9092 -t events -C" },
      { type: "h2", id: "trouble", text: "If it does not connect" },
      { type: "p", text: "A connection refused on localhost:9092 is expected. Nothing in this tree listens there. If a Spring process exits immediately, check that Java 21 is the version on PATH and that compose has not been assumed to provide MinIO. Production install, Helm, and TLS are separate and are not part of this first look." },
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
