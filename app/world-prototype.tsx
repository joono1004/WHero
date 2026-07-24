"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MAP_WIDTH = 64;
const MAP_DEPTH = 50;
const HEX_SIZE = 0.92;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_COLS = Math.ceil(MAP_WIDTH / HEX_WIDTH) + 1;
const HEX_ROWS = Math.ceil(MAP_DEPTH / (1.5 * HEX_SIZE)) + 1;
const SEA_LEVEL = -0.32;
const DEEP_WATER_EDGE = -0.18;
const SHORELINE = -0.02;
const BEACH_INNER_EDGE = 0.16;
const COAST_TRANSITION_EDGE = 0.3;
const PLAIN_VISUAL_RULE = {
  textureRepeatX: 8,
  textureRepeatZ: 6,
  baseColor: "#ffffff",
  roughness: 0.96,
} as const;

type CoastKind = "land" | "beach" | "shallow" | "deep";
type CoastCell = { row: number; column: number; x: number; z: number; kind: CoastKind };
type HexDiagnostic = {
  row: number;
  column: number;
  kind: CoastKind;
  height: number;
  layer: string;
};

function hexCenterAt(row: number, column: number) {
  return {
    x: -MAP_WIDTH / 2 + HEX_WIDTH / 2 + column * HEX_WIDTH + (row % 2) * (HEX_WIDTH / 2),
    z: -MAP_DEPTH / 2 + HEX_SIZE + row * 1.5 * HEX_SIZE,
  };
}

function isInsideMap(row: number, column: number) {
  if (row < 0 || row >= HEX_ROWS || column < 0 || column >= HEX_COLS) return false;
  const center = hexCenterAt(row, column);
  return Math.abs(center.x) <= MAP_WIDTH / 2 && Math.abs(center.z) <= MAP_DEPTH / 2;
}

function neighborsOf(row: number, column: number) {
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

function coastKindAt(seed: number, row: number, column: number): CoastKind {
  const center = hexCenterAt(row, column);
  const land = landValue(seed, center.x, center.z) >= SHORELINE;
  const touchesOppositeTerrain = neighborsOf(row, column).some(([neighborRow, neighborColumn]) => {
    if (!isInsideMap(neighborRow, neighborColumn)) return false;
    const neighbor = hexCenterAt(neighborRow, neighborColumn);
    return (landValue(seed, neighbor.x, neighbor.z) >= SHORELINE) !== land;
  });
  if (land) return touchesOppositeTerrain ? "beach" : "land";
  return touchesOppositeTerrain ? "shallow" : "deep";
}

function classifyCoastHexes(seed: number) {
  const cells: CoastCell[] = [];
  const counts: Record<CoastKind, number> = { land: 0, beach: 0, shallow: 0, deep: 0 };
  for (let row = 0; row < HEX_ROWS; row += 1) {
    for (let column = 0; column < HEX_COLS; column += 1) {
      if (!isInsideMap(row, column)) continue;
      const center = hexCenterAt(row, column);
      const kind = coastKindAt(seed, row, column);
      cells.push({ row, column, ...center, kind });
      counts[kind] += 1;
    }
  }
  return { cells, counts };
}

function hash(seed: number, x: number, y: number) {
  let value = seed ^ Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function terrainNoise(seed: number, x: number, z: number) {
  return (
    Math.sin(x * 0.43 + seed * 0.00013) * 0.16 +
    Math.cos(z * 0.37 - seed * 0.00017) * 0.13 +
    Math.sin((x + z) * 0.71 + seed * 0.00007) * 0.07
  );
}

function biomeNoise(seed: number, x: number, z: number) {
  return (
    Math.sin(x * 0.16 + z * 0.08 + seed * 0.00029) * 0.5 +
    Math.cos(x * 0.1 - z * 0.19 + seed * 0.00041) * 0.35 +
    Math.sin((x + z) * 0.07 + seed * 0.00017) * 0.15
  );
}

function landValue(seed: number, x: number, z: number) {
  const xRadius = MAP_WIDTH * (0.37 + hash(seed + 71, 1, 1) * 0.07);
  const zRadius = MAP_DEPTH * (0.34 + hash(seed + 72, 1, 2) * 0.08);
  const offsetX = (hash(seed + 73, 1, 3) - 0.5) * 2.4;
  const offsetZ = (hash(seed + 74, 1, 4) - 0.5) * 1.8;
  const radial = Math.hypot((x - offsetX) / xRadius, (z - offsetZ) / zRadius);
  const phaseA = hash(seed + 75, 1, 5) * Math.PI * 2;
  const phaseB = hash(seed + 76, 1, 6) * Math.PI * 2;
  const coastline =
    Math.sin(x * 0.58 + phaseA) * 0.12 +
    Math.cos(z * 0.66 + phaseB) * 0.11 +
    Math.sin((x - z) * 0.38 + phaseA * 0.7) * 0.08;
  return 1 - radial + coastline;
}

function distanceToRiver(x: number, z: number, samples: THREE.Vector3[]) {
  let nearest = Infinity;
  for (const point of samples) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
  return nearest;
}

function buildRiver(seed: number) {
  const scaleX = MAP_WIDTH / 28;
  const scaleZ = MAP_DEPTH / 22;
  const bend = (index: number, strength = 1) => (hash(seed + 2000, index, 7) - 0.5) * strength;
  const drift = (hash(seed + 2010, 1, 1) - 0.5) * 5;
  const controlPoints = [
    new THREE.Vector3(-6.8 + drift * 0.25, 0, 8.7),
    new THREE.Vector3(-5.8 + drift * 0.45 + bend(1, 2.6), 0, 6.2),
    new THREE.Vector3(-3.3 + drift * 0.55 + bend(2, 3), 0, 3.7),
    new THREE.Vector3(-0.4 + drift * 0.7 + bend(3, 3.4), 0, 1.1),
    new THREE.Vector3(2.7 + drift * 0.55 + bend(4, 3.2), 0, -1.7),
    new THREE.Vector3(4.4 + drift * 0.35 + bend(5, 2.7), 0, -4.6),
    new THREE.Vector3(5.7 + drift * 0.2 + bend(6, 2), 0, -7.6),
    new THREE.Vector3(6.3 + drift * 0.12, 0, -10.6),
  ].map((point) => new THREE.Vector3(point.x * scaleX, point.y, point.z * scaleZ));
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", 0.42);
  return { curve, samples: curve.getPoints(150) };
}

function createRiverRibbon(curve: THREE.CatmullRomCurve3) {
  const segments = 150;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const width = 0.62 + t * 0.25 + Math.sin(t * Math.PI * 7) * 0.035;
    for (const side of [-1, 1]) {
      const edge = point.clone().addScaledVector(normal, width * side);
      positions.push(edge.x, -0.17, edge.z);
      uvs.push(side < 0 ? 0 : 1, t * 9);
    }
    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
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
  const ridge = Math.max(0, Math.sin(x * 0.22 - z * 0.12 + seed * 0.0001)) * 0.18;
  const land = landValue(seed, x, z);
  if (land < DEEP_WATER_EDGE) return -0.72 + terrainNoise(seed + 811, x, z) * 0.12;
  if (land < SHORELINE) {
    return THREE.MathUtils.lerp(
      -0.62,
      SEA_LEVEL - 0.018,
      THREE.MathUtils.smoothstep(land, DEEP_WATER_EDGE, SHORELINE),
    );
  }
  if (land < BEACH_INNER_EDGE) {
    return THREE.MathUtils.lerp(
      SEA_LEVEL + 0.022,
      base * 0.24,
      THREE.MathUtils.smoothstep(land, SHORELINE, BEACH_INNER_EDGE),
    );
  }
  const distance = distanceToRiver(x, z, riverSamples);
  if (distance < 1.55) {
    const bank = THREE.MathUtils.smoothstep(distance, 0.62, 1.55);
    return THREE.MathUtils.lerp(-0.24, base + ridge, bank);
  }
  return base + ridge;
}

function terrainColor(height: number, wetness: number, biome: number) {
  const dry = new THREE.Color("#c3ad68");
  const grass = new THREE.Color("#879d57");
  const deep = new THREE.Color("#617c4d");
  const color = dry.clone().lerp(grass, THREE.MathUtils.clamp(wetness, 0, 1));
  if (biome > 0.48) color.lerp(new THREE.Color("#c8ad61"), THREE.MathUtils.smoothstep(biome, 0.48, 0.9));
  if (biome < -0.48) color.lerp(new THREE.Color("#668f67"), THREE.MathUtils.smoothstep(-biome, 0.48, 0.9));
  if (height > 0.2) color.lerp(deep, Math.min(0.35, height));
  return color;
}

function createBeachGeometry(seed: number, riverSamples: THREE.Vector3[]) {
  const columns = 144;
  const rows = 112;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
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
      if (coast < SHORELINE || coast > BEACH_INNER_EDGE) continue;
      const triangles = [corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]];
      for (const vertex of triangles) {
        const height = heightAt(seed, vertex.x, vertex.z, riverSamples) + 0.035;
        positions.push(vertex.x, height, vertex.z);
        uvs.push((vertex.x + MAP_WIDTH / 2) / MAP_WIDTH, (vertex.z + MAP_DEPTH / 2) / MAP_DEPTH);
        const vertexCoast = landValue(seed, vertex.x, vertex.z);
        const inland = THREE.MathUtils.smoothstep(vertexCoast, SHORELINE, BEACH_INNER_EDGE);
        const sandColor = new THREE.Color("#c59b5d").lerp(new THREE.Color("#f0d69c"), inland);
        const variation = THREE.MathUtils.clamp(
          0.98 + terrainNoise(seed + 970, vertex.x * 2, vertex.z * 2) * 0.12,
          0.92,
          1.04,
        );
        colors.push(sandColor.r * variation, sandColor.g * variation, sandColor.b * variation);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createSurfGeometry(seed: number, riverSamples: THREE.Vector3[]) {
  const columns = 144;
  const rows = 112;
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
  const columns = 144;
  const rows = 112;
  const positions: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -MAP_WIDTH / 2 + (column / columns) * MAP_WIDTH;
      const x1 = -MAP_WIDTH / 2 + ((column + 1) / columns) * MAP_WIDTH;
      const z0 = -MAP_DEPTH / 2 + (row / rows) * MAP_DEPTH;
      const z1 = -MAP_DEPTH / 2 + ((row + 1) / rows) * MAP_DEPTH;
      const coast = landValue(seed, (x0 + x1) / 2, (z0 + z1) / 2);
      if (coast < DEEP_WATER_EDGE || coast > SHORELINE) continue;
      positions.push(
        x0, SEA_LEVEL + 0.022, z0, x1, SEA_LEVEL + 0.022, z0, x1, SEA_LEVEL + 0.022, z1,
        x0, SEA_LEVEL + 0.022, z0, x1, SEA_LEVEL + 0.022, z1, x0, SEA_LEVEL + 0.022, z1,
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createCoastHexGeometries(seed: number, riverSamples: THREE.Vector3[]) {
  const classification = classifyCoastHexes(seed);
  const beachCells = classification.cells.filter((cell) => cell.kind === "beach");
  const shallowCells = classification.cells.filter((cell) => cell.kind === "shallow");

  const makeGeometry = (cells: { x: number; z: number }[], shallow: boolean) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const pushVertex = (x: number, z: number) => {
      const y = shallow
        ? SEA_LEVEL + 0.026
        : Math.max(heightAt(seed, x, z, riverSamples) + 0.055, SEA_LEVEL + 0.045);
      positions.push(x, y, z);
      uvs.push((x + MAP_WIDTH / 2) / MAP_WIDTH, (z + MAP_DEPTH / 2) / MAP_DEPTH);
    };
    for (const cell of cells) {
      const corners = Array.from({ length: 6 }, (_, edge) => {
        const angle = (Math.PI / 180) * (60 * edge - 30);
        return {
          x: cell.x + Math.cos(angle) * HEX_SIZE * 0.995,
          z: cell.z + Math.sin(angle) * HEX_SIZE * 0.995,
        };
      });
      for (let edge = 0; edge < 6; edge += 1) {
        pushVertex(cell.x, cell.z);
        pushVertex(corners[edge].x, corners[edge].z);
        pushVertex(corners[(edge + 1) % 6].x, corners[(edge + 1) % 6].z);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
  };

  return {
    beach: makeGeometry(beachCells, false),
    shallow: makeGeometry(shallowCells, true),
  };
}

function WorldScene({
  seed,
  showGrid,
  debugCoast,
  onHexSelected,
}: {
  seed: number;
  showGrid: boolean;
  debugCoast: boolean;
  onHexSelected: (diagnostic: HexDiagnostic) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b9c8b0");
    // Fog of war must be rendered as a per-hex exploration overlay.
    // A global scene fog would also wash out terrain the player has revealed.

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const aspect = host.clientWidth / host.clientHeight;
    const viewHeight = 44;
    const camera = new THREE.OrthographicCamera(
      (-viewHeight * aspect) / 2,
      (viewHeight * aspect) / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      100,
    );
    camera.position.set(17, 18, 19);
    camera.lookAt(0, 0, 0);
    camera.zoom = 0.88;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.62;
    controls.maxZoom = 2.8;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.48;

    scene.add(new THREE.HemisphereLight("#fff6d7", "#465649", 2.3));
    const sun = new THREE.DirectionalLight("#fff0c1", 3.4);
    sun.position.set(-12, 19, -9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -36;
    sun.shadow.camera.right = 36;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    const textureLoader = new THREE.TextureLoader();
    const { curve, samples } = buildRiver(seed);
    const coastHexGeometries = createCoastHexGeometries(seed, samples);
    const terrainGeometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_DEPTH, 180, 142);
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
      const coast = landValue(seed, x, z);
      if (coast >= SHORELINE && coast < COAST_TRANSITION_EDGE) {
        const beachStrength =
          1 - THREE.MathUtils.smoothstep(coast, BEACH_INNER_EDGE * 0.72, COAST_TRANSITION_EDGE);
        color.lerp(new THREE.Color("#e2c27a"), beachStrength * 0.94);
      }
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
        color: debugCoast ? "#4f934d" : PLAIN_VISUAL_RULE.baseColor,
        map: debugCoast ? null : groundTexture,
        vertexColors: !debugCoast,
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
        color: debugCoast ? "#123b70" : "#286987",
        map: debugCoast ? null : seaTexture,
        roughness: 0.68,
        metalness: 0,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = SEA_LEVEL;
    sea.receiveShadow = true;
    worldRoot.add(sea);

    const shallowWater = new THREE.Mesh(
      coastHexGeometries.shallow,
      new THREE.MeshStandardMaterial({
        color: debugCoast ? "#00f5ff" : "#69cfd0",
        roughness: 0.62,
        metalness: 0,
      }),
    );
    shallowWater.renderOrder = 16;
    worldRoot.add(shallowWater);

    const sandTexture = textureLoader.load("/assets/terrain/beach-sand-real-v1.png");
    sandTexture.colorSpace = THREE.SRGBColorSpace;
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(10, 8);
    sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const beach = new THREE.Mesh(
      debugCoast ? coastHexGeometries.beach : createBeachGeometry(seed, samples),
      new THREE.MeshStandardMaterial({
        color: debugCoast ? "#ffe500" : "#ffffff",
        map: debugCoast ? null : sandTexture,
        vertexColors: !debugCoast,
        roughness: 0.98,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    beach.receiveShadow = true;
    beach.renderOrder = 18;
    worldRoot.add(beach);

    const river = new THREE.Mesh(
      createRiverRibbon(curve),
      new THREE.MeshStandardMaterial({
        color: "#477f99",
        map: waterTexture,
        roughness: 0.55,
        metalness: 0,
        transparent: true,
        opacity: 0.96,
      }),
    );
    river.receiveShadow = true;
    worldRoot.add(river);

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
        if (mountainScore > 0.7) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "mountain" });
        else if (mountainScore > 0.38) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "hill" });
        else if (wetlandScore > 0.72) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "wetland" });
        else if (forestScore > 0.38) terrainCells.set(`${row}:${column}`, { row, column, x, z, type: "forest" });
      }
    }
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
      new THREE.MeshStandardMaterial({ color: "#4d3522", roughness: 1 }),
      treeInstances.length,
    );
    const lowerCanopy = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.5, 1.05, 10),
      new THREE.MeshStandardMaterial({ color: "#2d5c36", roughness: 0.96, flatShading: true }),
      treeInstances.length,
    );
    const upperCanopy = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.36, 0.88, 10),
      new THREE.MeshStandardMaterial({ color: "#477441", roughness: 0.94, flatShading: true }),
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

    const mountainMaterial = new THREE.MeshStandardMaterial({ color: "#77766f", roughness: 0.98, flatShading: true });
    const snowMaterial = new THREE.MeshStandardMaterial({ color: "#e0ded2", roughness: 0.92, flatShading: true });
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
      new THREE.MeshStandardMaterial({ color: "#7f8758", roughness: 0.98, flatShading: true }),
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
      color: "#5d8f82",
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
          new THREE.MeshStandardMaterial({ color: "#7e7b3d", roughness: 1 }),
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

    const rockMaterial = new THREE.MeshStandardMaterial({ color: "#716e61", roughness: 1, flatShading: true });
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

    const selectionGeometry = new THREE.BufferGeometry();
    const selection = new THREE.LineLoop(
      selectionGeometry,
      new THREE.LineBasicMaterial({ color: "#fff27a", transparent: true, opacity: 0.98 }),
    );
    selection.visible = false;
    selection.renderOrder = 10000;
    worldRoot.add(selection);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = new THREE.Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = new THREE.Vector2(event.clientX, event.clientY);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0 || pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(terrain, false)[0];
      if (!hit) return;
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
      const kind = coastKindAt(seed, row, column);
      onHexSelected({
        row,
        column,
        kind,
        height: heightAt(seed, center.x, center.z, samples),
        layer:
          kind === "beach"
            ? "beach-hex"
            : kind === "shallow"
              ? "shallow-water-hex"
              : kind === "deep"
                ? "deep-sea"
                : "terrain",
      });
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    const animate = () => {
      waterTexture.offset.y -= 0.00022;
      seaTexture.offset.x += 0.000025;
      controls.update();
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

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.LineLoop) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
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
  }, [debugCoast, onHexSelected, seed, showGrid]);

  return <div className="world-3d" ref={hostRef} aria-label="WebGL로 렌더링한 2.5D 육각형 세계 지도" />;
}

export function WorldPrototype() {
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [showGrid, setShowGrid] = useState(true);
  const [debugCoast, setDebugCoast] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<HexDiagnostic | null>(null);
  const coastStats = useMemo(() => classifyCoastHexes(seed).counts, [seed]);
  const handleHexSelected = useCallback((diagnostic: HexDiagnostic) => {
    setSelectedDiagnostic(diagnostic);
  }, []);

  const regenerate = () => {
    const parsed = Number(seedText);
    setSeed(Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now());
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * 99999999);
    setSeedText(String(next));
    setSeed(next);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WORLD GENERATION LAB · WEBGL 2.5D</p>
          <h1>World in Hero</h1>
        </div>
        <div className="controls">
          <label>월드 시드<input value={seedText} onChange={(event) => setSeedText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && regenerate()} /></label>
          <button onClick={regenerate}>이 시드로 생성</button>
          <button className="secondary" onClick={randomize}>새로운 세계</button>
          <label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Hex 경계</label>
          <label className="toggle"><input type="checkbox" checked={debugCoast} onChange={(event) => setDebugCoast(event.target.checked)} />해안 진단</label>
        </div>
      </header>
      <section className="stage">
        <WorldScene seed={seed} showGrid={showGrid} debugCoast={debugCoast} onHexSelected={handleHexSelected} />
        {debugCoast && <aside className="coast-debug">
          <strong>MAP DEBUG v33</strong>
          <span><i className="debug-land" />육지 <b>{coastStats.land}</b></span>
          <span><i className="debug-beach" />백사장 <b>{coastStats.beach}</b></span>
          <span><i className="debug-shallow" />얕은 바다 <b>{coastStats.shallow}</b></span>
          <span><i className="debug-deep" />깊은 바다 <b>{coastStats.deep}</b></span>
          {selectedDiagnostic ? (
            <p>
              선택 Hex {selectedDiagnostic.column}, {selectedDiagnostic.row}<br />
              판정 <b>{selectedDiagnostic.kind}</b> · 높이 {selectedDiagnostic.height.toFixed(3)}<br />
              렌더층 {selectedDiagnostic.layer}
            </p>
          ) : <p>Hex를 클릭하면 실제 판정값을 표시합니다.</p>}
        </aside>}
        <aside className="legend">
          <strong>2.5D 지도</strong>
          <span><i style={{ background: "#91a55d" }} />연속 지형</span>
          <span><i style={{ background: "#4f8ba5" }} />파인 강</span>
          <span><i style={{ background: "#405f3f" }} />입체 숲</span>
          <span><i style={{ background: "#77766d" }} />산악</span>
        </aside>
        <div className="selection-card">
          <span>조작 방법</span>
          <strong>휠 확대 · 드래그 이동</strong>
          <em>지형과 강이 실제 높이를 가진 WebGL 장면입니다.</em>
        </div>
      </section>
      <footer><span>현재 검증</span><b>2.5D 연속 지면</b><b>지형을 파낸 강</b><b>입체 그림자</b><small>이 버전에서 시점과 그래픽 방향을 먼저 확인합니다.</small></footer>
    </main>
  );
}
