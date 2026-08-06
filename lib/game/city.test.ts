import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFacility,
  canFoundAdditionalCity,
  canFoundCityAt,
  canQueueUnitProduction,
  canUpgradeCity,
  captureCity,
  cityFacilitySlots,
  cityFacilityYieldPerTurn,
  cityWallDefenseBonus,
  createCity,
  FACILITY_BUILD_COST,
  hasBarracks,
  hasFacilitySlotAvailable,
  MIN_CITY_FOUNDING_DISTANCE,
  nextCityTier,
  queueUnitProduction,
  upgradeCity,
} from "./city.ts";
import type { City } from "./city.ts";
import { ZERO_FACTION_RESOURCES } from "./faction.ts";
import type { FactionResources } from "./faction.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";

function makeCity(overrides: Partial<City> = {}): City {
  return {
    ...createCity({ id: "city-1", factionId: "faction-1", name: "테스트도시", position: { row: 0, column: 0 } }),
    ...overrides,
  };
}

const RICH_RESOURCES: FactionResources = { gold: 100000, food: 100000, iron: 0, researchResource: 0, wood: 0, gem: 0 };

test("createCity starts at outpost tier with no facilities or queue", () => {
  const city = createCity({ id: "city-1", factionId: "faction-1", name: "테스트도시", position: { row: 0, column: 0 } });
  assert.equal(city.tier, "outpost");
  assert.deepEqual(city.facilities, []);
  assert.deepEqual(city.productionQueue, []);
  assert.equal(city.heroId, null);
});

test("nextCityTier advances through outpost -> small -> medium -> large -> null", () => {
  assert.equal(nextCityTier("outpost"), "small");
  assert.equal(nextCityTier("small"), "medium");
  assert.equal(nextCityTier("medium"), "large");
  assert.equal(nextCityTier("large"), null);
});

test("cityFacilitySlots grows with tier", () => {
  assert.equal(cityFacilitySlots(makeCity({ tier: "outpost" })), 1);
  assert.equal(cityFacilitySlots(makeCity({ tier: "small" })), 2);
  assert.equal(cityFacilitySlots(makeCity({ tier: "medium" })), 3);
  assert.equal(cityFacilitySlots(makeCity({ tier: "large" })), 4);
});

test("cityWallDefenseBonus grows with tier and starts at 0", () => {
  assert.equal(cityWallDefenseBonus(makeCity({ tier: "outpost" })), 0);
  assert.ok(cityWallDefenseBonus(makeCity({ tier: "small" })) > 0);
  assert.ok(cityWallDefenseBonus(makeCity({ tier: "large" })) > cityWallDefenseBonus(makeCity({ tier: "medium" })));
});

test("upgradeCity advances the tier and deducts the cost", () => {
  const city = makeCity();
  const result = upgradeCity(city, RICH_RESOURCES);
  assert.equal(result.city.tier, "small");
  assert.ok(result.resources.gold < RICH_RESOURCES.gold);
  assert.ok(result.resources.food < RICH_RESOURCES.food);
});

test("upgradeCity throws when unaffordable", () => {
  assert.throws(() => upgradeCity(makeCity(), ZERO_FACTION_RESOURCES));
});

test("canUpgradeCity is false at the max tier regardless of resources", () => {
  assert.equal(canUpgradeCity(makeCity({ tier: "large" }), RICH_RESOURCES), false);
});

test("upgradeCity throws at the max tier", () => {
  assert.throws(() => upgradeCity(makeCity({ tier: "large" }), RICH_RESOURCES));
});

test("canFoundCityAt is true when far enough from every existing city", () => {
  const existing = [{ row: 0, column: 0 }];
  assert.equal(canFoundCityAt({ row: 0, column: MIN_CITY_FOUNDING_DISTANCE }, existing), true);
});

test("canFoundCityAt is false when too close to any existing city", () => {
  const existing = [{ row: 0, column: 0 }, { row: 10, column: 10 }];
  assert.equal(canFoundCityAt({ row: 0, column: 1 }, existing), false);
});

test("canFoundCityAt is trivially true with no existing cities", () => {
  assert.equal(canFoundCityAt({ row: 5, column: 5 }, []), true);
});

test("canFoundAdditionalCity allows a faction's very first city unconditionally", () => {
  assert.equal(canFoundAdditionalCity([]), true);
});

test("canFoundAdditionalCity requires at least one city past outpost before a second", () => {
  assert.equal(canFoundAdditionalCity(["outpost"]), false);
  assert.equal(canFoundAdditionalCity(["small"]), true);
  assert.equal(canFoundAdditionalCity(["outpost", "medium"]), true);
});

test("buildFacility adds a facility and deducts gold", () => {
  const city = makeCity();
  const result = buildFacility(city, "farm", RICH_RESOURCES);
  assert.deepEqual(result.city.facilities, ["farm"]);
  assert.equal(result.resources.gold, RICH_RESOURCES.gold - FACILITY_BUILD_COST.gold);
});

test("buildFacility throws once the tier's facility slots are full", () => {
  const city = makeCity({ tier: "outpost", facilities: ["farm"] });
  assert.equal(hasFacilitySlotAvailable(city), false);
  assert.throws(() => buildFacility(city, "market", RICH_RESOURCES));
});

test("buildFacility throws when unaffordable", () => {
  assert.throws(() => buildFacility(makeCity(), "farm", ZERO_FACTION_RESOURCES));
});

test("cityFacilityYieldPerTurn sums yields across multiple facilities", () => {
  const city = makeCity({ tier: "medium", facilities: ["farm", "market", "mine"] });
  const yieldPerTurn = cityFacilityYieldPerTurn(city);
  assert.ok((yieldPerTurn.food ?? 0) > 0);
  assert.ok((yieldPerTurn.gold ?? 0) > 0);
  assert.ok((yieldPerTurn.iron ?? 0) > 0);
});

test("cityFacilityYieldPerTurn is empty for a city with only a barracks", () => {
  const city = makeCity({ facilities: ["barracks"] });
  assert.deepEqual(cityFacilityYieldPerTurn(city), {});
});

test("hasBarracks reflects whether a barracks was built", () => {
  assert.equal(hasBarracks(makeCity()), false);
  assert.equal(hasBarracks(makeCity({ facilities: ["barracks"] })), true);
});

test("canQueueUnitProduction requires a barracks even for infantry", () => {
  const cityWithoutBarracks = makeCity();
  assert.equal(canQueueUnitProduction(cityWithoutBarracks, "infantry", ZERO_RESEARCH_LEVELS), false);
});

test("canQueueUnitProduction allows infantry with a barracks even at 0 research", () => {
  const city = makeCity({ facilities: ["barracks"] });
  assert.equal(canQueueUnitProduction(city, "infantry", ZERO_RESEARCH_LEVELS), true);
});

test("canQueueUnitProduction requires research investment for non-infantry types", () => {
  const city = makeCity({ facilities: ["barracks"] });
  assert.equal(canQueueUnitProduction(city, "archer", ZERO_RESEARCH_LEVELS), false);
  assert.equal(canQueueUnitProduction(city, "archer", { ...ZERO_RESEARCH_LEVELS, archer: 1 }), true);
});

test("queueUnitProduction appends a production order with the flat turn cost", () => {
  const city = makeCity({ facilities: ["barracks"] });
  const updated = queueUnitProduction(city, "infantry", ZERO_RESEARCH_LEVELS);
  assert.equal(updated.productionQueue.length, 1);
  assert.equal(updated.productionQueue[0].unitType, "infantry");
  assert.ok(updated.productionQueue[0].turnsRemaining > 0);
});

test("queueUnitProduction throws when the city can't produce that unit type yet", () => {
  const city = makeCity({ facilities: ["barracks"] });
  assert.throws(() => queueUnitProduction(city, "archer", ZERO_RESEARCH_LEVELS));
});

// --- captureCity (task 12) ---

test("captureCity transfers ownership to the capturing faction", () => {
  const city = makeCity({ factionId: "rival-1" });
  const captured = captureCity(city, "player-faction");
  assert.equal(captured.factionId, "player-faction");
});

test("captureCity clears any stationed hero, since they belonged to the previous owner", () => {
  const city = makeCity({ factionId: "rival-1", heroId: "hero-1" });
  const captured = captureCity(city, "player-faction");
  assert.equal(captured.heroId, null);
});

test("captureCity does not mutate other city fields", () => {
  const city = makeCity({ factionId: "rival-1", tier: "medium", facilities: ["farm"] });
  const captured = captureCity(city, "player-faction");
  assert.equal(captured.tier, "medium");
  assert.deepEqual(captured.facilities, ["farm"]);
  assert.equal(captured.id, city.id);
});
