import assert from "node:assert/strict";
import test from "node:test";
import { createCity } from "./city.ts";
import type { City } from "./city.ts";
import { PLAYER_FACTION_ID } from "./faction.ts";
import { heroCombatStats } from "./hero-definition.ts";
import { beginHeroRecovery } from "./hero.ts";
import { createNewSaveGame } from "./new-game.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";
import { endTurn } from "./turn.ts";
import type { Unit } from "./unit.ts";
import { enterMapCandidate } from "./world-entry.ts";

function withCity(save: ReturnType<typeof enterMapCandidate>, overrides: Partial<City> = {}) {
  const city: City = { ...createCity({ id: "city-1", factionId: PLAYER_FACTION_ID, name: "테스트도시", position: { row: 0, column: 0 } }), ...overrides };
  return {
    ...save,
    cities: { ...save.cities, [city.id]: city },
    factions: {
      ...save.factions,
      [PLAYER_FACTION_ID]: {
        ...save.factions[PLAYER_FACTION_ID],
        cityIds: [...save.factions[PLAYER_FACTION_ID].cityIds, city.id],
      },
    },
  };
}

const NOW = "2026-07-27T00:00:00.000Z";

function freshActiveWorldSave() {
  const save = createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
  return enterMapCandidate(save, 0, [save.heroes[0].heroId], NOW);
}

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    factionId: PLAYER_FACTION_ID,
    unitType: "infantry",
    position: { row: 0, column: 0 },
    stats: { attack: 5, defense: 5, maxHealth: 20, movement: 3, range: null },
    health: 20,
    movementRemaining: 0,
    ...overrides,
  };
}

test("endTurn increments world.turn by 1", () => {
  const save = freshActiveWorldSave();
  const before = save.world?.turn;
  const after = endTurn(save, NOW);
  assert.equal(after.world?.turn, (before ?? 0) + 1);
});

test("endTurn throws when no world is active", () => {
  const save = createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
  assert.throws(() => endTurn(save, NOW));
});

test("endTurn restores every unit's movementRemaining to its full movement stat", () => {
  let save = freshActiveWorldSave();
  save = {
    ...save,
    units: {
      "unit-1": makeUnit({ id: "unit-1", movementRemaining: 0, stats: { attack: 1, defense: 1, maxHealth: 1, movement: 3, range: null } }),
      "unit-2": makeUnit({ id: "unit-2", movementRemaining: 1, stats: { attack: 1, defense: 1, maxHealth: 1, movement: 5, range: null } }),
    },
  };
  const after = endTurn(save, NOW);
  assert.equal(after.units["unit-1"].movementRemaining, 3);
  assert.equal(after.units["unit-2"].movementRemaining, 5);
});

test("endTurn does not mutate other unit fields", () => {
  let save = freshActiveWorldSave();
  const unit = makeUnit({ health: 7 });
  save = { ...save, units: { "unit-1": unit } };
  const after = endTurn(save, NOW);
  assert.equal(after.units["unit-1"].health, 7);
  assert.equal(after.units["unit-1"].id, "unit-1");
});

test("endTurn does not mutate the original save (pure function)", () => {
  const save = freshActiveWorldSave();
  const turnBefore = save.world?.turn;
  endTurn(save, NOW);
  assert.equal(save.world?.turn, turnBefore);
});

test("endTurn updates updatedAt", () => {
  const save = freshActiveWorldSave();
  const after = endTurn(save, "2026-08-01T00:00:00.000Z");
  assert.equal(after.updatedAt, "2026-08-01T00:00:00.000Z");
});

test("ending several turns in a row keeps incrementing", () => {
  let save = freshActiveWorldSave();
  save = endTurn(save, NOW);
  save = endTurn(save, NOW);
  save = endTurn(save, NOW);
  assert.equal(save.world?.turn, 4);
});

test("endTurn ticks a recovering hero's timer down by one", () => {
  let save = freshActiveWorldSave();
  save = { ...save, heroes: save.heroes.map((hero) => beginHeroRecovery(hero, 3)) };
  const after = endTurn(save, NOW);
  assert.deepEqual(after.heroes[0].assignment, { mode: "recovering", turnsRemaining: 2 });
});

test("endTurn returns a hero to solo with full health once recovery finishes", () => {
  let save = freshActiveWorldSave();
  save = { ...save, heroes: save.heroes.map((hero) => beginHeroRecovery(hero, 1)) };
  const after = endTurn(save, NOW);
  const definition = STARTING_HEROES.find((hero) => hero.id === after.heroes[0].heroId)!;
  const expectedMaxHealth = heroCombatStats(definition.attributes, definition.unitType).maxHealth;
  assert.equal(after.heroes[0].assignment.mode, "solo");
  assert.equal(after.heroes[0].health, expectedMaxHealth);
});

test("endTurn does not touch a hero that isn't recovering", () => {
  const save = freshActiveWorldSave();
  const after = endTurn(save, NOW);
  assert.deepEqual(after.heroes[0].assignment, save.heroes[0].assignment);
  assert.equal(after.heroes[0].health, save.heroes[0].health);
});

test("endTurn credits a city's facility yield to its faction's resources", () => {
  const save = withCity(freshActiveWorldSave(), { facilities: ["farm", "mine"] });
  const before = save.factions[PLAYER_FACTION_ID].resources;
  const after = endTurn(save, NOW);
  const afterResources = after.factions[PLAYER_FACTION_ID].resources;
  assert.ok(afterResources.food > before.food);
  assert.ok(afterResources.iron > before.iron);
  assert.equal(afterResources.gold, before.gold, "no market built -> gold untouched");
});

test("endTurn sums facility yields across multiple cities owned by the same faction", () => {
  let save = withCity(freshActiveWorldSave(), { id: "city-1", facilities: ["farm"] });
  save = withCity(save, { id: "city-2", position: { row: 5, column: 5 }, facilities: ["farm"] });
  const after = endTurn(save, NOW);
  // Two farms -> double the single-farm yield.
  const singleFarm = endTurn(withCity(freshActiveWorldSave(), { facilities: ["farm"] }), NOW);
  assert.equal(
    after.factions[PLAYER_FACTION_ID].resources.food,
    singleFarm.factions[PLAYER_FACTION_ID].resources.food * 2,
  );
});

test("endTurn decrements a city's production queue without completing it early", () => {
  const save = withCity(freshActiveWorldSave(), {
    facilities: ["barracks"],
    productionQueue: [{ unitType: "infantry", turnsRemaining: 3 }],
  });
  const after = endTurn(save, NOW);
  const city = after.cities["city-1"];
  assert.equal(city.productionQueue.length, 1);
  assert.equal(city.productionQueue[0].turnsRemaining, 2);
});

test("endTurn spawns a real unit into the faction's roster once production completes", () => {
  const save = withCity(freshActiveWorldSave(), {
    facilities: ["barracks"],
    productionQueue: [{ unitType: "infantry", turnsRemaining: 1 }],
  });
  const after = endTurn(save, NOW);
  const city = after.cities["city-1"];
  assert.equal(city.productionQueue.length, 0);

  const faction = after.factions[PLAYER_FACTION_ID];
  assert.equal(faction.unitIds.length, 1);
  const unit = after.units[faction.unitIds[0]];
  assert.ok(unit);
  assert.equal(unit.unitType, "infantry");
  assert.deepEqual(unit.position, city.position);
  assert.equal(unit.factionId, PLAYER_FACTION_ID);
  assert.equal(unit.health, unit.stats.maxHealth);
});

test("endTurn speeds up production for a city with a stationed hero who has a troops specialty (task 11)", () => {
  // zhang-bao (STARTING_HEROES[0]) has domesticSpecialties.troops = "B".
  let save = freshActiveWorldSave();
  const heroId = save.heroes[0].heroId;
  save = withCity(save, {
    heroId,
    facilities: ["barracks"],
    productionQueue: [{ unitType: "infantry", turnsRemaining: 3 }],
  });
  const withHero = endTurn(save, NOW);
  const withoutHero = endTurn(withCity(freshActiveWorldSave(), {
    facilities: ["barracks"],
    productionQueue: [{ unitType: "infantry", turnsRemaining: 3 }],
  }), NOW);
  assert.ok(
    withHero.cities["city-1"].productionQueue[0].turnsRemaining <
      withoutHero.cities["city-1"].productionQueue[0].turnsRemaining,
  );
});

test("endTurn does not boost a resource yield when the stationed hero's specialty doesn't match", () => {
  // zhang-bao has gold/food domestic specialty "없음" - only troops is graded.
  let save = freshActiveWorldSave();
  const heroId = save.heroes[0].heroId;
  save = withCity(save, { heroId, facilities: ["market"] });
  const withHero = endTurn(save, NOW);
  const withoutHero = endTurn(withCity(freshActiveWorldSave(), { facilities: ["market"] }), NOW);
  assert.equal(
    withHero.factions[PLAYER_FACTION_ID].resources.gold,
    withoutHero.factions[PLAYER_FACTION_ID].resources.gold,
  );
});

test("endTurn boosts a matching resource yield for a stationed hero with a domestic specialty (task 11)", () => {
  // xu-shu has domesticSpecialties.gold = "B" and food = "B".
  let save = freshActiveWorldSave();
  const xuShu = { ...save.heroes[0], heroId: "xu-shu" };
  save = { ...save, heroes: [...save.heroes, xuShu] };
  save = withCity(save, { heroId: "xu-shu", facilities: ["market"] });
  const withHero = endTurn(save, NOW);
  const withoutHero = endTurn(withCity(freshActiveWorldSave(), { facilities: ["market"] }), NOW);
  assert.ok(
    withHero.factions[PLAYER_FACTION_ID].resources.gold >
      withoutHero.factions[PLAYER_FACTION_ID].resources.gold,
  );
});

test("endTurn's produced unit stats reflect the world's researchSnapshot, not live research", () => {
  let save = withCity(freshActiveWorldSave(), {
    facilities: ["barracks"],
    productionQueue: [{ unitType: "infantry", turnsRemaining: 1 }],
  });
  // researchSnapshot was frozen at world entry (0 for a fresh game); bump
  // live faction research afterward and confirm it's not what gets used.
  save = {
    ...save,
    factions: {
      ...save.factions,
      [PLAYER_FACTION_ID]: {
        ...save.factions[PLAYER_FACTION_ID],
        research: { ...save.factions[PLAYER_FACTION_ID].research, infantry: 10 },
      },
    },
  };
  const after = endTurn(save, NOW);
  const faction = after.factions[PLAYER_FACTION_ID];
  const unit = after.units[faction.unitIds[0]];
  // researchSnapshot.infantry was 0 -> grade D -> the lowest attack tier.
  assert.equal(unit.stats.attack, 1 * 3);
});

// --- 회복(recovery) specialty regen (task 11 follow-up) ---

test("endTurn heals a damaged unit sitting at a city stationed with a 회복-specialty hero", () => {
  // zhao-yun (LEGENDARY_HEROES) has domesticSpecialties.recovery = "B".
  let save = freshActiveWorldSave();
  const zhaoYun = { ...save.heroes[0], heroId: "zhao-yun" };
  save = { ...save, heroes: [...save.heroes, zhaoYun] };
  save = withCity(save, { heroId: "zhao-yun" });
  save = {
    ...save,
    units: {
      "unit-1": makeUnit({ id: "unit-1", position: { row: 0, column: 0 }, health: 5, stats: { attack: 1, defense: 1, maxHealth: 20, movement: 3, range: null } }),
    },
  };
  const after = endTurn(save, NOW);
  assert.ok(after.units["unit-1"].health > 5);
});

test("endTurn does not heal a unit sitting elsewhere on the map", () => {
  let save = freshActiveWorldSave();
  const zhaoYun = { ...save.heroes[0], heroId: "zhao-yun" };
  save = { ...save, heroes: [...save.heroes, zhaoYun] };
  save = withCity(save, { heroId: "zhao-yun" });
  save = {
    ...save,
    units: {
      "unit-1": makeUnit({ id: "unit-1", position: { row: 9, column: 9 }, health: 5, stats: { attack: 1, defense: 1, maxHealth: 20, movement: 3, range: null } }),
    },
  };
  const after = endTurn(save, NOW);
  assert.equal(after.units["unit-1"].health, 5);
});

test("endTurn heals the stationed 회복-specialty hero themselves, up to their own max health", () => {
  let save = freshActiveWorldSave();
  const zhaoYun = { ...save.heroes[0], heroId: "zhao-yun", health: 5, assignment: { mode: "city" as const, cityId: "city-1" } };
  save = { ...save, heroes: [zhaoYun] };
  save = withCity(save, { heroId: "zhao-yun" });
  const after = endTurn(save, NOW);
  assert.ok(after.heroes[0].health > 5);
});

test("endTurn speeds up a recovering hero's return when the faction has a 회복-specialty hero stationed anywhere", () => {
  // zhang-bao starts recovering with 3 turns remaining; zhao-yun (recovery
  // specialist) is stationed in a city elsewhere on the map - the faction-
  // wide speedup (recoveryTurnsBonus) should shave an extra turn off.
  let save = freshActiveWorldSave();
  const recoveringHero = beginHeroRecovery(save.heroes[0], 3);
  const zhaoYun = { ...save.heroes[0], heroId: "zhao-yun" };
  save = { ...save, heroes: [recoveringHero, zhaoYun] };
  save = withCity(save, { heroId: "zhao-yun" });
  const after = endTurn(save, NOW);
  assert.deepEqual(after.heroes[0].assignment, { mode: "recovering", turnsRemaining: 1 });
});

// --- world.conquered recomputation (task 12) ---

test("endTurn leaves world.conquered false while a rival faction is still active", () => {
  const save = freshActiveWorldSave();
  const rivalIds = save.world!.factionIds.filter((id) => id !== PLAYER_FACTION_ID);
  assert.ok(rivalIds.length > 0, "the default map tier should have at least one rival");
  const after = endTurn(save, NOW);
  assert.equal(after.world?.conquered, false);
});

test("endTurn flips world.conquered to true once every rival faction is eliminated", () => {
  let save = freshActiveWorldSave();
  const rivalIds = save.world!.factionIds.filter((id) => id !== PLAYER_FACTION_ID);
  const factions = { ...save.factions };
  for (const rivalId of rivalIds) {
    factions[rivalId] = { ...factions[rivalId], eliminationReason: "captured" };
  }
  save = { ...save, factions };
  const after = endTurn(save, NOW);
  assert.equal(after.world?.conquered, true);
});
