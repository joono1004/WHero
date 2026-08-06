import assert from "node:assert/strict";
import test from "node:test";
import {
  cityDefenseBonusFromHero,
  cityYieldWithHeroBonus,
  heroRegenPerTurn,
  productionTurnsBonus,
  recoveryTurnsBonus,
} from "./hero-assignment.ts";
import type { DomesticSpecialtyKind, HeroDefinition } from "./hero-definition.ts";
import type { SpecialtyGrade } from "./grade.ts";

const NO_SPECIALTIES: Record<DomesticSpecialtyKind, SpecialtyGrade> = {
  gold: "없음",
  food: "없음",
  troops: "없음",
  iron: "없음",
  recovery: "없음",
  defense: "없음",
};

function makeHeroDefinition(overrides: Partial<HeroDefinition> = {}): HeroDefinition {
  return {
    id: "hero-def-1",
    name: "테스트영웅",
    description: "",
    attributes: { leadership: "B", force: "B", intelligence: "B", charisma: "B", vitality: "B" },
    unitType: "infantry",
    domesticSpecialties: NO_SPECIALTIES,
    traits: [],
    skills: [],
    ...overrides,
  };
}

test("cityYieldWithHeroBonus passes the yield through unchanged when there's no stationed hero", () => {
  const baseYield = { gold: 15, food: 15 };
  assert.deepEqual(cityYieldWithHeroBonus(baseYield, null), baseYield);
});

test("cityYieldWithHeroBonus boosts only the resource matching the hero's domestic specialty", () => {
  const definition = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, gold: "A" } });
  const boosted = cityYieldWithHeroBonus({ gold: 15, food: 15 }, definition);
  assert.ok(boosted.gold! > 15);
  assert.equal(boosted.food, 15, "food specialty is 없음 -> no bonus");
});

test("cityYieldWithHeroBonus scales with the specialty's grade", () => {
  const weak = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, gold: "D" } });
  const strong = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, gold: "SS" } });
  const weakYield = cityYieldWithHeroBonus({ gold: 100 }, weak);
  const strongYield = cityYieldWithHeroBonus({ gold: 100 }, strong);
  assert.ok(strongYield.gold! > weakYield.gold!);
});

test("cityYieldWithHeroBonus does not touch resources the city doesn't produce", () => {
  const definition = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, gold: "SS" } });
  const boosted = cityYieldWithHeroBonus({ food: 10 }, definition);
  assert.equal(boosted.gold, undefined);
  assert.deepEqual(boosted, { food: 10 });
});

test("cityYieldWithHeroBonus boosts iron yield with a 채굴 specialty", () => {
  const definition = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, iron: "A" } });
  const boosted = cityYieldWithHeroBonus({ iron: 15 }, definition);
  assert.ok(boosted.iron! > 15);
});

test("productionTurnsBonus is 0 with no stationed hero or no troops specialty", () => {
  assert.equal(productionTurnsBonus(null), 0);
  assert.equal(productionTurnsBonus(makeHeroDefinition()), 0);
});

test("productionTurnsBonus is positive when the stationed hero has any troops specialty", () => {
  const definition = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, troops: "C" } });
  assert.ok(productionTurnsBonus(definition) > 0);
});

// --- 방어(defense)/회복(recovery) specialties (task 11 follow-up) ---

test("cityDefenseBonusFromHero is 0 with no stationed hero or no defense specialty", () => {
  assert.equal(cityDefenseBonusFromHero(null), 0);
  assert.equal(cityDefenseBonusFromHero(makeHeroDefinition()), 0);
});

test("cityDefenseBonusFromHero scales with the defense specialty's grade", () => {
  const weak = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, defense: "D" } });
  const strong = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, defense: "SS" } });
  assert.ok(cityDefenseBonusFromHero(strong) > cityDefenseBonusFromHero(weak));
  assert.ok(cityDefenseBonusFromHero(weak) > 0);
});

test("heroRegenPerTurn is 0 with no stationed hero or no recovery specialty", () => {
  assert.equal(heroRegenPerTurn(null), 0);
  assert.equal(heroRegenPerTurn(makeHeroDefinition()), 0);
});

test("heroRegenPerTurn scales with the recovery specialty's grade", () => {
  const weak = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, recovery: "D" } });
  const strong = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, recovery: "SS" } });
  assert.ok(heroRegenPerTurn(strong) > heroRegenPerTurn(weak));
  assert.ok(heroRegenPerTurn(weak) > 0);
});

test("recoveryTurnsBonus is 0 with no stationed hero or no recovery specialty, positive with any grade", () => {
  assert.equal(recoveryTurnsBonus(null), 0);
  assert.equal(recoveryTurnsBonus(makeHeroDefinition()), 0);
  const definition = makeHeroDefinition({ domesticSpecialties: { ...NO_SPECIALTIES, recovery: "C" } });
  assert.ok(recoveryTurnsBonus(definition) > 0);
});
