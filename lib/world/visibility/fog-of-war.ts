import { hexDistance, type TacticalCoordinate } from "../prototype/tactical-interaction";

export type FogState = "unexplored" | "explored" | "visible";

export type VisionSource = TacticalCoordinate & {
  radius: number;
};

export type VisionActorKind = "hero" | "unit";

export function visionRadiusFor(
  actorKind: VisionActorKind,
  terrainType?: string,
) {
  const baseRadius = actorKind === "hero" ? 4 : 3;
  const terrainModifier = terrainType === "hill" ? 1 : 0;
  return Math.max(1, baseRadius + terrainModifier);
}

export function outpostVisionRadius(hasStationedHero: boolean) {
  return hasStationedHero ? 5 : 4;
}

export function fogHexKey(row: number, column: number) {
  return `${row}:${column}`;
}

export function visibleHexKeys(
  sources: VisionSource[],
  rows: number,
  columns: number,
) {
  const visible = new Set<string>();

  for (const source of sources) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (hexDistance(source, { row, column }) <= source.radius) {
          visible.add(fogHexKey(row, column));
        }
      }
    }
  }

  return visible;
}

export function fogStateAt(
  row: number,
  column: number,
  visible: Set<string>,
  explored: Set<string>,
): FogState {
  const key = fogHexKey(row, column);
  if (visible.has(key)) return "visible";
  if (explored.has(key)) return "explored";
  return "unexplored";
}
