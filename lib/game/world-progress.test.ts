import assert from "node:assert/strict";
import test from "node:test";
import { createCity } from "./city.ts";
import type { City } from "./city.ts";
import { createFaction, isFactionEliminated, PLAYER_FACTION_ID } from "./faction.ts";
import type { Faction } from "./faction.ts";
import { isHeroInCity } from "./hero.ts";
import { createNewSaveGame } from "./new-game.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";
import { captureEnemyCity, isWorldConquered, surrenderFaction, surrenderRivalFaction } from "./world-progress.ts";
import { enterMapCandidate } from "./world-entry.ts";
import type { WorldState } from "./world.ts";

const NOW = "2026-07-27T00:00:00.000Z";

function freshActiveWorldSave() {
  const save = createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
  return enterMapCandidate(save, 0, [save.heroes[0].heroId], NOW);
}

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    id: "world-1",
    worldIndex: 1,
    generation: { seed: 1, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
    factionIds: [PLAYER_FACTION_ID, "rival-1", "rival-2"],
    playerFactionId: PLAYER_FACTION_ID,
    exploredHexes: [],
    turn: 1,
    conquered: false,
    heroDeploymentLimit: 1,
    enlistedHeroIds: [],
    researchSnapshot: { gold: 0, food: 0, infantry: 0, archer: 0, cavalry: 0, siege: 0 },
    ...overrides,
  };
}

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return { ...createFaction({ id: "rival-1", name: "1세력", isPlayerControlled: false }), ...overrides };
}

// --- isWorldConquered ---

test("isWorldConquered is false while any rival faction is still active", () => {
  const world = makeWorld();
  const factions = {
    [PLAYER_FACTION_ID]: makeFaction({ id: PLAYER_FACTION_ID, isPlayerControlled: true }),
    "rival-1": makeFaction({ id: "rival-1", eliminationReason: "captured" }),
    "rival-2": makeFaction({ id: "rival-2", eliminationReason: null }),
  };
  assert.equal(isWorldConquered(world, factions), false);
});

test("isWorldConquered is true once every rival faction is eliminated, regardless of reason", () => {
  const world = makeWorld();
  const factions = {
    [PLAYER_FACTION_ID]: makeFaction({ id: PLAYER_FACTION_ID, isPlayerControlled: true }),
    "rival-1": makeFaction({ id: "rival-1", eliminationReason: "captured" }),
    "rival-2": makeFaction({ id: "rival-2", eliminationReason: "surrendered" }),
  };
  assert.equal(isWorldConquered(world, factions), true);
});

test("isWorldConquered ignores the player faction's own elimination status", () => {
  const world = makeWorld({ factionIds: [PLAYER_FACTION_ID] });
  const factions = { [PLAYER_FACTION_ID]: makeFaction({ id: PLAYER_FACTION_ID, isPlayerControlled: true }) };
  assert.equal(isWorldConquered(world, factions), true, "no rivals at all -> vacuously conquered");
});

// --- surrenderFaction ---

test("surrenderFaction marks an active faction as surrendered", () => {
  const faction = makeFaction();
  const surrendered = surrenderFaction(faction);
  assert.equal(surrendered.eliminationReason, "surrendered");
  assert.equal(isFactionEliminated(surrendered), true);
});

test("surrenderFaction does not overwrite an already-captured faction's reason", () => {
  const faction = makeFaction({ eliminationReason: "captured" });
  const result = surrenderFaction(faction);
  assert.equal(result.eliminationReason, "captured");
});

// --- captureEnemyCity ---

function saveWithRival() {
  let save = freshActiveWorldSave();
  const capitalId = "rival-capital-1";
  const capital: City = createCity({ id: capitalId, factionId: "rival-1", name: "적 수도", position: { row: 5, column: 5 } });
  save = {
    ...save,
    cities: { ...save.cities, [capitalId]: capital },
    factions: {
      ...save.factions,
      "rival-1": makeFaction({ id: "rival-1", cityIds: [capitalId], capitalCityId: capitalId }),
    },
    // Replace (not append to) factionIds so this test is isolated from
    // whatever rival(s) enterMapCandidate itself already spawned for the
    // default map tier (task 12's own minimal AI scaffolding) - this test
    // wants exactly one rival, "rival-1", to reason about.
    world: { ...save.world!, factionIds: [PLAYER_FACTION_ID, "rival-1"] },
  };
  return { save, capitalId };
}

test("captureEnemyCity transfers the city to the capturing faction's cityIds", () => {
  const { save, capitalId } = saveWithRival();
  const result = captureEnemyCity(save, capitalId, PLAYER_FACTION_ID, NOW);
  assert.equal(result.cities[capitalId].factionId, PLAYER_FACTION_ID);
  assert.ok(result.factions[PLAYER_FACTION_ID].cityIds.includes(capitalId));
  assert.ok(!result.factions["rival-1"].cityIds.includes(capitalId));
});

test("captureEnemyCity eliminates the losing faction when the captured city was its capital", () => {
  const { save, capitalId } = saveWithRival();
  const result = captureEnemyCity(save, capitalId, PLAYER_FACTION_ID, NOW);
  assert.equal(result.factions["rival-1"].eliminationReason, "captured");
});

test("captureEnemyCity marks world.conquered once the last rival's capital falls", () => {
  const { save, capitalId } = saveWithRival();
  const result = captureEnemyCity(save, capitalId, PLAYER_FACTION_ID, NOW);
  assert.equal(result.world?.conquered, true);
});

test("capturing a non-capital city does not eliminate the faction", () => {
  const setup = saveWithRival();
  const capitalId = setup.capitalId;
  let save = setup.save;
  const secondCityId = "rival-city-2";
  const secondCity: City = createCity({ id: secondCityId, factionId: "rival-1", name: "적 도시", position: { row: 6, column: 6 } });
  save = {
    ...save,
    cities: { ...save.cities, [secondCityId]: secondCity },
    factions: {
      ...save.factions,
      "rival-1": { ...save.factions["rival-1"], cityIds: [...save.factions["rival-1"].cityIds, secondCityId] },
    },
  };
  const result = captureEnemyCity(save, secondCityId, PLAYER_FACTION_ID, NOW);
  assert.equal(result.factions["rival-1"].eliminationReason, null);
  assert.equal(result.world?.conquered, false);
  // the capital is untouched.
  assert.equal(result.cities[capitalId].factionId, "rival-1");
});

test("captureEnemyCity sends a stationed hero back to solo at the city's position", () => {
  const setup = saveWithRival();
  const capitalId = setup.capitalId;
  let save = setup.save;
  const heroId = save.heroes[0].heroId;
  save = {
    ...save,
    cities: { ...save.cities, [capitalId]: { ...save.cities[capitalId], heroId } },
  };
  const result = captureEnemyCity(save, capitalId, PLAYER_FACTION_ID, NOW);
  const hero = result.heroes.find((candidate) => candidate.heroId === heroId)!;
  assert.equal(hero.assignment.mode, "solo");
  assert.equal(isHeroInCity(hero), false);
});

test("captureEnemyCity throws when the city doesn't exist", () => {
  const { save } = saveWithRival();
  assert.throws(() => captureEnemyCity(save, "not-a-real-city", PLAYER_FACTION_ID, NOW));
});

test("captureEnemyCity throws when the city already belongs to the capturing faction", () => {
  const save = freshActiveWorldSave();
  const cityId = "city-mine";
  const mine: City = createCity({ id: cityId, factionId: PLAYER_FACTION_ID, name: "내도시", position: { row: 1, column: 1 } });
  const withCity = { ...save, cities: { ...save.cities, [cityId]: mine } };
  assert.throws(() => captureEnemyCity(withCity, cityId, PLAYER_FACTION_ID, NOW));
});

test("captureEnemyCity does not mutate the original save (pure function)", () => {
  const { save, capitalId } = saveWithRival();
  const before = save.cities[capitalId].factionId;
  captureEnemyCity(save, capitalId, PLAYER_FACTION_ID, NOW);
  assert.equal(save.cities[capitalId].factionId, before);
});

// --- surrenderRivalFaction ---

test("surrenderRivalFaction marks the given faction as surrendered", () => {
  const { save } = saveWithRival();
  const result = surrenderRivalFaction(save, "rival-1", NOW);
  assert.equal(result.factions["rival-1"].eliminationReason, "surrendered");
});

test("surrenderRivalFaction does not touch the surrendering faction's cities", () => {
  const { save, capitalId } = saveWithRival();
  const result = surrenderRivalFaction(save, "rival-1", NOW);
  assert.equal(result.cities[capitalId].factionId, "rival-1");
  assert.deepEqual(result.factions["rival-1"].cityIds, [capitalId]);
});

test("surrenderRivalFaction marks world.conquered once the last rival surrenders", () => {
  const { save } = saveWithRival();
  const result = surrenderRivalFaction(save, "rival-1", NOW);
  assert.equal(result.world?.conquered, true);
});

test("surrenderRivalFaction leaves world.conquered false while another rival is still active", () => {
  let { save } = saveWithRival();
  save = {
    ...save,
    world: { ...save.world!, factionIds: [...save.world!.factionIds, "rival-2"] },
    factions: { ...save.factions, "rival-2": makeFaction({ id: "rival-2" }) },
  };
  const result = surrenderRivalFaction(save, "rival-1", NOW);
  assert.equal(result.world?.conquered, false);
});

test("surrenderRivalFaction throws when no world is active", () => {
  const save = createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
  assert.throws(() => surrenderRivalFaction(save, "rival-1", NOW));
});

test("surrenderRivalFaction throws when the faction is missing from this save", () => {
  const { save } = saveWithRival();
  assert.throws(() => surrenderRivalFaction(save, "not-a-real-faction", NOW));
});

test("surrenderRivalFaction throws for the player's own faction id", () => {
  const { save } = saveWithRival();
  assert.throws(() => surrenderRivalFaction(save, PLAYER_FACTION_ID, NOW));
});

test("surrenderRivalFaction does not mutate the original save (pure function)", () => {
  const { save } = saveWithRival();
  surrenderRivalFaction(save, "rival-1", NOW);
  assert.equal(save.factions["rival-1"].eliminationReason, null);
});
