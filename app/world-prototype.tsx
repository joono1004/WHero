"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Terrain = "ocean" | "shallows" | "coast" | "plain" | "meadow" | "woodland" | "forest" | "hill" | "foothill" | "mountain";
type Cell = { q: number; r: number; terrain: Terrain; elevation: number; moisture: number };

const COLS = 20;
const ROWS = 20;
const SQRT3 = Math.sqrt(3);

function hash(seed: number, x: number, y: number) {
  let value = seed ^ Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(seed: number, x: number, y: number) {
  let total = 0;
  let weight = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const w = 1 / (1 + Math.abs(dx) + Math.abs(dy));
      total += hash(seed, x + dx, y + dy) * w;
      weight += w;
    }
  }
  return total / weight;
}

function generateWorld(seed: number): Cell[] {
  const raw = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, q) => {
      const nx = q / (COLS - 1) - 0.5;
      const ny = r / (ROWS - 1) - 0.5;
      const island = Math.max(0, 1 - Math.pow(Math.hypot(nx * 1.08, ny) * 1.7, 2));
      const elevation = smoothNoise(seed, q, r) * 0.7 + island * 0.42;
      const moisture = smoothNoise(seed + 9187, q, r);
      let terrain: Terrain = elevation < 0.46 ? "ocean" : elevation > 0.79 ? "mountain" : elevation > 0.68 ? "hill" : moisture > 0.59 ? "forest" : "plain";
      return { q, r, terrain, elevation, moisture };
    }),
  );

  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const get = (q: number, r: number) => raw[r]?.[q];
  const adjacent = (cell: Cell) => neighbors.map(([dq, dr]) => get(cell.q + dq, cell.r + dr)).filter(Boolean) as Cell[];

  const removeSmallGroups = (terrain: Terrain, minimum: number, fallback: Terrain) => {
    const pending = new Set(raw.flat().filter((cell) => cell.terrain === terrain).map((cell) => `${cell.q},${cell.r}`));
    while (pending.size) {
      const first = pending.values().next().value as string;
      pending.delete(first);
      const queue = [first];
      const group: Cell[] = [];
      while (queue.length) {
        const [q, r] = queue.pop()!.split(",").map(Number);
        const cell = get(q, r);
        if (!cell) continue;
        group.push(cell);
        for (const [dq, dr] of neighbors) {
          const key = `${q + dq},${r + dr}`;
          if (pending.delete(key)) queue.push(key);
        }
      }
      if (group.length < minimum) group.forEach((cell) => { cell.terrain = fallback; });
    }
  };

  removeSmallGroups("mountain", 2, "hill");
  removeSmallGroups("hill", 2, "plain");
  for (let pass = 0; pass < 2; pass += 1) {
    for (const cell of raw.flat()) {
      if (cell.terrain === "forest" && adjacent(cell).some((other) => other.terrain === "hill" || other.terrain === "mountain")) cell.terrain = "plain";
    }
  }
  removeSmallGroups("forest", 2, "plain");

  const beforeTransitions = raw.flat().map((cell) => ({ ...cell }));
  const original = new Map(beforeTransitions.map((cell) => [`${cell.q},${cell.r}`, cell]));
  const originalAdjacent = (cell: Cell) => neighbors.map(([dq, dr]) => original.get(`${cell.q + dq},${cell.r + dr}`)).filter(Boolean) as Cell[];

  for (const cell of raw.flat()) {
    const source = original.get(`${cell.q},${cell.r}`)!;
    if (source.terrain === "ocean") continue;
    const around = originalAdjacent(source);
    if (around.some((other) => other.terrain === "mountain") && source.terrain !== "mountain") cell.terrain = "foothill";
  }
  for (const cell of raw.flat()) {
    const source = original.get(`${cell.q},${cell.r}`)!;
    if (cell.terrain !== source.terrain || source.terrain !== "plain") continue;
    const around = originalAdjacent(source);
    if (around.some((other) => other.terrain === "forest")) cell.terrain = "woodland";
    else if (around.some((other) => other.terrain === "hill")) cell.terrain = "meadow";
  }

  const coastKeys = new Set(
    raw
      .flat()
      .filter(
        (cell) =>
          cell.terrain === "ocean" &&
          adjacent(cell).some((other) => other.terrain !== "ocean"),
      )
      .map((cell) => `${cell.q},${cell.r}`),
  );
  const shallowKeys = new Set(
    raw
      .flat()
      .filter(
        (cell) =>
          cell.terrain === "ocean" &&
          !coastKeys.has(`${cell.q},${cell.r}`) &&
          adjacent(cell).some((other) =>
            coastKeys.has(`${other.q},${other.r}`),
          ),
      )
      .map((cell) => `${cell.q},${cell.r}`),
  );

  return raw.flat().map((cell) => {
    if (cell.terrain !== "ocean") return cell;
    const key = `${cell.q},${cell.r}`;
    if (coastKeys.has(key)) return { ...cell, terrain: "coast" as const };
    if (shallowKeys.has(key)) return { ...cell, terrain: "shallows" as const };
    return cell;
  });
}

const colors: Record<Terrain, [string, string]> = {
  ocean: ["#183f54", "#245c72"],
  shallows: ["#28677a", "#438b96"],
  coast: ["#2e7283", "#62a3a4"],
  plain: ["#718759", "#9aa66b"],
  meadow: ["#7e8a5c", "#aaa46f"],
  woodland: ["#516c4c", "#72845a"],
  forest: ["#385f48", "#547558"],
  hill: ["#756f51", "#938366"],
  foothill: ["#686754", "#87806a"],
  mountain: ["#76756e", "#a19d91"],
};

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function WorldPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [groundTexture, setGroundTexture] = useState<HTMLImageElement | null>(null);
  const [forestSprite, setForestSprite] = useState<HTMLImageElement | null>(null);
  const [hillSprite, setHillSprite] = useState<HTMLImageElement | null>(null);
  const [mountainSprite, setMountainSprite] = useState<HTMLImageElement | null>(null);
  const [riverTexture, setRiverTexture] = useState<HTMLImageElement | null>(null);
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [showGrid, setShowGrid] = useState(true);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const cells = useMemo(() => generateWorld(seed), [seed]);

  useEffect(() => {
    const load = (source: string, setter: (image: HTMLImageElement) => void) => {
      const image = new Image();
      image.src = source;
      image.onload = () => setter(image);
    };
    load("/assets/terrain/ground-texture-v1.png", setGroundTexture);
    load("/assets/terrain/forest-cluster-v1.png", setForestSprite);
    load("/assets/terrain/hill-cluster-v1.png", setHillSprite);
    load("/assets/terrain/mountain-ridge-v1.png", setMountainSprite);
    load("/assets/terrain/river-water-v1.png", setRiverTexture);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b2029";
    ctx.fillRect(0, 0, width, height);

    const baseSize = Math.min(width / (SQRT3 * (COLS + 0.5)), height / (1.5 * ROWS + 0.5));
    const size = baseSize * view.zoom;
    const mapWidth = SQRT3 * size * (COLS + 0.5);
    const mapHeight = size * (1.5 * ROWS + 0.5);
    const ox = (width - mapWidth) / 2 + SQRT3 * size / 2 + view.x;
    const oy = (height - mapHeight) / 2 + size + view.y;
    const centerOf = (cell: Cell) => ({
      x: ox + SQRT3 * size * (cell.q + cell.r / 2),
      y: oy + 1.5 * size * cell.r,
    });
    const cellByCoordinate = new Map(cells.map((cell) => [`${cell.q},${cell.r}`, cell]));

    for (const cell of cells) {
      const { x: cx, y: cy } = centerOf(cell);
      hexPath(ctx, cx, cy, size + 0.6);
      const [dark, light] = colors[cell.terrain];
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (cell.terrain !== "ocean" && cell.terrain !== "shallows" && cell.terrain !== "coast" && groundTexture) {
        ctx.save();
        hexPath(ctx, cx, cy, size + 0.4);
        ctx.clip();
        ctx.globalAlpha = cell.terrain === "mountain" ? 0.18 : 0.34;
        ctx.drawImage(groundTexture, 0, 0, width, height);
        ctx.restore();
      }

      if (!["ocean", "shallows", "coast"].includes(cell.terrain)) {
        ctx.save();
        hexPath(ctx, cx, cy, size + 0.3);
        ctx.clip();
        const relief = ctx.createRadialGradient(
          cx - size * 0.35,
          cy - size * 0.38,
          size * 0.08,
          cx + size * 0.18,
          cy + size * 0.3,
          size * 1.15,
        );
        const reliefStrength = 0.08 + Math.max(0, cell.elevation - 0.48) * 0.3;
        relief.addColorStop(0, `rgba(255,244,203,${reliefStrength})`);
        relief.addColorStop(0.58, "rgba(255,255,255,0)");
        relief.addColorStop(1, `rgba(23,28,23,${reliefStrength * 1.35})`);
        ctx.fillStyle = relief;
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2);

        const detailCount = cell.terrain === "plain" || cell.terrain === "meadow" ? 10 : 5;
        for (let i = 0; i < detailCount; i += 1) {
          const angle = hash(seed + 211 + i, cell.q, cell.r) * Math.PI * 2;
          const distance = Math.sqrt(hash(seed + 311 + i, cell.r, cell.q)) * size * 0.68;
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance * 0.68;
          const radius = size * (0.018 + hash(seed + 411 + i, cell.q, cell.r) * 0.035);
          ctx.fillStyle = i % 3 === 0 ? "rgba(225,211,151,.22)" : "rgba(49,73,44,.17)";
          ctx.beginPath();
          ctx.ellipse(cx + dx, cy + dy, radius * 1.8, radius * 0.65, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (cell.terrain === "ocean" || cell.terrain === "shallows") {
        ctx.strokeStyle = cell.terrain === "shallows" ? "rgba(177,225,222,.18)" : "rgba(151,211,220,.15)";
        ctx.lineWidth = Math.max(0.7, size * 0.035);
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(cx + i * size * 0.24, cy + i * size * 0.09, size * 0.27, Math.PI * 1.08, Math.PI * 1.72);
          ctx.stroke();
        }
      }

    }

    const neighborDirections = [[1, 0], [0, 1], [-1, 1]];
    const isWater = (terrain: Terrain) => terrain === "ocean" || terrain === "shallows" || terrain === "coast";

    for (const cell of cells) {
      const a = centerOf(cell);
      for (const [dq, dr] of neighborDirections) {
        const neighbor = cellByCoordinate.get(`${cell.q + dq},${cell.r + dr}`);
        if (!neighbor || neighbor.terrain === cell.terrain) continue;
        const b = centerOf(neighbor);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const length = Math.hypot(vx, vy);
        const px = -vy / length;
        const py = vx / length;
        const pair = new Set([cell.terrain, neighbor.terrain]);

        let band = "rgba(128,126,83,.42)";
        if (pair.has("forest") || pair.has("woodland")) band = "rgba(64,102,65,.58)";
        if (pair.has("hill") || pair.has("foothill") || pair.has("mountain")) band = "rgba(122,112,83,.56)";
        if (isWater(cell.terrain) !== isWater(neighbor.terrain)) band = "rgba(209,193,132,.74)";
        if (pair.has("coast") && pair.has("shallows")) band = "rgba(107,177,176,.5)";
        if (pair.has("ocean") && pair.has("shallows")) band = "rgba(63,124,139,.46)";

        ctx.save();
        const waterBoundary = isWater(cell.terrain) !== isWater(neighbor.terrain);
        ctx.strokeStyle = band;
        ctx.lineWidth = size * (waterBoundary ? 0.18 : 0.3);
        ctx.lineCap = "round";
        const curve = (hash(seed + 740, cell.q + neighbor.q, cell.r + neighbor.r) - 0.5) * size * 0.28;
        ctx.beginPath();
        ctx.moveTo(mx - px * size * 0.42, my - py * size * 0.42);
        ctx.quadraticCurveTo(mx + (vx / length) * curve, my + (vy / length) * curve, mx + px * size * 0.42, my + py * size * 0.42);
        ctx.stroke();

        if (waterBoundary) {
          ctx.strokeStyle = "rgba(235,241,220,.58)";
          ctx.lineWidth = Math.max(0.8, size * 0.035);
          ctx.beginPath();
          ctx.moveTo(mx - px * size * 0.4, my - py * size * 0.4);
          ctx.quadraticCurveTo(mx + (vx / length) * curve * 0.82, my + (vy / length) * curve * 0.82, mx + px * size * 0.4, my + py * size * 0.4);
          ctx.stroke();
        }

        if (!waterBoundary) for (let i = 0; i < 9; i += 1) {
          const along = (i / 8 - 0.5) * size * 0.92;
          const scatter = (hash(seed + 500 + i, cell.q + neighbor.q, cell.r + neighbor.r) - 0.5) * size * 0.33;
          const x = mx + px * along + (vx / length) * scatter;
          const y = my + py * along + (vy / length) * scatter;
          const radius = size * (0.035 + hash(seed + 620 + i, neighbor.q, cell.r) * 0.07);

          if ((pair.has("forest") || pair.has("woodland")) && !isWater(cell.terrain) && !isWater(neighbor.terrain)) {
            ctx.fillStyle = i % 2 ? "#42694a" : "#68805a";
            ctx.beginPath(); ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2); ctx.fill();
          } else if ((pair.has("hill") || pair.has("foothill") || pair.has("mountain")) && !isWater(cell.terrain) && !isWater(neighbor.terrain)) {
            ctx.fillStyle = i % 2 ? "#746f60" : "#9b8f72";
            ctx.beginPath(); ctx.ellipse(x, y, radius * 1.35, radius * 0.72, i * 0.7, 0, Math.PI * 2); ctx.fill();
          }
        }

        if (forestSprite && pair.has("forest") && pair.has("woodland")) {
          const transitionWidth = size * 0.82;
          const transitionHeight = transitionWidth * (forestSprite.height / forestSprite.width);
          ctx.save();
          ctx.globalAlpha = 0.58;
          ctx.drawImage(forestSprite, mx - transitionWidth / 2, my - transitionHeight * 0.58, transitionWidth, transitionHeight);
          ctx.restore();
        }
        if (hillSprite && pair.has("foothill") && (pair.has("hill") || pair.has("mountain"))) {
          const transitionWidth = size * 1.18;
          const transitionHeight = transitionWidth * (hillSprite.height / hillSprite.width);
          ctx.save();
          ctx.globalAlpha = 0.82;
          ctx.drawImage(hillSprite, mx - transitionWidth / 2, my - transitionHeight * 0.64, transitionWidth, transitionHeight);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    const riverDirections = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    const riverSources: Cell[] = [];
    for (const candidate of [...cells]
      .filter((cell) => cell.terrain === "mountain" || cell.terrain === "hill")
      .sort((a, b) => b.elevation - a.elevation)) {
      if (riverSources.length >= 3) break;
      if (riverSources.every((source) => Math.hypot(source.q - candidate.q, source.r - candidate.r) > 5)) {
        riverSources.push(candidate);
      }
    }
    const riverRoutes: Cell[][] = [];
    for (const source of riverSources) {
      const sourceKey = `${source.q},${source.r}`;
      const costs = new Map<string, number>([[sourceKey, 0]]);
      const previous = new Map<string, string>();
      const frontier = [sourceKey];
      let targetKey: string | null = null;

      while (frontier.length) {
        frontier.sort((a, b) => costs.get(a)! - costs.get(b)!);
        const currentKey = frontier.shift()!;
        const current = cellByCoordinate.get(currentKey)!;
        if (isWater(current.terrain)) {
          targetKey = currentKey;
          break;
        }
        for (const [dq, dr] of riverDirections) {
          const next = cellByCoordinate.get(`${current.q + dq},${current.r + dr}`);
          if (!next) continue;
          const nextKey = `${next.q},${next.r}`;
          const uphill = Math.max(0, next.elevation - current.elevation);
          const terrainPenalty = next.terrain === "mountain" && current !== source ? 2.4 : next.terrain === "hill" ? 0.45 : 0;
          const meander = hash(seed + 1701, next.q, next.r) * 0.52;
          const nextCost = costs.get(currentKey)! + 1 + uphill * 34 + terrainPenalty + meander;
          if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
          costs.set(nextKey, nextCost);
          previous.set(nextKey, currentKey);
          if (!frontier.includes(nextKey)) frontier.push(nextKey);
        }
      }

      if (targetKey) {
        const route: Cell[] = [];
        let cursor: string | undefined = targetKey;
        while (cursor) {
          const cell = cellByCoordinate.get(cursor);
          if (cell) route.push(cell);
          if (cursor === sourceKey) break;
          cursor = previous.get(cursor);
        }
        route.reverse();
        if (route.length >= 5) riverRoutes.push(route);
      }
    }

    const drawRivers = () => {
    const riverPattern = riverTexture ? ctx.createPattern(riverTexture, "repeat") : null;
    riverPattern?.setTransform(new DOMMatrix().scale(Math.max(0.022, size / 620)));
    for (const route of riverRoutes) {
      const centers = route.map(centerOf);
      const points = [
        centers[0],
        ...centers.slice(0, -1).map((point, index) => {
          const next = centers[index + 1];
          const dx = next.x - point.x;
          const dy = next.y - point.y;
          const length = Math.hypot(dx, dy);
          const bend = (hash(seed + 1801 + index, route[index].q, route[index].r) - 0.5) * size * 0.28;
          return {
            x: (point.x + next.x) / 2 + (-dy / length) * bend,
            y: (point.y + next.y) / 2 + (dx / length) * bend,
          };
        }),
        centers[centers.length - 1],
      ];

      for (let i = 0; i < points.length - 1; i += 1) {
        const start = points[i];
        const end = points[i + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        const progress = i / Math.max(1, points.length - 2);
        const curve = (hash(seed + 1901 + i, route[0].q, route[0].r) - 0.5) * size * 0.32;
        const controlX = (start.x + end.x) / 2 + (-dy / length) * curve;
        const controlY = (start.y + end.y) / 2 + (dx / length) * curve;
        const terrain = route[Math.min(i, route.length - 1)].terrain;
        const trace = (color: string | CanvasPattern, lineWidth: number) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
          ctx.stroke();
        };

        const valleyStyle =
          terrain === "forest" || terrain === "woodland"
            ? { color: "rgba(103,119,76,.98)", width: 0.68 }
            : terrain === "mountain"
              ? { color: "rgba(105,101,89,.97)", width: 0.49 }
              : terrain === "hill" || terrain === "foothill"
                ? { color: "rgba(126,118,88,.97)", width: 0.54 }
                : { color: "rgba(126,145,86,.96)", width: 0.46 };
        const waterBase =
          terrain === "plain" || terrain === "meadow"
            ? 0.18
            : terrain === "forest" || terrain === "woodland"
              ? 0.115
              : 0.085;
        const waterWidth = size * (waterBase + progress * (terrain === "plain" || terrain === "meadow" ? 0.16 : 0.095));
        const widthVariation = 0.92 + hash(seed + 2051 + i, route[i]?.q ?? 0, route[i]?.r ?? 0) * 0.18;

        // Draw an opaque valley first so forests and relief are visually split
        // into two banks instead of leaving the river painted over their art.
        trace(valleyStyle.color, size * valleyStyle.width * widthVariation);
        trace("rgba(54,45,30,.64)", waterWidth * widthVariation + size * 0.13);
        trace("rgba(171,151,99,.62)", waterWidth * widthVariation + size * 0.065);
        trace("rgba(34,94,116,.96)", waterWidth * widthVariation);
        if (riverPattern) {
          ctx.globalAlpha = 0.92;
          trace(riverPattern, waterWidth * widthVariation * 0.9);
        }
        ctx.globalAlpha = 1;
        trace("rgba(205,237,232,.62)", Math.max(0.75, waterWidth * 0.16));

        if (terrain === "forest" || terrain === "woodland") {
          const nx = -dy / length;
          const ny = dx / length;
          for (const side of [-1, 1]) {
            for (let tree = 0; tree < 3; tree += 1) {
              const t = 0.24 + tree * 0.26;
              const bankDistance = size * (valleyStyle.width * 0.55 + 0.08);
              const tx = start.x + dx * t + nx * bankDistance * side;
              const ty = start.y + dy * t + ny * bankDistance * side;
              ctx.fillStyle = tree % 2 ? "#355f43" : "#4b7350";
              ctx.beginPath();
              ctx.arc(tx, ty, size * (0.055 + tree * 0.006), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      const spring = points[0];
      ctx.fillStyle = "rgba(68,139,157,.88)";
      ctx.beginPath();
      ctx.ellipse(spring.x, spring.y, size * 0.09, size * 0.055, -0.25, 0, Math.PI * 2);
      ctx.fill();

      if (points.length >= 4) {
        const deltaStart = points[points.length - 3];
        const mouth = points[points.length - 1];
        const dx = mouth.x - deltaStart.x;
        const dy = mouth.y - deltaStart.y;
        const length = Math.hypot(dx, dy);
        const nx = -dy / length;
        const ny = dx / length;
        for (const branch of [-0.34, 0, 0.34]) {
          const endX = mouth.x + nx * size * branch;
          const endY = mouth.y + ny * size * branch;
          ctx.strokeStyle = riverPattern ?? "rgba(62,137,157,.88)";
          ctx.lineWidth = size * (branch === 0 ? 0.19 : 0.12);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(deltaStart.x, deltaStart.y);
          ctx.quadraticCurveTo(
            (deltaStart.x + endX) / 2 + nx * size * branch * 0.5,
            (deltaStart.y + endY) / 2 + ny * size * branch * 0.5,
            endX,
            endY,
          );
          ctx.stroke();
        }
        const plume = ctx.createRadialGradient(mouth.x, mouth.y, 0, mouth.x, mouth.y, size * 0.72);
        plume.addColorStop(0, "rgba(83,155,167,.42)");
        plume.addColorStop(1, "rgba(83,155,167,0)");
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.ellipse(mouth.x, mouth.y, size * 0.72, size * 0.38, Math.atan2(dy, dx), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    };

    const allDirections = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    const terrainGroups = (terrain: Terrain) => {
      const remaining = new Set(cells.filter((cell) => cell.terrain === terrain).map((cell) => `${cell.q},${cell.r}`));
      const groups: Cell[][] = [];
      while (remaining.size > 0) {
        const first = remaining.values().next().value as string;
        remaining.delete(first);
        const queue = [first];
        const group: Cell[] = [];
        while (queue.length) {
          const key = queue.pop()!;
          const cell = cellByCoordinate.get(key);
          if (!cell) continue;
          group.push(cell);
          for (const [dq, dr] of allDirections) {
            const next = `${cell.q + dq},${cell.r + dr}`;
            if (remaining.delete(next)) queue.push(next);
          }
        }
        groups.push(group);
      }
      return groups;
    };

    const drawConnectedTerrain = (groups: Cell[][], sprite: HTMLImageElement | null, kind: "woodland" | "forest" | "hill" | "foothill" | "mountain") => {
      if (!sprite) return;
      const ratio = sprite.height / sprite.width;
      for (const group of groups) {
        const points = group.map(centerOf);
        if (kind === "forest") {
          const minX = Math.min(...points.map((point) => point.x));
          const maxX = Math.max(...points.map((point) => point.x));
          const minY = Math.min(...points.map((point) => point.y));
          const maxY = Math.max(...points.map((point) => point.y));
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const desiredWidth = Math.max(
            maxX - minX + size * 2.05,
            (maxY - minY + size * 1.5) / ratio,
          );
          const spriteWidth = Math.min(desiredWidth, size * 6.8);
          const spriteHeight = spriteWidth * ratio;

          ctx.save();
          ctx.beginPath();
          for (const cell of group) {
            const center = centerOf(cell);
            for (let i = 0; i < 6; i += 1) {
              const angle = (Math.PI / 180) * (60 * i - 30);
              const x = center.x + size * 1.09 * Math.cos(angle);
              const y = center.y + size * 1.09 * Math.sin(angle);
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
          }
          ctx.clip("nonzero");
          ctx.fillStyle = "rgba(23,58,39,.48)";
          ctx.fillRect(minX - size, minY - size, maxX - minX + size * 2, maxY - minY + size * 2);
          ctx.globalAlpha = 0.95;
          ctx.shadowColor = "rgba(2,12,10,.55)";
          ctx.shadowBlur = size * 0.22;
          ctx.shadowOffsetY = size * 0.12;
          ctx.drawImage(sprite, cx - spriteWidth / 2, cy - spriteHeight * 0.61, spriteWidth, spriteHeight);
          ctx.restore();

          continue;
        }
        if (kind === "woodland") {
          const anchors: { x: number; y: number; cell: Cell }[] = [];
          for (const cell of [...group].sort((a, b) => hash(seed + 991, a.q, a.r) - hash(seed + 991, b.q, b.r))) {
            const point = centerOf(cell);
            const spacing = kind === "forest" ? size * 2.18 : size * 1.55;
            if (anchors.every((anchor) => Math.hypot(point.x - anchor.x, point.y - anchor.y) > spacing)) anchors.push({ ...point, cell });
          }
          for (const anchor of anchors) {
            const baseWidth = kind === "forest" ? 2.25 : 0.88;
            const spriteWidth = size * (baseWidth + hash(seed + 992, anchor.cell.q, anchor.cell.r) * (kind === "forest" ? 0.36 : 0.2));
            const spriteHeight = spriteWidth * ratio;
            ctx.save();
            if (hash(seed + 993, anchor.cell.r, anchor.cell.q) > 0.5) {
              ctx.translate(anchor.x, 0); ctx.scale(-1, 1); ctx.translate(-anchor.x, 0);
            }
            ctx.globalAlpha = kind === "forest" ? 0.93 : 0.62;
            ctx.shadowColor = "rgba(2,12,10,.5)";
            ctx.shadowBlur = size * 0.18;
            ctx.shadowOffsetY = size * 0.12;
            ctx.drawImage(sprite, anchor.x - spriteWidth / 2, anchor.y - spriteHeight * 0.61, spriteWidth, spriteHeight);
            ctx.restore();
          }
          continue;
        }
        const minX = Math.min(...points.map((point) => point.x));
        const maxX = Math.max(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        const maxY = Math.max(...points.map((point) => point.y));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const desiredWidth = Math.max(maxX - minX + size * 1.75, (maxY - minY + size * 1.25) / ratio);
        const isLowHill = kind === "hill" || kind === "foothill";
        const widthLimit = size * (isLowHill ? 4.4 : 5.1);
        const spriteWidth = Math.min(desiredWidth, widthLimit);
        const spriteHeight = spriteWidth * ratio;

        ctx.save();
        ctx.beginPath();
        for (const cell of group) {
          const center = centerOf(cell);
          for (let i = 0; i < 6; i += 1) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const x = center.x + size * 1.08 * Math.cos(angle);
            const y = center.y + size * 1.08 * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
        ctx.clip("nonzero");
        ctx.globalAlpha = kind === "hill" ? 0.93 : kind === "foothill" ? 0.74 : 0.97;
        ctx.shadowColor = isLowHill ? "rgba(35,26,16,.48)" : "rgba(4,11,13,.64)";
        ctx.shadowBlur = size * 0.2;
        ctx.shadowOffsetY = size * 0.14;
        ctx.drawImage(sprite, cx - spriteWidth / 2, cy - spriteHeight * (isLowHill ? 0.61 : 0.72), spriteWidth, spriteHeight);
        ctx.restore();

        if (group.length >= 6) {
          const secondaryWidth = spriteWidth * 0.72;
          const secondaryHeight = secondaryWidth * ratio;
          const anchor = points[Math.floor(hash(seed + group.length, group[0].q, group[0].r) * points.length)];
          ctx.save();
          ctx.globalAlpha = isLowHill ? 0.72 : 0.86;
          ctx.drawImage(sprite, anchor.x - secondaryWidth / 2, anchor.y - secondaryHeight * 0.66, secondaryWidth, secondaryHeight);
          ctx.restore();
        }
      }
    };

    drawConnectedTerrain(terrainGroups("woodland"), forestSprite, "woodland");
    drawConnectedTerrain(terrainGroups("forest"), forestSprite, "forest");
    drawConnectedTerrain(terrainGroups("foothill"), hillSprite, "foothill");
    drawConnectedTerrain(terrainGroups("hill"), hillSprite, "hill");
    drawConnectedTerrain(terrainGroups("mountain"), mountainSprite, "mountain");
    drawRivers();

    for (const cell of cells) {
      const { x: cx, y: cy } = centerOf(cell);
      if (showGrid) {
        hexPath(ctx, cx, cy, size);
        ctx.strokeStyle = isWater(cell.terrain) ? "rgba(205,236,238,.29)" : "rgba(245,230,190,.34)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (selected?.q === cell.q && selected?.r === cell.r) {
        hexPath(ctx, cx, cy, size - 1);
        ctx.strokeStyle = "#ffd76a";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let best: Cell | null = null;
      let bestDistance = Infinity;
      for (const cell of cells) {
        const { x: cx, y: cy } = centerOf(cell);
        const distance = Math.hypot(x - cx, y - cy);
        if (distance < bestDistance && distance < size) { best = cell; bestDistance = distance; }
      }
      setSelected(best);
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - width / 2;
      const pointerY = event.clientY - rect.top - height / 2;
      const factor = event.deltaY < 0 ? 1.13 : 0.885;
      setView((previous) => {
        const zoom = Math.min(2.8, Math.max(0.72, previous.zoom * factor));
        const applied = zoom / previous.zoom;
        return {
          zoom,
          x: pointerX - (pointerX - previous.x) * applied,
          y: pointerY - (pointerY - previous.y) * applied,
        };
      });
    };
    const handlePointerDown = (event: PointerEvent) => {
      dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      setView((previous) => ({ ...previous, x: previous.x + dx, y: previous.y + dy }));
    };
    const handlePointerUp = (event: PointerEvent) => {
      dragRef.current.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
    };
    canvas.style.cursor = "grab";
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [cells, forestSprite, groundTexture, hillSprite, mountainSprite, riverTexture, seed, selected, showGrid, view]);

  const regenerate = () => {
    const parsed = Number(seedText);
    setSelected(null);
    setView({ zoom: 1, x: 0, y: 0 });
    setSeed(Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now());
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * 99999999);
    setSeedText(String(next));
    setSeed(next);
    setSelected(null);
    setView({ zoom: 1, x: 0, y: 0 });
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WORLD GENERATION LAB · PROTOTYPE 01</p>
          <h1>World in Hero</h1>
        </div>
        <div className="controls">
          <label>세계 시드<input value={seedText} onChange={(event) => setSeedText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && regenerate()} /></label>
          <button onClick={regenerate}>이 시드로 생성</button>
          <button className="secondary" onClick={randomize}>새로운 세계</button>
          <button className="secondary" onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>화면 맞춤</button>
          <label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Hex 경계</label>
        </div>
      </header>
      <section className="stage">
        <canvas ref={canvasRef} aria-label="랜덤으로 생성된 육각형 세계 지도" />
        <aside className="legend">
          <strong>지형</strong>
          {Object.entries({ 평원: "plain", 구릉: "meadow", 숲가장자리: "woodland", 숲: "forest", 언덕: "hill", 산기슭: "foothill", 산: "mountain", 해안: "coast", 얕은바다: "shallows", 바다: "ocean" }).map(([name, type]) => <span key={type}><i style={{ background: colors[type as Terrain][1] }} />{name}</span>)}
        </aside>
        <div className="selection-card">
          {selected ? <><span>선택한 지역</span><strong>{selected.q}, {selected.r}</strong><em>{({ ocean: "바다", shallows: "얕은 바다", coast: "해안", plain: "평원", meadow: "완만한 구릉", woodland: "숲 가장자리", forest: "울창한 숲", hill: "언덕", foothill: "산기슭", mountain: "산" } as Record<Terrain, string>)[selected.terrain]}</em></> : <><span>지도를 눌러보세요</span><strong>지역 정보</strong><em>Hex 경계와 지형 연결을 확인합니다.</em></>}
        </div>
      </section>
      <footer><span>현재 검증</span><b>고도·강·해안 연결</b><b>휠 확대/축소</b><b>드래그 지도 이동</b><small>휠로 확대하고 지도를 잡아 끌어 이동할 수 있습니다.</small></footer>
    </main>
  );
}
