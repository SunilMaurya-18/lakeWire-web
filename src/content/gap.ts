export const tiles = [
  {
    id: "cost",
    title: "Cross-AZ cost",
    problem: "Copies are billed in every zone.",
    answer: "One copy in object storage.",
  },
  {
    id: "coupled",
    title: "Coupled storage",
    problem: "Disks stay glued to brokers.",
    answer: "Brokers keep no disks.",
  },
  {
    id: "scale",
    title: "Slow scaling",
    problem: "New brokers must copy data.",
    answer: "Scale without moving bytes.",
  },
  {
    id: "latency",
    title: "Latency vs cost",
    problem: "Cheap disks add wait time.",
    answer: "Batch, then write once.",
  },
  {
    id: "correct",
    title: "Untested correctness",
    problem: "Failure paths rarely get tests.",
    answer: "Postgres locks the offset.",
  },
  {
    id: "ops",
    title: "Ops complexity",
    problem: "Rebalance is manual work.",
    answer: "No disks left to rebalance.",
  },
] as const;

export type TileId = (typeof tiles)[number]["id"];
