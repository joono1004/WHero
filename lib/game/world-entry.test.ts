import assert from "node:assert/strict";
import test from "node:test";
import { PLAYER_FACTION_ID } from "./faction.ts";
import { assignHeroToCity, appointHeroAsGovernor } from "./hero.ts";
import { createNewSaveGame } from "./new-game.ts";
import { findSaveGameIssues } from "./save.ts";
import { completeActiveWorld, enterMapCandidate } from "./world-entry.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";
import { MAP_TIER_INFO } from "./world.ts";

const NOW = "2026-07-27T00:00:00.000Z";

function freshLobbySave() {
  return createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
}

function enterFirstCandidate(save: ReturnType<typeof freshLobbySave>) {
  return enterMapCandidate(save, 0, [save.heroes[0].heroId], NOW);
}

test("enterMapCandidate turns the chosen candidate into the active world and clears candidates", () => {
  const save = freshLobbySave();
  const candidate = save.nextMapCandidates[0];
  const entered = enterFirstCandidate(save);
  assert.equal(entered.nextMapCandidates.length, 0);
  assert.ok(entered.world);
  assert.equal(entered.world?.worldIndex, candidate.worldIndex);
  assert.deepEqual(entered.world?.generation, candidate.generation);
  assert.equal(entered.world?.playerFactionId, PLAYER_FACTION_ID);
  assert.deepEqual(findSaveGameIssues(entered), []);
});

test("enterMapCandidate throws when a world is already active", () => {
  const save = enterFirstCandidate(freshLobbySave());
  assert.throws(() => enterFirstCandidate(save));
});

test("enterMapCandidate throws for an out-of-range candidate index", () => {
  const save = freshLobbySave();
  assert.throws(() => enterMapCandidate(save, 5, [save.heroes[0].heroId], NOW));
});

test("enterMapCandidate throws when no heroes are enlisted", () => {
  const save = freshLobbySave();
  assert.throws(() => enterMapCandidate(save, 0, [], NOW));
});

test("enterMapCandidate throws when more than 5 heroes are enlisted", () => {
  const save = freshLobbySave();
  const heroId = save.heroes[0].heroId;
  assert.throws(() => enterMapCandidate(save, 0, [heroId, heroId, heroId, heroId, heroId, heroId], NOW));
});

test("enterMapCandidate throws for an enlisted hero id not in the roster", () => {
  const save = freshLobbySave();
  assert.throws(() => enterMapCandidate(save, 0, ["not-a-real-hero"], NOW));
});

// --- rival (AI) faction scaffolding (task 12) ---

test("enterMapCandidate spawns one rival faction per map tier's faction count, minus the player", () => {
  const save = freshLobbySave();
  const expectedFactionCount = MAP_TIER_INFO[save.nextMapCandidates[0].generation.mapTier].factions;
  const entered = enterFirstCandidate(save);
  assert.equal(entered.world?.factionIds.length, expectedFactionCount);
  const rivalIds = entered.world!.factionIds.filter((id) => id !== PLAYER_FACTION_ID);
  assert.equal(rivalIds.length, expectedFactionCount - 1);
  for (const rivalId of rivalIds) {
    assert.ok(entered.factions[rivalId], `rival faction ${rivalId} should exist in save.factions`);
    assert.equal(entered.factions[rivalId].isPlayerControlled, false);
  }
});

test("each rival faction starts with exactly one city, which is also its capital", () => {
  const entered = enterFirstCandidate(freshLobbySave());
  const rivalIds = entered.world!.factionIds.filter((id) => id !== PLAYER_FACTION_ID);
  for (const rivalId of rivalIds) {
    const faction = entered.factions[rivalId];
    assert.equal(faction.cityIds.length, 1);
    assert.equal(faction.capitalCityId, faction.cityIds[0]);
    assert.ok(entered.cities[faction.capitalCityId!], "the rival's capital city should exist in save.cities");
    assert.equal(entered.cities[faction.capitalCityId!].factionId, rivalId);
  }
});

test("completeActiveWorld archives the world and offers two fresh candidates", () => {
  const entered = enterFirstCandidate(freshLobbySave());
  const worldId = entered.world?.id;
  const completed = completeActiveWorld(entered, NOW);
  assert.equal(completed.world, null);
  assert.equal(completed.nextMapCandidates.length, 2);
  assert.notEqual(completed.nextMapCandidates[0].generation.mapType, completed.nextMapCandidates[1].generation.mapType);
  assert.ok(worldId && completed.clearedWorlds[worldId]);
  assert.deepEqual(findSaveGameIssues(completed), []);
});

test("completeActiveWorld throws when no world is active", () => {
  assert.throws(() => completeActiveWorld(freshLobbySave(), NOW));
});

test("completeActiveWorld resets a hero stationed in a city back to solo", () => {
  let save = enterFirstCandidate(freshLobbySave());
  save = {
    ...save,
    heroes: save.heroes.map((hero) => assignHeroToCity(hero, "city-1")),
  };
  const completed = completeActiveWorld(save, NOW);
  assert.equal(completed.heroes[0].assignment.mode, "solo");
});

test("completeActiveWorld leaves a governor's assignment untouched", () => {
  let save = enterFirstCandidate(freshLobbySave());
  const priorWorldId = "world-prior";
  save = {
    ...save,
    clearedWorlds: {
      [priorWorldId]: {
        id: priorWorldId,
        worldIndex: 0,
        generation: { seed: 0, mapType: "continent", mapTier: "mini", terrainVersion: "v1" },
        clearedAt: NOW,
        governorHeroId: save.heroes[0].heroId,
        name: null,
      },
    },
    heroes: save.heroes.map((hero) => appointHeroAsGovernor(hero, priorWorldId)),
  };
  const completed = completeActiveWorld(save, NOW);
  assert.deepEqual(completed.heroes[0].assignment, { mode: "governor", worldId: priorWorldId });
});

test("completeActiveWorld discards rival factions along with the rest of the world's scoped state", () => {
  const entered = enterFirstCandidate(freshLobbySave());
  const rivalIds = entered.world!.factionIds.filter((id) => id !== PLAYER_FACTION_ID);
  assert.ok(rivalIds.length > 0);
  const completed = completeActiveWorld(entered, NOW);
  for (const rivalId of rivalIds) {
    assert.equal(completed.factions[rivalId], undefined);
  }
  assert.deepEqual(Object.keys(completed.cities), []);
});

test("completeActiveWorld resets the player faction's cityIds/unitIds but keeps its resources and research", () => {
  let save = enterFirstCandidate(freshLobbySave());
  const faction = save.factions[PLAYER_FACTION_ID];
  save = {
    ...save,
    factions: {
      [PLAYER_FACTION_ID]: {
        ...faction,
        cityIds: ["city-1"],
        unitIds: ["unit-1"],
        resources: { gold: 500, food: 20, iron: 10, researchResource: 3, wood: 0, gem: 0 },
      },
    },
  };
  const completed = completeActiveWorld(save, NOW);
  const resultFaction = completed.factions[PLAYER_FACTION_ID];
  assert.deepEqual(resultFaction.cityIds, []);
  assert.deepEqual(resultFaction.unitIds, []);
  assert.deepEqual(resultFaction.resources, { gold: 500, food: 20, iron: 10, researchResource: 3, wood: 0, gem: 0 });
});

test("enter -> complete -> enter again round-trips without integrity issues", () => {
  let save = freshLobbySave();
  save = enterFirstCandidate(save);
  save = completeActiveWorld(save, NOW);
  save = enterFirstCandidate(save);
  assert.deepEqual(findSaveGameIssues(save), []);
  assert.equal(save.world?.worldIndex, 2);
});
