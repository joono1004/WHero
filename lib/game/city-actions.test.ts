import assert from "node:assert/strict";
import test from "node:test";
import { checkHeroSummons, foundCity } from "./city-actions.ts";
import { upgradeCity } from "./city.ts";
import { PLAYER_FACTION_ID } from "./faction.ts";
import { assignHeroToCity, isHeroEnlisted, sendHeroSolo } from "./hero.ts";
import { createNewSaveGame } from "./new-game.ts";
import { findSaveGameIssues } from "./save.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";
import { enterMapCandidate } from "./world-entry.ts";

const NOW = "2026-07-27T00:00:00.000Z";

function freshLobbySave() {
  return createNewSaveGame({ factionName: "테스트세력", heroId: STARTING_HEROES[0].id, seed: 42, now: NOW });
}

function activeWorldSaveWithHeroes(count: number) {
  const save = freshLobbySave();
  // Give the roster enough heroes to enlist `count` of them - reuse the same
  // starting hero definition under distinct ids/instances, since only the
  // heroId's existence in save.heroes matters for these tests.
  const heroes = Array.from({ length: count }, (_, index) => ({
    ...save.heroes[0],
    heroId: `${save.heroes[0].heroId}-${index}`,
  }));
  const withRoster = { ...save, heroes };
  const enlistedHeroIds = heroes.map((hero) => hero.heroId);
  return enterMapCandidate(withRoster, 0, enlistedHeroIds, NOW);
}

test("foundCity creates an outpost-tier city and leaves the founding hero solo", () => {
  const save = activeWorldSaveWithHeroes(1);
  const heroId = save.heroes[0].heroId;
  const result = foundCity(save, heroId, { row: 4, column: 4 }, "첫도시", NOW);
  const faction = result.factions[PLAYER_FACTION_ID];
  assert.equal(faction.cityIds.length, 1);
  const city = result.cities[faction.cityIds[0]];
  assert.equal(city.tier, "outpost");
  assert.equal(city.heroId, null);
  const hero = result.heroes.find((candidate) => candidate.heroId === heroId)!;
  assert.deepEqual(hero.assignment, { mode: "solo", position: { row: 4, column: 4 } });
  assert.deepEqual(findSaveGameIssues(result), []);
});

test("foundCity sets the faction's capitalCityId on the first city, and never changes it after (task 12)", () => {
  const save = activeWorldSaveWithHeroes(2);
  const founderId = save.heroes[0].heroId;
  const secondHeroId = save.heroes[1].heroId;
  let updated = foundCity(save, founderId, { row: 0, column: 0 }, "첫도시", NOW);
  const firstCityId = updated.factions[PLAYER_FACTION_ID].cityIds[0];
  assert.equal(updated.factions[PLAYER_FACTION_ID].capitalCityId, firstCityId);

  const RICH_RESOURCES = { gold: 100000, food: 100000, iron: 0, researchResource: 0 };
  const upgraded = upgradeCity(updated.cities[firstCityId], RICH_RESOURCES);
  updated = {
    ...updated,
    cities: { ...updated.cities, [firstCityId]: upgraded.city },
    factions: { ...updated.factions, [PLAYER_FACTION_ID]: { ...updated.factions[PLAYER_FACTION_ID], resources: upgraded.resources } },
    heroes: updated.heroes.map((hero) => (hero.heroId === secondHeroId ? sendHeroSolo(hero, { row: 0, column: 20 }) : hero)),
  };
  updated = foundCity(updated, secondHeroId, { row: 0, column: 20 }, "두번째도시", NOW);
  assert.equal(updated.factions[PLAYER_FACTION_ID].capitalCityId, firstCityId, "capital stays the first city, not the second");
});

test("foundCity throws when no world is active", () => {
  const save = freshLobbySave();
  assert.throws(() => foundCity(save, save.heroes[0].heroId, { row: 4, column: 4 }, "도시", NOW));
});

test("foundCity throws for a hero that isn't moving solo", () => {
  let save = activeWorldSaveWithHeroes(1);
  const heroId = save.heroes[0].heroId;
  save = { ...save, heroes: save.heroes.map((hero) => assignHeroToCity(hero, "city-elsewhere")) };
  assert.throws(() => foundCity(save, heroId, { row: 4, column: 4 }, "도시", NOW));
});

test("foundCity throws when the position is too close to an existing city", () => {
  const save = activeWorldSaveWithHeroes(2);
  const founderId = save.heroes[0].heroId;
  const secondHeroId = save.heroes[1].heroId;
  let updated = foundCity(save, founderId, { row: 0, column: 0 }, "첫도시", NOW);
  updated = { ...updated, heroes: updated.heroes.map((hero) => (hero.heroId === secondHeroId ? sendHeroSolo(hero, { row: 0, column: 1 }) : hero)) };
  assert.throws(() => foundCity(updated, secondHeroId, { row: 0, column: 1 }, "너무가까운도시", NOW));
});

test("foundCity throws for a second city before any existing city reaches small tier", () => {
  const save = activeWorldSaveWithHeroes(2);
  const founderId = save.heroes[0].heroId;
  const secondHeroId = save.heroes[1].heroId;
  let updated = foundCity(save, founderId, { row: 0, column: 0 }, "첫도시", NOW);
  updated = { ...updated, heroes: updated.heroes.map((hero) => (hero.heroId === secondHeroId ? sendHeroSolo(hero, { row: 0, column: 10 }) : hero)) };
  assert.throws(() => foundCity(updated, secondHeroId, { row: 0, column: 10 }, "두번째도시", NOW));
});

test("foundCity's referential integrity holds after founding (city.heroId <-> hero.assignment)", () => {
  const save = activeWorldSaveWithHeroes(1);
  const result = foundCity(save, save.heroes[0].heroId, { row: 4, column: 4 }, "첫도시", NOW);
  assert.deepEqual(findSaveGameIssues(result), []);
});

test("with zero cities, the summon count is still treated as 1 (the founder already solo)", () => {
  const save = activeWorldSaveWithHeroes(3);
  // world-entry.ts already made the first hero solo and the rest enlisted.
  assert.equal(save.heroes.filter(isHeroEnlisted).length, 2);
  const result = checkHeroSummons(save, { row: 1, column: 1 }, NOW);
  assert.equal(result.heroes.filter(isHeroEnlisted).length, 2);
});

test("founding a second city (city count 2) promotes the next enlisted hero, but not the one after", () => {
  const RICH_RESOURCES = { gold: 100000, food: 100000, iron: 0, researchResource: 0 };
  const save = activeWorldSaveWithHeroes(3);
  const [founderId, secondHeroId, thirdHeroId] = save.heroes.map((hero) => hero.heroId);

  let updated = foundCity(save, founderId, { row: 0, column: 0 }, "도시1", NOW);
  assert.equal(updated.heroes.filter(isHeroEnlisted).length, 2, "still only 1 city -> no extra summon");
  // The founder stays solo (not auto-stationed) so they're free to found
  // the next city themselves.
  assert.equal(updated.heroes.find((hero) => hero.heroId === founderId)?.assignment.mode, "solo");

  // Upgrade city1 to "small" so a second city is allowed (point 7), then
  // found it far enough away, still with the same (still-solo) founder.
  const cityId = updated.factions[PLAYER_FACTION_ID].cityIds[0];
  const upgraded = upgradeCity(updated.cities[cityId], RICH_RESOURCES);
  updated = {
    ...updated,
    cities: { ...updated.cities, [cityId]: upgraded.city },
    factions: {
      ...updated.factions,
      [PLAYER_FACTION_ID]: { ...updated.factions[PLAYER_FACTION_ID], resources: upgraded.resources },
    },
  };

  updated = foundCity(updated, founderId, { row: 0, column: 10 }, "도시2", NOW);
  assert.equal(updated.factions[PLAYER_FACTION_ID].cityIds.length, 2);
  // City count is now 2 -> the next enlisted hero (secondHeroId) should be
  // summoned (solo), but the one after that (thirdHeroId) should not.
  assert.equal(updated.heroes.find((hero) => hero.heroId === secondHeroId)?.assignment.mode, "solo");
  assert.equal(isHeroEnlisted(updated.heroes.find((hero) => hero.heroId === thirdHeroId)!), true);
  assert.equal(updated.heroes.filter(isHeroEnlisted).length, 1);
  assert.deepEqual(findSaveGameIssues(updated), []);
});

test("checkHeroSummons never promotes more heroes than were enlisted", () => {
  const save = activeWorldSaveWithHeroes(2);
  const result = checkHeroSummons(save, { row: 1, column: 1 }, NOW);
  assert.ok(result.heroes.filter(isHeroEnlisted).length <= 1);
});

test("checkHeroSummons is a no-op when no world is active", () => {
  const save = freshLobbySave();
  const result = checkHeroSummons(save, { row: 0, column: 0 }, NOW);
  assert.deepEqual(result, save);
});
