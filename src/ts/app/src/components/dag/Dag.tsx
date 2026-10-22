import type { ReactNode } from "react";

import type { DagLayout } from "./dag-layout";
import styles from "./Dag.module.css";

interface DagProps {
  layout: DagLayout;
  /** Edges to and from this node are highlighted. */
  activeId?: string | null;
  renderNode: (id: string) => ReactNode;
}

/** Draws a laid-out DAG: curved edges underneath, caller-rendered nodes on top. */
export function Dag({ layout, activeId, renderNode }: DagProps) {
  const isActive = (edge: { from: string; to: string }) =>
    edge.from === activeId || edge.to === activeId;

  return (
    <div
      className={styles.canvas}
      style={{ width: layout.width, height: layout.height }}
    >
      <svg
        className={styles.edges}
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <defs>
          <ArrowMarker id="dag-arrow" className={styles.arrow} />
          <ArrowMarker id="dag-arrow-active" className={styles.activeArrow} />
        </defs>
        {layout.edges.map((edge) => (
          <path
            key={`${edge.from}->${edge.to}`}
            d={edge.path}
            className={isActive(edge) ? styles.activeEdge : styles.edge}
            markerEnd={`url(#${isActive(edge) ? "dag-arrow-active" : "dag-arrow"})`}
          />
        ))}
      </svg>
      {layout.nodes.map((node) => (
        <div
          key={node.id}
          className={styles.node}
          style={{
            left: node.x,
            top: node.y,
            width: layout.nodeWidth,
            height: layout.nodeHeight,
          }}
        >
          {renderNode(node.id)}
        </div>
      ))}
    </div>
  );
}

function ArrowMarker({ id, className }: { id: string; className: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="7"
      markerHeight="7"
      orient="auto"
    >
      <path d="M 0 0 L 8 4 L 0 8 z" className={className} />
    </marker>
  );
}
