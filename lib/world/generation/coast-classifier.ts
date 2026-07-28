import * as THREE from "three";
import {
  BEACH_LOGICAL_EDGE,
  SHORELINE,
  type MapRuntimeConfig,
} from "../config/map-config";
import {
  hexCenterAt,
  isInsideMap,
  neighborsOf,
} from "../hex/hex-grid";
import type {
  CoastCell,
  CoastKind,
  WaterBodyIndex,
} from "../model/world-map";

export type LandValueSampler = (seed: number, x: number, z: number) => number;

export function beachRegionStrength(
  seed: number,
  x: number,
  z: number,
) {
  const region =
    Math.sin(x * 0.17 + seed * 0.00019) +
    Math.cos(z * 0.14 - seed * 0.00023) +
    Math.sin((x + z) * 0.075 + seed * 0.00011) * 0.45;
  return 1 - THREE.MathUtils.smoothstep(region, 0.52, 0.92);
}

export function createWaterBodyIndex(
  seed: number,
  config: MapRuntimeConfig,
  sampleLand: LandValueSampler,
): WaterBodyIndex {
  const result: WaterBodyIndex = new Map();
  const visited = new Set<string>();

  for (let row = 0; row < config.rows; row += 1) {
    for (let column = 0; column < config.columns; column += 1) {
      const startKey = `${row}:${column}`;
      if (
        visited.has(startKey) ||
        !isInsideMap(row, column, config)
      ) {
        continue;
      }
      const start = hexCenterAt(row, column, config);
      if (sampleLand(seed, start.x, start.z) >= SHORELINE) continue;

      const queue: [number, number][] = [[row, column]];
      const bodyKeys: string[] = [];
      let ocean = false;
      visited.add(startKey);

      while (queue.length > 0) {
        const [currentRow, currentColumn] = queue.shift()!;
        bodyKeys.push(`${currentRow}:${currentColumn}`);

        for (const [neighborRow, neighborColumn] of neighborsOf(
          currentRow,
          currentColumn,
        )) {
          if (!isInsideMap(neighborRow, neighborColumn, config)) {
            ocean = true;
            continue;
          }
          const key = `${neighborRow}:${neighborColumn}`;
          if (visited.has(key)) continue;
          const center = hexCenterAt(neighborRow, neighborColumn, config);
          if (sampleLand(seed, center.x, center.z) >= SHORELINE) continue;
          visited.add(key);
          queue.push([neighborRow, neighborColumn]);
        }
      }

      const body = { size: bodyKeys.length, ocean };
      bodyKeys.forEach((key) => result.set(key, body));
    }
  }

  return result;
}

function adjacentWaterBody(
  row: number,
  column: number,
  waterBodies: WaterBodyIndex,
) {
  for (const [neighborRow, neighborColumn] of neighborsOf(row, column)) {
    const body = waterBodies.get(`${neighborRow}:${neighborColumn}`);
    if (body) return body;
  }
  return waterBodies.get(`${row}:${column}`);
}

export function coastKindAt(
  seed: number,
  row: number,
  column: number,
  config: MapRuntimeConfig,
  sampleLand: LandValueSampler,
  waterBodies: WaterBodyIndex,
): CoastKind {
  const center = hexCenterAt(row, column, config);
  const land = sampleLand(seed, center.x, center.z) >= SHORELINE;
  const touchesOppositeTerrain = neighborsOf(row, column).some(
    ([neighborRow, neighborColumn]) => {
      if (!isInsideMap(neighborRow, neighborColumn, config)) return false;
      const neighbor = hexCenterAt(neighborRow, neighborColumn, config);
      return (sampleLand(seed, neighbor.x, neighbor.z) >= SHORELINE) !== land;
    },
  );

  if (land && touchesOppositeTerrain) {
    const body = adjacentWaterBody(row, column, waterBodies);
    const largeEnough = body ? body.ocean || body.size >= 36 : false;
    const closeEnoughToWater =
      sampleLand(seed, center.x, center.z) <= BEACH_LOGICAL_EDGE;
    const beachAllowed = beachRegionStrength(seed, center.x, center.z) > 0.35;
    return largeEnough && closeEnoughToWater && beachAllowed
      ? "beach"
      : "cliff";
  }
  if (land) return "land";
  return touchesOppositeTerrain ? "shallow" : "deep";
}

export function classifyCoastHexes(
  seed: number,
  config: MapRuntimeConfig,
  sampleLand: LandValueSampler,
) {
  const cells: CoastCell[] = [];
  const counts: Record<CoastKind, number> = {
    land: 0,
    beach: 0,
    cliff: 0,
    shallow: 0,
    deep: 0,
  };
  const waterBodies = createWaterBodyIndex(seed, config, sampleLand);

  for (let row = 0; row < config.rows; row += 1) {
    for (let column = 0; column < config.columns; column += 1) {
      if (!isInsideMap(row, column, config)) continue;
      const center = hexCenterAt(row, column, config);
      const kind = coastKindAt(
        seed,
        row,
        column,
        config,
        sampleLand,
        waterBodies,
      );
      cells.push({ row, column, ...center, kind });
      counts[kind] += 1;
    }
  }

  return { cells, counts };
}
