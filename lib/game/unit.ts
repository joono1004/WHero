import type { HexCoordinate } from "./hex.ts";
import type { FactionId, UnitId } from "./ids.ts";

// Concrete stat values and the roster of unit types are balance decisions,
// not yet made. This is the shape a unit's data fits into once they are.
export type UnitStats = {
  attack: number;
  defense: number;
  maxHealth: number;
  movement: number;
  // null = melee (근접, no attack range - fights adjacent targets); a
  // number = ranged (궁병/공성병기 etc.), consumed by combat.ts's
  // counterattack rule (task 9). Concrete per-unit-type values are still a
  // balance decision (task 10 - unit roster).
  range: number | null;
};

// No heroId here - units and heroes used to be linkable (a hero "riding
// with" a unit for a buff), but that HeroAssignment mode was removed
// (2026-07-28): heroes and units now always move independently.
export type Unit = {
  id: UnitId;
  factionId: FactionId;
  unitType: string;
  position: HexCoordinate;
  stats: UnitStats;
  health: number;
  movementRemaining: number;
};
