import { Collapsible } from "@/components/ui/Collapsible";
import { fetchViewDefinition } from "@/lib/view-definition";
import styles from "./ViewDefinition.module.css";

/** A view's SQL, read live from PostgreSQL and collapsed until opened. */
export async function ViewDefinition({ name }: { name: string }) {
  const definition = await fetchViewDefinition(name);

  switch (definition.outcome) {
    case "sql":
      return (
        <div className={styles.definition}>
          <Collapsible summary="SQL">
            <pre className={styles.sql}>
              <code>{definition.sql}</code>
            </pre>
          </Collapsible>
        </div>
      );
    case "missing":
      // The view's dataset section already says it doesn't exist yet.
      return null;
    case "hidden":
      return (
        <p className={styles.note}>
          PostgreSQL only shows a view's SQL to its owner.
        </p>
      );
    case "error":
      return (
        <p className={styles.error}>Couldn't load the SQL: {definition.message}</p>
      );
  }
}
