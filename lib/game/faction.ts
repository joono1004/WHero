import type { CityId, FactionId, UnitId } from "./ids.ts";
import type { ResearchLevels } from "./research.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";

// The player's faction identity is stable across world transitions - unlike
// cityIds/unitIds (reset per world), resources/research represent long-term
// investment (like hero leveling) and must survive a world clear, so the
// Faction record itself (not just its stats) persists rather than being
// recreated fresh each world.
export const PLAYER_FACTION_ID = "player-faction" as FactionId;

// Gold and food are the faction's general economy. iron (철) is produced by
// mine facilities (task 10 - city.ts) and consumed by... nothing yet, but
// it's the fourth facility-yield resource the user specified alongside
// gold/food. researchResource is specifically what a governed,
// previously-cleared world yields (task 13 - governing a region was left
// producing "some resource, form undecided"; this is that resource, spent
// on research per this session's direction).
export type FactionResources = {
  gold: number;
  food: number;
  iron: number;
  researchResource: number;
};

export const ZERO_FACTION_RESOURCES: FactionResources = {
  gold: 0,
  food: 0,
  iron: 0,
  researchResource: 0,
};

// A faction is any power on the map, player or AI. The world tiers already
// defined in app/world-prototype.tsx (MAP_TIERS[].factions, 2-8 depending on
// map size) imply rival factions to conquer, so this type isn't player-only.
export type Faction = {
  id: FactionId;
  name: string;
  isPlayerControlled: boolean;
  level: number;
  cityIds: CityId[];
  unitIds: UnitId[];
  resources: FactionResources;
  research: ResearchLevels;
  // 수도 (task 12, 2026-07-28): the city this faction founded first.
  // Null only briefly, before their first city exists - city-actions.ts's
  // foundCity sets it. Losing this city (world-progress.ts's
  // captureEnemyCity) is what "defeats" a faction, per the user's victory
  // condition ("적세력 주둔지중 수도 점령시 적세력 패배").
  capitalCityId: CityId | null;
  // Null while still in the fight. "captured" when their capital falls;
  // "surrendered" for the user's stress-reducing shortcut ("적세력이
  // 이길수 없는 전력인 경우... 항복하는 이벤트") - both count the same for
  // world-progress.ts's isWorldConquered, kept distinct only so a future UI
  // can show a different message for each. Nothing currently sets
  // "surrendered" - the AI-power comparison it'd be decided from is still
  // undecided (this session's direction, deferred for later discussion) -
  // see world-progress.ts's surrenderFaction doc comment.
  eliminationReason: "captured" | "surrendered" | null;
};

export function isFactionEliminated(faction: Faction): boolean {
  return faction.eliminationReason !== null;
}

export function createFaction(params: {
  id: FactionId;
  name: string;
  isPlayerControlled: boolean;
}): Faction {
  return {
    id: params.id,
    name: params.name,
    isPlayerControlled: params.isPlayerControlled,
    level: 1,
    cityIds: [],
    unitIds: [],
    resources: ZERO_FACTION_RESOURCES,
    research: ZERO_RESEARCH_LEVELS,
    capitalCityId: null,
    eliminationReason: null,
  };
}
