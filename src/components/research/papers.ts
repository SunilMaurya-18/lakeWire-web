export const tags = ["Kafka", "Diskless", "Storage", "Correctness"] as const;

export type Tag = (typeof tags)[number];

export type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  tags: Tag[];
  why: string;
  href: string;
  bibtex?: string;
};

export const papers: Paper[] = [
  {
    id: "kafka-2011",
    title: "Kafka: a Distributed Messaging System for Log Processing",
    authors: "Kreps, Narkhede, Rao",
    venue: "NetDB",
    year: 2011,
    tags: ["Kafka"],
    why: "The log LakeWire speaks. Producers append. Consumers read by offset.",
    href: "https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf",
    bibtex: `@inproceedings{kreps2011kafka,
  title={Kafka: a Distributed Messaging System for Log Processing},
  author={Kreps, Jay and Narkhede, Neha and Rao, Jun},
  booktitle={NetDB},
  year={2011}
}`,
  },
  {
    id: "kip-1150",
    title: "KIP-1150: Diskless Topics",
    authors: "Apache Kafka",
    venue: "KIP",
    year: 2026,
    tags: ["Kafka", "Diskless"],
    why: "Accepted direction: batches go to object storage, metadata stays in a coordinator.",
    href: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-1150+Diskless+Topics",
  },
  {
    id: "kip-405",
    title: "KIP-405: Kafka Tiered Storage",
    authors: "Apache Kafka",
    venue: "KIP",
    year: 2019,
    tags: ["Kafka", "Storage"],
    why: "Moves cold segments to objects. The hot set is still replicated on broker disks. LakeWire does not keep that hot set.",
    href: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-405%3A+Kafka+Tiered+Storage",
  },
  {
    id: "kip-679",
    title: "KIP-679: Idempotence on by default",
    authors: "Apache Kafka",
    venue: "KIP",
    year: 2020,
    tags: ["Kafka", "Correctness"],
    why: "Stock producers send a producer id and sequence. Without dedupe in the commit, those clients fail.",
    href: "https://cwiki.apache.org/confluence/display/KAFKA/KIP-679%3A+Producer+will+enable+the+strongest+delivery+guarantee+by+default",
  },
  {
    id: "corfu-2012",
    title: "CORFU: A Shared Log Design for Flash Clusters",
    authors: "Balakrishnan, Malkhi, Prabhakaran, Wobber, Wei, Davis",
    venue: "NSDI",
    year: 2012,
    tags: ["Diskless"],
    why: "A shared log where the address is the position. LakeWire assigns that position in Postgres, not on a broker disk.",
    href: "https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/balakrishnan",
    bibtex: `@inproceedings{balakrishnan2012corfu,
  title={CORFU: A Shared Log Design for Flash Clusters},
  author={Balakrishnan, Mahesh and Malkhi, Dahlia and Prabhakaran, Vijayan and Wobber, Ted and Wei, Michael and Davis, John D.},
  booktitle={NSDI},
  year={2012}
}`,
  },
  {
    id: "azure-2011",
    title: "Windows Azure Storage",
    authors: "Calder et al.",
    venue: "SOSP",
    year: 2011,
    tags: ["Storage"],
    why: "Object storage already replicates across fault domains. That is the copy LakeWire does not make itself.",
    href: "https://www.microsoft.com/en-us/research/publication/windows-azure-storage-a-highly-available-cloud-storage-service-with-strong-consistency/",
    bibtex: `@inproceedings{calder2011azure,
  title={Windows Azure Storage},
  author={Calder, Brad and others},
  booktitle={SOSP},
  year={2011}
}`,
  },
  {
    id: "linearizability-1990",
    title: "Linearizability",
    authors: "Herlihy, Wing",
    venue: "ACM TOPLAS",
    year: 1990,
    tags: ["Correctness"],
    why: "An acked offset must be readable, in order, from any broker. That is the check behind invariants I1 and I4.",
    href: "https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf",
    bibtex: `@article{herlihy1990linearizability,
  title={Linearizability: A Correctness Condition for Concurrent Objects},
  author={Herlihy, Maurice P. and Wing, Jeannette M.},
  journal={ACM TOPLAS},
  year={1990}
}`,
  },
  {
    id: "ldfi-2015",
    title: "Lineage-driven Fault Injection",
    authors: "Alvaro, Rosen, Hellerstein",
    venue: "SIGMOD",
    year: 2015,
    tags: ["Correctness"],
    why: "The reason the harness kills, pauses, and partitions brokers instead of only testing the happy path.",
    href: "https://people.ucsc.edu/~palvaro/molly.pdf",
    bibtex: `@inproceedings{alvaro2015lineage,
  title={Lineage-driven Fault Injection},
  author={Alvaro, Peter and Rosen, Joshua and Hellerstein, Joseph M.},
  booktitle={SIGMOD},
  year={2015}
}`,
  },
];
