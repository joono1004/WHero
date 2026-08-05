// Branded-in-spirit string id aliases. Kept in one file so hero/unit/city/
// faction modules can reference each other's id types without importing each
// other's full module (avoids circular imports).

export type FactionId = string;
export type HeroId = string;
export type UnitId = string;
export type CityId = string;
export type ItemId = string;
export type WorldId = string;
