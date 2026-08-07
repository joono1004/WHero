import assert from "node:assert/strict";
import test from "node:test";
import { createFaction } from "./faction.ts";
import type { Faction } from "./faction.ts";
import {
  activeEvolutionFor,
  canEvolveUnitType,
  evolveUnitType,
  setActiveEvolution,
  troopGrade,
  troopLevel,
  troopUpgradeCost,
  upgradeTroopLevel,
} from "./unit-evolution.ts";

function makeFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    ...createFaction({ id: "faction-1", name: "테스트세력", isPlayerControlled: true }),
    resources: { gold: 100000, food: 0, iron: 0, researchResource: 100000, wood: 0, gem: 0 },
    ...overrides,
  };
}

test("troopLevel defaults to 0 for a node with no recorded level", () => {
  assert.equal(troopLevel({}, "infantry"), 0);
  assert.equal(troopGrade({}, "infantry"), "D");
});

test("upgradeTroopLevel raises a root node's own level and spends resources", () => {
  const faction = makeFaction();
  const cost = troopUpgradeCost(faction.troopLevels, "infantry")!;
  const updated = upgradeTroopLevel(faction, "infantry");
  assert.equal(troopLevel(updated.troopLevels, "infantry"), 1);
  assert.equal(updated.resources.gold, faction.resources.gold - cost.gold);
});

test("upgradeTroopLevel throws for a non-root node that isn't unlocked yet", () => {
  const faction = makeFaction();
  assert.throws(() => upgradeTroopLevel(faction, "infantry_mountain"));
});

test("canEvolveUnitType is false until the parent reaches the required grade", () => {
  const faction = makeFaction();
  assert.equal(canEvolveUnitType(faction, "infantry_mountain"), false);
});

test("canEvolveUnitType is true once the parent's grade and cost are met", () => {
  let faction = makeFaction();
  // infantry_mountain requires infantry at grade C (researchLevelToUnitGrade
  // reaches C at level 2 - see unit-production.ts).
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  assert.equal(canEvolveUnitType(faction, "infantry_mountain"), true);
});

test("evolveUnitType unlocks the node at level 0 and makes it the line's active evolution", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_mountain");
  assert.ok(faction.unlockedUnitTypes.includes("infantry_mountain"));
  assert.equal(troopLevel(faction.troopLevels, "infantry_mountain"), 0);
  assert.equal(activeEvolutionFor(faction, "infantry"), "infantry_mountain");
});

test("evolving into a child does not carry over the parent's level", () => {
  let faction = makeFaction();
  for (let i = 0; i < 8; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  assert.equal(troopGrade(faction.troopLevels, "infantry"), "A");
  faction = evolveUnitType(faction, "infantry_mountain");
  assert.equal(troopGrade(faction.troopLevels, "infantry_mountain"), "D");
});

test("evolveUnitType throws when a required item is missing", () => {
  let faction = makeFaction();
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_mountain");
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "infantry_mountain");
  assert.throws(() => evolveUnitType(faction, "infantry_ranger"));
});

test("evolveUnitType succeeds once the required item is in the faction's inventory, and consumes it", () => {
  let faction = makeFaction({ itemInventory: ["evolution-item-ranger"] });
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_mountain");
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "infantry_mountain");
  faction = evolveUnitType(faction, "infantry_ranger");
  assert.ok(faction.unlockedUnitTypes.includes("infantry_ranger"));
  assert.equal(faction.itemInventory.includes("evolution-item-ranger"), false);
});

test("cross-line prerequisite: cavalry_dragoon needs infantry_mountain unlocked first", () => {
  let faction = makeFaction();
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "cavalry");
  faction = evolveUnitType(faction, "cavalry_heavy");
  for (let i = 0; i < 5; i += 1) faction = upgradeTroopLevel(faction, "cavalry_heavy");
  assert.equal(canEvolveUnitType(faction, "cavalry_dragoon"), false);

  let withInfantry = faction;
  for (let i = 0; i < 2; i += 1) withInfantry = upgradeTroopLevel(withInfantry, "infantry");
  withInfantry = evolveUnitType(withInfantry, "infantry_mountain");
  assert.equal(canEvolveUnitType(withInfantry, "cavalry_dragoon"), true);
});

test("setActiveEvolution switches which node a line produces, once unlocked", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_mountain");
  faction = setActiveEvolution(faction, "infantry", "infantry");
  assert.equal(activeEvolutionFor(faction, "infantry"), "infantry");
});

test("setActiveEvolution throws for a node that isn't unlocked", () => {
  const faction = makeFaction();
  assert.throws(() => setActiveEvolution(faction, "infantry", "infantry_mountain"));
});

test("strategist's root is fire-elemental and ranged, its evolution switches to water", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "strategist");
  faction = evolveUnitType(faction, "strategist_water");
  assert.equal(activeEvolutionFor(faction, "strategist"), "strategist_water");
});
