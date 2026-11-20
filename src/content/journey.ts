export const steps = [
  {
    id: "produce",
    label: "A record leaves the client",
    lang: "Shell",
    code: "kcat -b localhost:9092 -t events -P",
  },
  {
    id: "batch",
    label: "The buffer waits, then seals",
    lang: "Config",
    code: "linger.ms=200\nobject.max.bytes=8MiB",
  },
  {
    id: "put",
    label: "One object enters storage",
    lang: "Path",
    code: "s3://{bucket}/{prefix}/v2/\n  {yyyy}/{mm}/{dd}/{hh}/\n  {broker}-{epoch}-{uuid}.lkw",
  },
  {
    id: "commit",
    label: "Postgres assigns the offset",
    lang: "SQL",
    code: "sl_commit_object()",
  },
  {
    id: "ack",
    label: "The ack travels back",
    lang: "Ack",
    code: "acks=all\noffset returns after the commit",
  },
  {
    id: "get",
    label: "A consumer reads the range",
    lang: "Fetch",
    code: "range GET the .lkw object\npatch baseOffset\nreturn the original batches",
  },
] as const;

export type StepId = (typeof steps)[number]["id"];
