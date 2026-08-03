"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  BEACH_FADE_START,
  BEACH_INNER_EDGE,
  BEACH_VISUAL_EDGE,
  COAST_TRANSITION_EDGE,
  createMapRuntimeConfig,
  DEEP_WATER_EDGE,
  HEX_SIZE,
  HEX_WIDTH,
  PLAIN_VISUAL_RULE,
  SEA_LEVEL,
  SHORELINE,
  type MapRuntimeConfig,
  type MapTierId,
  type MapTypeId,
} from "@/lib/world/config/map-config";
import {
  hexCenterAt as getHexCenter,
  hexCoordinatesAt as getHexCoordinates,
  isInsideMap as checkInsideMap,
  neighborsOf,
} from "@/lib/world/hex/hex-grid";
import {
  biomeNoise,
  seededHash as hash,
  terrainNoise,
} from "@/lib/world/generation/seed-noise";
import {
  beachRegionStrength,
  classifyCoastHexes as classifyCoastCells,
  coastKindAt as getCoastKind,
  createWaterBodyIndex as getWaterBodyIndex,
} from "@/lib/world/generation/coast-classifier";
import type {
  HexDiagnostic,
  SelectedHexPopup,
} from "@/lib/world/model/world-map";
import { HexInfoPopup } from "@/components/world/HexInfoPopup";
import { TerrainLegend } from "@/components/world/TerrainLegend";
import { WorldControls } from "@/components/world/WorldControls";
import { TestHeroPanel } from "@/components/world/TestHeroPanel";
import {
  TacticalActionPanel,
  type TacticalPanelCommand,
  type TacticalPanelState,
} from "@/components/world/TacticalActionPanel";
import { HERO_LOD_SAMPLES } from "@/lib/world/prototype/test-hero";
import { UNIT_VISUAL_SAMPLES } from "@/lib/world/prototype/test-unit";
import {
  availableAttackModes,
  findMovementPath,
  hexDistance,
  reachableHexes,
  type AttackMode,
  type TacticalActor,
  type TacticalSkill,
} from "@/lib/world/prototype/tactical-interaction";
import {
  fogStateAt,
  visionRadiusFor,
  visibleHexKeys,
  type VisionSource,
} from "@/lib/world/visibility/fog-of-war";

// Character art is independent from each generated world. Keep the decoded
// textures between seed changes so regenerating terrain does not decode the
// same hero and unit images again.
const CHARACTER_TEXTURE_CACHE = new Map<string, THREE.Texture>();

let ACTIVE_CONFIG: MapRuntimeConfig = createMapRuntimeConfig(
  "medium",
  "continent",
);
let MAP_WIDTH = ACTIVE_CONFIG.width;
let MAP_DEPTH = ACTIVE_CONFIG.depth;
let HEX_COLS = ACTIVE_CONFIG.columns;
let HEX_ROWS = ACTIVE_CONFIG.rows;
let ACTIVE_MAP_TYPE: MapTypeId = ACTIVE_CONFIG.mapType.id;

function applyRuntimeConfig(config: MapRuntimeConfig) {
  ACTIVE_CONFIG = config;
  MAP_WIDTH = config.width;
  MAP_DEPTH = config.depth;
  HEX_COLS = config.columns;
  HEX_ROWS = config.rows;
  ACTIVE_MAP_TYPE = config.mapType.id;
}

function configureMapTier(tierId: MapTierId) {
  const config = createMapRuntimeConfig(tierId, ACTIVE_MAP_TYPE);
  applyRuntimeConfig(config);
  return config.tier;
}

function configureMapType(mapTypeId: MapTypeId) {
  const config = createMapRuntimeConfig(ACTIVE_CONFIG.tier.id, mapTypeId);
  applyRuntimeConfig(config);
  return config.mapType;
}

function hexCenterAt(row: number, column: number) {
  return getHexCenter(row, column, ACTIVE_CONFIG);
}

function hexCoordinatesAt(x: number, z: number) {
  return getHexCoordinates(x, z, ACTIVE_CONFIG);
}

function isInsideMap(row: number, column: number) {
  return checkInsideMap(row, column, ACTIVE_CONFIG);
}

function createWaterBodyIndex(seed: number) {
  return getWaterBodyIndex(seed, ACTIVE_CONFIG, landValue);
}

function coastKindAt(
  seed: number,
  row: number,
  column: number,
  waterBodies = createWaterBodyIndex(seed),
) {
  return getCoastKind(
    seed,
    row,
    column,
    ACTIVE_CONFIG,
    landValue,
    waterBodies,
  );
}

function classifyCoastHexes(seed: number) {
  return classifyCoastCells(seed, ACTIVE_CONFIG, landValue);
}

function organicCoastalEnvelope(
  seed: number,
  x: number,
  z: number,
  mapType: "continent" | "archipelago",
) {
  const normalizedX = x / (MAP_WIDTH * 0.5);
  const normalizedZ = z / (MAP_DEPTH * 0.5);
  const exponent = mapType === "continent" ? 3.35 : 3.05;
  const superellipseDistance = Math.pow(
    Math.pow(Math.abs(normalizedX), exponent) +
      Math.pow(Math.abs(normalizedZ), exponent),
    1 / exponent,
  );
  const angle = Math.atan2(normalizedZ, normalizedX);
  const phaseA = hash(seed + 1691, 2, 3) * Math.PI * 2;
  const phaseB = hash(seed + 1692, 4, 7) * Math.PI * 2;
  const phaseC = hash(seed + 1693, 6, 11) * Math.PI * 2;
  const coastlineWobble =
    Math.sin(angle * 3 + phaseA) * 0.052 +
    Math.sin(angle * 5 + phaseB) * 0.034 +
    Math.cos(angle * 7 + phaseC) * 0.018 +
    Math.sin(normalizedX * 5.4 + normalizedZ * 3.1 + phaseB) * 0.024;
  const boundaryDetailFade =
    1 - THREE.MathUtils.smoothstep(superellipseDistance, 0.84, 0.98);
  const naturalCoastRadius =
    (mapType === "continent" ? 0.91 : 0.895) +
    coastlineWobble * boundaryDetailFade;
  return (naturalCoastRadius - superellipseDistance) * 3.2;
}

function archipelagoIslandField(seed: number, x: number, z: number) {
  const normalizedX = x / (MAP_WIDTH * 0.5);
  const normalizedZ = z / (MAP_DEPTH * 0.5);
  const anchors = [
    [-0.46, -0.45],
    [0.46, -0.43],
    [-0.45, 0.45],
    [0.45, 0.44],
  ] as const;
  const sizeProfiles = [
    // A dominant island with three noticeably smaller satellites.
    [0.485, 0.345, 0.315, 0.29],
    // Two medium islands and two smaller islands.
    [0.425, 0.405, 0.325, 0.295],
    // A gradual large-to-small composition.
    [0.46, 0.385, 0.335, 0.3],
  ] as const;
  const sizeProfile =
    sizeProfiles[
      Math.floor(hash(seed + 1761, 7, 29) * sizeProfiles.length) %
        sizeProfiles.length
    ];
  const islandSizeOrder = anchors
    .map((_, island) => island)
    .sort(
      (a, b) =>
        hash(seed + 1762, a, 31) - hash(seed + 1762, b, 31),
    );
  let strongestIsland = -4;
  let secondStrongestIsland = -4;

  anchors.forEach(([anchorX, anchorZ], island) => {
    const centerX =
      anchorX + (hash(seed + 1701, island, 3) - 0.5) * 0.008;
    const centerZ =
      anchorZ + (hash(seed + 1702, island, 5) - 0.5) * 0.008;
    const deltaX = normalizedX - centerX;
    const deltaZ = normalizedZ - centerZ;
    const sizeRank = islandSizeOrder.indexOf(island);
    const inwardRadius = sizeProfile[sizeRank];
    const outwardBlendX = THREE.MathUtils.smoothstep(
      Math.sign(anchorX) * deltaX,
      -0.045,
      0.045,
    );
    const outwardBlendZ = THREE.MathUtils.smoothstep(
      Math.sign(anchorZ) * deltaZ,
      -0.045,
      0.045,
    );
    const radiusX =
      THREE.MathUtils.lerp(inwardRadius, 0.45, outwardBlendX) +
      (hash(seed + 1731, island, 17) - 0.5) * 0.004;
    const radiusZ =
      THREE.MathUtils.lerp(inwardRadius, 0.45, outwardBlendZ) +
      (hash(seed + 1741, island, 19) - 0.5) * 0.004;
    const rotation = (hash(seed + 1746, island, 21) - 0.5) * 0.62;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const rotatedX = deltaX * cosine - deltaZ * sine;
    const rotatedZ = deltaX * sine + deltaZ * cosine;
    const exponent = 2.15 + hash(seed + 1748, island, 22) * 0.7;
    const baseDistance = Math.pow(
      Math.pow(Math.abs(rotatedX / radiusX), exponent) +
        Math.pow(Math.abs(rotatedZ / radiusZ), exponent),
      1 / exponent,
    );
    const angle = Math.atan2(rotatedZ / radiusZ, rotatedX / radiusX);
    const phase = hash(seed + 1751, island, 23) * Math.PI * 2;
    const bayAngle = hash(seed + 1753, island, 27) * Math.PI * 2 - Math.PI;
    const capeAngle = hash(seed + 1754, island, 29) * Math.PI * 2 - Math.PI;
    const angularDistance = (from: number, to: number) =>
      Math.atan2(Math.sin(from - to), Math.cos(from - to));
    const bay =
      Math.exp(-Math.pow(angularDistance(angle, bayAngle) / 0.34, 2)) *
      0.095;
    const cape =
      Math.exp(-Math.pow(angularDistance(angle, capeAngle) / 0.42, 2)) *
      0.105;
    const coastlineShape =
      Math.sin(angle * 2 + phase) * 0.065 +
      Math.sin(angle * 3 - phase * 0.72) * 0.052 +
      Math.cos(angle * 5 + phase * 0.38) * 0.028 +
      cape -
      bay;
    const distance = baseDistance / Math.max(0.78, 1 + coastlineShape);

    // Low-frequency lobes form broad peninsulas and bays, while a seeded cape
    // and inlet stop neighboring islands from sharing the same silhouette.
    const islandStrength = 1 - distance;
    if (islandStrength > strongestIsland) {
      secondStrongestIsland = strongestIsland;
      strongestIsland = islandStrength;
    } else {
      secondStrongestIsland = Math.max(secondStrongestIsland, islandStrength);
    }
  });
  const boundaryDistance = Math.max(
    Math.abs(normalizedX),
    Math.abs(normalizedZ),
  );
  const oceanFrame =
    THREE.MathUtils.smoothstep(boundaryDistance, 0.82, 0.98) * 0.9;
  const competingIslandStrength = strongestIsland - secondStrongestIsland;
  const naturalStrait =
    (1 -
      THREE.MathUtils.smoothstep(
        competingIslandStrength,
        0.025,
        0.12,
      )) *
    0.62;
  return strongestIsland - oceanFrame - naturalStrait;
}

function rawArchipelagoValue(seed: number, x: number, z: number) {
  return archipelagoIslandField(seed, x, z);
}

function rawContinentValue(seed: number, x: number, z: number) {
  const envelope = organicCoastalEnvelope(seed, x, z, "continent");
  const normalizedX = x / (MAP_WIDTH * 0.5);
  const normalizedZ = z / (MAP_DEPTH * 0.5);
  const exponent = 3.35;
  const boundaryDistance = Math.pow(
    Math.pow(Math.abs(normalizedX), exponent) +
      Math.pow(Math.abs(normalizedZ), exponent),
    1 / exponent,
  );
  const boundaryDetailFade =
    1 - THREE.MathUtils.smoothstep(boundaryDistance, 0.84, 0.98);
  const phaseA = hash(seed + 75, 1, 5) * Math.PI * 2;
  const phaseB = hash(seed + 76, 1, 6) * Math.PI * 2;
  const coastline =
    Math.sin(x * 0.31 + phaseA) * 0.07 +
    Math.cos(z * 0.34 + phaseB) * 0.065 +
    Math.sin((x - z) * 0.21 + phaseA * 0.7) * 0.04;
  return envelope + coastline * boundaryDetailFade;
}

const landRatioThresholdCache = new Map<string, number>();
function targetLandThreshold(
  seed: number,
  mapType: "continent" | "archipelago",
  targetLandRatio: number,
) {
  const cacheKey = `${mapType}:${seed}:${HEX_COLS}:${HEX_ROWS}:${targetLandRatio}`;
  const cached = landRatioThresholdCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const values: number[] = [];
  for (let row = 0; row < HEX_ROWS; row += 1) {
    for (let column = 0; column < HEX_COLS; column += 1) {
      if (!isInsideMap(row, column)) continue;
      const center = hexCenterAt(row, column);
      values.push(
        mapType === "archipelago"
          ? rawArchipelagoValue(seed, center.x, center.z)
          : rawContinentValue(seed, center.x, center.z),
      );
    }
  }
  values.sort((a, b) => a - b);
  const thresholdIndex = THREE.MathUtils.clamp(
    Math.floor(values.length * (1 - targetLandRatio)),
    0,
    Math.max(0, values.length - 1),
  );
  const threshold = values[thresholdIndex] ?? SHORELINE;
  landRatioThresholdCache.set(cacheKey, threshold);
  return threshold;
}

function landValue(seed: number, x: number, z: number) {
  if (ACTIVE_MAP_TYPE === "inland" || ACTIVE_MAP_TYPE === "highlands") {
    const broadRelief =
      Math.sin(x * 0.22 + seed * 0.00017) * 0.12 +
      Math.cos(z * 0.25 - seed * 0.00013) * 0.1 +
      Math.sin((x + z) * 0.11 + seed * 0.00021) * 0.08;
    return (ACTIVE_MAP_TYPE === "highlands" ? 0.48 : 0.42) + broadRelief;
  }

  if (ACTIVE_MAP_TYPE === "riverlands") {
    const broadRelief =
      Math.sin(x * 0.18 + seed * 0.00017) * 0.07 +
      Math.cos(z * 0.2 - seed * 0.00013) * 0.06 +
      Math.sin((x + z) * 0.09 + seed * 0.00021) * 0.05;
    const oceanAtNorth = hash(seed + 624, 2, 5) > 0.5;
    const edgeDistance = oceanAtNorth ? MAP_DEPTH / 2 - z : z + MAP_DEPTH / 2;
    const seaBandWidth = MAP_DEPTH * 0.055;
    const narrowSeaBand =
      (1 - THREE.MathUtils.smoothstep(edgeDistance, 0, seaBandWidth)) * 0.8;
    return 0.36 + broadRelief - narrowSeaBand;
  }

  if (ACTIVE_MAP_TYPE === "archipelago") {
    return rawArchipelagoValue(seed, x, z) - targetLandThreshold(seed, "archipelago", 0.7) + SHORELINE;
  }

  return rawContinentValue(seed, x, z) - targetLandThreshold(seed, "continent", 0.75) + SHORELINE;
}

function distanceToRiver(x: number, z: number, samples: THREE.Vector3[]) {
  let nearest = Infinity;
  for (const point of samples) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
  return nearest;
}

function riverWidthAt(t: number) {
  const maximumWidth = Math.min(HEX_WIDTH * 0.74, HEX_SIZE * 1.28);
  const sourceWidth = ACTIVE_MAP_TYPE === "riverlands" ? 0.42 : 0.34;
  return THREE.MathUtils.lerp(
    sourceWidth,
    maximumWidth,
    Math.pow(THREE.MathUtils.clamp(t, 0, 1), 0.82),
  );
}

function naturalLandHeight(seed: number, x: number, z: number) {
  const base = terrainNoise(seed, x, z);
  const ridge = Math.max(0, Math.sin(x * 0.22 - z * 0.12 + seed * 0.0001)) * 0.18;
  const highlandLift =
    ACTIVE_MAP_TYPE === "highlands"
      ? 0.16 + Math.max(0, Math.sin(x * 0.16 + z * 0.1)) * 0.18
      : 0;
  return base + ridge + highlandLift;
}

function nearestRiverSample(x: number, z: number, samples: THREE.Vector3[]) {
  if (samples.length === 0) {
    return {
      point: new THREE.Vector3(x, naturalLandHeight(0, x, z), z),
      index: 0,
      distance: Infinity,
      t: 0,
    };
  }
  let index = 0;
  let distance = Infinity;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const point = samples[sampleIndex];
    const candidate = Math.hypot(x - point.x, z - point.z);
    if (candidate >= distance) continue;
    index = sampleIndex;
    distance = candidate;
  }
  const samplesPerRiver = 181;
  return {
    point: samples[index],
    index,
    distance,
    t: (index % samplesPerRiver) / (samplesPerRiver - 1),
  };
}

function buildRiver(seed: number, variant = 0) {
  const riverSeed = seed + variant * 7919;
  const waterBodies = createWaterBodyIndex(seed);
  const landCandidates: { x: number; z: number; height: number }[] = [];
  const oceanMouths: { x: number; z: number }[] = [];
  const lakeGroups = new Map<WaterBody, { x: number; z: number }[]>();

  for (let row = 0; row < HEX_ROWS; row += 1) {
    for (let column = 0; column < HEX_COLS; column += 1) {
      if (!isInsideMap(row, column)) continue;
      const center = hexCenterAt(row, column);
      const body = waterBodies.get(`${row}:${column}`);
      if (body) {
        if (!body.ocean && body.size >= 6) {
          const cells = lakeGroups.get(body) ?? [];
          cells.push(center);
          lakeGroups.set(body, cells);
        }
        if (
          body.ocean &&
          neighborsOf(row, column).some(([neighborRow, neighborColumn]) => {
            if (!isInsideMap(neighborRow, neighborColumn)) return false;
            const neighbor = hexCenterAt(neighborRow, neighborColumn);
            return landValue(seed, neighbor.x, neighbor.z) >= SHORELINE;
          })
        ) {
          oceanMouths.push(center);
        }
        continue;
      }
      const coast = landValue(seed, center.x, center.z);
      if (coast < 0.24) continue;
      landCandidates.push({
        ...center,
        height: naturalLandHeight(seed, center.x, center.z) + coast * 0.22,
      });
    }
  }

  landCandidates.sort((a, b) => b.height - a.height);
  const largeLakes = [...lakeGroups.values()].sort((a, b) => b.length - a.length);
  const lakeThreshold = ACTIVE_MAP_TYPE === "riverlands" ? 0.24 : 0.52;
  const useLakeSource = largeLakes.length > 0 && hash(riverSeed + 2021, 3, 9) > lakeThreshold;
  const sourceOffset = variant * 4;
  const mountainSource =
    landCandidates[
      Math.min(
        landCandidates.length - 1,
        sourceOffset + Math.floor(hash(riverSeed + 2022, 5, 4) * 4),
      )
    ] ??
    { x: -MAP_WIDTH * 0.16, z: MAP_DEPTH * 0.2, height: 0.42 };
  const lake = useLakeSource ? largeLakes[0] : null;
  const source = lake
    ? lake.reduce((best, cell) =>
        oceanMouths.length > 0 &&
        Math.min(...oceanMouths.map((mouth) => Math.hypot(cell.x - mouth.x, cell.z - mouth.z))) <
          Math.min(...oceanMouths.map((mouth) => Math.hypot(best.x - mouth.x, best.z - mouth.z)))
          ? cell
          : best,
      )
    : mountainSource;
  const mouth =
    oceanMouths.reduce(
      (best, cell) =>
        Math.hypot(cell.x - source.x, cell.z - source.z) <
        Math.hypot(best.x - source.x, best.z - source.z)
          ? cell
          : best,
      oceanMouths[0] ?? { x: source.x, z: -MAP_DEPTH / 2 },
    );

  const direction = new THREE.Vector2(mouth.x - source.x, mouth.z - source.z);
  const length = Math.max(1, direction.length());
  direction.normalize();
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const controlPoints: THREE.Vector3[] = [];
  const pointCount = 9;
  let previousHeight = lake ? SEA_LEVEL + 0.055 : Math.max(0.28, naturalLandHeight(seed, source.x, source.z) + 0.035);
  for (let index = 0; index < pointCount; index += 1) {
    const t = index / (pointCount - 1);
    const envelope = Math.sin(Math.PI * t);
    const bend =
      (hash(riverSeed + 2030, index, 11) - 0.5) *
      Math.min(4.2, length * 0.13) *
      envelope;
    const x = THREE.MathUtils.lerp(source.x, mouth.x, t) + normal.x * bend;
    const z = THREE.MathUtils.lerp(source.z, mouth.z, t) + normal.y * bend;
    const terrainHeight = naturalLandHeight(seed, x, z) + 0.025;
    const targetHeight = THREE.MathUtils.lerp(previousHeight, SEA_LEVEL + 0.045, Math.pow(t, 1.18));
    const y =
      index === 0
        ? previousHeight
        : index === pointCount - 1
          ? SEA_LEVEL + 0.035
          : Math.max(SEA_LEVEL + 0.045, Math.min(terrainHeight, targetHeight, previousHeight - 0.012));
    previousHeight = y;
    controlPoints.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", 0.42);
  return { curve, samples: curve.getPoints(180), sourceType: lake ? "lake" : "mountain" };
}

function buildTributary(
  seed: number,
  mainCurve: THREE.CatmullRomCurve3,
  joinT: number,
  side: -1 | 1,
) {
  const join = mainCurve.getPoint(joinT);
  const tangent = mainCurve.getTangent(joinT).normalize();
  const normal = new THREE.Vector2(-tangent.z, tangent.x);
  const candidates: { x: number; z: number; height: number; score: number }[] = [];
  const fallbackCandidates: { x: number; z: number; height: number; score: number }[] = [];
  for (let row = 0; row < HEX_ROWS; row += 1) {
    for (let column = 0; column < HEX_COLS; column += 1) {
      if (!isInsideMap(row, column)) continue;
      const center = hexCenterAt(row, column);
      if (landValue(seed, center.x, center.z) < 0.22) continue;
      const offsetX = center.x - join.x;
      const offsetZ = center.z - join.z;
      const sideDistance = (offsetX * normal.x + offsetZ * normal.y) * side;
      const distance = Math.hypot(offsetX, offsetZ);
      const minimumDistance = Math.min(MAP_WIDTH, MAP_DEPTH) * 0.2;
      if (distance < minimumDistance) continue;
      const height = naturalLandHeight(seed, center.x, center.z) + landValue(seed, center.x, center.z) * 0.2;
      const score = height + sideDistance * 0.018 - Math.abs(distance - minimumDistance * 1.55) * 0.012;
      const candidate = { ...center, height, score };
      fallbackCandidates.push(candidate);
      if (sideDistance >= minimumDistance * 0.48) candidates.push(candidate);
    }
  }
  const sourcePool = candidates.length > 0 ? candidates : fallbackCandidates;
  sourcePool.sort((a, b) => b.score - a.score);
  const source = sourcePool[Math.min(sourcePool.length - 1, Math.floor(hash(seed + 2710, side, 4) * 4))];
  if (!source) return null;

  const direction = new THREE.Vector2(join.x - source.x, join.z - source.z);
  const length = Math.max(1, direction.length());
  direction.normalize();
  const bendNormal = new THREE.Vector2(-direction.y, direction.x);
  const points: THREE.Vector3[] = [];
  const pointCount = 7;
  let previousHeight = Math.max(join.y + 0.16, source.height + 0.04);
  for (let index = 0; index < pointCount; index += 1) {
    const t = index / (pointCount - 1);
    const envelope = Math.sin(Math.PI * t);
    const bend =
      (hash(seed + 2720, index, side + 2) - 0.5) *
      Math.min(3.2, length * 0.12) *
      envelope;
    const x = THREE.MathUtils.lerp(source.x, join.x, t) + bendNormal.x * bend;
    const z = THREE.MathUtils.lerp(source.z, join.z, t) + bendNormal.y * bend;
    const targetHeight = THREE.MathUtils.lerp(previousHeight, join.y + 0.012, Math.pow(t, 1.12));
    const y =
      index === pointCount - 1
        ? join.y + 0.012
        : Math.max(join.y + 0.025, Math.min(naturalLandHeight(seed, x, z) + 0.025, targetHeight));
    previousHeight = y;
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42);
}

function createRiverRibbon(curve: THREE.CatmullRomCurve3) {
  const segments = 180;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const fullWidth = riverWidthAt(t) + Math.sin(t * Math.PI * 7) * 0.018;
    for (const side of [-1, 1]) {
      const edge = point.clone().addScaledVector(normal, fullWidth * 0.5 * side);
      positions.push(edge.x, point.y, edge.z);
      uvs.push(side < 0 ? 0 : 1, t * 9);
    }
    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function heightAt(seed: number, x: number, z: number, riverSamples: THREE.Vector3[]) {
  const base = terrainNoise(seed, x, z);
  const raisedSurface = naturalLandHeight(seed, x, z);
  const land = landValue(seed, x, z);
  if (land < DEEP_WATER_EDGE) return -0.72 + terrainNoise(seed + 811, x, z) * 0.12;
  if (land < SHORELINE) {
    return THREE.MathUtils.lerp(
      -0.62,
      SEA_LEVEL - 0.018,
      THREE.MathUtils.smoothstep(land, DEEP_WATER_EDGE, SHORELINE),
    );
  }
  const naturalSurface =
    land < BEACH_INNER_EDGE
      ? THREE.MathUtils.lerp(
      SEA_LEVEL + 0.022,
      base * 0.24,
      THREE.MathUtils.smoothstep(land, SHORELINE, BEACH_INNER_EDGE),
        )
      : raisedSurface;
  const nearest = nearestRiverSample(x, z, riverSamples);
  const halfWidth = riverWidthAt(nearest.t) * 0.5;
  const outerBank = halfWidth + 0.76;
  if (nearest.distance < outerBank) {
    const bank = THREE.MathUtils.smoothstep(nearest.distance, halfWidth + 0.04, outerBank);
    return THREE.MathUtils.lerp(nearest.point.y - 0.045, naturalSurface, bank);
  }
  return naturalSurface;
}

function terrainColor(height: number, wetness: number, biome: number) {
  const dry = new THREE.Color("#d4bf78");
  const grass = new THREE.Color("#9dbb68");
  const deep = new THREE.Color("#78955d");
  const color = dry.clone().lerp(grass, THREE.MathUtils.clamp(wetness, 0, 1));
  if (biome > 0.48) color.lerp(new THREE.Color("#d7bb72"), THREE.MathUtils.smoothstep(biome, 0.48, 0.9));
  if (biome < -0.48) color.lerp(new THREE.Color("#7aa579"), THREE.MathUtils.smoothstep(-biome, 0.48, 0.9));
  if (height > 0.2) color.lerp(deep, Math.min(0.3, height));
  return color;
}

function createBeachGeometry(seed: number, riverSamples: THREE.Vector3[]) {
  const columns = Math.min(440, Math.max(220, HEX_COLS * 8));
  const rows = Math.min(350, Math.max(180, HEX_ROWS * 7));
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const waterBodies = createWaterBodyIndex(seed);
  const point = (column: number, row: number) => ({
    x: -MAP_WIDTH / 2 + (column / columns) * MAP_WIDTH,
    z: -MAP_DEPTH / 2 + (row / rows) * MAP_DEPTH,
  });
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const corners = [
        point(column, row),
        point(column + 1, row),
        point(column + 1, row + 1),
        point(column, row + 1),
      ];
      const centerX = (corners[0].x + corners[2].x) / 2;
      const centerZ = (corners[0].z + corners[2].z) / 2;
      const coast = landValue(seed, centerX, centerZ);
      if (coast < SHORELINE - 0.04 || coast > BEACH_VISUAL_EDGE + 0.035) continue;
      const nearest = hexCoordinatesAt(centerX, centerZ);
      const beachCellNearby = [
        [nearest.row, nearest.column] as const,
        ...neighborsOf(nearest.row, nearest.column),
      ].some(([row, column]) =>
        isInsideMap(row, column) && coastKindAt(seed, row, column, waterBodies) === "beach"
      );
      if (!beachCellNearby) continue;
      // Clockwise x/z winding points the face downward. Reverse it so the
      // beach is front-facing for the camera above the world.
      const triangles = [corners[0], corners[2], corners[1], corners[0], corners[3], corners[2]];
      for (const vertex of triangles) {
        const height = Math.max(
          heightAt(seed, vertex.x, vertex.z, riverSamples) + 0.065,
          SEA_LEVEL + 0.045,
        );
        positions.push(vertex.x, height, vertex.z);
        uvs.push((vertex.x + MAP_WIDTH / 2) / MAP_WIDTH, (vertex.z + MAP_DEPTH / 2) / MAP_DEPTH);
        const vertexCoast = landValue(seed, vertex.x, vertex.z);
        const inland = THREE.MathUtils.smoothstep(vertexCoast, SHORELINE, BEACH_VISUAL_EDGE);
        const sandColor = new THREE.Color("#c59b5d").lerp(new THREE.Color("#f0d69c"), inland);
        const waterFade = THREE.MathUtils.smoothstep(vertexCoast, SHORELINE - 0.025, SHORELINE);
        const landFade =
          1 - THREE.MathUtils.smoothstep(vertexCoast, BEACH_FADE_START, BEACH_VISUAL_EDGE);
        const irregularEdge =
          terrainNoise(seed + 1131, vertex.x * 2.4, vertex.z * 2.4) * 0.035;
        const naturalLandFade =
          1 - THREE.MathUtils.smoothstep(
            vertexCoast + irregularEdge,
            BEACH_FADE_START,
            BEACH_VISUAL_EDGE,
          );
        const regionFade = beachRegionStrength(seed, vertex.x, vertex.z);
        const nearestRiver = nearestRiverSample(vertex.x, vertex.z, riverSamples);
        const riverHalfWidth = riverWidthAt(nearestRiver.t) * 0.5;
        const riverMouthOpening = THREE.MathUtils.smoothstep(
          nearestRiver.distance,
          riverHalfWidth * 0.82,
          riverHalfWidth + 0.34,
        );
        const alpha = THREE.MathUtils.clamp(
          waterFade *
            Math.min(landFade, naturalLandFade) *
            regionFade *
            riverMouthOpening,
          0,
          1,
        );
        const variation = THREE.MathUtils.clamp(
          0.98 + terrainNoise(seed + 970, vertex.x * 2, vertex.z * 2) * 0.12,
          0.92,
          1.04,
        );
        colors.push(
          sandColor.r * variation,
          sandColor.g * variation,
          sandColor.b * variation,
          alpha,
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createRockyCoastGeometry(seed: number, riverSamples: THREE.Vector3[]) {
  const columns = Math.min(440, Math.max(220, HEX_COLS * 8));
  const rows = Math.min(350, Math.max(180, HEX_ROWS * 7));
  const positions: number[] = [];
  const colors: number[] = [];
  const waterBodies = createWaterBodyIndex(seed);
  const point = (column: number, row: number) => ({
    x: -MAP_WIDTH / 2 + (column / columns) * MAP_WIDTH,
    z: -MAP_DEPTH / 2 + (row / rows) * MAP_DEPTH,
  });

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const corners = [
        point(column, row),
        point(column + 1, row),
        point(column + 1, row + 1),
        point(column, row + 1),
      ];
      const centerX = (corners[0].x + corners[2].x) / 2;
      const centerZ = (corners[0].z + corners[2].z) / 2;
      const coast = landValue(seed, centerX, centerZ);
      if (coast < SHORELINE - 0.035 || coast > SHORELINE + 0.085) continue;

      const nearest = hexCoordinatesAt(centerX, centerZ);
      const rockyCellNearby = [
        [nearest.row, nearest.column] as const,
        ...neighborsOf(nearest.row, nearest.column),
      ].some(([hexRow, hexColumn]) =>
        isInsideMap(hexRow, hexColumn) &&
        coastKindAt(seed, hexRow, hexColumn, waterBodies) === "cliff"
      );
      if (!rockyCellNearby) continue;

      const triangles = [corners[0], corners[2], corners[1], corners[0], corners[3], corners[2]];
      for (const vertex of triangles) {
        const vertexCoast = landValue(seed, vertex.x, vertex.z);
        const waterFade = THREE.MathUtils.smoothstep(
          vertexCoast,
          SHORELINE - 0.026,
          SHORELINE + 0.006,
        );
        const inlandFade =
          1 - THREE.MathUtils.smoothstep(
            vertexCoast + terrainNoise(seed + 1741, vertex.x * 2.1, vertex.z * 2.1) * 0.025,
            SHORELINE + 0.022,
            SHORELINE + 0.078,
          );
        const alpha = THREE.MathUtils.clamp(waterFade * inlandFade, 0, 0.92);
        const height = Math.max(
          heightAt(seed, vertex.x, vertex.z, riverSamples) + 0.058,
          SEA_LEVEL + 0.048,
        );
        const rockColor = new THREE.Color("#80735f").lerp(
          new THREE.Color("#b79b72"),
          THREE.MathUtils.smoothstep(vertexCoast, SHORELINE, SHORELINE + 0.07),
        );
        const variation = THREE.MathUtils.clamp(
          0.92 + terrainNoise(seed + 1811, vertex.x * 2.8, vertex.z * 2.8) * 0.22,
          0.78,
          1.06,
        );
        positions.push(vertex.x, height, vertex.z);
        colors.push(
          rockColor.r * variation,
          rockColor.g * variation,
          rockColor.b * variation,
          alpha,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.computeVertexNormals();
  return geometry;
}

function createSurfGeometry(seed: number, riverSamples: THREE.Vector3[]) {
  const columns = Math.min(260, Math.max(120, HEX_COLS * 4));
  const rows = Math.min(220, Math.max(100, HEX_ROWS * 4));
  const positions: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -MAP_WIDTH / 2 + (column / columns) * MAP_WIDTH;
      const x1 = -MAP_WIDTH / 2 + ((column + 1) / columns) * MAP_WIDTH;
      const z0 = -MAP_DEPTH / 2 + (row / rows) * MAP_DEPTH;
      const z1 = -MAP_DEPTH / 2 + ((row + 1) / rows) * MAP_DEPTH;
      const coast = landValue(seed, (x0 + x1) / 2, (z0 + z1) / 2);
      if (coast < SHORELINE - 0.025 || coast > SHORELINE + 0.018) continue;
      const corners = [
        new THREE.Vector3(x0, 0, z0),
        new THREE.Vector3(x1, 0, z0),
        new THREE.Vector3(x1, 0, z1),
        new THREE.Vector3(x0, 0, z1),
      ];
      for (const vertex of [corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]]) {
        vertex.y = Math.max(
          heightAt(seed, vertex.x, vertex.z, riverSamples) + 0.055,
          SEA_LEVEL + 0.038,
        );
        positions.push(vertex.x, vertex.y, vertex.z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createShallowCoastGeometry(seed: number) {
  const columns = Math.min(440, Math.max(220, HEX_COLS * 8));
  const rows = Math.min(350, Math.max(180, HEX_ROWS * 7));
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -MAP_WIDTH / 2 + (column / columns) * MAP_WIDTH;
      const x1 = -MAP_WIDTH / 2 + ((column + 1) / columns) * MAP_WIDTH;
      const z0 = -MAP_DEPTH / 2 + (row / rows) * MAP_DEPTH;
      const z1 = -MAP_DEPTH / 2 + ((row + 1) / rows) * MAP_DEPTH;
      const coast = landValue(seed, (x0 + x1) / 2, (z0 + z1) / 2);
      if (coast < DEEP_WATER_EDGE - 0.035 || coast > SHORELINE + 0.035) continue;
      const corners = [
        { x: x0, z: z0 },
        { x: x1, z: z0 },
        { x: x1, z: z1 },
        { x: x0, z: z1 },
      ];
      const triangles = [corners[0], corners[2], corners[1], corners[0], corners[3], corners[2]];
      for (const vertex of triangles) {
        const vertexCoast = landValue(seed, vertex.x, vertex.z);
        const depth = THREE.MathUtils.smoothstep(vertexCoast, DEEP_WATER_EDGE, SHORELINE);
        const deepFade = THREE.MathUtils.smoothstep(
          vertexCoast,
          DEEP_WATER_EDGE - 0.025,
          DEEP_WATER_EDGE + 0.045,
        );
        const shoreFade =
          1 - THREE.MathUtils.smoothstep(vertexCoast, SHORELINE - 0.012, SHORELINE + 0.025);
        const alpha = THREE.MathUtils.clamp(deepFade * shoreFade * 0.82, 0, 0.82);
        const waterColor = new THREE.Color("#2d708d").lerp(new THREE.Color("#78c9c0"), depth);
        const variation = 0.96 + terrainNoise(seed + 1461, vertex.x * 1.8, vertex.z * 1.8) * 0.1;
        positions.push(vertex.x, SEA_LEVEL + 0.028, vertex.z);
        colors.push(
          waterColor.r * variation,
          waterColor.g * variation,
          waterColor.b * variation,
          alpha,
        );
        uvs.push((vertex.x + MAP_WIDTH / 2) / MAP_WIDTH, (vertex.z + MAP_DEPTH / 2) / MAP_DEPTH);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

const DEFAULT_TACTICAL_PANEL: TacticalPanelState = {
  isOpen: false,
  actorName: null,
  actorKind: null,
  message: "",
  canAttack: false,
  skills: [],
  attackChoices: [],
  skillMenuOpen: false,
  attackTargeting: false,
  canCancelMove: false,
};

const MELEE_ATTACK: AttackMode = {
  id: "melee",
  label: "근접 공격",
  minRange: 1,
  maxRange: 1,
  damage: 30,
};

function heroTacticalProfile(heroId: string) {
  const profiles: Record<
    string,
    {
      movement: number;
      attackModes: AttackMode[];
      healRange?: number;
      healAmount?: number;
      skills: TacticalSkill[];
    }
  > = {
    "guan-yu": {
      movement: 5,
      attackModes: [{ ...MELEE_ATTACK, damage: 38 }],
      skills: [
        {
          id: "green-dragon-charge",
          label: "청룡 돌파",
          kind: "damage",
          range: 2,
          amount: 58,
          remainingUses: 2,
          maxUses: 2,
        },
      ],
    },
    "huang-zhong": {
      movement: 4,
      attackModes: [
        { ...MELEE_ATTACK, damage: 16 },
        {
          id: "ranged",
          label: "원거리 공격",
          minRange: 1,
          maxRange: 3,
          damage: 34,
        },
      ],
      skills: [
        {
          id: "true-shot",
          label: "백발백중",
          kind: "damage",
          range: 4,
          amount: 55,
          remainingUses: 2,
          maxUses: 2,
        },
      ],
    },
    "wei-yan": {
      movement: 4,
      attackModes: [{ ...MELEE_ATTACK, damage: 35 }],
      skills: [
        {
          id: "ambush-charge",
          label: "기습 돌격",
          kind: "damage",
          range: 2,
          amount: 60,
          remainingUses: 2,
          maxUses: 2,
        },
      ],
    },
    "zhao-yun": {
      movement: 5,
      attackModes: [{ ...MELEE_ATTACK, damage: 32 }],
      // Temporary prototype ability used to validate future healing classes.
      healRange: 2,
      healAmount: 28,
      skills: [
        {
          id: "rescue",
          label: "구원",
          kind: "heal",
          range: 3,
          amount: 46,
          remainingUses: 2,
          maxUses: 2,
        },
      ],
    },
  };
  return profiles[heroId] ?? {
    movement: 4,
    attackModes: [MELEE_ATTACK],
    skills: [],
  };
}

function unitTacticalProfile(unitId: string) {
  if (unitId === "archer") {
    return {
      movement: 3,
      attackModes: [
        { ...MELEE_ATTACK, damage: 12 },
        {
          id: "ranged" as const,
          label: "원거리 공격",
          minRange: 1,
          maxRange: 3,
          damage: 26,
        },
      ],
    };
  }
  return {
    movement: unitId === "cavalry" ? 5 : 3,
    attackModes: [{ ...MELEE_ATTACK, damage: unitId === "cavalry" ? 34 : 24 }],
  };
}

function WorldScene({
  generationId,
  seed,
  mapTierId,
  mapTypeId,
  showGrid,
  showFog,
  onHexSelected,
  onReady,
}: {
  generationId: number;
  seed: number;
  mapTierId: MapTierId;
  mapTypeId: MapTypeId;
  showGrid: boolean;
  showFog: boolean;
  onHexSelected: (
    diagnostic: HexDiagnostic,
    pointerPosition: { x: number; y: number },
  ) => void;
  onReady: (generationId: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tacticalPanelRef = useRef<HTMLElement>(null);
  const tacticalCommandRef = useRef<(command: TacticalPanelCommand) => void>(
    () => undefined,
  );
  const endTurnRef = useRef<() => void>(() => undefined);
  const [turnNumber, setTurnNumber] = useState(1);
  const [tacticalPanel, setTacticalPanel] = useState<TacticalPanelState>(
    DEFAULT_TACTICAL_PANEL,
  );
  const handleTacticalCommand = useCallback(
    (command: TacticalPanelCommand) => tacticalCommandRef.current(command),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setTacticalPanel(DEFAULT_TACTICAL_PANEL);
    setTurnNumber(1);
    configureMapTier(mapTierId);
    configureMapType(mapTypeId);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d8e5cf");
    // Fog of war must be rendered as a per-hex exploration overlay.
    // A global scene fog would also wash out terrain the player has revealed.

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const aspect = host.clientWidth / host.clientHeight;
    const viewHeight = Math.max(38, MAP_DEPTH * 0.88);
    const camera = new THREE.OrthographicCamera(
      (-viewHeight * aspect) / 2,
      (viewHeight * aspect) / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      220,
    );
    const cameraDistanceScale = Math.max(0.9, MAP_DEPTH / 52);
    camera.position.set(
      17 * cameraDistanceScale,
      18 * cameraDistanceScale,
      19 * cameraDistanceScale,
    );
    camera.lookAt(0, 0, 0);
    camera.zoom = 0.88;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.62;
    controls.maxZoom = window.matchMedia("(max-width: 900px)").matches ? 5.5 : 4.2;
    controls.mouseButtons.LEFT = -1 as THREE.MOUSE;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = -1 as THREE.TOUCH;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.48;
    const initialCameraPosition = camera.position.clone();
    const initialCameraTarget = controls.target.clone();
    const initialCameraZoom = camera.zoom;
    const handleResetView = () => {
      camera.position.copy(initialCameraPosition);
      camera.zoom = initialCameraZoom;
      camera.updateProjectionMatrix();
      controls.target.copy(initialCameraTarget);
      controls.update();
    };
    window.addEventListener("world-map-reset-view", handleResetView);

    scene.add(new THREE.HemisphereLight("#fffbea", "#697967", 2.65));
    const sun = new THREE.DirectionalLight("#fff4cf", 3.65);
    sun.position.set(-12, 19, -9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -MAP_WIDTH * 0.58;
    sun.shadow.camera.right = MAP_WIDTH * 0.58;
    sun.shadow.camera.top = MAP_DEPTH * 0.6;
    sun.shadow.camera.bottom = -MAP_DEPTH * 0.6;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    let sceneBuildComplete = false;
    let assetsLoaded = true;
    let readyNotified = false;
    let readyFrame = 0;
    const notifyReady = () => {
      if (!sceneBuildComplete || !assetsLoaded || readyNotified) return;
      readyNotified = true;
      readyFrame = window.requestAnimationFrame(() => onReady(generationId));
    };
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onStart = () => {
      assetsLoaded = false;
    };
    loadingManager.onLoad = () => {
      assetsLoaded = true;
      notifyReady();
    };
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const loadCharacterTexture = (url: string) => {
      const cached = CHARACTER_TEXTURE_CACHE.get(url);
      if (cached) return cached;
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      CHARACTER_TEXTURE_CACHE.set(url, texture);
      return texture;
    };
    const createUnitEmblemTexture = (unitId: string, accent: string) => {
      const cacheKey = `unit-emblem-v4:${unitId}:${accent}`;
      const cached = CHARACTER_TEXTURE_CACHE.get(cacheKey);
      if (cached) return cached;

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) return loadCharacterTexture("/art/units/infantry-emblem-v1.svg");
      context.clearRect(0, 0, 256, 256);
      const metal = context.createRadialGradient(94, 76, 12, 128, 128, 120);
      metal.addColorStop(0, "#40515a");
      metal.addColorStop(0.52, "#1f2c33");
      metal.addColorStop(1, "#0a1116");
      context.fillStyle = metal;
      context.beginPath();
      context.arc(128, 128, 112, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 10;
      context.strokeStyle = "#e8c56b";
      context.stroke();
      context.lineWidth = 4;
      context.strokeStyle = "#8a672b";
      context.beginPath();
      context.arc(128, 128, 96, 0, Math.PI * 2);
      context.stroke();
      context.lineCap = "round";
      context.lineJoin = "round";
      const gold = context.createLinearGradient(96, 46, 162, 208);
      gold.addColorStop(0, "#fff1b5");
      gold.addColorStop(0.45, "#e9c45e");
      gold.addColorStop(1, "#9c6b23");
      context.strokeStyle = gold;
      context.fillStyle = gold;

      // Decorative ticks make the symbols read like a researched discipline,
      // rather than a flat mobile-game badge.
      context.lineWidth = 5;
      context.globalAlpha = 0.72;
      for (let tick = 0; tick < 4; tick += 1) {
        const angle = -Math.PI * 0.8 + tick * Math.PI * 0.53;
        context.beginPath();
        context.moveTo(128 + Math.cos(angle) * 79, 128 + Math.sin(angle) * 79);
        context.lineTo(128 + Math.cos(angle) * 89, 128 + Math.sin(angle) * 89);
        context.stroke();
      }
      context.globalAlpha = 1;

      if (unitId === "infantry") {
        // Upward blade, lower grip: an unmistakable infantry sword.
        context.beginPath();
        context.moveTo(128, 39);
        context.lineTo(153, 109);
        context.lineTo(138, 127);
        context.lineTo(138, 154);
        context.lineTo(118, 154);
        context.lineTo(118, 127);
        context.lineTo(103, 109);
        context.closePath();
        context.fill();
        context.lineWidth = 7;
        context.strokeStyle = "#fff4c8";
        context.stroke();
        context.strokeStyle = "#d9aa3d";
        context.lineWidth = 10;
        context.beginPath();
        context.moveTo(93, 158);
        context.lineTo(163, 158);
        context.stroke();
        context.lineWidth = 15;
        context.strokeStyle = "#f3d47a";
        context.beginPath();
        context.moveTo(128, 164);
        context.lineTo(128, 201);
        context.stroke();
        context.fillStyle = "#9f6a26";
        context.beginPath();
        context.arc(128, 209, 12, 0, Math.PI * 2);
        context.fill();
      } else if (unitId === "archer") {
        context.lineWidth = 12;
        context.beginPath();
        context.arc(105, 128, 63, -Math.PI / 2, Math.PI / 2);
        context.stroke();
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(105, 63);
        context.lineTo(105, 193);
        context.moveTo(71, 177);
        context.lineTo(194, 66);
        context.stroke();
        context.fillStyle = "#fff4c8";
        context.beginPath();
        context.moveTo(194, 66);
        context.lineTo(174, 72);
        context.lineTo(188, 91);
        context.closePath();
        context.fill();
      } else {
        // A simple horse-head silhouette keeps cavalry legible at a small size.
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(76, 181);
        context.quadraticCurveTo(61, 125, 91, 90);
        context.lineTo(96, 55);
        context.lineTo(121, 84);
        context.quadraticCurveTo(152, 73, 181, 101);
        context.quadraticCurveTo(199, 125, 181, 177);
        context.lineTo(153, 196);
        context.lineTo(108, 189);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = "#15282f";
        context.beginPath();
        context.arc(158, 118, 8, 0, Math.PI * 2);
        context.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      CHARACTER_TEXTURE_CACHE.set(cacheKey, texture);
      return texture;
    };
    const primaryRivers =
      ACTIVE_MAP_TYPE === "inland"
        ? []
        : ACTIVE_MAP_TYPE === "riverlands"
          ? [buildRiver(seed, 0), buildRiver(seed, 1)]
          : [buildRiver(seed, 0)];
    const riverCurves = primaryRivers.map((river) => river.curve);
    if (ACTIVE_MAP_TYPE === "riverlands" && primaryRivers[0]) {
      const firstTributary = buildTributary(seed, primaryRivers[0].curve, 0.46, -1);
      const secondTributary = buildTributary(seed, primaryRivers[0].curve, 0.63, 1);
      if (firstTributary) riverCurves.push(firstTributary);
      if (secondTributary) riverCurves.push(secondTributary);
    }
    const samples = riverCurves.flatMap((riverCurve) => riverCurve.getPoints(180));
    const terrainGeometry = new THREE.PlaneGeometry(
      MAP_WIDTH,
      MAP_DEPTH,
      Math.min(260, Math.max(132, HEX_COLS * 4)),
      Math.min(220, Math.max(110, HEX_ROWS * 4)),
    );
    terrainGeometry.rotateX(-Math.PI / 2);
    const position = terrainGeometry.attributes.position;
    const colorValues: number[] = [];
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const height = heightAt(seed, x, z, samples);
      position.setY(i, height);
      const wetness = 0.45 + terrainNoise(seed + 91, x * 1.7, z * 1.7) * 1.8;
      const biome = biomeNoise(seed, x, z);
      const color = terrainColor(height, wetness, biome);
      colorValues.push(color.r, color.g, color.b);
    }
    terrainGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colorValues, 3));
    terrainGeometry.computeVertexNormals();
    const groundTexture = textureLoader.load("/assets/terrain/ground-texture-v1.png");
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(PLAIN_VISUAL_RULE.textureRepeatX, PLAIN_VISUAL_RULE.textureRepeatZ);
    groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({
        color: PLAIN_VISUAL_RULE.baseColor,
        map: groundTexture,
        vertexColors: true,
        roughness: PLAIN_VISUAL_RULE.roughness,
        metalness: 0,
      }),
    );
    terrain.receiveShadow = true;
    worldRoot.add(terrain);

    const waterTexture = textureLoader.load("/assets/terrain/river-water-v1.png");
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1.2, 8);
    const seaTexture = waterTexture.clone();
    seaTexture.needsUpdate = true;
    seaTexture.repeat.set(5, 4);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_WIDTH + 14, MAP_DEPTH + 14),
      new THREE.MeshStandardMaterial({
        color: "#3a7f9d",
        map: seaTexture,
        roughness: 0.68,
        metalness: 0,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = SEA_LEVEL;
    sea.receiveShadow = true;
    worldRoot.add(sea);

    const shallowWater = new THREE.Mesh(
      createShallowCoastGeometry(seed),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: seaTexture,
        vertexColors: true,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: false,
        roughness: 0.62,
        metalness: 0,
      }),
    );
    shallowWater.renderOrder = 16;
    worldRoot.add(shallowWater);

    const rockyCoast = new THREE.Mesh(
      createRockyCoastGeometry(seed, samples),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        transparent: true,
        alphaTest: 0.015,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1.5,
      }),
    );
    rockyCoast.receiveShadow = true;
    rockyCoast.renderOrder = 17;
    worldRoot.add(rockyCoast);

    const sandTexture = textureLoader.load("/assets/terrain/beach-sand-real-v1.png");
    sandTexture.colorSpace = THREE.SRGBColorSpace;
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(10, 8);
    sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const beach = new THREE.Mesh(
      createBeachGeometry(seed, samples),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: sandTexture,
        vertexColors: true,
        transparent: true,
        alphaTest: 0.015,
        depthWrite: false,
        roughness: 0.98,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    beach.receiveShadow = true;
    beach.renderOrder = 18;
    worldRoot.add(beach);

    riverCurves.forEach((riverCurve) => {
      const river = new THREE.Mesh(
        createRiverRibbon(riverCurve),
        new THREE.MeshStandardMaterial({
          color: ACTIVE_MAP_TYPE === "riverlands" ? "#58a8bd" : "#5b96ac",
          map: waterTexture,
          roughness: 0.55,
          metalness: 0,
          transparent: true,
          opacity: 0.96,
        }),
      );
      river.receiveShadow = true;
      worldRoot.add(river);
    });

    type TerrainCell = {
      row: number;
      column: number;
      x: number;
      z: number;
      type: "forest" | "mountain" | "hill" | "wetland";
    };
    const terrainCells = new Map<string, TerrainCell>();
    for (let row = 0; row < HEX_ROWS; row += 1) {
      for (let column = 0; column < HEX_COLS; column += 1) {
        const { x, z } = hexCenterAt(row, column);
        if (Math.abs(x) > MAP_WIDTH / 2 || Math.abs(z) > MAP_DEPTH / 2) continue;
        if (landValue(seed, x, z) < 0.22 || distanceToRiver(x, z, samples) < 1.18) continue;
        const mountainScore =
          Math.sin(x * 0.19 - z * 0.13 + seed * 0.00031) * 0.55 +
          Math.cos(z * 0.24 + seed * 0.00019) * 0.45;
        const forestScore =
          Math.sin(x * 0.26 + z * 0.17 + seed * 0.00043) * 0.52 +
          Math.cos(x * 0.18 - z * 0.29 + seed * 0.00037) * 0.48;
        const wetlandScore =
          Math.cos(x * 0.21 + z * 0.2 + seed * 0.00053) * 0.56 +
          Math.sin(x * 0.12 - z * 0.25 + seed * 0.00047) * 0.44;
        const mountainEdge = ACTIVE_MAP_TYPE === "highlands" ? 0.36 : 0.7;
        const hillEdge = ACTIVE_MAP_TYPE === "highlands" ? 0.08 : 0.38;
        const wetlandEdge =
          ACTIVE_MAP_TYPE === "riverlands"
            ? 0.38
            : ACTIVE_MAP_TYPE === "highlands"
              ? 0.92
              : 0.72;
        if (mountainScore > mountainEdge) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "mountain" });
        else if (mountainScore > hillEdge) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "hill" });
        else if (wetlandScore > wetlandEdge) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "wetland" });
        else if (forestScore > 0.38) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "forest" });
      }
    }

    type OccupantHexMarker = {
      fill: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    };
    const occupantHexPoints = (
      cell: { x: number; z: number },
      groundHeight: number,
    ) => {
      const edgePoints: THREE.Vector3[] = [];
      for (let edge = 0; edge < 6; edge += 1) {
        const angle = (Math.PI / 180) * (60 * edge - 30);
        const x = cell.x + Math.cos(angle) * HEX_SIZE * 0.93;
        const z = cell.z + Math.sin(angle) * HEX_SIZE * 0.93;
        edgePoints.push(
          new THREE.Vector3(
            x,
            Math.max(heightAt(seed, x, z, samples) + 0.105, groundHeight + 0.105),
            z,
          ),
        );
      }
      return edgePoints;
    };
    const updateOccupantHexMarker = (
      marker: OccupantHexMarker,
      cell: { x: number; z: number },
      groundHeight: number,
    ) => {
      const edgePoints = occupantHexPoints(cell, groundHeight);
      const fillGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(21);
      positions[0] = cell.x;
      positions[1] = groundHeight + 0.104;
      positions[2] = cell.z;
      edgePoints.forEach((point, index) => {
        const offset = (index + 1) * 3;
        positions[offset] = point.x;
        positions[offset + 1] = point.y;
        positions[offset + 2] = point.z;
      });
      fillGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      fillGeometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]);
      marker.fill.geometry.dispose();
      marker.fill.geometry = fillGeometry;
      marker.outline.geometry.dispose();
      marker.outline.geometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
    };
    const addOccupantHexMarker = (
      cell: { x: number; z: number },
      groundHeight: number,
      color: THREE.ColorRepresentation,
    ): OccupantHexMarker => {
      const placeholderGeometry = new THREE.BufferGeometry();
      const fill = new THREE.Mesh(
        placeholderGeometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        }),
      );
      fill.renderOrder = 82;
      worldRoot.add(fill);

      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.94,
          depthTest: false,
          depthWrite: false,
        }),
      );
      outline.renderOrder = 83;
      worldRoot.add(outline);
      const marker = { fill, outline };
      updateOccupantHexMarker(marker, cell, groundHeight);
      return marker;
    };

    type HeroLodPair = {
      full: THREE.Sprite;
      fullOutline: THREE.Sprite;
      badge: THREE.Sprite;
      badgeOutline: THREE.Sprite;
    };
    type UnitLodPair = {
      full: THREE.Sprite;
      emblem: THREE.Sprite;
    };
    type ActorVisual = {
      actor: TacticalActor;
      full: THREE.Sprite;
      fullOutline?: THREE.Sprite;
      badge: THREE.Sprite;
      badgeOutline?: THREE.Sprite;
      hexMarker: OccupantHexMarker;
    };
    const heroLodPairs: HeroLodPair[] = [];
    const unitLodPairs: UnitLodPair[] = [];
    const actorVisuals = new Map<string, ActorVisual>();
    const heroStartCells: { row: number; column: number; x: number; z: number }[] = [];
    // Put a unit's feet in the lower fifth of its occupied hex instead of
    // visually pinning every figure to the exact geometric centre.
    const occupantFootOffsetZ = HEX_SIZE * 0.42;
    const occupiedHeroHexes = new Set<string>();
    const heroTargetXs = [-0.31, -0.1, 0.11, 0.32];

    HERO_LOD_SAMPLES.forEach((hero, heroIndex) => {
      const preferredStart = {
        x: MAP_WIDTH * heroTargetXs[heroIndex],
        z: MAP_DEPTH * 0.24,
      };
      let heroStart:
        | { row: number; column: number; x: number; z: number }
        | undefined;
      let heroStartScore = Number.POSITIVE_INFINITY;
      for (let row = 0; row < HEX_ROWS; row += 1) {
        for (let column = 0; column < HEX_COLS; column += 1) {
          const key = `${row}:${column}`;
          if (occupiedHeroHexes.has(key)) continue;
          const center = hexCenterAt(row, column);
          if (coastKindAt(seed, row, column) !== "land") continue;
          if (distanceToRiver(center.x, center.z, samples) < 1.35) continue;
          const terrainType = terrainCells.get(key)?.type;
          if (terrainType === "mountain" || terrainType === "wetland") continue;
          const score = Math.hypot(
            center.x - preferredStart.x,
            center.z - preferredStart.z,
          );
          if (score < heroStartScore) {
            heroStartScore = score;
            heroStart = { row, column, ...center };
          }
        }
      }
      if (!heroStart) return;

      occupiedHeroHexes.add(`${heroStart.row}:${heroStart.column}`);
      const heroFoot = {
        x: heroStart.x,
        z: heroStart.z + occupantFootOffsetZ,
      };
      const heroCenterGroundHeight = heightAt(
        seed,
        heroStart.x,
        heroStart.z,
        samples,
      );
      const heroGroundHeight = heightAt(
        seed,
        heroFoot.x,
        heroFoot.z,
        samples,
      );
      const hexMarker = addOccupantHexMarker(
        heroStart,
        heroGroundHeight,
        "#69c8ff",
      );
      heroStartCells.push(heroStart);
      const profile = heroTacticalProfile(hero.id);
      const actor: TacticalActor = {
        id: `hero:${hero.id}`,
        name: hero.name,
        kind: "hero",
        team: "player",
        row: heroStart.row,
        column: heroStart.column,
        movement: profile.movement,
        remainingMovement: profile.movement,
        acted: false,
        hp: 100,
        maxHp: 100,
        attackModes: profile.attackModes.map((mode) => ({ ...mode })),
        healRange: profile.healRange,
        healAmount: profile.healAmount,
        // Hero skills will be connected after each hero's skill set is defined.
        skills: [],
      };

      const fullTexture = loadCharacterTexture(hero.image.map);
      const fullMarker = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: fullTexture,
          transparent: true,
          alphaTest: 0.08,
          depthTest: false,
          depthWrite: false,
        }),
      );
      fullMarker.scale.set(
        hero.fullScale.width,
        hero.fullScale.height,
        1,
      );
      // The rendered sprite includes a small transparent bottom margin. This
      // anchor brings the visible feet down onto the hex surface.
      fullMarker.center.set(0.5, 0.075);
      fullMarker.position.set(
        heroFoot.x,
        heroGroundHeight + 0.02,
        heroFoot.z,
      );
      fullMarker.renderOrder = 90;
      fullMarker.userData = {
        type: "hero",
        actorId: actor.id,
        team: actor.team,
        heroId: hero.id,
        row: heroStart.row,
        column: heroStart.column,
      };
      worldRoot.add(fullMarker);

      const fullOutline = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: loadCharacterTexture(hero.image.outline),
          color: hero.aura,
          transparent: true,
          opacity: 0.9,
          alphaTest: 0.08,
          depthTest: false,
          depthWrite: false,
        }),
      );
      fullOutline.scale.set(hero.fullScale.width, hero.fullScale.height, 1);
      fullOutline.center.set(0.5, 0.075);
      fullOutline.position.copy(fullMarker.position);
      fullOutline.position.y -= 0.002;
      fullOutline.renderOrder = 89;
      fullOutline.userData = fullMarker.userData;
      worldRoot.add(fullOutline);

      const badgeTexture = loadCharacterTexture(hero.image.badge);
      const badgeMarker = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: badgeTexture,
          transparent: true,
          alphaTest: 0.08,
          depthTest: false,
          depthWrite: false,
        }),
      );
      badgeMarker.scale.set(0.675, 0.675, 1);
      badgeMarker.position.set(
        heroStart.x,
        heroCenterGroundHeight + 0.12,
        heroStart.z,
      );
      badgeMarker.renderOrder = 95;
      badgeMarker.userData = fullMarker.userData;
      worldRoot.add(badgeMarker);

      const badgeOutline = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: loadCharacterTexture(hero.image.badgeOutline),
          color: hero.aura,
          transparent: true,
          opacity: 0.95,
          alphaTest: 0.06,
          depthTest: false,
          depthWrite: false,
        }),
      );
      badgeOutline.scale.set(0.675, 0.675, 1);
      badgeOutline.position.copy(badgeMarker.position);
      badgeOutline.position.y -= 0.004;
      badgeOutline.renderOrder = 94;
      badgeOutline.userData = fullMarker.userData;
      worldRoot.add(badgeOutline);
      heroLodPairs.push({
        full: fullMarker,
        fullOutline,
        badge: badgeMarker,
        badgeOutline,
      });
      actorVisuals.set(actor.id, {
        actor,
        full: fullMarker,
        fullOutline,
        badge: badgeMarker,
        badgeOutline,
        hexMarker,
      });
    });

    const occupiedUnitHexes = new Set<string>(occupiedHeroHexes);
    const unitNames: Record<string, string> = {
      infantry: "적 보병",
      archer: "아군 궁병",
      cavalry: "적 기병",
    };
    UNIT_VISUAL_SAMPLES.forEach((unit) => {
      const anchor = heroStartCells[
        unit.id === "infantry" ? 2 : unit.id === "archer" ? 3 : 1
      ] ?? heroStartCells[0];
      const preferredCoordinates = {
        row: THREE.MathUtils.clamp(
          (anchor?.row ?? Math.floor(HEX_ROWS / 2)) +
            (unit.id === "archer" ? 2 : 3),
          0,
          HEX_ROWS - 1,
        ),
        column: THREE.MathUtils.clamp(
          (anchor?.column ?? Math.floor(HEX_COLS / 2)) +
            (unit.id === "archer" ? 2 : unit.id === "cavalry" ? -1 : 0),
          0,
          HEX_COLS - 1,
        ),
      };
      const preferredStart = hexCenterAt(
        preferredCoordinates.row,
        preferredCoordinates.column,
      );
      let unitStart:
        | { row: number; column: number; x: number; z: number }
        | undefined;
      let unitStartScore = Number.POSITIVE_INFINITY;

      for (let row = 0; row < HEX_ROWS; row += 1) {
        for (let column = 0; column < HEX_COLS; column += 1) {
          const key = `${row}:${column}`;
          if (occupiedUnitHexes.has(key)) continue;
          const center = hexCenterAt(row, column);
          if (coastKindAt(seed, row, column) !== "land") continue;
          if (distanceToRiver(center.x, center.z, samples) < 1.35) continue;
          const terrainType = terrainCells.get(key)?.type;
          if (terrainType === "mountain" || terrainType === "wetland") continue;
          const score = Math.hypot(
            center.x - preferredStart.x,
            center.z - preferredStart.z,
          );
          if (score < unitStartScore) {
            unitStartScore = score;
            unitStart = { row, column, ...center };
          }
        }
      }
      if (!unitStart) return;

      occupiedUnitHexes.add(`${unitStart.row}:${unitStart.column}`);
      const unitFoot = {
        x: unitStart.x,
        z: unitStart.z + occupantFootOffsetZ,
      };
      const unitGroundHeight = heightAt(
        seed,
        unitFoot.x,
        unitFoot.z,
        samples,
      );
      const team = unit.id === "archer" ? "player" : "enemy";
      const hexMarker = addOccupantHexMarker(
        unitStart,
        unitGroundHeight,
        team === "player" ? "#69c8ff" : "#ef6767",
      );
      const profile = unitTacticalProfile(unit.id);
      const actor: TacticalActor = {
        id: `unit:${unit.id}`,
        name: unitNames[unit.id] ?? unit.name,
        kind: "unit",
        team,
        row: unitStart.row,
        column: unitStart.column,
        movement: profile.movement,
        remainingMovement: profile.movement,
        acted: false,
        hp: unit.id === "archer" ? 55 : 100,
        maxHp: 100,
        attackModes: profile.attackModes.map((mode) => ({ ...mode })),
        skills: [],
      };

      const unitTexture = loadCharacterTexture(unit.visual.image);
      const unitMarker = new THREE.Sprite(
          new THREE.SpriteMaterial({
          map: unitTexture,
          transparent: true,
          alphaTest: 0.08,
          depthTest: false,
          depthWrite: false,
          }),
        );
      unitMarker.scale.set(unit.visual.scale.width, unit.visual.scale.height, 1);
      unitMarker.center.set(0.5, 0.075);
      unitMarker.position.set(unitFoot.x, unitGroundHeight + 0.02, unitFoot.z);
      unitMarker.renderOrder = 88;
      unitMarker.userData = {
        type: "unit",
        actorId: actor.id,
        team: actor.team,
        unitId: unit.id,
        row: unitStart.row,
        column: unitStart.column,
      };
      worldRoot.add(unitMarker);

      const emblemMarker = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: loadCharacterTexture(unit.emblem.image),
          transparent: true,
          alphaTest: 0.08,
          depthTest: false,
          depthWrite: false,
        }),
      );
      emblemMarker.scale.set(unit.emblem.scale.width, unit.emblem.scale.height, 1);
      emblemMarker.center.set(0.5, 0.1);
      emblemMarker.position.set(unitFoot.x, unitGroundHeight + 0.08, unitFoot.z);
      emblemMarker.renderOrder = 96;
      emblemMarker.userData = unitMarker.userData;
      worldRoot.add(emblemMarker);
      unitLodPairs.push({ full: unitMarker, emblem: emblemMarker });
      actorVisuals.set(actor.id, {
        actor,
        full: unitMarker,
        badge: emblemMarker,
        hexMarker,
      });
    });
    const updateActorActionAppearance = (visual: ActorVisual) => {
      const inactive = visual.actor.acted;
      const tint = inactive ? "#a7aaa7" : "#ffffff";
      visual.full.material.color.set(tint);
      visual.full.material.opacity = inactive ? 0.82 : 1;
      visual.badge.material.color.set(tint);
      visual.badge.material.opacity = inactive ? 0.86 : 1;
      if (visual.fullOutline) {
        visual.fullOutline.material.opacity = inactive ? 0.66 : 0.9;
      }
      if (visual.badgeOutline) {
        visual.badgeOutline.material.opacity = inactive ? 0.72 : 0.95;
      }
      visual.hexMarker.fill.material.opacity = inactive ? 0.08 : 0.2;
      visual.hexMarker.outline.material.opacity = inactive ? 0.36 : 0.94;
    };
    const neighborCells = (cell: TerrainCell) => {
      const diagonal = cell.row % 2 === 0 ? -1 : 1;
      return [
        [cell.row, cell.column - 1], [cell.row, cell.column + 1],
        [cell.row - 1, cell.column], [cell.row + 1, cell.column],
        [cell.row - 1, cell.column + diagonal], [cell.row + 1, cell.column + diagonal],
      ];
    };
    const componentsFor = (type: TerrainCell["type"]) => {
      const visited = new Set<string>();
      const groups: TerrainCell[][] = [];
      for (const [key, cell] of terrainCells) {
        if (cell.type !== type || visited.has(key)) continue;
        const group: TerrainCell[] = [];
        const queue = [cell];
        visited.add(key);
        while (queue.length) {
          const current = queue.shift()!;
          group.push(current);
          for (const [row, column] of neighborCells(current)) {
            const neighborKey = `${row}:${column}`;
            const neighbor = terrainCells.get(neighborKey);
            if (neighbor?.type === type && !visited.has(neighborKey)) {
              visited.add(neighborKey);
              queue.push(neighbor);
            }
          }
        }
        groups.push(group);
      }
      return groups;
    };

    const treeInstances: { x: number; y: number; z: number; scale: number; rotation: number }[] = [];
    componentsFor("forest").forEach((group, groupIndex) => {
      if (group.length < 4) {
        const smallTreeCount = Math.min(2, group.length);
        for (let treeIndex = 0; treeIndex < smallTreeCount; treeIndex += 1) {
          const cell = group[treeIndex];
          const index = groupIndex * 100 + treeIndex;
          const x = cell.x + (hash(seed + 3291, index, 1) - 0.5) * HEX_SIZE * 0.42;
          const z = cell.z + (hash(seed + 3292, index, 2) - 0.5) * HEX_SIZE * 0.42;
          treeInstances.push({
            x,
            y: heightAt(seed, x, z, samples),
            z,
            scale: 0.55 + hash(seed + 3293, index, 3) * 0.22,
            rotation: hash(seed + 3294, index, 4) * Math.PI * 2,
          });
        }
        return;
      }
      const perHex = group.length >= 16 ? 7 : 5;
      group.forEach((cell, cellIndex) => {
        for (let treeIndex = 0; treeIndex < perHex; treeIndex += 1) {
          const index = groupIndex * 10000 + cellIndex * 100 + treeIndex;
          const angle = hash(seed + 3301, index, 1) * Math.PI * 2;
          const radius = Math.sqrt(hash(seed + 3302, index, 2)) * HEX_SIZE * 0.72;
          const x = cell.x + Math.cos(angle) * radius;
          const z = cell.z + Math.sin(angle) * radius;
          treeInstances.push({
            x,
            y: heightAt(seed, x, z, samples),
            z,
            scale: 0.42 + hash(seed + 3303, index, 3) * 0.36,
            rotation: hash(seed + 3304, index, 4) * Math.PI * 2,
          });
        }
      });
      const groupKeys = new Set(group.map((cell) => `${cell.row}:${cell.column}`));
      group.forEach((cell, cellIndex) => {
        neighborCells(cell).forEach(([row, column], neighborIndex) => {
          const neighborKey = `${row}:${column}`;
          if (!groupKeys.has(neighborKey) || `${cell.row}:${cell.column}` > neighborKey) return;
          const neighbor = terrainCells.get(neighborKey)!;
          const x = (cell.x + neighbor.x) / 2;
          const z = (cell.z + neighbor.z) / 2;
          const index = groupIndex * 1000 + cellIndex * 10 + neighborIndex;
          treeInstances.push({
            x,
            y: heightAt(seed, x, z, samples),
            z,
            scale: 0.48 + hash(seed + 3310, index, 1) * 0.28,
            rotation: hash(seed + 3311, index, 2) * Math.PI * 2,
          });
        });
      });
    });

    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.065, 0.095, 0.62, 8),
      new THREE.MeshStandardMaterial({ color: "#684b31", roughness: 1 }),
      treeInstances.length,
    );
    const lowerCanopy = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.5, 1.05, 10),
      new THREE.MeshStandardMaterial({ color: "#3f7547", roughness: 0.96, flatShading: true }),
      treeInstances.length,
    );
    const upperCanopy = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.36, 0.88, 10),
      new THREE.MeshStandardMaterial({ color: "#609151", roughness: 0.94, flatShading: true }),
      treeInstances.length,
    );
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scaleVector = new THREE.Vector3();
    treeInstances.forEach((tree, index) => {
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation);
      matrix.compose(new THREE.Vector3(tree.x, tree.y + tree.scale * 0.3, tree.z), quaternion, scaleVector.setScalar(tree.scale));
      trunkMesh.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(tree.x, tree.y + tree.scale * 0.83, tree.z), quaternion, scaleVector.setScalar(tree.scale));
      lowerCanopy.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(tree.x, tree.y + tree.scale * 1.25, tree.z), quaternion, scaleVector.setScalar(tree.scale * 0.92));
      upperCanopy.setMatrixAt(index, matrix);
    });
    [trunkMesh, lowerCanopy, upperCanopy].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worldRoot.add(mesh);
    });

    const mountainMaterial = new THREE.MeshStandardMaterial({ color: "#918f86", roughness: 0.98, flatShading: true });
    const snowMaterial = new THREE.MeshStandardMaterial({ color: "#f2f0e8", roughness: 0.92, flatShading: true });
    componentsFor("mountain").forEach((group, groupIndex) => {
      group.forEach((cell, cellIndex) => {
        const peaks = group.length >= 4 ? 2 : 1;
        for (let peakIndex = 0; peakIndex < peaks; peakIndex += 1) {
          const index = groupIndex * 1000 + cellIndex * 10 + peakIndex;
          const x = cell.x + (hash(seed + 4401, index, 1) - 0.5) * HEX_SIZE * 0.55;
          const z = cell.z + (hash(seed + 4402, index, 2) - 0.5) * HEX_SIZE * 0.55;
          const y = heightAt(seed, x, z, samples);
          const peakHeight = 1.25 + hash(seed + 4403, index, 3) * 0.75;
          const radius = 0.55 + hash(seed + 4404, index, 4) * 0.23;
          const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, peakHeight, 9, 4), mountainMaterial);
          mountain.position.set(x, y + peakHeight * 0.46, z);
          mountain.rotation.y = hash(seed + 4405, index, 5) * Math.PI;
          mountain.castShadow = true;
          mountain.receiveShadow = true;
          worldRoot.add(mountain);
          if (peakHeight > 1.65) {
            const snow = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.34, peakHeight * 0.25, 9), snowMaterial);
            snow.position.set(x, y + peakHeight * 0.88, z);
            snow.rotation.y = mountain.rotation.y;
            snow.castShadow = true;
            worldRoot.add(snow);
          }
        }
      });
    });

    const hillCells = componentsFor("hill").flat();
    const hillMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: "#9ca46c", roughness: 0.98, flatShading: true }),
      hillCells.length,
    );
    hillCells.forEach((cell, index) => {
      const y = heightAt(seed, cell.x, cell.z, samples);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(seed + 5501, index, 1) * Math.PI);
      matrix.compose(
        new THREE.Vector3(cell.x, y - 0.02, cell.z),
        quaternion,
        scaleVector.set(0.92 + hash(seed + 5502, index, 2) * 0.35, 0.32 + hash(seed + 5503, index, 3) * 0.16, 0.82),
      );
      hillMesh.setMatrixAt(index, matrix);
    });
    hillMesh.instanceMatrix.needsUpdate = true;
    hillMesh.castShadow = true;
    hillMesh.receiveShadow = true;
    worldRoot.add(hillMesh);

    const wetlandCells = componentsFor("wetland").flat();
    const wetlandMaterial = new THREE.MeshStandardMaterial({
      color: "#72aa9b",
      roughness: 0.68,
      metalness: 0,
      transparent: true,
      opacity: 0.86,
    });
    wetlandCells.forEach((cell, index) => {
      const y = heightAt(seed, cell.x, cell.z, samples);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(HEX_SIZE * 0.62, 20), wetlandMaterial);
      pool.rotation.x = -Math.PI / 2;
      pool.scale.set(1, 0.62 + hash(seed + 5601, index, 1) * 0.24, 1);
      pool.position.set(cell.x, y + 0.035, cell.z);
      pool.receiveShadow = true;
      worldRoot.add(pool);
      for (let reedIndex = 0; reedIndex < 5; reedIndex += 1) {
        const angle = hash(seed + 5602, index, reedIndex) * Math.PI * 2;
        const radius = 0.28 + hash(seed + 5603, index, reedIndex) * HEX_SIZE * 0.28;
        const reed = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.024, 0.38, 5),
          new THREE.MeshStandardMaterial({ color: "#99934f", roughness: 1 }),
        );
        reed.position.set(
          cell.x + Math.cos(angle) * radius,
          y + 0.19,
          cell.z + Math.sin(angle) * radius,
        );
        reed.castShadow = true;
        worldRoot.add(reed);
      }
    });

    const rockMaterial = new THREE.MeshStandardMaterial({ color: "#8b8879", roughness: 1, flatShading: true });
    for (let i = 0; i < 26; i += 1) {
      const x = (hash(seed + 501, i, 1) - 0.5) * (MAP_WIDTH - 2);
      const z = (hash(seed + 502, i, 2) - 0.5) * (MAP_DEPTH - 2);
      if (landValue(seed, x, z) < 0.12 || distanceToRiver(x, z, samples) < 1.05) continue;
      const y = heightAt(seed, x, z, samples);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + hash(seed, i, 4) * 0.18, 0), rockMaterial);
      rock.position.set(x, y + 0.12, z);
      rock.scale.y = 0.55 + hash(seed, i, 5) * 0.45;
      rock.rotation.set(hash(seed, i, 6), hash(seed, i, 7) * Math.PI, hash(seed, i, 8));
      rock.castShadow = true;
      worldRoot.add(rock);
    }

    const gridPositions: number[] = [];
    for (let r = 0; r < HEX_ROWS; r += 1) {
      for (let q = 0; q < HEX_COLS; q += 1) {
        const { x: cx, z: cz } = hexCenterAt(r, q);
        if (cx < -MAP_WIDTH / 2 - HEX_WIDTH || cx > MAP_WIDTH / 2 + HEX_WIDTH) continue;
        if (cz < -MAP_DEPTH / 2 - HEX_SIZE || cz > MAP_DEPTH / 2 + HEX_SIZE) continue;
        for (let edge = 0; edge < 6; edge += 1) {
          const a = (Math.PI / 180) * (60 * edge - 30);
          const b = (Math.PI / 180) * (60 * (edge + 1) - 30);
          const ax = cx + Math.cos(a) * HEX_SIZE;
          const az = cz + Math.sin(a) * HEX_SIZE;
          const bx = cx + Math.cos(b) * HEX_SIZE;
          const bz = cz + Math.sin(b) * HEX_SIZE;
          gridPositions.push(
            ax, Math.max(heightAt(seed, ax, az, samples) + 0.045, -0.285), az,
            bx, Math.max(heightAt(seed, bx, bz, samples) + 0.045, -0.285), bz,
          );
        }
      }
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
    const grid = new THREE.LineSegments(
      gridGeometry,
      new THREE.LineBasicMaterial({ color: "#efe7be", transparent: true, opacity: 0.3 }),
    );
    grid.visible = showGrid;
    worldRoot.add(grid);

    type FogRenderCell = {
      row: number;
      column: number;
      x: number;
      z: number;
      y: number;
    };
    const fogCells: FogRenderCell[] = [];
    for (let row = 0; row < HEX_ROWS; row += 1) {
      for (let column = 0; column < HEX_COLS; column += 1) {
        const center = hexCenterAt(row, column);
        if (
          center.x < -MAP_WIDTH / 2 - HEX_WIDTH ||
          center.x > MAP_WIDTH / 2 + HEX_WIDTH ||
          center.z < -MAP_DEPTH / 2 - HEX_SIZE ||
          center.z > MAP_DEPTH / 2 + HEX_SIZE
        ) {
          continue;
        }
        fogCells.push({
          row,
          column,
          x: center.x,
          z: center.z,
          y: Math.max(heightAt(seed, center.x, center.z, samples) + 0.19, -0.17),
        });
      }
    }
    const fogGeometry = new THREE.CircleGeometry(HEX_SIZE * 1.035, 6);
    fogGeometry.rotateZ(-Math.PI / 6);
    fogGeometry.rotateX(-Math.PI / 2);
    const createCloudFogMaterial = (
      color: THREE.ColorRepresentation,
      shadowColor: THREE.ColorRepresentation,
      opacity: number,
      cloudScale: number,
    ) =>
      new THREE.ShaderMaterial({
        uniforms: {
          cloudColor: { value: new THREE.Color(color) },
          shadowColor: { value: new THREE.Color(shadowColor) },
          fogOpacity: { value: opacity },
          cloudScale: { value: cloudScale },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vFogWorldPosition;
          void main() {
            vec4 localPosition = vec4(position, 1.0);
            #ifdef USE_INSTANCING
              localPosition = instanceMatrix * localPosition;
            #endif
            vec4 worldPosition = modelMatrix * localPosition;
            vFogWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 cloudColor;
          uniform vec3 shadowColor;
          uniform float fogOpacity;
          uniform float cloudScale;
          uniform float time;
          varying vec3 vFogWorldPosition;

          float cloudHash(vec2 point) {
            return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
          }

          float cloudNoise(vec2 point) {
            vec2 cell = floor(point);
            vec2 fraction = fract(point);
            fraction = fraction * fraction * (3.0 - 2.0 * fraction);
            float a = cloudHash(cell);
            float b = cloudHash(cell + vec2(1.0, 0.0));
            float c = cloudHash(cell + vec2(0.0, 1.0));
            float d = cloudHash(cell + vec2(1.0, 1.0));
            return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
          }

          float cloudFbm(vec2 point) {
            float value = 0.0;
            float amplitude = 0.55;
            for (int octave = 0; octave < 4; octave++) {
              value += cloudNoise(point) * amplitude;
              point = point * 2.03 + vec2(17.1, 9.2);
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec2 drift = vec2(time * 0.014, time * 0.006);
            float cloud = cloudFbm(vFogWorldPosition.xz * cloudScale + drift);
            float billow = smoothstep(0.28, 0.82, cloud);
            vec3 color = mix(shadowColor, cloudColor, 0.55 + billow * 0.45);
            float alpha = fogOpacity * mix(0.78, 1.0, billow);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
    const unexploredFogMaterial = createCloudFogMaterial(
      "#f6f5eb",
      "#aab7b6",
      0.94,
      0.2,
    );
    const exploredFogMaterial = createCloudFogMaterial(
      "#eef1ed",
      "#b8c4c1",
      0.3,
      0.24,
    );
    const unexploredFog = new THREE.InstancedMesh(
      fogGeometry,
      unexploredFogMaterial,
      fogCells.length,
    );
    const exploredFog = new THREE.InstancedMesh(
      fogGeometry,
      exploredFogMaterial,
      fogCells.length,
    );
    unexploredFog.renderOrder = 78;
    exploredFog.renderOrder = 79;
    unexploredFog.frustumCulled = false;
    exploredFog.frustumCulled = false;
    unexploredFog.visible = showFog;
    exploredFog.visible = showFog;
    unexploredFog.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    exploredFog.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    worldRoot.add(unexploredFog, exploredFog);

    const exploredHexKeys = new Set<string>();
    let currentVisibleHexKeys = new Set<string>();
    const fogTransform = new THREE.Object3D();
    const hiddenFogMatrix = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
    const playerVisionSources = (): VisionSource[] =>
      [...actorVisuals.values()]
        .filter((visual) => visual.actor.team === "player" && visual.actor.hp > 0)
        .map((visual) => ({
          row: visual.actor.row,
          column: visual.actor.column,
          radius: visionRadiusFor(
            visual.actor.kind,
            terrainCells.get(
              `${visual.actor.row}:${visual.actor.column}`,
            )?.type,
          ),
        }));
    const updateFogMeshes = () => {
      fogCells.forEach((cell, index) => {
        fogTransform.position.set(cell.x, cell.y, cell.z);
        fogTransform.scale.set(1, 1, 1);
        fogTransform.updateMatrix();
        const state = fogStateAt(
          cell.row,
          cell.column,
          currentVisibleHexKeys,
          exploredHexKeys,
        );
        unexploredFog.setMatrixAt(
          index,
          state === "unexplored" ? fogTransform.matrix : hiddenFogMatrix,
        );
        exploredFog.setMatrixAt(
          index,
          state === "explored" ? fogTransform.matrix : hiddenFogMatrix,
        );
      });
      unexploredFog.instanceMatrix.needsUpdate = true;
      exploredFog.instanceMatrix.needsUpdate = true;
    };
    const refreshFogVisibility = (commitExploration = true) => {
      currentVisibleHexKeys = visibleHexKeys(
        playerVisionSources(),
        HEX_ROWS,
        HEX_COLS,
      );
      if (commitExploration) {
        currentVisibleHexKeys.forEach((key) => exploredHexKeys.add(key));
      }
      updateFogMeshes();
    };
    refreshFogVisibility(true);

    const selectionGeometry = new THREE.BufferGeometry();
    const selection = new THREE.LineLoop(
      selectionGeometry,
      new THREE.LineBasicMaterial({ color: "#fff27a", transparent: true, opacity: 0.98 }),
    );
    selection.visible = false;
    selection.renderOrder = 10000;
    worldRoot.add(selection);

    type TacticalActionMarker = {
      sprite: THREE.Sprite;
      action: "attack" | "heal" | "skill";
      actorId: string;
      targetId: string;
    };
    const interactionOverlays: THREE.Mesh[] = [];
    const tacticalActionMarkers: TacticalActionMarker[] = [];
    let selectedActorId: string | null = null;
    let commandPanelOpen = false;
    let attackTargeting = false;
    let selectedSkillId: string | null = null;
    let pendingAttackTargetId: string | null = null;
    let movementPlanBudget = 0;
    let movementPlanOrigin: { row: number; column: number } | null = null;
    let movementPreviewActive = false;
    let reachableByKey = new Map<string, { row: number; column: number; cost: number }>();
    let activeActionAnimation:
      | {
          startedAt: number;
          attackerId: string;
          targetId: string;
          attackerY: number;
          targetY: number;
        }
      | null = null;

    const movementCostAt = (row: number, column: number) => {
      if (!isInsideMap(row, column)) return null;
      const kind = coastKindAt(seed, row, column);
      if (kind === "deep") return null;
      if (kind === "shallow") return 2;
      const terrainType = terrainCells.get(`${row}:${column}`)?.type;
      if (terrainType === "mountain") return null;
      if (terrainType === "wetland") return 3;
      if (terrainType === "forest" || terrainType === "hill") return 2;
      if (kind === "beach" || kind === "cliff") return 2;
      const center = hexCenterAt(row, column);
      const nearestRiver = nearestRiverSample(center.x, center.z, samples);
      const isRiver =
        riverCurves.length > 0 &&
        nearestRiver.distance <= riverWidthAt(nearestRiver.t) * 0.5 + 0.12;
      if (isRiver) return 2;
      return 1;
    };
    const livingActors = () =>
      [...actorVisuals.values()].filter((visual) => visual.actor.hp > 0);
    const occupiedActorKeys = (exceptActorId?: string) =>
      new Set(
        livingActors()
          .filter((visual) => visual.actor.id !== exceptActorId)
          .map((visual) => `${visual.actor.row}:${visual.actor.column}`),
      );
    const clearInteractionOverlays = () => {
      interactionOverlays.splice(0).forEach((overlay) => {
        worldRoot.remove(overlay);
        overlay.geometry.dispose();
        overlay.material.dispose();
      });
    };
    const clearActionMarkers = () => {
      tacticalActionMarkers.splice(0).forEach(({ sprite }) => {
        worldRoot.remove(sprite);
        sprite.material.dispose();
      });
    };
    const addHexOverlay = (
      row: number,
      column: number,
      color: THREE.ColorRepresentation,
      opacity: number,
      glow = false,
    ) => {
      const center = hexCenterAt(row, column);
      const points = occupantHexPoints(
        center,
        heightAt(seed, center.x, center.z, samples),
      );
      const positions = new Float32Array(21);
      positions.set([
        center.x,
        heightAt(seed, center.x, center.z, samples) + 0.11,
        center.z,
      ]);
      points.forEach((point, index) => {
        positions.set([point.x, point.y + 0.005, point.z], (index + 1) * 3);
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setIndex([
        0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1,
      ]);
      const overlay = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        }),
      );
      overlay.renderOrder = 84;
      interactionOverlays.push(overlay);
      worldRoot.add(overlay);
      if (glow) {
        const glowOverlay = new THREE.Mesh(
          geometry.clone(),
          new THREE.MeshBasicMaterial({
            color: "#d5ffad",
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        glowOverlay.renderOrder = 85;
        interactionOverlays.push(glowOverlay);
        worldRoot.add(glowOverlay);
      }
    };
    const actionTextureCache = new Map<"attack" | "heal" | "skill", THREE.Texture>();
    const createActionTexture = (action: "attack" | "heal" | "skill") => {
      const cached = actionTextureCache.get(action);
      if (cached) return cached;
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      const context = canvas.getContext("2d")!;
      const colors = {
        attack: ["#9d312d", "#ffcf75"],
        heal: ["#2f8b58", "#e8fff0"],
        skill: ["#6942a1", "#f2dcff"],
      } as const;
      context.beginPath();
      context.arc(96, 96, 76, 0, Math.PI * 2);
      context.fillStyle = colors[action][0];
      context.fill();
      context.lineWidth = 12;
      context.strokeStyle = colors[action][1];
      context.stroke();
      context.fillStyle = colors[action][1];
      context.font = "900 76px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(action === "attack" ? "⚔" : action === "heal" ? "+" : "★", 96, 101);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      actionTextureCache.set(action, texture);
      return texture;
    };
    const addActionMarker = (
      action: "attack" | "heal" | "skill",
      actorId: string,
      target: ActorVisual,
    ) => {
      const center = hexCenterAt(target.actor.row, target.actor.column);
      const ground = heightAt(seed, center.x, center.z, samples);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createActionTexture(action),
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      );
      sprite.scale.set(0.62, 0.62, 1);
      if (action === "attack") {
        sprite.material.opacity = 0.62;
        sprite.scale.set(HEX_WIDTH * 0.86, HEX_WIDTH * 0.86, 1);
        sprite.position.set(
          target.full.position.x,
          target.full.position.y + target.full.scale.y * 0.66,
          target.full.position.z,
        );
        addHexOverlay(target.actor.row, target.actor.column, "#dc665c", 0.16);
      } else {
        sprite.position.set(center.x + 0.38, ground + 1.12, center.z - 0.18);
      }
      sprite.renderOrder = 120;
      sprite.userData = {
        type: "tactical-action",
        action,
        actorId,
        targetId: target.actor.id,
      };
      worldRoot.add(sprite);
      tacticalActionMarkers.push({
        sprite,
        action,
        actorId,
        targetId: target.actor.id,
      });
    };
    const setActorPosition = (
      visual: ActorVisual,
      row: number,
      column: number,
    ) => {
      const center = hexCenterAt(row, column);
      const foot = { x: center.x, z: center.z + occupantFootOffsetZ };
      const footGround = heightAt(seed, foot.x, foot.z, samples);
      const centerGround = heightAt(seed, center.x, center.z, samples);
      visual.actor.row = row;
      visual.actor.column = column;
      visual.full.position.set(foot.x, footGround + 0.02, foot.z);
      visual.full.userData.row = row;
      visual.full.userData.column = column;
      visual.fullOutline?.position.copy(visual.full.position);
      if (visual.fullOutline) visual.fullOutline.position.y -= 0.002;
      visual.badge.position.set(center.x, centerGround + 0.12, center.z);
      visual.badge.userData.row = row;
      visual.badge.userData.column = column;
      visual.badgeOutline?.position.copy(visual.badge.position);
      if (visual.badgeOutline) visual.badgeOutline.position.y -= 0.004;
      updateOccupantHexMarker(visual.hexMarker, center, footGround);
    };
    const diagnosticForHex = (
      row: number,
      column: number,
      actor?: TacticalActor,
    ): HexDiagnostic => {
      const center = hexCenterAt(row, column);
      const kind = coastKindAt(seed, row, column);
      const terrainCell = terrainCells.get(`${row}:${column}`);
      const nearestRiver = nearestRiverSample(center.x, center.z, samples);
      const isRiver =
        riverCurves.length > 0 &&
        nearestRiver.distance <= riverWidthAt(nearestRiver.t) * 0.5 + 0.12;
      const terrainLabel =
        kind === "beach"
          ? "백사장"
          : kind === "cliff"
            ? "바위 해안"
            : kind === "shallow"
              ? "얕은 바다"
              : kind === "deep"
                ? "깊은 바다"
                : isRiver
                  ? "강"
                  : terrainCell?.type === "forest"
                    ? "숲"
                    : terrainCell?.type === "wetland"
                      ? "습지"
                      : terrainCell?.type === "hill"
                        ? "언덕"
                        : terrainCell?.type === "mountain"
                          ? "산악"
                          : "평원·일반 육지";
      return {
        row,
        column,
        kind,
        terrain: terrainLabel,
        height: heightAt(seed, center.x, center.z, samples),
        layer:
          isRiver
            ? "river-channel"
            : kind === "beach"
              ? "beach-edge-overlay"
              : kind === "cliff"
                ? "cliff-coast-hex"
                : kind === "shallow"
                  ? "shallow-water-hex"
                  : kind === "deep"
                    ? "deep-sea"
                    : "terrain",
        movementCost: movementCostAt(row, column),
        actor: actor
          ? {
              name: actor.name,
              kind: actor.kind,
              hp: actor.hp,
              maxHp: actor.maxHp,
            }
          : undefined,
      };
    };
    const popupPositionForActor = (visual: ActorVisual) => {
      const anchor = visual.badge.position.clone();
      worldRoot.localToWorld(anchor);
      anchor.project(camera);
      return {
        x: THREE.MathUtils.clamp(
          (anchor.x * 0.5 + 0.5) * host.clientWidth,
          8,
          Math.max(8, host.clientWidth - 240),
        ),
        y: THREE.MathUtils.clamp(
          (-anchor.y * 0.5 + 0.5) * host.clientHeight,
          8,
          Math.max(8, host.clientHeight - 145),
        ),
      };
    };
    const setPanelForActor = (
      visual: ActorVisual,
      message: string,
      overrides: Partial<TacticalPanelState> = {},
    ) => {
      commandPanelOpen = true;
      attackTargeting = overrides.attackTargeting ?? false;
      setTacticalPanel({
        isOpen: true,
        actorName: visual.actor.name,
        actorKind: visual.actor.kind,
        message,
        canAttack: livingActors().some(
          (candidate) =>
            candidate.actor.team !== visual.actor.team &&
            availableAttackModes(visual.actor, candidate.actor).length > 0,
        ),
        skills: visual.actor.skills.map((skill) => ({ ...skill })),
        attackChoices: [],
        skillMenuOpen: false,
        canCancelMove: movementPreviewActive,
        ...overrides,
      });
    };
    const showMovementPlan = (visual: ActorVisual) => {
      clearInteractionOverlays();
      reachableByKey.forEach((hex) => {
        if (
          hex.row === visual.actor.row &&
          hex.column === visual.actor.column
        ) {
          return;
        }
        addHexOverlay(hex.row, hex.column, "#59ed3f", 0.52, true);
      });
    };
    const showMovementRoute = (
      visual: ActorVisual,
      destination: { row: number; column: number; cost: number },
    ) => {
      if (!movementPlanOrigin) return;
      const path = findMovementPath({
        start: movementPlanOrigin,
        destination,
        movement: movementPlanBudget,
        rows: HEX_ROWS,
        columns: HEX_COLS,
        occupied: occupiedActorKeys(visual.actor.id),
        movementCostAt,
      });
      path.slice(1).forEach((hex, index) => {
        const isDestination = index === path.length - 2;
        addHexOverlay(
          hex.row,
          hex.column,
          isDestination ? "#fff27a" : "#caff54",
          isDestination ? 0.62 : 0.42,
          true,
        );
      });
    };
    const rebuildActionMarkers = (visual: ActorVisual) => {
      clearActionMarkers();
      clearInteractionOverlays();
      if (visual.actor.acted) return;
      const enemies = livingActors().filter(
        (candidate) => candidate.actor.team !== visual.actor.team,
      );
      const allies = livingActors().filter(
        (candidate) =>
          candidate.actor.team === visual.actor.team &&
          candidate.actor.id !== visual.actor.id &&
          candidate.actor.hp < candidate.actor.maxHp,
      );
      if (selectedSkillId) {
        const skill = visual.actor.skills.find(
          (candidate) => candidate.id === selectedSkillId,
        );
        if (!skill || skill.remainingUses <= 0) return;
        const targets = skill.kind === "damage" ? enemies : allies;
        targets
          .filter(
            (target) =>
              hexDistance(visual.actor, target.actor) <= skill.range,
          )
          .forEach((target) =>
            addActionMarker("skill", visual.actor.id, target),
          );
        return;
      }
      enemies
        .filter(
          (enemy) =>
            availableAttackModes(visual.actor, enemy.actor).length > 0,
        )
        .forEach((enemy) =>
          addActionMarker("attack", visual.actor.id, enemy),
        );
    };
    const clearSelection = (message = DEFAULT_TACTICAL_PANEL.message) => {
      selectedActorId = null;
      commandPanelOpen = false;
      attackTargeting = false;
      selectedSkillId = null;
      pendingAttackTargetId = null;
      movementPlanBudget = 0;
      movementPlanOrigin = null;
      movementPreviewActive = false;
      reachableByKey.clear();
      clearInteractionOverlays();
      clearActionMarkers();
      setTacticalPanel({ ...DEFAULT_TACTICAL_PANEL, message });
    };
    const selectActor = (visual: ActorVisual) => {
      if (visual.actor.team !== "player") {
        setTacticalPanel({
          ...DEFAULT_TACTICAL_PANEL,
          message: `${visual.actor.name} · 체력 ${visual.actor.hp}/${visual.actor.maxHp}`,
        });
        return;
      }
      if (visual.actor.acted) {
        clearSelection(`${visual.actor.name}은(는) 이번 턴의 행동을 마쳤습니다.`);
        return;
      }
      selectedActorId = visual.actor.id;
      commandPanelOpen = false;
      selectedSkillId = null;
      pendingAttackTargetId = null;
      clearInteractionOverlays();
      clearActionMarkers();
      const reachable = visual.actor.acted
        ? []
        : reachableHexes({
            start: visual.actor,
            movement: visual.actor.remainingMovement,
            rows: HEX_ROWS,
            columns: HEX_COLS,
            occupied: occupiedActorKeys(visual.actor.id),
            movementCostAt,
          });
      movementPlanBudget = visual.actor.remainingMovement;
      movementPlanOrigin = {
        row: visual.actor.row,
        column: visual.actor.column,
      };
      movementPreviewActive = false;
      reachableByKey = new Map(
        reachable.map((hex) => [`${hex.row}:${hex.column}`, hex]),
      );
      reachableByKey.set(`${visual.actor.row}:${visual.actor.column}`, {
        row: visual.actor.row,
        column: visual.actor.column,
        cost: 0,
      });
      showMovementPlan(visual);
      setTacticalPanel(DEFAULT_TACTICAL_PANEL);
    };
    const performWait = () => {
      const visual = selectedActorId
        ? actorVisuals.get(selectedActorId)
        : undefined;
      if (!visual || visual.actor.acted) return;
      visual.actor.acted = true;
      visual.actor.remainingMovement = 0;
      updateActorActionAppearance(visual);
      refreshFogVisibility();
      clearSelection(`${visual.actor.name}이(가) 현재 위치에서 대기합니다.`);
    };
    const performMove = (
      visual: ActorVisual,
      destination: { row: number; column: number; cost: number },
    ) => {
      setActorPosition(visual, destination.row, destination.column);
      movementPreviewActive = Boolean(
        movementPlanOrigin &&
          (destination.row !== movementPlanOrigin.row ||
            destination.column !== movementPlanOrigin.column),
      );
      visual.actor.remainingMovement = Math.max(
        0,
        movementPlanBudget - destination.cost,
      );
      refreshFogVisibility(false);
      showMovementPlan(visual);
      showMovementRoute(visual, destination);
      setPanelForActor(visual, "");
    };
    const finishCombatAction = (
      attacker: ActorVisual,
      target: ActorVisual,
      amount: number,
      label: string,
      heal = false,
    ) => {
      activeActionAnimation = {
        startedAt: performance.now(),
        attackerId: attacker.actor.id,
        targetId: target.actor.id,
        attackerY: attacker.full.position.y,
        targetY: target.full.position.y,
      };
      if (heal) {
        target.actor.hp = Math.min(target.actor.maxHp, target.actor.hp + amount);
      } else {
        target.actor.hp = Math.max(0, target.actor.hp - amount);
      }
      attacker.actor.acted = true;
      attacker.actor.remainingMovement = 0;
      updateActorActionAppearance(attacker);
      if (target.actor.hp <= 0) {
        target.full.visible = false;
        target.fullOutline && (target.fullOutline.visible = false);
        target.badge.visible = false;
        target.badgeOutline && (target.badgeOutline.visible = false);
        target.hexMarker.fill.visible = false;
        target.hexMarker.outline.visible = false;
      }
      refreshFogVisibility();
      clearSelection(
        `${label} · ${target.actor.name} 체력 ${target.actor.hp}/${target.actor.maxHp}`,
      );
    };
    const performAttack = (
      attacker: ActorVisual,
      target: ActorVisual,
      mode: AttackMode,
    ) => {
      finishCombatAction(
        attacker,
        target,
        mode.damage,
        `${attacker.actor.name}의 ${mode.label}`,
      );
    };
    const performHeal = (healer: ActorVisual, target: ActorVisual) => {
      finishCombatAction(
        healer,
        target,
        healer.actor.healAmount ?? 0,
        `${healer.actor.name}의 회복`,
        true,
      );
    };
    const performSkill = (
      user: ActorVisual,
      target: ActorVisual,
      skill: TacticalSkill,
    ) => {
      skill.remainingUses -= 1;
      finishCombatAction(
        user,
        target,
        skill.amount,
        `${user.actor.name}의 ${skill.label}`,
        skill.kind === "heal",
      );
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: THREE.Vector2 | null = null;
    let previousPointer: THREE.Vector2 | null = null;
    let pointerId: number | null = null;
    let isDraggingMap = false;
    const activeTouchPointers = new Set<number>();
    const resetSinglePointerGesture = () => {
      pointerDown = null;
      previousPointer = null;
      pointerId = null;
      isDraggingMap = false;
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        activeTouchPointers.add(event.pointerId);
        if (!event.isPrimary || activeTouchPointers.size > 1) {
          resetSinglePointerGesture();
          return;
        }
      }
      if (event.button !== 0) return;
      pointerDown = new THREE.Vector2(event.clientX, event.clientY);
      previousPointer = pointerDown.clone();
      pointerId = event.pointerId;
      isDraggingMap = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" &&
        activeTouchPointers.size !== 1
      ) {
        return;
      }
      if (
        pointerId !== event.pointerId ||
        !pointerDown ||
        !previousPointer
      ) {
        return;
      }
      const currentPointer = new THREE.Vector2(event.clientX, event.clientY);
      if (!isDraggingMap && pointerDown.distanceTo(currentPointer) >= 6) {
        isDraggingMap = true;
      }
      if (isDraggingMap) {
        const deltaX = currentPointer.x - previousPointer.x;
        const deltaY = currentPointer.y - previousPointer.y;
        const visibleWidth =
          (camera.right - camera.left) / camera.zoom;
        const visibleHeight =
          (camera.top - camera.bottom) / camera.zoom;
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(
          camera.matrixWorld,
          0,
        );
        const cameraUp = new THREE.Vector3().setFromMatrixColumn(
          camera.matrixWorld,
          1,
        );
        const panOffset = cameraRight
          .multiplyScalar(
            (-deltaX * visibleWidth) / renderer.domElement.clientWidth,
          )
          .add(
            cameraUp.multiplyScalar(
              (deltaY * visibleHeight) / renderer.domElement.clientHeight,
            ),
          );
        camera.position.add(panOffset);
        controls.target.add(panOffset);
      }
      previousPointer = currentPointer;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        activeTouchPointers.delete(event.pointerId);
      }
      if (event.button !== 0 || !pointerDown) return;
      const wasDraggingMap = isDraggingMap;
      if (
        pointerId !== null &&
        renderer.domElement.hasPointerCapture(pointerId)
      ) {
        renderer.domElement.releasePointerCapture(pointerId);
      }
      pointerDown = null;
      previousPointer = null;
      pointerId = null;
      isDraggingMap = false;
      if (wasDraggingMap) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const interactiveSprites = [
        ...livingActors().flatMap((visual) => [
          visual.full,
          visual.fullOutline,
          visual.badge,
          visual.badgeOutline,
        ]),
        ...tacticalActionMarkers.map((marker) => marker.sprite),
      ].filter(
        (object): object is THREE.Sprite =>
          object instanceof THREE.Sprite && object.visible,
      );
      const objectHits = raycaster
        .intersectObjects(interactiveSprites, false)
        .filter((intersection) => intersection.object.visible);
      const objectHit =
        objectHits.find(
          (intersection) =>
            intersection.object.userData.type === "tactical-action",
        ) ?? objectHits[0];
      if (objectHit) {
        const data = objectHit.object.userData;
        if (data.type === "tactical-action") {
          const attacker = actorVisuals.get(data.actorId as string);
          const target = actorVisuals.get(data.targetId as string);
          if (!attacker || !target || attacker.actor.acted) return;
          if (data.action === "heal") {
            performHeal(attacker, target);
            return;
          }
          if (data.action === "skill") {
            const skill = attacker.actor.skills.find(
              (candidate) => candidate.id === selectedSkillId,
            );
            if (skill && skill.remainingUses > 0) {
              performSkill(attacker, target, skill);
            }
            return;
          }
          const modes = availableAttackModes(attacker.actor, target.actor);
          if (modes.length === 1) {
            performAttack(attacker, target, modes[0]);
          } else if (modes.length > 1) {
            pendingAttackTargetId = target.actor.id;
            clearActionMarkers();
            clearInteractionOverlays();
            setPanelForActor(attacker, "공격 방식을 선택하세요.", {
              attackTargeting: false,
              attackChoices: modes.map((mode) => ({
                id: mode.id,
                label: mode.label,
                damage: mode.damage,
              })),
            });
          }
          return;
        }
        const clickedActor = actorVisuals.get(data.actorId as string);
        if (clickedActor) {
          if (
            movementPreviewActive &&
            selectedActorId &&
            clickedActor.actor.id !== selectedActorId &&
            !attackTargeting
          ) {
            onHexSelected(
              diagnosticForHex(
                clickedActor.actor.row,
                clickedActor.actor.column,
                clickedActor.actor,
              ),
              {
                x: THREE.MathUtils.clamp(
                  event.clientX - host.getBoundingClientRect().left,
                  8,
                  Math.max(8, host.clientWidth - 240),
                ),
                y: THREE.MathUtils.clamp(
                  event.clientY - host.getBoundingClientRect().top,
                  8,
                  Math.max(8, host.clientHeight - 145),
                ),
              },
            );
            return;
          }
          if (clickedActor.actor.team === "player") {
            if (selectedActorId === clickedActor.actor.id) {
              clearActionMarkers();
              movementPreviewActive = true;
              showMovementPlan(clickedActor);
              setPanelForActor(clickedActor, "");
            } else {
              selectActor(clickedActor);
            }
            return;
          }
          if (attackTargeting && selectedActorId) {
            const attacker = actorVisuals.get(selectedActorId);
            const modes = attacker
              ? availableAttackModes(attacker.actor, clickedActor.actor)
              : [];
            if (attacker && clickedActor.actor.team !== attacker.actor.team) {
              if (modes.length === 1) {
                performAttack(attacker, clickedActor, modes[0]);
              } else if (modes.length > 1) {
                pendingAttackTargetId = clickedActor.actor.id;
                clearActionMarkers();
                clearInteractionOverlays();
                setPanelForActor(attacker, "공격 방식을 선택하세요.", {
                  attackTargeting: false,
                  attackChoices: modes.map((mode) => ({
                    id: mode.id,
                    label: mode.label,
                    damage: mode.damage,
                  })),
                });
              }
              return;
            }
          }
          onHexSelected(
            diagnosticForHex(
              clickedActor.actor.row,
              clickedActor.actor.column,
              clickedActor.actor,
            ),
            {
              x: THREE.MathUtils.clamp(
                event.clientX - host.getBoundingClientRect().left,
                8,
                Math.max(8, host.clientWidth - 240),
              ),
              y: THREE.MathUtils.clamp(
                event.clientY - host.getBoundingClientRect().top,
                8,
                Math.max(8, host.clientHeight - 145),
              ),
            },
          );
          return;
        }
      }
      const hit = raycaster.intersectObject(terrain, false)[0];
      if (!hit) {
        clearSelection("지도 밖을 선택해 행동을 취소했습니다.");
        return;
      }
      const localHit = worldRoot.worldToLocal(hit.point.clone());
      const row = THREE.MathUtils.clamp(
        Math.round((localHit.z + MAP_DEPTH / 2 - HEX_SIZE) / (1.5 * HEX_SIZE)),
        0,
        HEX_ROWS - 1,
      );
      const rowOffset = (row % 2) * (HEX_WIDTH / 2);
      const column = THREE.MathUtils.clamp(
        Math.round((localHit.x + MAP_WIDTH / 2 - HEX_WIDTH / 2 - rowOffset) / HEX_WIDTH),
        0,
        HEX_COLS - 1,
      );
      const clickedKey = `${row}:${column}`;
      const selected = selectedActorId
        ? actorVisuals.get(selectedActorId)
        : undefined;
      if (selected && !selected.actor.acted) {
        if (
          selected.actor.row === row &&
          selected.actor.column === column
        ) {
          clearInteractionOverlays();
          clearActionMarkers();
          setPanelForActor(selected, "");
          return;
        }
        const reachable = reachableByKey.get(clickedKey);
        if (reachable) {
          performMove(selected, reachable);
          return;
        }
        if (movementPreviewActive) {
          onHexSelected(
            diagnosticForHex(row, column),
            {
              x: THREE.MathUtils.clamp(
                event.clientX - host.getBoundingClientRect().left,
                8,
                Math.max(8, host.clientWidth - 240),
              ),
              y: THREE.MathUtils.clamp(
                event.clientY - host.getBoundingClientRect().top,
                8,
                Math.max(8, host.clientHeight - 125),
              ),
            },
          );
          return;
        }
        clearSelection("이동 불가능한 곳을 선택해 이동 명령을 취소했습니다.");
        return;
      }
      const center = hexCenterAt(row, column);
      const selectedPoints: THREE.Vector3[] = [];
      for (let edge = 0; edge < 6; edge += 1) {
        const angle = (Math.PI / 180) * (60 * edge - 30);
        const x = center.x + Math.cos(angle) * HEX_SIZE * 0.96;
        const z = center.z + Math.sin(angle) * HEX_SIZE * 0.96;
        selectedPoints.push(new THREE.Vector3(x, Math.max(heightAt(seed, x, z, samples) + 0.095, -0.25), z));
      }
      selectionGeometry.setFromPoints(selectedPoints);
      selection.visible = true;
      onHexSelected(
        diagnosticForHex(row, column),
        {
          x: THREE.MathUtils.clamp(
            event.clientX - host.getBoundingClientRect().left,
            8,
            Math.max(8, host.clientWidth - 240),
          ),
          y: THREE.MathUtils.clamp(
            event.clientY - host.getBoundingClientRect().top,
            8,
            Math.max(8, host.clientHeight - 125),
          ),
        },
      );
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        activeTouchPointers.delete(event.pointerId);
      }
      if (
        pointerId !== null &&
        renderer.domElement.hasPointerCapture(pointerId)
      ) {
        renderer.domElement.releasePointerCapture(pointerId);
      }
      resetSinglePointerGesture();
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel);
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    tacticalCommandRef.current = (command) => {
      const visual = selectedActorId
        ? actorVisuals.get(selectedActorId)
        : undefined;
      if (!visual) return;
      if (command.type === "wait") {
        performWait();
        return;
      }
      if (command.type === "start-attack") {
        selectedSkillId = null;
        rebuildActionMarkers(visual);
        setPanelForActor(visual, "", { attackTargeting: true });
        return;
      }
      if (command.type === "cancel-attack") {
        attackTargeting = false;
        pendingAttackTargetId = null;
        clearActionMarkers();
        showMovementPlan(visual);
        setPanelForActor(visual, "");
        return;
      }
      if (command.type === "cancel-move") {
        if (!movementPlanOrigin || !movementPreviewActive) return;
        setActorPosition(
          visual,
          movementPlanOrigin.row,
          movementPlanOrigin.column,
        );
        visual.actor.remainingMovement = movementPlanBudget;
        refreshFogVisibility(false);
        clearSelection();
        return;
      }
      if (command.type === "info") {
        onHexSelected(
          diagnosticForHex(
            visual.actor.row,
            visual.actor.column,
            visual.actor,
          ),
          popupPositionForActor(visual),
        );
        commandPanelOpen = false;
        setTacticalPanel(DEFAULT_TACTICAL_PANEL);
        return;
      }
      if (command.type === "toggle-skills") {
        setPanelForActor(visual, "사용할 영웅 스킬을 선택하세요.", {
          skillMenuOpen: true,
        });
        return;
      }
      if (command.type === "use-skill") {
        const skill = visual.actor.skills.find(
          (candidate) => candidate.id === command.skillId,
        );
        if (!skill || skill.remainingUses <= 0 || visual.actor.acted) return;
        selectedSkillId = skill.id;
        rebuildActionMarkers(visual);
        setPanelForActor(
          visual,
          `${skill.label} 대상에게 표시된 보라색 아이콘을 누르세요.`,
          { skillMenuOpen: true },
        );
        return;
      }
      if (command.type === "attack" && pendingAttackTargetId) {
        const target = actorVisuals.get(pendingAttackTargetId);
        const mode = visual.actor.attackModes.find(
          (candidate) => candidate.id === command.modeId,
        );
        if (
          target &&
          mode &&
          availableAttackModes(visual.actor, target.actor).some(
            (candidate) => candidate.id === mode.id,
          )
        ) {
          performAttack(visual, target, mode);
        }
      }
    };
    endTurnRef.current = () => {
      actorVisuals.forEach((visual) => {
        if (visual.actor.team !== "player" || visual.actor.hp <= 0) return;
        visual.actor.acted = false;
        visual.actor.remainingMovement = visual.actor.movement;
        updateActorActionAppearance(visual);
      });
      clearSelection("새로운 턴입니다. 모든 아군이 다시 행동할 수 있습니다.");
      setTurnNumber((current) => current + 1);
    };
    const handleOutsideInterfacePointer = (event: PointerEvent) => {
      if (!selectedActorId) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        renderer.domElement.contains(target) ||
        target.closest(".tactical-action-panel")
      ) {
        return;
      }
      clearSelection("다른 UI를 선택해 행동을 취소했습니다.");
    };
    window.addEventListener("pointerdown", handleOutsideInterfacePointer, true);

    const animate = () => {
      const fogTime = performance.now() * 0.001;
      unexploredFogMaterial.uniforms.time.value = fogTime;
      exploredFogMaterial.uniforms.time.value = fogTime;
      waterTexture.offset.y -= 0.00022;
      seaTexture.offset.x += 0.000025;
      controls.update();
      if (activeActionAnimation) {
        const elapsed = performance.now() - activeActionAnimation.startedAt;
        const progress = Math.min(1, elapsed / 360);
        const attacker = actorVisuals.get(activeActionAnimation.attackerId);
        const target = actorVisuals.get(activeActionAnimation.targetId);
        if (attacker) {
          attacker.full.position.y =
            activeActionAnimation.attackerY +
            Math.sin(progress * Math.PI) * 0.22;
          if (attacker.fullOutline) {
            attacker.fullOutline.position.y = attacker.full.position.y - 0.002;
          }
        }
        if (target && target.actor.hp > 0) {
          target.full.position.y =
            activeActionAnimation.targetY +
            Math.sin(progress * Math.PI * 4) * 0.04;
          target.full.material.opacity = progress < 0.7 && Math.floor(progress * 8) % 2 === 0 ? 0.45 : 1;
        }
        if (progress >= 1) {
          if (attacker) {
            attacker.full.position.y = activeActionAnimation.attackerY;
            if (attacker.fullOutline) {
              attacker.fullOutline.position.y = attacker.full.position.y - 0.002;
            }
          }
          if (target) {
            target.full.position.y = activeActionAnimation.targetY;
            target.full.material.opacity = 1;
          }
          activeActionAnimation = null;
        }
      }
      const showFullHero = camera.zoom >= 1.35;
      heroLodPairs.forEach(({ full, fullOutline, badge, badgeOutline }) => {
        const badgeScale = 2.325 / camera.zoom;
        badge.scale.set(badgeScale, badgeScale, 1);
        badgeOutline.scale.set(badgeScale, badgeScale, 1);
        full.visible = showFullHero;
        fullOutline.visible = showFullHero;
        badge.visible = !showFullHero;
        badgeOutline.visible = !showFullHero;
      });
      const showFullUnit = camera.zoom >= 1.35;
      unitLodPairs.forEach(({ full, emblem }) => {
        full.visible = showFullUnit;
        emblem.visible = !showFullUnit;
      });
      actorVisuals.forEach((visual) => {
        const revealed =
          !showFog ||
          visual.actor.team === "player" ||
          currentVisibleHexKeys.has(
            `${visual.actor.row}:${visual.actor.column}`,
          );
        const showActor = visual.actor.hp > 0 && revealed;
        visual.hexMarker.fill.visible = showActor;
        visual.hexMarker.outline.visible = showActor;
        if (showActor) return;
        visual.full.visible = false;
        if (visual.fullOutline) visual.fullOutline.visible = false;
        visual.badge.visible = false;
        if (visual.badgeOutline) visual.badgeOutline.visible = false;
      });
      const actionPanel = tacticalPanelRef.current;
      const selectedVisual = selectedActorId
        ? actorVisuals.get(selectedActorId)
        : undefined;
      if (
        actionPanel &&
        commandPanelOpen &&
        selectedVisual &&
        selectedVisual.actor.hp > 0
      ) {
        // The full sprite position is anchored at the actor's feet. Projecting
        // that point keeps the compact command panel directly below the hex.
        const anchor = selectedVisual.full.position.clone();
        worldRoot.localToWorld(anchor);
        anchor.project(camera);
        const anchorX = (anchor.x * 0.5 + 0.5) * host.clientWidth;
        const anchorY = (-anchor.y * 0.5 + 0.5) * host.clientHeight;
        const panelWidth = actionPanel.offsetWidth;
        const panelHeight = actionPanel.offsetHeight;
        const gap = 8;
        const margin = 8;
        const left = THREE.MathUtils.clamp(
          anchorX - panelWidth * 0.5,
          margin,
          Math.max(margin, host.clientWidth - panelWidth - margin),
        );
        const top = THREE.MathUtils.clamp(
          anchorY + gap,
          margin,
          Math.max(margin, host.clientHeight - panelHeight - margin),
        );
        actionPanel.classList.add("is-character-anchored");
        actionPanel.style.left = `${Math.round(left)}px`;
        actionPanel.style.top = `${Math.round(top)}px`;
        actionPanel.style.right = "auto";
        actionPanel.style.bottom = "auto";
      } else if (actionPanel) {
        actionPanel.classList.remove("is-character-anchored");
        actionPanel.style.removeProperty("left");
        actionPanel.style.removeProperty("top");
        actionPanel.style.removeProperty("right");
        actionPanel.style.removeProperty("bottom");
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    const resize = () => {
      const nextAspect = host.clientWidth / host.clientHeight;
      camera.left = (-viewHeight * nextAspect) / 2;
      camera.right = (viewHeight * nextAspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    sceneBuildComplete = true;
    notifyReady();

    return () => {
      window.cancelAnimationFrame(readyFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerCancel);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener(
        "pointerdown",
        handleOutsideInterfacePointer,
        true,
      );
      window.removeEventListener("world-map-reset-view", handleResetView);
      tacticalCommandRef.current = () => undefined;
      endTurnRef.current = () => undefined;
      clearInteractionOverlays();
      clearActionMarkers();
      actionTextureCache.forEach((texture) => texture.dispose());
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.LineLoop) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.dispose();
        }
      });
      groundTexture.dispose();
      waterTexture.dispose();
      seaTexture.dispose();
      sandTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [generationId, mapTierId, mapTypeId, onHexSelected, onReady, seed, showFog, showGrid]);

  return (
    <div className="world-scene-shell">
      <div
        className="world-3d"
        ref={hostRef}
        aria-label="WebGL로 렌더링한 2.5D 육각형 세계 지도"
      />
      <TacticalActionPanel
        state={tacticalPanel}
        onCommand={handleTacticalCommand}
        panelRef={tacticalPanelRef}
      />
      <button
        type="button"
        className="turn-end-control"
        onClick={() => endTurnRef.current()}
      >
        <small>TURN {turnNumber}</small>
        <span>턴 종료</span>
      </button>
    </div>
  );
}

export function WorldPrototype() {
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [selectedTierId, setSelectedTierId] = useState<MapTierId>("medium");
  const [appliedTierId, setAppliedTierId] = useState<MapTierId>("medium");
  const [selectedMapTypeId, setSelectedMapTypeId] = useState<MapTypeId>("continent");
  const [appliedMapTypeId, setAppliedMapTypeId] = useState<MapTypeId>("continent");
  const [showGrid, setShowGrid] = useState(true);
  const [showFog, setShowFog] = useState(true);
  const [generationId, setGenerationId] = useState(0);
  const generationIdRef = useRef(generationId);
  const [isWorldLoading, setIsWorldLoading] = useState(true);
  const [selectedHexPopup, setSelectedHexPopup] =
    useState<SelectedHexPopup | null>(null);
  const activeTier = configureMapTier(appliedTierId);
  const activeMapType = configureMapType(appliedMapTypeId);
  const coastStats = useMemo(() => {
    configureMapTier(appliedTierId);
    configureMapType(appliedMapTypeId);
    return classifyCoastHexes(seed).counts;
  }, [appliedMapTypeId, appliedTierId, seed]);
  const handleHexSelected = useCallback((
    diagnostic: HexDiagnostic,
    pointerPosition: { x: number; y: number },
  ) => {
    setSelectedHexPopup((current) => {
      if (
        current?.diagnostic.row === diagnostic.row &&
        current.diagnostic.column === diagnostic.column
      ) {
        return null;
      }
      return {
        diagnostic,
        x: pointerPosition.x,
        y: pointerPosition.y,
      };
    });
  }, []);
  generationIdRef.current = generationId;
  const handleWorldReady = useCallback((readyGenerationId: number) => {
    if (readyGenerationId === generationIdRef.current) {
      setIsWorldLoading(false);
    }
  }, []);

  const regenerate = () => {
    const parsed = Number(seedText);
    setIsWorldLoading(true);
    setGenerationId((current) => current + 1);
    setAppliedTierId(selectedTierId);
    setAppliedMapTypeId(selectedMapTypeId);
    setSelectedHexPopup(null);
    setSeed(Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now());
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * 99999999);
    setIsWorldLoading(true);
    setGenerationId((current) => current + 1);
    setSeedText(String(next));
    setAppliedTierId(selectedTierId);
    setAppliedMapTypeId(selectedMapTypeId);
    setSelectedHexPopup(null);
    setSeed(next);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WORLD GENERATION LAB · WEBGL 2.5D</p>
          <h1>World in Hero</h1>
        </div>
        <WorldControls
          selectedMapTypeId={selectedMapTypeId}
          selectedTierId={selectedTierId}
          activeMapType={activeMapType}
          activeTier={activeTier}
          seedText={seedText}
          showGrid={showGrid}
          showFog={showFog}
          onMapTypeChange={setSelectedMapTypeId}
          onTierChange={setSelectedTierId}
          onSeedTextChange={setSeedText}
          onRegenerate={regenerate}
          onRandomize={randomize}
          onGridChange={setShowGrid}
          onFogChange={setShowFog}
        />
      </header>
      <section className="stage">
        <WorldScene
          generationId={generationId}
          seed={seed}
          mapTierId={appliedTierId}
          mapTypeId={appliedMapTypeId}
          showGrid={showGrid}
          showFog={showFog}
          onHexSelected={handleHexSelected}
          onReady={handleWorldReady}
        />
        {isWorldLoading && (
          <div className="world-loading" role="status" aria-live="polite" aria-busy="true">
            <div className="world-loading-card">
              <span className="world-loading-kicker">새로운 원정지를 준비하고 있습니다</span>
              <strong>세계 생성 중</strong>
              <div className="world-loading-track" aria-hidden="true">
                <i />
              </div>
              <dl>
                <div><dt>맵 등급</dt><dd>{activeTier.label}</dd></div>
                <div><dt>맵 유형</dt><dd>{activeMapType.label}</dd></div>
                <div><dt>월드 시드</dt><dd>{seed}</dd></div>
              </dl>
              <p>지형 · 강 · 해안 · 숲 · 시야 정보를 구성하고 있습니다.</p>
            </div>
          </div>
        )}
        <TerrainLegend coastStats={coastStats} />
        <TestHeroPanel />
        <HexInfoPopup popup={selectedHexPopup} />
      </section>
      <footer><span>현재 검증</span><b>2.5D 연속 지면</b><b>지형을 파낸 강</b><b>입체 그림자</b><small>이 버전에서 시점과 그래픽 방향을 먼저 확인합니다.</small></footer>
    </main>
  );
}
