import type { Status } from "@bsotd/pipeline/core";

import { STATUS_LABELS } from "./labels";
import styles from "./StatusBadge.module.css";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={styles.badge} data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}
