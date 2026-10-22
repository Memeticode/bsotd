import Link from "next/link";
import {
  DatasetKind,
  datasetProducer,
  type Dataset,
  type Pipeline,
} from "@bsotd/pipeline/core";

import { Tag } from "@/components/ui/Tag";
import { DATASET_KIND_LABELS } from "./labels";
import styles from "./InputList.module.css";

interface InputListProps {
  pipeline: Pipeline;
  inputs: Dataset[];
}

/** The datasets a step reads, each with where it comes from. */
export function InputList({ pipeline, inputs }: InputListProps) {
  return (
    <ul className={styles.list}>
      {inputs.map((input) => (
        <li key={input.name} className={styles.input}>
          <span className={styles.name}>{input.name}</span>
          <Tag>{DATASET_KIND_LABELS[input.kind]}</Tag>
          <InputSource pipeline={pipeline} input={input} />
        </li>
      ))}
    </ul>
  );
}

function InputSource({ pipeline, input }: { pipeline: Pipeline; input: Dataset }) {
  if (input.kind === DatasetKind.External) {
    return (
      <a href={input.url} target="_blank" rel="noreferrer">
        {input.url}
      </a>
    );
  }

  const producer = datasetProducer(pipeline, input.name);

  return (
    producer && (
      <span className={styles.source}>
        from <Link href={`/pipeline/${producer.id}`}>{producer.name}</Link>
      </span>
    )
  );
}
