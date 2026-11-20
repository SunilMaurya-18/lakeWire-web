type Vec = [number, number, number];

/** Reading pace for the designed path. Not a latency measurement. */
export const PRODUCE_STEP_MS = 7000;

const producer: Vec = [-3.85, 1.05, 0.8];
const brokerFace: Vec = [-1.22, 1.48, 0.8];
const buffer: Vec = [-0.47, 2.02, 0.85];
const uploader: Vec = [0.77, 2.02, 0.85];
const commit: Vec = [-0.47, 1.27, 0.72];
const postgres: Vec = [3.7, 1.4, 0.55];
const storage: Vec = [3.7, -1.7, 0.55];

export type ProduceStep = {
  id: "produce" | "buffer" | "intent" | "upload" | "commit" | "ack";
  title: string;
  focus: string[];
  /** Existing connection to brighten. Upload travels from the same broker without a new map edge. */
  line: "produce" | "commit" | null;
  body: string;
  path: Vec[];
};

export const produceSteps: ProduceStep[] = [
  {
    id: "produce",
    title: "Produce request",
    focus: ["clients", "broker"],
    line: "produce",
    body: "A producer sends one Produce request to a broker. This scenario is the durable acknowledgement for acks=1 and acks=all. Both wait for the stored object and the PostgreSQL commit. acks=0 is best-effort and does not take this wait.",
    path: [producer, brokerFace],
  },
  {
    id: "buffer",
    title: "Buffer and LKW1",
    focus: ["buffer", "uploader", "broker"],
    line: null,
    body: "The broker holds the records in its write buffer and assembles one LKW1 object. Batches are stored with baseOffset 0. Offsets are not assigned yet. The buffer and the uploader are modules in this broker, not separate services. Bytes still in the buffer are not durable.",
    path: [brokerFace, buffer, uploader],
  },
  {
    id: "intent",
    title: "Upload intent",
    focus: ["postgres", "commit"],
    line: "commit",
    body: "Before the object is uploaded, the broker writes an upload intent in PostgreSQL. The intent records the object key and this broker epoch. Readers cannot see the records yet.",
    path: [commit, postgres],
  },
  {
    id: "upload",
    title: "Object upload",
    focus: ["uploader", "storage"],
    line: null,
    body: "The uploader then writes that immutable object to object storage. The upload alone does not acknowledge the producer. Until the commit finishes, the object stays invisible to fetch.",
    path: [uploader, storage],
  },
  {
    id: "commit",
    title: "Commit",
    focus: ["postgres", "commit"],
    line: "commit",
    body: "PostgreSQL checks that the intent still exists and that the broker epoch is current. The same transaction assigns offsets and publishes the segment metadata and high watermarks. This play-through is one new produce. Duplicate sequences are meant to resolve here, inside a single partition. This is not a Kafka transaction.",
    path: [commit, postgres],
  },
  {
    id: "ack",
    title: "Acknowledgement",
    focus: ["clients", "broker"],
    line: "produce",
    body: "The broker acknowledges the producer only after that commit succeeds. For acks=1 and acks=all, the acknowledgement means the object is in storage and the PostgreSQL commit landed. Nothing in this repository runs this path.",
    path: [postgres, brokerFace, producer],
  },
];
