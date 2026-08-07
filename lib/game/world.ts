import type { FactionId, HeroId, WorldId } from "./ids.ts";
import type { TroopLevels } from "./unit-evolution.ts";

// Mirrors MapTypeId / MapTierId in app/world-prototype.tsx. Duplicated rather
// than imported (see the no-cross-import boundary in docs/SYSTEM_LAYER.md) —
// keep these two lists in sync by hand until an integration contract takes
// over. If Codex adds or renames a map type/tier, update this file to match.
export type MapTypeId = "inland" | "continent" | "archipelago" | "highlands" | "riverlands";
export type MapTierId = "mini" | "small" | "medium" | "large" | "huge" | "colossal" | "world";

// Display info for the lobby's map-candidate cards. Values mirror
// MAP_TYPES/MAP_TIERS in app/world-prototype.tsx (same sync-by-hand rule as
// the id lists above) - factions/columns/rows come straight from there.
export const MAP_TYPE_INFO: Record<MapTypeId, { label: string; description: string }> = {
  inland: { label: "내륙", description: "바다 없이 넓게 이어진 육지" },
  continent: { label: "대륙", description: "육지가 넓은 하나의 대륙과 외곽 바다" },
  archipelago: { label: "군도", description: "섬 70%·바다 30%의 넓은 군도" },
  highlands: { label: "고산", description: "바다 없는 산맥·고원·협곡" },
  riverlands: { label: "대하천", description: "바다 5% 미만의 강·호수·습지" },
};

export const MAP_TIER_ORDER: MapTierId[] = ["mini", "small", "medium", "large", "huge", "colossal", "world"];

export const MAP_TIER_INFO: Record<MapTierId, { label: string; factions: number; columns: number; rows: number }> = {
  mini: { label: "미니", factions: 2, columns: 30, rows: 26 },
  small: { label: "소형", factions: 3, columns: 36, rows: 33 },
  medium: { label: "중형", factions: 4, columns: 42, rows: 38 },
  large: { label: "대형", factions: 5, columns: 47, rows: 42 },
  huge: { label: "거대", factions: 6, columns: 52, rows: 46 },
  colossal: { label: "초거대", factions: 7, columns: 57, rows: 49 },
  world: { label: "월드", factions: 8, columns: 62, rows: 52 },
};

export type WorldGenerationParams = {
  seed: number;
  mapType: MapTypeId;
  mapTier: MapTierId;
  // Bumped whenever the terrain-generation logic changes enough that the same
  // seed would no longer regenerate the same map. Lets save/load (task 4)
  // detect a stale save instead of silently desyncing units from terrain.
  terrainVersion: string;
};

export type WorldState = {
  id: WorldId;
  worldIndex: number;
  generation: WorldGenerationParams;
  factionIds: FactionId[];
  playerFactionId: FactionId;
  exploredHexes: string[];
  turn: number;
  conquered: boolean;
  // How many heroes may be deployed (solo/unit/city) in this world at once.
  // Set equal to enlistedHeroIds.length at creation (task 10) - heroes
  // beyond this limit sit in the roster unused unless parked in a cleared
  // world (see ClearedWorldRecord) — task 13.
  heroDeploymentLimit: number;
  // Up to 5 heroes chosen before entering this world (task 10, this
  // session's direction - point 8). Only the first starts on the map
  // (solo); the rest sit in HeroAssignment's "enlisted" mode until
  // city-actions.ts's checkHeroSummons promotes them as the faction's city
  // count grows. Order matters - it's summon priority.
  enlistedHeroIds: HeroId[];
  // The player faction's per-node troop levels (unit-evolution.ts's
  // TroopLevels) at the moment this world was entered. Units produced
  // during the campaign use this rather than live faction.troopLevels
  // (this session's direction - "맵 시작 전 연구" carries over as-is) -
  // see unit-production.ts. Named researchSnapshot until 2026-08-07, when
  // troop leveling moved out of research.ts into unit-evolution.ts.
  troopLevelsSnapshot: TroopLevels;
};

// A lightweight record of a world the player has already conquered. Kept
// around (rather than discarded once the player moves on) specifically so a
// hero - typically one past the current world's heroDeploymentLimit - can be
// appointed governor here via HeroAssignment's "governor" mode. Exactly one
// governor per world (or none). What governing actually produces (gold, a
// buff, something else) is still undecided; see docs/SYSTEM_LAYER.md task 13.
//
// Rebellions (task 14) are a separate mechanic layered on top of this record:
// occasionally a governed (or ungoverned) cleared world can have a rebellion
// to put down, and heroes other than the current governor can be dispatched
// there for a one-off, rate-limited mission. That doesn't touch
// governorHeroId or anyone's assignment - it doesn't belong on this type.
export type ClearedWorldRecord = {
  id: WorldId;
  worldIndex: number;
  generation: WorldGenerationParams;
  clearedAt: string;
  governorHeroId: HeroId | null;
  // Player-given name (2026-08-06, lobby redesign direction - "영주 임명시
  // 세계1과 같은 이름을 임의로 정할 수 있어"), set when a governor is first
  // appointed (see governor.ts's appointGovernor). null until then - display
  // code should fall back to "세계 {worldIndex}" when this is null.
  name: string | null;
};
