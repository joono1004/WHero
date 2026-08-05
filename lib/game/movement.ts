import { hexEquals, hexKey, hexNeighborsWithinBounds } from "./hex.ts";
import type { HexCoordinate, MapBounds } from "./hex.ts";
import type { Unit } from "./unit.ts";
import type { MovementCost } from "../integration/movement-cost.ts";

// Movement rules (task 8): pure hex pathfinding on top of hex.ts's
// neighbor/bounds math. Deliberately terrain-agnostic - actual terrain
// categories live in app/world-prototype.tsx (Codex's territory) and
// haven't been agreed as a shared contract yet (see SYSTEM_LAYER.md's
// "연동 계약" section and lib/integration/README.md), so every function
// here takes a MovementCost callback (lib/integration/movement-cost.ts)
// instead of knowing about terrain itself. Whoever wires this up to the
// real map supplies a function that reads terrain-per-hex and returns its
// entry cost; until then, tests and any other caller can pass a flat
// cost-1 function.
//
// The old terrain-specialty movement bonus idea (+50% in a hero's specialty
// terrain) is gone. Heroes now move independently of units (2026-07-28 -
// the former "unit" HeroAssignment mode, and its rider-shares-movement
// synergy, were both removed), using their own fixed unitType/병과
// (hero-definition.ts's heroBaseMovement) as a plain movement budget - this
// module still doesn't know about hero specialties or terrain, only the
// movement budget it's handed, same as a unit's.

export type { MovementCost };

export type ReachableHex = { hex: HexCoordinate; costSoFar: number };

// Every hex reachable from `origin` without exceeding `movementBudget`,
// along with the cheapest cost to reach each one (uniform-cost search /
// Dijkstra - costs can vary per hex, so plain BFS isn't enough once terrain
// cost is wired in). Always includes `origin` itself at cost 0.
export function reachableHexes(
  origin: HexCoordinate,
  movementBudget: number,
  bounds: MapBounds,
  cost: MovementCost,
): ReachableHex[] {
  const bestCost = new Map<string, ReachableHex>();
  bestCost.set(hexKey(origin), { hex: origin, costSoFar: 0 });
  const frontier: ReachableHex[] = [{ hex: origin, costSoFar: 0 }];

  while (frontier.length > 0) {
    const current = popCheapest(frontier);
    // A cheaper path to this hex may have been recorded after this entry
    // was queued (lazy deletion instead of a decrease-key priority queue).
    if (current.costSoFar > (bestCost.get(hexKey(current.hex))?.costSoFar ?? Infinity)) continue;

    for (const neighbor of hexNeighborsWithinBounds(current.hex, bounds)) {
      const entryCost = cost(neighbor);
      if (entryCost === null || entryCost < 0) continue;
      const newCost = current.costSoFar + entryCost;
      if (newCost > movementBudget) continue;
      const key = hexKey(neighbor);
      const existing = bestCost.get(key);
      if (existing && existing.costSoFar <= newCost) continue;
      const entry: ReachableHex = { hex: neighbor, costSoFar: newCost };
      bestCost.set(key, entry);
      frontier.push(entry);
    }
  }

  return [...bestCost.values()];
}

// The cheapest path from `origin` to `destination` as a list of hexes
// starting with `origin` and ending with `destination` (inclusive), or null
// if `destination` can't be reached at all. Not capped by a movement
// budget - this answers "what's the best route", not "can I get there this
// turn"; check the last entry's cost against remaining movement (or use
// reachableHexes) for that.
export function shortestPath(
  origin: HexCoordinate,
  destination: HexCoordinate,
  bounds: MapBounds,
  cost: MovementCost,
): HexCoordinate[] | null {
  if (hexEquals(origin, destination)) return [origin];

  const bestCost = new Map<string, number>([[hexKey(origin), 0]]);
  const cameFrom = new Map<string, HexCoordinate>();
  const frontier: ReachableHex[] = [{ hex: origin, costSoFar: 0 }];

  while (frontier.length > 0) {
    const current = popCheapest(frontier);
    if (current.costSoFar > (bestCost.get(hexKey(current.hex)) ?? Infinity)) continue;
    if (hexEquals(current.hex, destination)) break;

    for (const neighbor of hexNeighborsWithinBounds(current.hex, bounds)) {
      const entryCost = cost(neighbor);
      if (entryCost === null || entryCost < 0) continue;
      const newCost = current.costSoFar + entryCost;
      const key = hexKey(neighbor);
      const existing = bestCost.get(key);
      if (existing !== undefined && existing <= newCost) continue;
      bestCost.set(key, newCost);
      cameFrom.set(key, current.hex);
      frontier.push({ hex: neighbor, costSoFar: newCost });
    }
  }

  if (!bestCost.has(hexKey(destination))) return null;

  const path: HexCoordinate[] = [destination];
  let cursor = destination;
  while (!hexEquals(cursor, origin)) {
    const prev = cameFrom.get(hexKey(cursor));
    if (!prev) return null;
    path.push(prev);
    cursor = prev;
  }
  return path.reverse();
}

function popCheapest(frontier: ReachableHex[]): ReachableHex {
  let bestIndex = 0;
  for (let i = 1; i < frontier.length; i += 1) {
    if (frontier[i].costSoFar < frontier[bestIndex].costSoFar) bestIndex = i;
  }
  return frontier.splice(bestIndex, 1)[0];
}

// Moves a unit along a precomputed path (typically from shortestPath),
// deducting the path's total entry cost from movementRemaining. Throws
// rather than silently clamping if the path doesn't start at the unit's
// current position, skips to a non-neighboring hex, crosses an impassable
// hex, or costs more than the unit has left - the UI is expected to only
// offer moves built from reachableHexes/shortestPath against this same
// unit and cost function, so any of those indicate a caller bug.
export function moveUnit(unit: Unit, path: HexCoordinate[], bounds: MapBounds, cost: MovementCost): Unit {
  if (path.length === 0 || !hexEquals(path[0], unit.position)) {
    throw new Error(`path must start at unit ${unit.id}'s current position`);
  }

  let totalCost = 0;
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    if (!hexNeighborsWithinBounds(from, bounds).some((neighbor) => hexEquals(neighbor, to))) {
      throw new Error(`path step ${i} (${hexKey(to)}) is not a neighbor of ${hexKey(from)}`);
    }
    const entryCost = cost(to);
    if (entryCost === null) {
      throw new Error(`path step ${i} (${hexKey(to)}) is not passable`);
    }
    totalCost += entryCost;
  }

  if (totalCost > unit.movementRemaining) {
    throw new Error(
      `path costs ${totalCost} but unit ${unit.id} only has ${unit.movementRemaining} movement remaining`,
    );
  }

  return {
    ...unit,
    position: path[path.length - 1],
    movementRemaining: unit.movementRemaining - totalCost,
  };
}
