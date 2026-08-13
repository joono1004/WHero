import assert from "node:assert/strict";
import test from "node:test";
import { checkSaveGameShape, findSaveGameIssues, parseSaveGame, SAVE_SCHEMA_VERSION } from "./save.ts";
import type { SaveGame } from "./save.ts";
import type { City } from "./city.ts";
import { ZERO_FACTION_RESOURCES } from "./faction.ts";
import type { Faction } from "./faction.ts";
import { ZERO_ATTRIBUTE_PROGRESS } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";
import { ZERO_TROOP_LEVELS } from "./unit-evolution.ts";
import type { Unit } from "./unit.ts";

function makeValidSave(): SaveGame {
  const hero: HeroState = {
    heroId: "hero-1",
    level: 1,
    experience: 0,
    health: 100,
    items: [],
    assignment: { mode: "city", cityId: "city-1" },
    attributeProgress: ZERO_ATTRIBUTE_PROGRESS,
    deploymentPriority: true,
    evolvedUnitType: null,
  };
  const unit: Unit = {
    id: "unit-1",
    factionId: "faction-1",
    unitType: "placeholder",
    position: { row: 0, column: 0 },
    stats: { attack: 1, defense: 1, maxHealth: 10, movement: 2, range: null },
    health: 10,
    movementRemaining: 2,
  };
  const city: City = {
    id: "city-1",
    factionId: "faction-1",
    name: "Capital",
    position: { row: 1, column: 1 },
    tier: "outpost",
    facilities: [],
    productionQueue: [],
    heroId: "hero-1",
  };
  const faction: Faction = {
    id: "faction-1",
    name: "Player",
    isPlayerControlled: true,
    level: 1,
    cityIds: ["city-1"],
    unitIds: ["unit-1"],
    resources: ZERO_FACTION_RESOURCES,
    research: ZERO_RESEARCH_LEVELS,
    troopLevels: ZERO_TROOP_LEVELS,
    unlockedUnitTypes: [],
    activeEvolution: {},
    itemInventory: [],
    capitalCityId: "city-1",
    eliminationReason: null,
  };
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    factionName: "Player",
    heroes: [hero],
    world: {
      id: "world-1",
      worldIndex: 1,
      generation: { seed: 1, mapType: "continent", mapTier: "medium", terrainVersion: "v1" },
      factionIds: ["faction-1"],
      playerFactionId: "faction-1",
      exploredHexes: [],
      turn: 1,
      conquered: false,
      heroDeploymentLimit: 5,
      enlistedHeroIds: ["hero-1"],
      troopLevelsSnapshot: ZERO_TROOP_LEVELS,
    },
    nextMapCandidates: [],
    clearedWorlds: {},
    factions: { "faction-1": faction },
    units: { "unit-1": unit },
    cities: { "city-1": city },
    campaign: { conqueredCountryIds: [], activeCountryId: null },
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
}

test("a well-formed save has no issues", () => {
  assert.deepEqual(findSaveGameIssues(makeValidSave()), []);
});

test("a solo hero (no city) is valid on its own", () => {
  const save = makeValidSave();
  save.heroes[0].assignment = { mode: "solo", position: { row: 4, column: 4 } };
  save.cities["city-1"].heroId = null;
  assert.deepEqual(findSaveGameIssues(save), []);
});

test("a save in the lobby (world null, candidates present) has no issues", () => {
  const save = makeValidSave();
  save.world = null;
  save.nextMapCandidates = [{ worldIndex: 2, generation: { seed: 2, mapType: "continent", mapTier: "small", terrainVersion: "v1" } }];
  save.cities["city-1"].heroId = null;
  save.heroes[0].assignment = { mode: "solo", position: { row: 0, column: 0 } };
  assert.deepEqual(findSaveGameIssues(save), []);
});

test("flags a save with neither an active world nor any map candidates", () => {
  const save = makeValidSave();
  save.world = null;
  save.cities["city-1"].heroId = null;
  save.heroes[0].assignment = { mode: "solo", position: { row: 0, column: 0 } };
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("nothing to choose")));
});

test("flags a save with both an active world and leftover map candidates", () => {
  const save = makeValidSave();
  save.nextMapCandidates = [{ worldIndex: 2, generation: { seed: 2, mapType: "continent", mapTier: "small", terrainVersion: "v1" } }];
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("should be cleared")));
});

test("flags a playerFactionId missing from world.factionIds", () => {
  const save = makeValidSave();
  save.world!.playerFactionId = "faction-ghost";
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("faction-ghost")));
});

test("flags a faction referenced by world but absent from factions", () => {
  const save = makeValidSave();
  save.world!.factionIds.push("faction-missing");
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("faction-missing")));
});

test("flags a unit id a faction owns but that doesn't exist", () => {
  const save = makeValidSave();
  save.factions["faction-1"].unitIds.push("unit-ghost");
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("unit-ghost")));
});

test("flags a city id a faction owns but that doesn't exist", () => {
  const save = makeValidSave();
  save.factions["faction-1"].cityIds.push("city-ghost");
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("city-ghost")));
});

test("flags a hero stationed in a city that doesn't exist", () => {
  const save = makeValidSave();
  save.heroes[0].assignment = { mode: "city", cityId: "city-ghost" };
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("city-ghost")));
});

test("flags a city referencing a hero id not present in heroes", () => {
  const save = makeValidSave();
  save.cities["city-1"].heroId = "hero-ghost";
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("hero-ghost")));
});

test("flags a one-sided link: hero says it's in the city, but city.heroId disagrees", () => {
  const save = makeValidSave();
  save.cities["city-1"].heroId = null;
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("city.heroId")));
});

test("flags a one-sided link: city says it has a hero, but that hero's assignment disagrees", () => {
  const save = makeValidSave();
  save.heroes[0].assignment = { mode: "solo", position: { row: 0, column: 0 } };
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("city-1") && issue.includes("otherwise")));
});

test("a hero governing a cleared world is valid", () => {
  const save = makeValidSave();
  save.clearedWorlds["world-0"] = {
    id: "world-0",
    worldIndex: 0,
    generation: { seed: 0, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
    clearedAt: "2026-07-20T00:00:00.000Z",
    governorHeroId: "hero-1",
    name: null,
  };
  save.heroes[0].assignment = { mode: "governor", worldId: "world-0" };
  save.cities["city-1"].heroId = null;
  assert.deepEqual(findSaveGameIssues(save), []);
});

test("flags a hero governing a world that isn't actually a cleared world", () => {
  const save = makeValidSave();
  save.heroes[0].assignment = { mode: "governor", worldId: "world-ghost" };
  save.cities["city-1"].heroId = null;
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("world-ghost")));
});

test("flags a one-sided link: hero says it governs the world, but that record disagrees", () => {
  const save = makeValidSave();
  save.clearedWorlds["world-0"] = {
    id: "world-0",
    worldIndex: 0,
    generation: { seed: 0, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
    clearedAt: "2026-07-20T00:00:00.000Z",
    governorHeroId: null,
    name: null,
  };
  save.heroes[0].assignment = { mode: "governor", worldId: "world-0" };
  save.cities["city-1"].heroId = null;
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("region.governorHeroId")));
});

test("flags a one-sided link: cleared world lists a governor who says they're elsewhere", () => {
  const save = makeValidSave();
  save.clearedWorlds["world-0"] = {
    id: "world-0",
    worldIndex: 0,
    generation: { seed: 0, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
    clearedAt: "2026-07-20T00:00:00.000Z",
    governorHeroId: "hero-1",
    name: null,
  };
  // hero-1 stays assigned to city-1 (its default in makeValidSave), not the world
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("world-0") && issue.includes("otherwise")));
});

test("flags the active world also appearing in clearedWorlds", () => {
  const save = makeValidSave();
  save.clearedWorlds["world-1"] = {
    id: "world-1",
    worldIndex: 1,
    generation: save.world!.generation,
    clearedAt: "2026-07-20T00:00:00.000Z",
    governorHeroId: null,
    name: null,
  };
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("both the active world")));
});

test("flags more deployed heroes than the world's deployment limit allows", () => {
  const save = makeValidSave();
  save.world!.heroDeploymentLimit = 0;
  const issues = findSaveGameIssues(save);
  assert.ok(issues.some((issue) => issue.includes("over the limit")));
});

test("a hero governing a cleared world does not count against the deployment limit", () => {
  const save = makeValidSave();
  save.clearedWorlds["world-0"] = {
    id: "world-0",
    worldIndex: 0,
    generation: { seed: 0, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
    clearedAt: "2026-07-20T00:00:00.000Z",
    governorHeroId: "hero-1",
    name: null,
  };
  save.heroes[0].assignment = { mode: "governor", worldId: "world-0" };
  save.cities["city-1"].heroId = null;
  save.world!.heroDeploymentLimit = 0;
  assert.deepEqual(findSaveGameIssues(save), []);
});

test("reports every issue at once rather than stopping at the first", () => {
  const save = makeValidSave();
  save.world!.playerFactionId = "faction-ghost";
  save.cities["city-1"].heroId = "hero-ghost";
  const issues = findSaveGameIssues(save);
  assert.ok(issues.length >= 2);
});

// checkSaveGameShape / parseSaveGame - guarding against data that isn't even
// shaped like a SaveGame (hand-edited or corrupted localStorage, a foreign
// browser extension writing to the same key, ...).

test("checkSaveGameShape accepts a well-formed save", () => {
  assert.deepEqual(checkSaveGameShape(makeValidSave()), []);
});

test("checkSaveGameShape rejects non-object input instead of throwing", () => {
  assert.deepEqual(checkSaveGameShape(null), ["save data is not an object"]);
  assert.deepEqual(checkSaveGameShape("hello"), ["save data is not an object"]);
  assert.deepEqual(checkSaveGameShape(42), ["save data is not an object"]);
  assert.deepEqual(checkSaveGameShape([1, 2, 3]), ["save data is not an object"]);
});

test("checkSaveGameShape flags a missing top-level field", () => {
  const save: Record<string, unknown> = { ...makeValidSave() };
  delete save.factionName;
  const errors = checkSaveGameShape(save);
  assert.ok(errors.some((error) => error.includes("factionName")));
});

test("checkSaveGameShape flags a hero with a malformed assignment", () => {
  const save = makeValidSave();
  // @ts-expect-error deliberately corrupting the shape for the test
  save.heroes[0].assignment = { mode: "flying" };
  const errors = checkSaveGameShape(save);
  assert.ok(errors.some((error) => error.includes("assignment.mode")));
});

test("checkSaveGameShape flags a hero missing entirely required fields", () => {
  const save: Record<string, unknown> = { ...makeValidSave() };
  save.heroes = [{ heroId: "hero-1" }];
  const errors = checkSaveGameShape(save);
  assert.ok(errors.some((error) => error.includes("heroes[0].level")));
  assert.ok(errors.some((error) => error.includes("heroes[0].assignment")));
});

test("checkSaveGameShape flags a faction that isn't an object", () => {
  const save: Record<string, unknown> = { ...makeValidSave() };
  save.factions = { "faction-1": "not an object" };
  const errors = checkSaveGameShape(save);
  assert.ok(errors.some((error) => error.includes("factions.faction-1")));
});

test("parseSaveGame rejects invalid JSON without throwing", () => {
  const result = parseSaveGame("{not json");
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("JSON")));
});

test("parseSaveGame round-trips a valid save through JSON", () => {
  const save = makeValidSave();
  const result = parseSaveGame(JSON.stringify(save));
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.save, save);
});

test("parseSaveGame rejects a save with a mismatched schema version", () => {
  const save = makeValidSave();
  save.schemaVersion = SAVE_SCHEMA_VERSION + 1;
  const result = parseSaveGame(JSON.stringify(save));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("schema version")));
});

test("parseSaveGame rejects a shape-valid but referentially-broken save", () => {
  const save = makeValidSave();
  save.world!.playerFactionId = "faction-ghost";
  const result = parseSaveGame(JSON.stringify(save));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("faction-ghost")));
});
