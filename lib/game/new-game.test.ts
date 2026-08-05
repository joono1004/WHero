import assert from "node:assert/strict";
import test from "node:test";
import { heroCombatStats } from "./hero-definition.ts";
import { findSaveGameIssues } from "./save.ts";
import { createNewSaveGame } from "./new-game.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";

const BASE_PARAMS = { factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: "2026-07-27T00:00:00.000Z" };

test("createNewSaveGame produces a save with no integrity issues", () => {
  const save = createNewSaveGame(BASE_PARAMS);
  assert.deepEqual(findSaveGameIssues(save), []);
});

test("createNewSaveGame embeds the chosen faction name and hero", () => {
  const save = createNewSaveGame(BASE_PARAMS);
  assert.equal(save.factionName, "테스트세력");
  assert.equal(save.heroes.length, 1);
  assert.equal(save.heroes[0].heroId, STARTING_HEROES[0].id);
  assert.equal(save.heroes[0].level, 1);
});

test("createNewSaveGame starts the hero solo at the origin hex", () => {
  const save = createNewSaveGame(BASE_PARAMS);
  assert.deepEqual(save.heroes[0].assignment, { mode: "solo", position: { row: 0, column: 0 } });
});

test("createNewSaveGame starts the hero with zero attribute progress and deployment priority on", () => {
  const save = createNewSaveGame(BASE_PARAMS);
  assert.deepEqual(save.heroes[0].attributeProgress, {
    leadership: 0,
    force: 0,
    intelligence: 0,
    charisma: 0,
    vitality: 0,
  });
  assert.equal(save.heroes[0].deploymentPriority, true);
});

test("createNewSaveGame starts the hero at full health, derived from vitality", () => {
  const hero = STARTING_HEROES[0];
  const save = createNewSaveGame({ ...BASE_PARAMS, heroId: hero.id });
  const expectedMaxHealth = heroCombatStats(hero.attributes, hero.unitType).maxHealth;
  assert.equal(save.heroes[0].health, expectedMaxHealth);
});

test("createNewSaveGame throws for an unknown hero id rather than producing a broken save", () => {
  assert.throws(() => createNewSaveGame({ ...BASE_PARAMS, heroId: "not-a-real-hero" }));
});

test("createNewSaveGame is deterministic given the same inputs", () => {
  const a = createNewSaveGame(BASE_PARAMS);
  const b = createNewSaveGame(BASE_PARAMS);
  assert.deepEqual(a, b);
});

test("createNewSaveGame starts with no active world and exactly one map candidate", () => {
  const save = createNewSaveGame(BASE_PARAMS);
  assert.equal(save.world, null);
  assert.equal(save.nextMapCandidates.length, 1);
  assert.equal(save.nextMapCandidates[0].worldIndex, 1);
  assert.equal(save.nextMapCandidates[0].generation.mapTier, "mini");
});

test("createNewSaveGame's initial map candidate depends on the given seed", () => {
  const a = createNewSaveGame({ ...BASE_PARAMS, seed: 111 });
  const b = createNewSaveGame({ ...BASE_PARAMS, seed: 999 });
  assert.notDeepEqual(a.nextMapCandidates, b.nextMapCandidates);
});

test("createNewSaveGame works for every starting hero, not just the first", () => {
  for (const hero of STARTING_HEROES) {
    const save = createNewSaveGame({ ...BASE_PARAMS, heroId: hero.id });
    assert.deepEqual(findSaveGameIssues(save), []);
    assert.equal(save.heroes[0].heroId, hero.id);
  }
});
