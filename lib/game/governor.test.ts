import assert from "node:assert/strict";
import test from "node:test";
import { appointGovernor } from "./governor.ts";
import { createNewSaveGame } from "./new-game.ts";
import type { SaveGame } from "./save.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";

const NOW = "2026-07-27T00:00:00.000Z";
const WORLD_ID = "world-0";

function saveWithClearedWorld(): SaveGame {
  const save = createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
  return {
    ...save,
    clearedWorlds: {
      [WORLD_ID]: {
        id: WORLD_ID,
        worldIndex: 1,
        generation: { seed: 1, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
        clearedAt: NOW,
        governorHeroId: null,
        name: null,
      },
    },
  };
}

test("appointGovernor sets the hero's assignment and the world's governorHeroId", () => {
  const save = saveWithClearedWorld();
  const heroId = save.heroes[0].heroId;
  const result = appointGovernor(save, WORLD_ID, heroId);
  assert.deepEqual(result.heroes[0].assignment, { mode: "governor", worldId: WORLD_ID });
  assert.equal(result.clearedWorlds[WORLD_ID].governorHeroId, heroId);
});

test("appointGovernor sets the world's name when given one", () => {
  const save = saveWithClearedWorld();
  const result = appointGovernor(save, WORLD_ID, save.heroes[0].heroId, "촉산");
  assert.equal(result.clearedWorlds[WORLD_ID].name, "촉산");
});

test("appointGovernor leaves the world unnamed when called without a name", () => {
  const save = saveWithClearedWorld();
  const result = appointGovernor(save, WORLD_ID, save.heroes[0].heroId);
  assert.equal(result.clearedWorlds[WORLD_ID].name, null);
});

test("appointGovernor treats a whitespace-only name as no name", () => {
  const save = saveWithClearedWorld();
  const result = appointGovernor(save, WORLD_ID, save.heroes[0].heroId, "   ");
  assert.equal(result.clearedWorlds[WORLD_ID].name, null);
});

test("appointGovernor throws for a worldId that isn't a cleared world", () => {
  const save = saveWithClearedWorld();
  assert.throws(() => appointGovernor(save, "world-ghost", save.heroes[0].heroId));
});

test("appointGovernor throws when the world already has a governor", () => {
  const save = saveWithClearedWorld();
  const heroId = save.heroes[0].heroId;
  const once = appointGovernor(save, WORLD_ID, heroId);
  assert.throws(() => appointGovernor(once, WORLD_ID, heroId));
});

test("appointGovernor throws for an unknown hero id", () => {
  const save = saveWithClearedWorld();
  assert.throws(() => appointGovernor(save, WORLD_ID, "not-a-real-hero"));
});

test("appointGovernor throws when the hero isn't idle", () => {
  const save = saveWithClearedWorld();
  const recovering: SaveGame = {
    ...save,
    heroes: save.heroes.map((hero) => ({ ...hero, assignment: { mode: "recovering" as const, turnsRemaining: 2 } })),
  };
  assert.throws(() => appointGovernor(recovering, WORLD_ID, recovering.heroes[0].heroId));
});

test("appointGovernor does not mutate the original save", () => {
  const save = saveWithClearedWorld();
  appointGovernor(save, WORLD_ID, save.heroes[0].heroId);
  assert.equal(save.clearedWorlds[WORLD_ID].governorHeroId, null);
  assert.equal(save.heroes[0].assignment.mode, "solo");
});
