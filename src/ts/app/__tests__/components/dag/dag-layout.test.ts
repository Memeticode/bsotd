import assert from "node:assert/strict";
import { test } from "node:test";

import { layoutDag, type DagSizing } from "../../../src/components/dag/dag-layout.ts";

const sizing: DagSizing = {
  nodeWidth: 100,
  nodeHeight: 40,
  columnGap: 10,
  rowGap: 20,
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
