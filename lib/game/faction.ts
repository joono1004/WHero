import type { CityId, FactionId, ItemId, UnitId, UnitTypeId } from "./ids.ts";
import type { ResearchLevels } from "./research.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";
import type { TroopLevels } from "./unit-evolution.ts";
import { ZERO_TROOP_LEVELS } from "./unit-evolution.ts";
import type { TroopLine } from "./unit-production.ts";

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
//
// wood/gem (2026-08-06, lobby redesign direction): the resources a governed
// world produces over real elapsed time (not per-turn like the above four),
// shown in the lobby header. Added here as real fields so the header can
// read live state rather than fake zeros, but the actual production tick
// (how often, how much, whether it accrues while offline) is explicitly
// undecided/unbuilt - both start and stay at 0 until that lands. gem is
// also the premium currency spent on hero gacha (also undecided/unbuilt).
export type FactionResources = {
  gold: number;
  food: number;
  iron: number;
  researchResource: number;
  wood: number;
  gem: number;
};

export const ZERO_FACTION_RESOURCES: FactionResources = {
  gold: 0,
  food: 0,
  iron: 0,
  researchResource: 0,
  wood: 0,
  gem: 0,
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
  // 2026-08-07 진화 트리 방향 (unit-evolution.ts): 병과 트리의 각 노드가
  // 독립적으로 쌓는 등급 레벨(troopLevels), 지금까지 해금한 진화 노드
  // 목록(unlockedUnitTypes - 루트 5종은 항상 해금된 것으로 취급되어 여기
  // 들어가지 않음), 계열별로 지금 무엇을 생산할지 선택한 값
  // (activeEvolution - 미선택 계열은 그 계열의 루트가 기본값), 그리고
  // 진화용 아이템 등을 담는 세력 공용 인벤토리(itemInventory - 아이템을
  // 얻는 경로는 별도 작업 범위, 지금은 이미 보유했다고 가정하고 소비만
  // 함). 모두 research와 마찬가지로 세계 전환에도 살아남는 장기 투자값.
  troopLevels: TroopLevels;
  unlockedUnitTypes: UnitTypeId[];
  activeEvolution: Partial<Record<TroopLine, UnitTypeId>>;
  itemInventory: ItemId[];
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
    troopLevels: ZERO_TROOP_LEVELS,
    unlockedUnitTypes: [],
    activeEvolution: {},
    itemInventory: [],
    capitalCityId: null,
    eliminationReason: null,
  };
}
