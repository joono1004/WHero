import { hexKey, neighborsOf } from "../hex/hex-grid";
import type { FactionVisualId } from "./faction-visual";

export type TacticalCoordinate = {
  row: number;
  column: number;
};

export type ReachableHex = TacticalCoordinate & {
  cost: number;
};

export type AttackMode = {
  id: "melee" | "ranged";
  label: string;
  minRange: number;
  maxRange: number;
  damage: number;
};

export type TacticalSkill = {
  id: string;
  label: string;
  kind: "damage" | "heal";
  range: number;
  amount: number;
  remainingUses: number;
  maxUses: number;
};

export type TacticalActor = TacticalCoordinate & {
  id: string;
  name: string;
  kind: "hero" | "unit";
  team: "player" | "enemy";
  factionId: FactionVisualId;
  movement: number;
  remainingMovement: number;
  acted: boolean;
  hp: number;
  maxHp: number;
  attackModes: AttackMode[];
  healRange?: number;
  healAmount?: number;
  skills: TacticalSkill[];
};

export type ReachableHexOptions = {
  start: TacticalCoordinate;
  movement: number;
  rows: number;
  columns: number;
  occupied: Set<string>;
  movementCostAt: (row: number, column: number) => number | null;
};

export type MovementPathOptions = ReachableHexOptions & {
  destination: TacticalCoordinate;
};

export function reachableHexes({
  start,
  movement,
  rows,
  columns,
  occupied,
  movementCostAt,
}: ReachableHexOptions) {
  const startKey = hexKey(start.row, start.column);
  const bestCost = new Map<string, number>([[startKey, 0]]);
  const frontier: ReachableHex[] = [{ ...start, cost: 0 }];

  while (frontier.length > 0) {
    frontier.sort((left, right) => left.cost - right.cost);
    const current = frontier.shift()!;
    const currentKey = hexKey(current.row, current.column);
    if (current.cost !== bestCost.get(currentKey)) continue;

    for (const [row, column] of neighborsOf(current.row, current.column)) {
      if (row < 0 || row >= rows || column < 0 || column >= columns) continue;
      const key = hexKey(row, column);
      if (occupied.has(key) && key !== startKey) continue;
      const stepCost = movementCostAt(row, column);
      if (stepCost === null) continue;
      const nextCost = current.cost + stepCost;
      if (nextCost > movement || nextCost >= (bestCost.get(key) ?? Infinity)) {
        continue;
      }
      bestCost.set(key, nextCost);
      frontier.push({ row, column, cost: nextCost });
    }
  }

  return [...bestCost.entries()]
    .filter(([key]) => key !== startKey)
    .map(([key, cost]) => {
      const [row, column] = key.split(":").map(Number);
      return { row, column, cost };
    });
}

export function findMovementPath({
  start,
  destination,
  movement,
  rows,
  columns,
  occupied,
  movementCostAt,
}: MovementPathOptions): ReachableHex[] {
  const startKey = hexKey(start.row, start.column);
  const destinationKey = hexKey(destination.row, destination.column);
  const bestCost = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, string>();
  const frontier: ReachableHex[] = [{ ...start, cost: 0 }];

  while (frontier.length > 0) {
    frontier.sort((left, right) => left.cost - right.cost);
    const current = frontier.shift()!;
    const currentKey = hexKey(current.row, current.column);
    if (current.cost !== bestCost.get(currentKey)) continue;
    if (currentKey === destinationKey) break;

    for (const [row, column] of neighborsOf(current.row, current.column)) {
      if (row < 0 || row >= rows || column < 0 || column >= columns) continue;
      const key = hexKey(row, column);
      if (occupied.has(key) && key !== startKey) continue;
      const stepCost = movementCostAt(row, column);
      if (stepCost === null) continue;
      const nextCost = current.cost + stepCost;
      if (nextCost > movement || nextCost >= (bestCost.get(key) ?? Infinity)) {
        continue;
      }
      bestCost.set(key, nextCost);
      previous.set(key, currentKey);
      frontier.push({ row, column, cost: nextCost });
    }
  }

  if (!bestCost.has(destinationKey)) return [];

  const path: ReachableHex[] = [];
  let key = destinationKey;
  while (true) {
    const [row, column] = key.split(":").map(Number);
    path.push({ row, column, cost: bestCost.get(key) ?? 0 });
    if (key === startKey) break;
    const parent = previous.get(key);
    if (!parent) return [];
    key = parent;
  }

  return path.reverse();
}

export function hexDistance(
  left: TacticalCoordinate,
  right: TacticalCoordinate,
) {
  const leftQ = left.column - (left.row - (left.row & 1)) / 2;
  const rightQ = right.column - (right.row - (right.row & 1)) / 2;
  const leftX = leftQ;
  const leftZ = left.row;
  const leftY = -leftX - leftZ;
  const rightX = rightQ;
  const rightZ = right.row;
  const rightY = -rightX - rightZ;
  return Math.max(
    Math.abs(leftX - rightX),
    Math.abs(leftY - rightY),
    Math.abs(leftZ - rightZ),
  );
}

export function availableAttackModes(
  actor: Pick<TacticalActor, "attackModes" | "row" | "column">,
  target: TacticalCoordinate,
) {
  const distance = hexDistance(actor, target);
  return actor.attackModes.filter(
    (mode) => distance >= mode.minRange && distance <= mode.maxRange,
  );
}

export function attackApproachHexes(
  actor: Pick<TacticalActor, "attackModes">,
  target: TacticalCoordinate,
  reachable: ReachableHex[],
) {
  return reachable.filter((hex) =>
    actor.attackModes.some((mode) => {
      const distance = hexDistance(hex, target);
      return distance >= mode.minRange && distance <= mode.maxRange;
    }),
  );
}
