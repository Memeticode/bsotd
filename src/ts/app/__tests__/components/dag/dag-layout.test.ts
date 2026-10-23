import assert from "node:assert/strict";
import { test } from "node:test";

import { layoutDag, type DagSizing } from "../../../src/components/dag/dag-layout.ts";

const sizing: DagSizing = {
  nodeWidth: 100,
  nodeHeight: 40,
  columnGap: 10,
  rowGap: 20,
  laneGap: 8,
  padding: 5,
};

// a -> b -> d and a -> c -> d
const diamond = layoutDag(
  ["a", "b", "c", "d"],
  [
    { from: "a", to: "b" },
    { from: "a", to: "c" },
    { from: "b", to: "d" },
    { from: "c", to: "d" },
  ],
  sizing,
);

function position(id: string) {
  const node = diamond.nodes.find((n) => n.id === id);
  assert.ok(node, `node ${id} is laid out`);
  return node;
}

test("each node sits one row below its lowest parent", () => {
  assert.deepEqual(
    ["a", "b", "c", "d"].map((id) => position(id).y),
    [5, 65, 65, 125],
  );
});

test("rows are centred and keep the given order", () => {
  // The widest row holds b and c: 5 + 100 + 10 + 100 + 5.
  assert.equal(diamond.width, 220);
  assert.equal(position("b").x, 5);
  assert.equal(position("c").x, 115);
  assert.equal(position("a").x, 60);
  assert.equal(position("d").x, 60);
});

test("edges run from the bottom of the parent to the top of the child", () => {
  const edge = diamond.edges.find((e) => e.from === "a" && e.to === "b");

  assert.ok(edge);
  assert.match(edge.path, /^M 110 45 C .* 55 65$/);
});

test("edges that skip rows run down a lane beside the rows they pass", () => {
  // a -> b -> c, and a -> c skips b's row.
  const layout = layoutDag(
    ["a", "b", "c"],
    [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "a", to: "c" },
    ],
    sizing,
  );
  const skipping = layout.edges.find((e) => e.from === "a" && e.to === "c");

  // The lane clears b's right edge (5 + 100) by 8, and the graph widens by
  // the 8 it overhangs on both sides, which moves the nodes right by 8.
  assert.equal(layout.width, 126);
  assert.deepEqual(
    layout.nodes.map((node) => node.x),
    [13, 13, 13],
  );
  assert.equal(
    skipping?.path,
    "M 63 45 C 63 55, 121 55, 121 65 L 121 105 C 121 115, 63 115, 63 125",
  );
});

test("a node's skipping edges share a lane, and lanes alongside keep apart", () => {
  // a -> b -> c -> d, with a -> c, a -> d and b -> d skipping rows.
  const layout = layoutDag(
    ["a", "b", "c", "d"],
    [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "d" },
      { from: "a", to: "c" },
      { from: "a", to: "d" },
      { from: "b", to: "d" },
    ],
    sizing,
  );
  const laneOf = (from: string, to: string) =>
    Number(
      /C \S+ \S+, (\S+) /.exec(
        layout.edges.find((e) => e.from === from && e.to === to)?.path ?? "",
      )?.[1],
    );

  assert.equal(laneOf("a", "c"), laneOf("a", "d"));
  assert.equal(laneOf("b", "d"), laneOf("a", "d") + 8);
});

test("cycles are rejected", () => {
  assert.throws(
    () =>
      layoutDag(["a", "b"], [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ]),
    /cycle/,
  );
});

test("edges must join known nodes", () => {
  assert.throws(
    () => layoutDag(["a"], [{ from: "a", to: "missing" }]),
    /unknown node/,
  );
});
