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
  /** Space between a lane and the nodes or lanes beside it. */
  laneGap: number;
  /** Space around the graph, e.g. for focus outlines. */
  padding: number;
}

const DEFAULT_SIZING: DagSizing = {
  nodeWidth: 136,
  nodeHeight: 60,
  columnGap: 16,
  rowGap: 28,
  laneGap: 12,
  padding: 8,
};

/**
 * Lays a DAG out top to bottom. Each node sits one row below its lowest
 * parent, rows are centred, and nodes keep their given order within a row.
 *
 * Edges that skip rows run down a lane to the right of the rows they pass,
 * so they don't cross behind other nodes. A node's skipping edges share one
 * lane, and the graph widens evenly on both sides to make room.
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

  const known = new Set(nodeIds);

  for (const edge of edges) {
    if (!known.has(edge.from) || !known.has(edge.to)) {
      throw new Error(`Edge ${edge.from} -> ${edge.to} joins an unknown node.`);
    }
  }

  const ranks = rankNodes(nodeIds, edges);
  const rankOf = (id: string) => ranks.get(id) ?? 0;
  const rows: string[][] = [];

  for (const id of nodeIds) {
    const rank = rankOf(id);
    rows[rank] = [...(rows[rank] ?? []), id];
  }

  const widestRow = Math.max(...rows.map((row) => row.length));
  const nodesWidth =
    widestRow * nodeWidth + (widestRow - 1) * columnGap + 2 * padding;
  const height =
    rows.length * nodeHeight + (rows.length - 1) * rowGap + 2 * padding;

  const placed = rows.flatMap((row, rank) => {
    const rowWidth = row.length * nodeWidth + (row.length - 1) * columnGap;
    const left = (nodesWidth - rowWidth) / 2;

    return row.map((id, column) => ({
      id,
      x: left + column * (nodeWidth + columnGap),
      y: padding + rank * (nodeHeight + rowGap),
    }));
  });

  const lanes = placeLanes(nodeIds, edges, rankOf, rows, placed, sizing);

  // Widen evenly on both sides so the nodes stay centred.
  const overflow = Math.max(
    0,
    ...[...lanes.values()].map((x) => x + padding - nodesWidth),
  );
  const nodes = placed.map((node) => ({ ...node, x: node.x + overflow }));
  const positions = new Map(nodes.map((node) => [node.id, node]));

  const routedEdges = edges.map((edge) => {
    const from = positions.get(edge.from)!;
    const to = positions.get(edge.to)!;

    // From the bottom centre of the parent to the top centre of the child.
    const start = { x: from.x + nodeWidth / 2, y: from.y + nodeHeight };
    const end = { x: to.x + nodeWidth / 2, y: to.y };
    const lane = lanes.get(edge.from);

    return {
      ...edge,
      path:
        rankOf(edge.to) - rankOf(edge.from) > 1 && lane !== undefined
          ? lanePath(start, end, lane + overflow, rowGap)
          : directPath(start, end),
    };
  });

  return {
    width: nodesWidth + 2 * overflow,
    height,
    nodeWidth,
    nodeHeight,
    nodes,
    edges: routedEdges,
  };
}

interface Point {
  x: number;
  y: number;
}

function directPath(start: Point, end: Point): string {
  const bend = (end.y - start.y) / 2;

  return [
    `M ${start.x} ${start.y}`,
    `C ${start.x} ${start.y + bend}, ${end.x} ${end.y - bend}, ${end.x} ${end.y}`,
  ].join(" ");
}

/** Out to the lane below the parent's row, down it, and in above the child. */
function lanePath(
  start: Point,
  end: Point,
  lane: number,
  rowGap: number,
): string {
  const half = rowGap / 2;
  const top = start.y + rowGap;

  return [
    `M ${start.x} ${start.y}`,
    `C ${start.x} ${start.y + half}, ${lane} ${start.y + half}, ${lane} ${top}`,
    `L ${lane} ${end.y - rowGap}`,
    `C ${lane} ${end.y - half}, ${end.x} ${end.y - half}, ${end.x} ${end.y}`,
  ].join(" ");
}

/**
 * The x of each lane, by the node whose skipping edges run down it. A lane
 * clears every node in the rows it passes, and any lane already beside it.
 */
function placeLanes(
  nodeIds: string[],
  edges: DagEdge[],
  rankOf: (id: string) => number,
  rows: string[][],
  nodes: PositionedNode[],
  { nodeWidth, laneGap }: DagSizing,
): Map<string, number> {
  const right = new Map(nodes.map((node) => [node.id, node.x + nodeWidth]));
  const lanes = new Map<string, number>();
  const placed: { first: number; last: number; x: number }[] = [];

  for (const id of nodeIds) {
    const targets = edges
      .filter((edge) => edge.from === id && rankOf(edge.to) - rankOf(id) > 1)
      .map((edge) => rankOf(edge.to));

    if (targets.length === 0) {
      continue;
    }

    // The rows between this node and its furthest skipping child.
    const first = rankOf(id) + 1;
    const last = Math.max(...targets) - 1;

    let x =
      Math.max(
        ...rows.slice(first, last + 1).flat().map((node) => right.get(node) ?? 0),
      ) + laneGap;

    for (const lane of placed) {
      if (lane.first <= last && first <= lane.last) {
        x = Math.max(x, lane.x + laneGap);
      }
    }

    placed.push({ first, last, x });
    lanes.set(id, x);
  }

  return lanes;
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
