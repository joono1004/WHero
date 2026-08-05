import assert from "node:assert/strict";
import test from "node:test";
import { hexDistance, hexEquals, hexKey, isWithinBounds } from "./hex.ts";
import type { HexCoordinate, MapBounds } from "./hex.ts";
import { moveUnit, reachableHexes, shortestPath } from "./movement.ts";
import type { Unit } from "./unit.ts";

const BOUNDS: MapBounds = { rows: 9, columns: 9 };
const ORIGIN: HexCoordinate = { row: 4, column: 4 };

const flatCost = (hex: HexCoordinate) => (isWithinBounds(hex, BOUNDS) ? 1 : null);

function blockedCost(...blocked: HexCoordinate[]) {
  const blockedKeys = new Set(blocked.map(hexKey));
  return (hex: HexCoordinate) => (blockedKeys.has(hexKey(hex)) ? null : 1);
}

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    factionId: "faction-1",
    unitType: "infantry",
    position: ORIGIN,
    stats: { attack: 1, defense: 1, maxHealth: 10, movement: 3, range: null },
    health: 10,
    movementRemaining: 3,
    ...overrides,
  };
}

test("reachableHexes always includes the origin at cost 0", () => {
  const result = reachableHexes(ORIGIN, 2, BOUNDS, flatCost);
  const originEntry = result.find((entry) => hexEquals(entry.hex, ORIGIN));
  assert.ok(originEntry);
  assert.equal(originEntry?.costSoFar, 0);
});

test("reachableHexes with uniform cost-1 matches hex distance within budget", () => {
  const budget = 2;
  const result = reachableHexes(ORIGIN, budget, BOUNDS, flatCost);
  const resultKeys = new Set(result.map((entry) => hexKey(entry.hex)));

  for (let row = 0; row < BOUNDS.rows; row += 1) {
    for (let column = 0; column < BOUNDS.columns; column += 1) {
      const hex = { row, column };
      const withinBudget = hexDistance(ORIGIN, hex) <= budget;
      assert.equal(resultKeys.has(hexKey(hex)), withinBudget, `mismatch at ${hexKey(hex)}`);
    }
  }
});

test("reachableHexes reports the correct cheapest cost for each hex", () => {
  const result = reachableHexes(ORIGIN, 2, BOUNDS, flatCost);
  for (const entry of result) {
    assert.equal(entry.costSoFar, hexDistance(ORIGIN, entry.hex));
  }
});

test("reachableHexes excludes hexes outside the movement budget", () => {
  const result = reachableHexes(ORIGIN, 1, BOUNDS, flatCost);
  assert.ok(result.every((entry) => hexDistance(ORIGIN, entry.hex) <= 1));
  assert.ok(!result.some((entry) => hexDistance(ORIGIN, entry.hex) > 1));
});

test("reachableHexes routes around an impassable hex instead of stopping short", () => {
  // (row-2, col) sits at hex distance 2 from origin with two independent
  // 2-step shortest paths (through (row-1, col) or through (row-1, col-1)
  // for this even-row origin) - blocking one still leaves the other.
  const target = { row: ORIGIN.row - 2, column: ORIGIN.column };
  const oneRoute = { row: ORIGIN.row - 1, column: ORIGIN.column };
  const cost = blockedCost(oneRoute);
  const result = reachableHexes(ORIGIN, 2, BOUNDS, cost);
  const targetEntry = result.find((entry) => hexEquals(entry.hex, target));
  assert.ok(targetEntry, "expected a detour route to reach the target within budget");
});

test("reachableHexes never returns a hex fully sealed off by impassable neighbors", () => {
  const sealed = { row: ORIGIN.row, column: ORIGIN.column + 1 };
  // Block every neighbor's approach by making the seal itself impassable.
  const cost = blockedCost(sealed);
  const result = reachableHexes(ORIGIN, 5, BOUNDS, cost);
  assert.ok(!result.some((entry) => hexEquals(entry.hex, sealed)));
});

test("shortestPath from a hex to itself is just that hex", () => {
  assert.deepEqual(shortestPath(ORIGIN, ORIGIN, BOUNDS, flatCost), [ORIGIN]);
});

test("shortestPath starts at origin and ends at destination", () => {
  const destination = { row: ORIGIN.row + 2, column: ORIGIN.column + 1 };
  const path = shortestPath(ORIGIN, destination, BOUNDS, flatCost);
  assert.ok(path);
  assert.deepEqual(path?.[0], ORIGIN);
  assert.deepEqual(path?.[path.length - 1], destination);
});

test("shortestPath with uniform cost has length equal to hex distance + 1", () => {
  const destination = { row: ORIGIN.row + 3, column: ORIGIN.column - 2 };
  const path = shortestPath(ORIGIN, destination, BOUNDS, flatCost);
  assert.ok(path);
  assert.equal((path?.length ?? 0) - 1, hexDistance(ORIGIN, destination));
});

test("shortestPath's consecutive steps are always neighbors", () => {
  const destination = { row: ORIGIN.row - 3, column: ORIGIN.column + 4 };
  const path = shortestPath(ORIGIN, destination, BOUNDS, flatCost);
  assert.ok(path);
  for (let i = 1; i < (path?.length ?? 0); i += 1) {
    assert.equal(hexDistance(path![i - 1], path![i]), 1);
  }
});

test("shortestPath returns null when the destination is completely walled off", () => {
  const destination = { row: ORIGIN.row, column: ORIGIN.column + 1 };
  const wallCost: typeof flatCost = (hex) =>
    hexEquals(hex, destination) ? null : flatCost(hex);
  // Wall off every approach to the destination by making the destination
  // itself impassable - trivially unreachable.
  assert.equal(shortestPath(ORIGIN, destination, BOUNDS, wallCost), null);
});

test("shortestPath returns null for a destination outside the map bounds", () => {
  const destination = { row: -1, column: -1 };
  assert.equal(shortestPath(ORIGIN, destination, BOUNDS, flatCost), null);
});

test("moveUnit deducts the path's total cost and updates position", () => {
  const unit = makeUnit({ movementRemaining: 3 });
  const path = [ORIGIN, { row: ORIGIN.row, column: ORIGIN.column + 1 }, { row: ORIGIN.row, column: ORIGIN.column + 2 }];
  const moved = moveUnit(unit, path, BOUNDS, flatCost);
  assert.deepEqual(moved.position, { row: ORIGIN.row, column: ORIGIN.column + 2 });
  assert.equal(moved.movementRemaining, 1);
});

test("moveUnit throws if the path doesn't start at the unit's position", () => {
  const unit = makeUnit();
  const path = [{ row: 0, column: 0 }, { row: 0, column: 1 }];
  assert.throws(() => moveUnit(unit, path, BOUNDS, flatCost));
});

test("moveUnit throws if a path step isn't a neighbor of the previous one", () => {
  const unit = makeUnit();
  const path = [ORIGIN, { row: ORIGIN.row + 5, column: ORIGIN.column + 5 }];
  assert.throws(() => moveUnit(unit, path, BOUNDS, flatCost));
});

test("moveUnit throws if the path crosses an impassable hex", () => {
  const unit = makeUnit();
  const blocked = { row: ORIGIN.row, column: ORIGIN.column + 1 };
  const path = [ORIGIN, blocked];
  assert.throws(() => moveUnit(unit, path, BOUNDS, blockedCost(blocked)));
});

test("moveUnit throws if the path costs more than the unit's remaining movement", () => {
  const unit = makeUnit({ movementRemaining: 1 });
  const path = [ORIGIN, { row: ORIGIN.row, column: ORIGIN.column + 1 }, { row: ORIGIN.row, column: ORIGIN.column + 2 }];
  assert.throws(() => moveUnit(unit, path, BOUNDS, flatCost));
});

test("moveUnit leaves the unit unchanged (pure function) when it doesn't throw", () => {
  const unit = makeUnit({ movementRemaining: 3 });
  const path = [ORIGIN, { row: ORIGIN.row, column: ORIGIN.column + 1 }];
  moveUnit(unit, path, BOUNDS, flatCost);
  assert.equal(unit.movementRemaining, 3);
  assert.deepEqual(unit.position, ORIGIN);
});

test("moveUnit respects a per-hex movement cost higher than 1", () => {
  const unit = makeUnit({ movementRemaining: 3 });
  const costly = { row: ORIGIN.row, column: ORIGIN.column + 1 };
  const cost = (hex: HexCoordinate) => (hexEquals(hex, costly) ? 3 : 1);
  const path = [ORIGIN, costly];
  const moved = moveUnit(unit, path, BOUNDS, cost);
  assert.equal(moved.movementRemaining, 0);
});
