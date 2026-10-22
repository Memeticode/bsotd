export interface DagEdge {
  from: string;
  to: string;
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

export interface RoutedEdge extends DagEdge {
  /** SVG path data for the edge. */
  path: string;
}

export interface DagLayout {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  nodes: PositionedNode[];
  edges: RoutedEdge[];
}

export interface DagSizing {
  nodeWidth: number;
  nodeHeight: number;
  columnGap: number;
  rowGap: number;
  /** Space around the graph, e.g. for focus outlines. */
  padding: number;
}

const DEFAULT_SIZING: DagSizing = {
  nodeWidth: 136,
  nodeHeight: 60,
  columnGap: 16,
  rowGap: 28,
  padding: 8,
};

/**
 * Lays a DAG out top to bottom. Each node sits one row below its lowest
 * parent, rows are centred, and nodes keep their given order within a row.
 * Edges that skip a row are drawn straight through it.
 */
export function layoutDag(
  nodeIds: string[],
  edges: DagEdge[],
  sizing: DagSizing = DEFAULT_SIZING,
): DagLayout {
  const { nodeWidth, nodeHeight, columnGap, rowGap, padding } = sizing;

  if (nodeIds.length === 0) {
    return { width: 0, height: 0, nodeWidth, nodeHeight, nodes: [], edges: [] };
  }

  const ranks = rankNodes(nodeIds, edges);
  const rows: string[][] = [];

  for (const id of nodeIds) {
    const rank = ranks.get(id) ?? 0;
    rows[rank] = [...(rows[rank] ?? []), id];
  }

  const widestRow = Math.max(...rows.map((row) => row.length));
  const width = widestRow * nodeWidth + (widestRow - 1) * columnGap + 2 * padding;
  const height = rows.length * nodeHeight + (rows.length - 1) * rowGap + 2 * padding;

  const nodes = rows.flatMap((row, rank) => {
    const rowWidth = row.length * nodeWidth + (row.length - 1) * columnGap;
    const left = (width - rowWidth) / 2;

    return row.map((id, column) => ({
      id,
      x: left + column * (nodeWidth + columnGap),
      y: padding + rank * (nodeHeight + rowGap),
    }));
  });

  const positions = new Map(nodes.map((node) => [node.id, node]));

  const routedEdges = edges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);

    if (from === undefined || to === undefined) {
      throw new Error(`Edge ${edge.from} -> ${edge.to} joins an unknown node.`);
    }

    // From the bottom centre of the parent to the top centre of the child.
    const x1 = from.x + nodeWidth / 2;
    const y1 = from.y + nodeHeight;
    const x2 = to.x + nodeWidth / 2;
    const y2 = to.y;
    const bend = (y2 - y1) / 2;

    return {
      ...edge,
      path: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
    };
  });

  return { width, height, nodeWidth, nodeHeight, nodes, edges: routedEdges };
}

/** Each node's rank is the length of the longest path leading to it. */
function rankNodes(nodeIds: string[], edges: DagEdge[]): Map<string, number> {
  const parents = new Map(nodeIds.map((id) => [id, [] as string[]]));

  for (const edge of edges) {
    parents.get(edge.to)?.push(edge.from);
  }

  const ranks = new Map<string, number>();
  const visiting = new Set<string>();

  const rank = (id: string): number => {
    const known = ranks.get(id);

    if (known !== undefined) {
      return known;
    }

    if (visiting.has(id)) {
      throw new Error(`The graph has a cycle through "${id}".`);
    }

    visiting.add(id);
    const parentRanks = (parents.get(id) ?? []).map(rank);
    const result = parentRanks.length === 0 ? 0 : Math.max(...parentRanks) + 1;
    visiting.delete(id);

    ranks.set(id, result);
    return result;
  };

  nodeIds.forEach(rank);
  return ranks;
}
