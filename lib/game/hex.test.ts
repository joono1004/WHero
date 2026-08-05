import assert from "node:assert/strict";
import test from "node:test";
import {
  hexDistance,
  hexEquals,
  hexKey,
  hexNeighbors,
  hexNeighborsWithinBounds,
  isWithinBounds,
} from "./hex.ts";

test("hexKey produces a stable, unique identifier", () => {
  assert.equal(hexKey({ row: 3, column: 5 }), "3:5");
  assert.notEqual(hexKey({ row: 3, column: 5 }), hexKey({ row: 5, column: 3 }));
});

test("hexEquals compares by value", () => {
  assert.ok(hexEquals({ row: 2, column: 4 }, { row: 2, column: 4 }));
  assert.ok(!hexEquals({ row: 2, column: 4 }, { row: 4, column: 2 }));
});

test("isWithinBounds rejects coordinates outside the map", () => {
  const bounds = { rows: 10, columns: 12 };
  assert.ok(isWithinBounds({ row: 0, column: 0 }, bounds));
  assert.ok(isWithinBounds({ row: 9, column: 11 }, bounds));
  assert.ok(!isWithinBounds({ row: -1, column: 0 }, bounds));
  assert.ok(!isWithinBounds({ row: 0, column: 12 }, bounds));
  assert.ok(!isWithinBounds({ row: 10, column: 0 }, bounds));
});

test("hexNeighbors returns six neighbors matching the odd-r offset layout", () => {
  const evenRowNeighbors = hexNeighbors({ row: 4, column: 4 });
  assert.deepEqual(
    new Set(evenRowNeighbors.map(hexKey)),
    new Set([
      "4:3",
      "4:5",
      "3:4",
      "5:4",
      "3:3",
      "5:3",
    ]),
  );

  const oddRowNeighbors = hexNeighbors({ row: 5, column: 4 });
  assert.deepEqual(
    new Set(oddRowNeighbors.map(hexKey)),
    new Set([
      "5:3",
      "5:5",
      "4:4",
      "6:4",
      "4:5",
      "6:5",
    ]),
  );
});

test("hexNeighbors is symmetric: if b is a neighbor of a, a is a neighbor of b", () => {
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const origin = { row, column };
      for (const neighbor of hexNeighbors(origin)) {
        const back = hexNeighbors(neighbor).some((candidate) => hexEquals(candidate, origin));
        assert.ok(back, `expected ${hexKey(neighbor)} to list ${hexKey(origin)} as a neighbor`);
      }
    }
  }
});

test("hexNeighborsWithinBounds filters out-of-map neighbors", () => {
  const bounds = { rows: 3, columns: 3 };
  const corner = hexNeighborsWithinBounds({ row: 0, column: 0 }, bounds);
  assert.ok(corner.every((hex) => isWithinBounds(hex, bounds)));
  assert.ok(corner.length < hexNeighbors({ row: 0, column: 0 }).length);
});

test("hexDistance is zero for the same hex", () => {
  assert.equal(hexDistance({ row: 4, column: 4 }, { row: 4, column: 4 }), 0);
});

test("hexDistance is one for every direct neighbor", () => {
  const origin = { row: 4, column: 4 };
  for (const neighbor of hexNeighbors(origin)) {
    assert.equal(hexDistance(origin, neighbor), 1);
  }
});

test("hexDistance is symmetric", () => {
  const a = { row: 1, column: 2 };
  const b = { row: 6, column: 7 };
  assert.equal(hexDistance(a, b), hexDistance(b, a));
});
