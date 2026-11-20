type Vec = [number, number, number];

const consumer: Vec = [-3.85, -0.05, 0.8];
const brokerFace: Vec = [-1.22, -1.5, 0.8];
const fetchAt: Vec = [1.82, -1.35, 0.95];
const cacheAt: Vec = [1.82, -1.05, 0.95];
const postgres: Vec = [3.7, 1.4, 0.55];
/** A committed range. Kept away from the uncommitted object marker. */
const committed: Vec = [3.35, -1.38, 0.75];

export type CacheBranch = "hit" | "miss";

export type FetchStep = {
  id: "fetch" | "watermark" | "range" | "patch" | "response";
  title: string;
  focus: string[];
  line: "fetch" | "object" | null;
  body: string;
  path: Vec[];
};

const shared = {
  fetch: {
    id: "fetch" as const,
    title: "Fetch request",
    focus: ["clients", "broker"],
    line: "fetch" as const,
    body: "A consumer sends Fetch to a broker. Only committed records can be returned. The zone peer cache is planned for v0.2 and is off.",
    path: [consumer, brokerFace],
  },
  watermark: {
    id: "watermark" as const,
    title: "High watermark and index",
    focus: ["fetch", "postgres"],
    line: null,
    body: "The broker reads the committed high watermark, partitions.next_offset, and the segment index from PostgreSQL. The object marked not visible was uploaded and has no commit, so it is absent from the index. NOTIFY is delivered only after a commit. This fetch is below the watermark, so the broker does not wait.",
    path: [fetchAt, postgres],
  },
  patch: {
    id: "patch" as const,
    title: "Patch baseOffset",
    focus: ["fetch", "broker"],
    line: null,
    body: "The fetch handler patches batch baseOffset from 0 to the offset assigned at commit. The object in storage is unchanged. The design does this because the Kafka batch CRC does not cover baseOffset.",
    path: [committed, fetchAt],
  },
  response: {
    id: "response" as const,
    title: "Fetch response",
    focus: ["clients", "broker", "fetch"],
    line: "fetch" as const,
    body: "The broker returns records below the committed high watermark. It does not return bytes at or above that watermark, or anything from the uncommitted object.",
    path: [fetchAt, brokerFace, consumer],
  },
};

const missRange: FetchStep = {
  id: "range",
  title: "Cache miss",
  focus: ["fetch", "storage"],
  line: "object",
  body: "The local cache does not have the range. The broker reads it from the committed object in storage. It does not read the uncommitted object. The peer cache is not consulted.",
  path: [fetchAt, committed],
};

const hitRange: FetchStep = {
  id: "range",
  title: "Cache hit",
  focus: ["fetch", "broker"],
  line: null,
  body: "The local cache already has the committed range, so the broker does not read object storage. The uncommitted object stays invisible. The peer cache is not consulted.",
  path: [cacheAt, fetchAt],
};

const hitPatch: FetchStep = { ...shared.patch, path: [cacheAt, fetchAt] };

export const fetchStepsMiss: FetchStep[] = [shared.fetch, shared.watermark, missRange, shared.patch, shared.response];
export const fetchStepsHit: FetchStep[] = [shared.fetch, shared.watermark, hitRange, hitPatch, shared.response];

export function fetchSteps(branch: CacheBranch) {
  return branch === "hit" ? fetchStepsHit : fetchStepsMiss;
}
