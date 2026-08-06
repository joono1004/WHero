import assert from "node:assert/strict";
import test from "node:test";
import { ZERO_FACTION_RESOURCES } from "./faction.ts";
import type { FactionResources } from "./faction.ts";
import {
  canAffordResearch,
  MAX_RESEARCH_LEVEL,
  researchUpgradeCost,
  upgradeResearch,
  ZERO_RESEARCH_LEVELS,
} from "./research.ts";

test("researchUpgradeCost grows with the current level", () => {
  const costAt0 = researchUpgradeCost(0)!;
  const costAt1 = researchUpgradeCost(1)!;
  assert.ok(costAt1.gold > costAt0.gold);
  assert.ok(costAt1.researchResource > costAt0.researchResource);
});

test("researchUpgradeCost is null at the max level (nothing further to research)", () => {
  assert.equal(researchUpgradeCost(MAX_RESEARCH_LEVEL), null);
});

test("canAffordResearch is true only when both resources cover the cost", () => {
  const cost = { gold: 100, researchResource: 50 };
  assert.equal(canAffordResearch({ gold: 100, food: 0, iron: 0, researchResource: 50, wood: 0, gem: 0 }, cost), true);
  assert.equal(canAffordResearch({ gold: 99, food: 0, iron: 0, researchResource: 50, wood: 0, gem: 0 }, cost), false);
  assert.equal(canAffordResearch({ gold: 100, food: 0, iron: 0, researchResource: 49, wood: 0, gem: 0 }, cost), false);
});

test("upgradeResearch raises the chosen category by exactly one level", () => {
  const resources: FactionResources = { gold: 1000, food: 0, iron: 0, researchResource: 1000, wood: 0, gem: 0 };
  const result = upgradeResearch(ZERO_RESEARCH_LEVELS, resources, "gold");
  assert.equal(result.levels.gold, 1);
  assert.equal(result.levels.food, 0);
});

test("upgradeResearch does not touch other categories' levels", () => {
  const resources: FactionResources = { gold: 1000, food: 0, iron: 0, researchResource: 1000, wood: 0, gem: 0 };
  const levels = { ...ZERO_RESEARCH_LEVELS, cavalry: 3 };
  const result = upgradeResearch(levels, resources, "infantry");
  assert.equal(result.levels.infantry, 1);
  assert.equal(result.levels.cavalry, 3);
});

test("upgradeResearch deducts exactly the cost from resources", () => {
  const resources: FactionResources = { gold: 1000, food: 42, iron: 0, researchResource: 1000, wood: 0, gem: 0 };
  const cost = researchUpgradeCost(0)!;
  const result = upgradeResearch(ZERO_RESEARCH_LEVELS, resources, "archer");
  assert.equal(result.resources.gold, 1000 - cost.gold);
  assert.equal(result.resources.researchResource, 1000 - cost.researchResource);
  assert.equal(result.resources.food, 42, "food should be untouched by research spending");
});

test("upgradeResearch throws when the faction can't afford it", () => {
  assert.throws(() => upgradeResearch(ZERO_RESEARCH_LEVELS, ZERO_FACTION_RESOURCES, "siege"));
});

test("upgradeResearch throws once a category is already at the max level", () => {
  const maxed = { ...ZERO_RESEARCH_LEVELS, gold: MAX_RESEARCH_LEVEL };
  const resources: FactionResources = { gold: 999999, food: 0, iron: 0, researchResource: 999999, wood: 0, gem: 0 };
  assert.throws(() => upgradeResearch(maxed, resources, "gold"));
});

test("upgradeResearch never leaves a resource negative across many upgrades", () => {
  let levels = ZERO_RESEARCH_LEVELS;
  let resources: FactionResources = { gold: 100000, food: 0, iron: 0, researchResource: 100000, wood: 0, gem: 0 };
  for (let i = 0; i < MAX_RESEARCH_LEVEL; i += 1) {
    const result = upgradeResearch(levels, resources, "cavalry");
    levels = result.levels;
    resources = result.resources;
    assert.ok(resources.gold >= 0);
    assert.ok(resources.researchResource >= 0);
  }
  assert.equal(levels.cavalry, MAX_RESEARCH_LEVEL);
});
