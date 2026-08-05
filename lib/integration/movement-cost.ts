import type { HexCoordinate } from "../game/hex.ts";

// The seam between lib/game's pathfinding (movement.ts) and whatever
// eventually supplies real per-hex terrain data (Codex's lib/world engine).
// Cost to enter `hex`, or null if it can't be entered at all (impassable
// terrain, terrain the unit's type can't cross, occupied by a blocking
// unit, ...). Whatever "blocking" means is entirely up to the caller.
//
// lib/game/movement.ts never reads terrain itself - it only calls this
// callback. Until lib/world exposes a terrain lookup, callers (tests, and
// eventually the map screen) supply their own function here; a flat cost-1
// function is enough for pathfinding tests that don't care about terrain.
export type MovementCost = (hex: HexCoordinate) => number | null;
