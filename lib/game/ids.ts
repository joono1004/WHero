// Branded-in-spirit string id aliases. Kept in one file so hero/unit/city/
// faction modules can reference each other's id types without importing each
// other's full module (avoids circular imports).

export type FactionId = string;
export type HeroId = string;
export type UnitId = string;
export type CityId = string;
export type ItemId = string;
export type WorldId = string;
// A node in the troop evolution tree (unit-production.ts's
// UNIT_TYPE_CATALOG) - either a line's root (e.g. "infantry") or an evolved
// variant unlocked via unit-evolution.ts (e.g. "infantry_mountain").
export type UnitTypeId = string;
