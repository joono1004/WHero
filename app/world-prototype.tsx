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
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [showGrid, setShowGrid] = useState(true);
  const [selected, setSelected] = useState<Cell | null>(null);
  const cells = useMemo(() => generateWorld(seed), [seed]);

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

    for (const cell of cells) {
      const cx = ox + SQRT3 * size * (cell.q + cell.r / 2);
      const cy = oy + 1.5 * size * cell.r;
      hexPath(ctx, cx, cy, size + 0.6);
      const [dark, light] = colors[cell.terrain];
      const gradient = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (cell.terrain === "forest") {
        ctx.fillStyle = "rgba(19,50,35,.7)";
        for (let i = 0; i < 3; i += 1) {
          const px = cx + (hash(seed + i, cell.q, cell.r) - 0.5) * size;
          const py = cy + (hash(seed + 41 + i, cell.r, cell.q) - 0.5) * size;
          ctx.beginPath(); ctx.arc(px, py, size * 0.12, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (cell.terrain === "mountain") {
        ctx.fillStyle = "rgba(230,225,208,.7)";
        ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.5); ctx.lineTo(cx - size * 0.35, cy + size * 0.25); ctx.lineTo(cx + size * 0.35, cy + size * 0.25); ctx.closePath(); ctx.fill();
      }
      if (showGrid) {
        hexPath(ctx, cx, cy, size);
        ctx.strokeStyle = cell.terrain === "ocean" || cell.terrain === "coast" ? "rgba(205,236,238,.24)" : "rgba(245,230,190,.28)";
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
        const cx = ox + SQRT3 * size * (cell.q + cell.r / 2);
        const cy = oy + 1.5 * size * cell.r;
        const distance = Math.hypot(x - cx, y - cy);
        if (distance < bestDistance && distance < size) { best = cell; bestDistance = distance; }
      }
      setSelected(best);
    };
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [cells, seed, selected, showGrid]);

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
