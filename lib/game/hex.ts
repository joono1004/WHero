// Pure hex-coordinate math for game systems (turns, movement, city radius, fog of war).
// Deliberately independent of app/world-prototype.tsx: that file owns rendering and
// mutates module-level globals (HEX_COLS, MAP_WIDTH, ...) for the active render pass,
// which is unsafe to depend on from system code. Bounds are passed in explicitly here.
//
// Coordinate convention matches the renderer's odd-r offset layout (odd rows shifted
// right by half a hex width, see hexCenterAt in world-prototype.tsx) so the two sides
// agree on what "row/column" means once they're wired together.

export type HexCoordinate = { row: number; column: number };

export type MapBounds = { rows: number; columns: number };

export function hexKey(hex: HexCoordinate): string {
  return `${hex.row}:${hex.column}`;
}

export function hexEquals(a: HexCoordinate, b: HexCoordinate): boolean {
  return a.row === b.row && a.column === b.column;
}

export function isWithinBounds(hex: HexCoordinate, bounds: MapBounds): boolean {
  return hex.row >= 0 && hex.row < bounds.rows && hex.column >= 0 && hex.column < bounds.columns;
}

export function hexNeighbors(hex: HexCoordinate): HexCoordinate[] {
  const diagonal = hex.row % 2 === 0 ? -1 : 1;
  return [
    { row: hex.row, column: hex.column - 1 },
    { row: hex.row, column: hex.column + 1 },
    { row: hex.row - 1, column: hex.column },
    { row: hex.row + 1, column: hex.column },
    { row: hex.row - 1, column: hex.column + diagonal },
    { row: hex.row + 1, column: hex.column + diagonal },
  ];
}

export function hexNeighborsWithinBounds(hex: HexCoordinate, bounds: MapBounds): HexCoordinate[] {
  return hexNeighbors(hex).filter((neighbor) => isWithinBounds(neighbor, bounds));
}

type CubeCoordinate = { x: number; y: number; z: number };

function toCube(hex: HexCoordinate): CubeCoordinate {
  const x = hex.column - (hex.row - (hex.row & 1)) / 2;
  const z = hex.row;
  const y = -x - z;
  return { x, y, z };
}

export function hexDistance(a: HexCoordinate, b: HexCoordinate): number {
  const cubeA = toCube(a);
  const cubeB = toCube(b);
  return Math.max(
    Math.abs(cubeA.x - cubeB.x),
    Math.abs(cubeA.y - cubeB.y),
    Math.abs(cubeA.z - cubeB.z),
  );
}
