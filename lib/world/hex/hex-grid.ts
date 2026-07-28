import * as THREE from "three";
import { HEX_SIZE, HEX_WIDTH, type MapRuntimeConfig } from "../config/map-config";
import type { HexCoordinate, WorldPosition } from "../model/world-map";

export function hexCenterAt(
  row: number,
  column: number,
  config: MapRuntimeConfig,
): WorldPosition {
  return {
    x:
      -config.width / 2 +
      HEX_WIDTH / 2 +
      column * HEX_WIDTH +
      (row % 2) * (HEX_WIDTH / 2),
    z: -config.depth / 2 + HEX_SIZE + row * 1.5 * HEX_SIZE,
  };
}

export function hexCoordinatesAt(
  x: number,
  z: number,
  config: MapRuntimeConfig,
): HexCoordinate {
  const row = THREE.MathUtils.clamp(
    Math.round((z + config.depth / 2 - HEX_SIZE) / (1.5 * HEX_SIZE)),
    0,
    config.rows - 1,
  );
  const rowOffset = (row % 2) * (HEX_WIDTH / 2);
  const column = THREE.MathUtils.clamp(
    Math.round(
      (x + config.width / 2 - HEX_WIDTH / 2 - rowOffset) / HEX_WIDTH,
    ),
    0,
    config.columns - 1,
  );
  return { row, column };
}

export function isInsideMap(
  row: number,
  column: number,
  config: MapRuntimeConfig,
) {
  if (
    row < 0 ||
    row >= config.rows ||
    column < 0 ||
    column >= config.columns
  ) {
    return false;
  }
  const center = hexCenterAt(row, column, config);
  return (
    Math.abs(center.x) <= config.width / 2 &&
    Math.abs(center.z) <= config.depth / 2
  );
}

export function neighborsOf(row: number, column: number) {
  const diagonal = row % 2 === 0 ? -1 : 1;
  return [
    [row, column - 1],
    [row, column + 1],
    [row - 1, column],
    [row + 1, column],
    [row - 1, column + diagonal],
    [row + 1, column + diagonal],
  ] as const;
}

export function hexKey(row: number, column: number) {
  return `${row}:${column}`;
}
