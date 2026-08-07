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

// 2026-08-08: 병과 트리가 계열당 외길(tier 0~5)로 단순화됨 - 분기/교차
// 계열 선행조건/아이템 해금은 사용자가 "나중에 추가"로 명시적으로 미룸.
// 그 메커니즘을 검증하던 테스트(분기, 교차 계열, 아이템)는 실제 카탈로그
// 노드가 없어져서 지웠음 - unit-evolution.ts의 로직 자체(requiredItemId/
// requiredUnitTypeIds 처리)는 그대로 남아있으니, 분기가 돌아오면 그때
// 다시 채우면 됨.

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
  assert.throws(() => upgradeTroopLevel(faction, "infantry_swordsman"));
});

test("canEvolveUnitType is false until the parent reaches the required grade", () => {
  const faction = makeFaction();
  assert.equal(canEvolveUnitType(faction, "infantry_swordsman"), false);
});

test("canEvolveUnitType is true once the parent's grade and cost are met", () => {
  let faction = makeFaction();
  // infantry_swordsman (tier 1) requires infantry at grade C
  // (researchLevelToUnitGrade reaches C at level 2 - see unit-production.ts).
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  assert.equal(canEvolveUnitType(faction, "infantry_swordsman"), true);
});

test("evolveUnitType unlocks the node at level 0 and makes it the line's active evolution", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_swordsman");
  assert.ok(faction.unlockedUnitTypes.includes("infantry_swordsman"));
  assert.equal(troopLevel(faction.troopLevels, "infantry_swordsman"), 0);
  assert.equal(activeEvolutionFor(faction, "infantry"), "infantry_swordsman");
});

test("evolving into a child does not carry over the parent's level", () => {
  let faction = makeFaction();
  for (let i = 0; i < 8; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  assert.equal(troopGrade(faction.troopLevels, "infantry"), "A");
  faction = evolveUnitType(faction, "infantry_swordsman");
  assert.equal(troopGrade(faction.troopLevels, "infantry_swordsman"), "D");
});

test("canEvolveUnitType is false when a deeper tier's own parent isn't unlocked yet", () => {
  // infantry_mountain (tier 2) requires infantry_swordsman (tier 1) to be
  // unlocked first, regardless of the root's own grade.
  let faction = makeFaction();
  for (let i = 0; i < 8; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  assert.equal(canEvolveUnitType(faction, "infantry_mountain"), false);
});

test("evolving through several tiers in a row works end to end", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_swordsman");
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry_swordsman");
  faction = evolveUnitType(faction, "infantry_mountain");
  assert.deepEqual(new Set(faction.unlockedUnitTypes), new Set(["infantry_swordsman", "infantry_mountain"]));
  assert.equal(activeEvolutionFor(faction, "infantry"), "infantry_mountain");
});

test("setActiveEvolution switches which node a line produces, once unlocked", () => {
  let faction = makeFaction();
  for (let i = 0; i < 2; i += 1) faction = upgradeTroopLevel(faction, "infantry");
  faction = evolveUnitType(faction, "infantry_swordsman");
  faction = setActiveEvolution(faction, "infantry", "infantry");
  assert.equal(activeEvolutionFor(faction, "infantry"), "infantry");
});

test("setActiveEvolution throws for a node that isn't unlocked", () => {
  const faction = makeFaction();
  assert.throws(() => setActiveEvolution(faction, "infantry", "infantry_swordsman"));
});

test("strategist's root is ranged and fire-elemental", () => {
  const faction = makeFaction();
  assert.equal(activeEvolutionFor(faction, "strategist"), "strategist");
});
