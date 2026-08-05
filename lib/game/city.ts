import type { FactionResources } from "./faction.ts";
import { hexDistance } from "./hex.ts";
import type { HexCoordinate } from "./hex.ts";
import type { CityId, FactionId, HeroId } from "./ids.ts";
import type { ResearchLevels } from "./research.ts";
import { isUnitTypeUnlocked } from "./unit-production.ts";
import type { TroopResearchKind } from "./research.ts";

// City growth (task 10), per the user's spec: 주둔지(outpost) -> 소도시(small)
// -> 중도시(medium) -> 대도시(large). Each tier raises the facility slot
// count and the city's wall defense bonus (the latter isn't wired into
// combat.ts yet - task 9's resolveAttack has no map-driven "attack a city"
// trigger, same "no UI to call it from yet" gap as tasks 8/9).
export type CityTier = "outpost" | "small" | "medium" | "large";

export const CITY_TIER_ORDER: CityTier[] = ["outpost", "small", "medium", "large"];

export const CITY_TIER_INFO: Record<CityTier, { label: string; facilitySlots: number; wallDefenseBonus: number }> = {
  outpost: { label: "주둔지", facilitySlots: 1, wallDefenseBonus: 0 },
  small: { label: "소도시", facilitySlots: 2, wallDefenseBonus: 5 },
  medium: { label: "중도시", facilitySlots: 3, wallDefenseBonus: 10 },
  large: { label: "대도시", facilitySlots: 4, wallDefenseBonus: 20 },
};

// Draft, unplaytested cost curve (mirrors research.ts's researchUpgradeCost
// in spirit) for advancing to the next tier. `large` has none - it's the
// cap.
export const CITY_UPGRADE_COST: Record<Exclude<CityTier, "large">, Pick<FactionResources, "gold" | "food">> = {
  outpost: { gold: 200, food: 100 },
  small: { gold: 500, food: 250 },
  medium: { gold: 1000, food: 500 },
};

export function nextCityTier(tier: CityTier): CityTier | null {
  const index = CITY_TIER_ORDER.indexOf(tier);
  return index === CITY_TIER_ORDER.length - 1 ? null : CITY_TIER_ORDER[index + 1];
}

export function cityWallDefenseBonus(city: City): number {
  return CITY_TIER_INFO[city.tier].wallDefenseBonus;
}

// 훈련소(barracks, unlocks unit production - no direct resource yield) /
// 농장(farm, food) / 시장(market, gold) / 광산(mine, iron). Built inside a
// city, capped by its tier's facilitySlots - distinct from the outer
// "territory resource tiles" the user described (mines/farms/markets a
// unit can be sent to occupy outside the city) which depend on real
// terrain placement and are explicitly deferred until Codex's terrain
// rules exist (2026-07-27 direction) - see docs/SYSTEM_LAYER.md.
export type FacilityType = "barracks" | "farm" | "market" | "mine";

export const FACILITY_LABEL: Record<FacilityType, string> = {
  barracks: "훈련소",
  farm: "농장",
  market: "시장",
  mine: "광산",
};

// Flat draft cost, same for every facility type - easy to differentiate
// later.
export const FACILITY_BUILD_COST: Pick<FactionResources, "gold"> = { gold: 100 };

// Per-turn yield for each built facility, applied in turn.ts's endTurn.
// barracks yields nothing directly - it only unlocks queueUnitProduction.
export const FACILITY_YIELD_PER_TURN: Record<FacilityType, Partial<FactionResources>> = {
  barracks: {},
  farm: { food: 15 },
  market: { gold: 15 },
  mine: { iron: 15 },
};

export function cityFacilitySlots(city: City): number {
  return CITY_TIER_INFO[city.tier].facilitySlots;
}

export function hasFacilitySlotAvailable(city: City): boolean {
  return city.facilities.length < cityFacilitySlots(city);
}

export function hasBarracks(city: City): boolean {
  return city.facilities.includes("barracks");
}

export function cityFacilityYieldPerTurn(city: City): Partial<FactionResources> {
  const total: Partial<FactionResources> = {};
  for (const facility of city.facilities) {
    for (const [key, amount] of Object.entries(FACILITY_YIELD_PER_TURN[facility])) {
      const resourceKey = key as keyof FactionResources;
      total[resourceKey] = (total[resourceKey] ?? 0) + (amount ?? 0);
    }
  }
  return total;
}

// A new city must sit at least this many hexes from every one of the
// founding faction's existing cities (this session's direction).
export const MIN_CITY_FOUNDING_DISTANCE = 3;

export function canFoundCityAt(position: HexCoordinate, existingCityPositions: HexCoordinate[]): boolean {
  return existingCityPositions.every((existing) => hexDistance(position, existing) >= MIN_CITY_FOUNDING_DISTANCE);
}

// A faction's first city can be founded freely; every city after that
// requires at least one existing city to have already reached "small"
// (소도시) or better (this session's direction - point 7).
export function canFoundAdditionalCity(existingCityTiers: CityTier[]): boolean {
  if (existingCityTiers.length === 0) return true;
  return existingCityTiers.some((tier) => tier !== "outpost");
}

export type ProductionOrder = {
  unitType: TroopResearchKind;
  turnsRemaining: number;
};

// Flat draft turn cost to produce any unit type - easy to differentiate per
// type later.
export const UNIT_PRODUCTION_TURNS = 3;

export type City = {
  id: CityId;
  factionId: FactionId;
  name: string;
  position: HexCoordinate;
  tier: CityTier;
  facilities: FacilityType[];
  productionQueue: ProductionOrder[];
  heroId: HeroId | null;
};

export function createCity(params: { id: CityId; factionId: FactionId; name: string; position: HexCoordinate }): City {
  return {
    id: params.id,
    factionId: params.factionId,
    name: params.name,
    position: params.position,
    tier: "outpost",
    facilities: [],
    productionQueue: [],
    heroId: null,
  };
}

// Transfers ownership of a city to the capturing faction (task 12). Pure -
// doesn't touch either faction's cityIds (that's the caller's job, see
// world-progress.ts's captureEnemyCity, which also handles the losing
// faction's elimination check). Clears the previous owner's stationed hero
// (city.heroId) since that hero belonged to a faction that no longer holds
// this city - same "the assignment's target is gone, fall back" logic as
// world-entry.ts's completeActiveWorld uses for heroes riding a
// world-ending unit/city; the caller is responsible for actually resetting
// that hero's HeroState the same way.
export function captureCity(city: City, capturingFactionId: FactionId): City {
  return { ...city, factionId: capturingFactionId, heroId: null };
}

export function canUpgradeCity(city: City, resources: FactionResources): boolean {
  const cost = CITY_UPGRADE_COST[city.tier as Exclude<CityTier, "large">];
  if (!cost) return false;
  return resources.gold >= cost.gold && resources.food >= cost.food;
}

// Advances a city to its next tier, spending the cost. Throws if already at
// the max tier or unaffordable - callers (UI) should check
// canUpgradeCity first and disable the button rather than relying on this
// throw for normal flow (same convention as research.ts's upgradeResearch).
export function upgradeCity(city: City, resources: FactionResources): { city: City; resources: FactionResources } {
  const next = nextCityTier(city.tier);
  if (!next) {
    throw new Error(`city ${city.id} is already at the max tier (${city.tier})`);
  }
  const cost = CITY_UPGRADE_COST[city.tier as Exclude<CityTier, "large">];
  if (!canUpgradeCity(city, resources)) {
    throw new Error(`cannot afford to upgrade city ${city.id} from ${city.tier}`);
  }
  return {
    city: { ...city, tier: next },
    resources: { ...resources, gold: resources.gold - cost.gold, food: resources.food - cost.food },
  };
}

// Builds one facility inside a city, spending FACILITY_BUILD_COST. Throws
// if there's no free slot or it's unaffordable - same UI-precheck
// convention as upgradeCity/upgradeResearch.
export function buildFacility(
  city: City,
  facility: FacilityType,
  resources: FactionResources,
): { city: City; resources: FactionResources } {
  if (!hasFacilitySlotAvailable(city)) {
    throw new Error(`city ${city.id} has no free facility slot (tier ${city.tier})`);
  }
  if (resources.gold < FACILITY_BUILD_COST.gold) {
    throw new Error(`cannot afford to build a ${facility} in city ${city.id}`);
  }
  return {
    city: { ...city, facilities: [...city.facilities, facility] },
    resources: { ...resources, gold: resources.gold - FACILITY_BUILD_COST.gold },
  };
}

export function canQueueUnitProduction(city: City, unitType: TroopResearchKind, research: ResearchLevels): boolean {
  return hasBarracks(city) && isUnitTypeUnlocked(unitType, research[unitType]);
}

// Adds a unit to the city's production queue. Doesn't spend resources
// beyond the barracks/research gate - UNIT_PRODUCTION_TURNS is treated as
// the cost (time investment), per this session's scope (no separate gold
// sink was specified). Throws if the city has no barracks or the unit type
// isn't unlocked by research yet - same UI-precheck convention as the rest
// of this module.
export function queueUnitProduction(city: City, unitType: TroopResearchKind, research: ResearchLevels): City {
  if (!canQueueUnitProduction(city, unitType, research)) {
    throw new Error(`city ${city.id} cannot produce ${unitType} right now`);
  }
  return {
    ...city,
    productionQueue: [...city.productionQueue, { unitType, turnsRemaining: UNIT_PRODUCTION_TURNS }],
  };
}
