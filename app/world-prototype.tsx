"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Terrain = "ocean" | "coast" | "plain" | "forest" | "hill" | "mountain";
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
      let terrain: Terrain = elevation < 0.46 ? "ocean" : elevation > 0.8 ? "mountain" : elevation > 0.7 ? "hill" : moisture > 0.56 ? "forest" : "plain";
      return { q, r, terrain, elevation, moisture };
    }),
  );

  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  return raw.flat().map((cell) => {
    if (cell.terrain !== "ocean") return cell;
    const touchesLand = neighbors.some(([dq, dr]) => {
      const other = raw[cell.r + dr]?.[cell.q + dq];
      return other && other.terrain !== "ocean";
    });
    return touchesLand ? { ...cell, terrain: "coast" as const } : cell;
  });
}

const colors: Record<Terrain, [string, string]> = {
  ocean: ["#183f54", "#245c72"],
  coast: ["#2e7283", "#62a3a4"],
  plain: ["#718759", "#9aa66b"],
  forest: ["#385f48", "#547558"],
  hill: ["#756f51", "#938366"],
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
  const [mountainSprite, setMountainSprite] = useState<HTMLImageElement | null>(null);
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [showGrid, setShowGrid] = useState(true);
  const [selected, setSelected] = useState<Cell | null>(null);
  const cells = useMemo(() => generateWorld(seed), [seed]);

  useEffect(() => {
    const load = (source: string, setter: (image: HTMLImageElement) => void) => {
      const image = new Image();
      image.src = source;
      image.onload = () => setter(image);
    };
    load("/assets/terrain/ground-texture-v1.png", setGroundTexture);
    load("/assets/terrain/forest-cluster-v1.png", setForestSprite);
    load("/assets/terrain/mountain-ridge-v1.png", setMountainSprite);
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

    const size = Math.min(width / (SQRT3 * (COLS + 0.5)), height / (1.5 * ROWS + 0.5));
    const mapWidth = SQRT3 * size * (COLS + 0.5);
    const mapHeight = size * (1.5 * ROWS + 0.5);
    const ox = (width - mapWidth) / 2 + SQRT3 * size / 2;
    const oy = (height - mapHeight) / 2 + size;
    const centerOf = (cell: Cell) => ({
      x: ox + SQRT3 * size * (cell.q + cell.r / 2),
      y: oy + 1.5 * size * cell.r,
    });
    const cellByCoordinate = new Map(cells.map((cell) => [`${cell.q},${cell.r}`, cell]));

    for (const cell of cells) {
      const { x: cx, y: cy } = centerOf(cell);
      hexPath(ctx, cx, cy, size + 0.6);
      const [dark, light] = colors[cell.terrain];
      const gradient = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (cell.terrain !== "ocean" && cell.terrain !== "coast" && groundTexture) {
        ctx.save();
        hexPath(ctx, cx, cy, size + 0.4);
        ctx.clip();
        ctx.globalAlpha = cell.terrain === "mountain" ? 0.18 : 0.34;
        const patchSize = size * 5.4;
        const tx = cx - (hash(seed + 220, cell.q, cell.r) * patchSize);
        const ty = cy - (hash(seed + 221, cell.r, cell.q) * patchSize);
        ctx.drawImage(groundTexture, tx, ty, patchSize, patchSize);
        ctx.restore();
      }

      if (cell.terrain === "ocean") {
        ctx.strokeStyle = "rgba(151,211,220,.15)";
        ctx.lineWidth = Math.max(0.7, size * 0.035);
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(cx + i * size * 0.24, cy + i * size * 0.09, size * 0.27, Math.PI * 1.08, Math.PI * 1.72);
          ctx.stroke();
        }
      }

      if (cell.terrain === "coast") {
        ctx.strokeStyle = "rgba(213,236,217,.42)";
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.03, size * 0.46, Math.PI * 1.05, Math.PI * 1.88);
        ctx.stroke();
        ctx.strokeStyle = "rgba(238,224,174,.33)";
        ctx.lineWidth = Math.max(1, size * 0.12);
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.02, size * 0.58, Math.PI * 0.96, Math.PI * 1.94);
        ctx.stroke();
      }

      if (cell.terrain === "forest") {
        if (forestSprite) {
          const scale = 1.65 + hash(seed + 770, cell.q, cell.r) * 0.28;
          const spriteWidth = size * scale;
          const spriteHeight = spriteWidth * (forestSprite.height / forestSprite.width);
          ctx.save();
          ctx.globalAlpha = 0.94;
          ctx.shadowColor = "rgba(2,12,10,.5)";
          ctx.shadowBlur = size * 0.18;
          ctx.shadowOffsetY = size * 0.12;
          ctx.drawImage(forestSprite, cx - spriteWidth / 2, cy - spriteHeight * 0.65, spriteWidth, spriteHeight);
          ctx.restore();
        } else for (let i = 0; i < 7; i += 1) {
          const px = cx + (hash(seed + i, cell.q, cell.r) - 0.5) * size * 1.18;
          const py = cy + (hash(seed + 41 + i, cell.r, cell.q) - 0.5) * size * 0.95;
          const crown = size * (0.1 + hash(seed + 70 + i, cell.q, cell.r) * 0.08);
          ctx.fillStyle = "rgba(5,20,17,.28)";
          ctx.beginPath(); ctx.ellipse(px + crown * 0.35, py + crown * 0.45, crown, crown * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          const canopy = ctx.createRadialGradient(px - crown * 0.25, py - crown * 0.35, 0, px, py, crown);
          canopy.addColorStop(0, "#78905c"); canopy.addColorStop(0.45, "#3e6849"); canopy.addColorStop(1, "#173c32");
          ctx.fillStyle = canopy;
          ctx.beginPath(); ctx.arc(px, py, crown, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (cell.terrain === "hill") {
        ctx.fillStyle = "rgba(24,27,20,.22)";
        ctx.beginPath(); ctx.ellipse(cx + size * 0.1, cy + size * 0.15, size * 0.48, size * 0.22, -0.32, 0, Math.PI * 2); ctx.fill();
        const hill = ctx.createLinearGradient(cx - size * 0.4, cy - size * 0.4, cx + size * 0.4, cy + size * 0.3);
        hill.addColorStop(0, "rgba(179,166,112,.78)"); hill.addColorStop(1, "rgba(73,70,50,.55)");
        ctx.fillStyle = hill;
        ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.48, size * 0.24, -0.32, 0, Math.PI * 2); ctx.fill();
      }
      if (cell.terrain === "mountain") {
        if (mountainSprite) {
          const scale = 1.9 + hash(seed + 880, cell.q, cell.r) * 0.32;
          const spriteWidth = size * scale;
          const spriteHeight = spriteWidth * (mountainSprite.height / mountainSprite.width);
          ctx.save();
          ctx.globalAlpha = 0.96;
          ctx.shadowColor = "rgba(4,11,13,.62)";
          ctx.shadowBlur = size * 0.2;
          ctx.shadowOffsetY = size * 0.15;
          ctx.drawImage(mountainSprite, cx - spriteWidth / 2, cy - spriteHeight * 0.76, spriteWidth, spriteHeight);
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(12,18,19,.35)";
          ctx.beginPath(); ctx.ellipse(cx + size * 0.12, cy + size * 0.25, size * 0.46, size * 0.15, 0, 0, Math.PI * 2); ctx.fill();
          const mountain = ctx.createLinearGradient(cx - size * 0.5, cy - size * 0.5, cx + size * 0.5, cy + size * 0.4);
          mountain.addColorStop(0, "#c4bda9"); mountain.addColorStop(0.47, "#77766d"); mountain.addColorStop(1, "#3b4341");
          ctx.fillStyle = mountain;
          ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.68); ctx.lineTo(cx - size * 0.5, cy + size * 0.3); ctx.lineTo(cx + size * 0.52, cy + size * 0.3); ctx.closePath(); ctx.fill();
        }
      }
    }

    const neighborDirections = [[1, 0], [0, 1], [-1, 1]];
    const isWater = (terrain: Terrain) => terrain === "ocean" || terrain === "coast";

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
        if (pair.has("forest")) band = "rgba(64,102,65,.58)";
        if (pair.has("hill") || pair.has("mountain")) band = "rgba(122,112,83,.56)";
        if (isWater(cell.terrain) !== isWater(neighbor.terrain)) band = "rgba(209,193,132,.74)";
        if (pair.has("ocean") && pair.has("coast")) band = "rgba(91,156,162,.48)";

        ctx.save();
        ctx.strokeStyle = band;
        ctx.lineWidth = size * 0.3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(mx - px * size * 0.42, my - py * size * 0.42);
        ctx.lineTo(mx + px * size * 0.42, my + py * size * 0.42);
        ctx.stroke();

        for (let i = 0; i < 9; i += 1) {
          const along = (i / 8 - 0.5) * size * 0.92;
          const scatter = (hash(seed + 500 + i, cell.q + neighbor.q, cell.r + neighbor.r) - 0.5) * size * 0.33;
          const x = mx + px * along + (vx / length) * scatter;
          const y = my + py * along + (vy / length) * scatter;
          const radius = size * (0.035 + hash(seed + 620 + i, neighbor.q, cell.r) * 0.07);

          if (pair.has("forest") && !isWater(cell.terrain) && !isWater(neighbor.terrain)) {
            ctx.fillStyle = i % 2 ? "#42694a" : "#68805a";
            ctx.beginPath(); ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2); ctx.fill();
          } else if ((pair.has("hill") || pair.has("mountain")) && !isWater(cell.terrain) && !isWater(neighbor.terrain)) {
            ctx.fillStyle = i % 2 ? "#746f60" : "#9b8f72";
            ctx.beginPath(); ctx.ellipse(x, y, radius * 1.35, radius * 0.72, i * 0.7, 0, Math.PI * 2); ctx.fill();
          } else if (isWater(cell.terrain) !== isWater(neighbor.terrain)) {
            ctx.fillStyle = i % 2 ? "rgba(229,216,169,.82)" : "rgba(130,183,177,.72)";
            ctx.beginPath(); ctx.ellipse(x, y, radius * 1.5, radius * 0.6, Math.atan2(py, px), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
      }
    }

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
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [cells, forestSprite, groundTexture, mountainSprite, seed, selected, showGrid]);

  const regenerate = () => {
    const parsed = Number(seedText);
    setSelected(null);
    setSeed(Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now());
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * 99999999);
    setSeedText(String(next));
    setSeed(next);
    setSelected(null);
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
          <label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Hex 경계</label>
        </div>
      </header>
      <section className="stage">
        <canvas ref={canvasRef} aria-label="랜덤으로 생성된 육각형 세계 지도" />
        <aside className="legend">
          <strong>지형</strong>
          {Object.entries({ 평원: "plain", 숲: "forest", 언덕: "hill", 산: "mountain", 해안: "coast", 바다: "ocean" }).map(([name, type]) => <span key={type}><i style={{ background: colors[type as Terrain][1] }} />{name}</span>)}
        </aside>
        <div className="selection-card">
          {selected ? <><span>선택한 지역</span><strong>{selected.q}, {selected.r}</strong><em>{({ ocean: "바다", coast: "해안", plain: "평원", forest: "숲", hill: "언덕", mountain: "산" } as Record<Terrain, string>)[selected.terrain]}</em></> : <><span>지도를 눌러보세요</span><strong>지역 정보</strong><em>Hex 경계와 지형 연결을 확인합니다.</em></>}
        </div>
      </section>
      <footer><span>현재 검증</span><b>Hex 경계 가독성</b><b>시드 재현성</b><b>육지·바다 연결</b><small>전투와 도시는 다음 단계에서 추가됩니다.</small></footer>
    </main>
  );
}
