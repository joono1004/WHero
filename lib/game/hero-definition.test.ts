import assert from "node:assert/strict";
import test from "node:test";
import { heroArchetype, heroBaseMovement, heroCombatStats, heroOverallGrade } from "./hero-definition.ts";
import type { HeroAttributes } from "./hero-definition.ts";

test("a hero with dominant leadership is a general-type", () => {
  const attributes: HeroAttributes = { leadership: "S", force: "B", intelligence: "C", charisma: "B", vitality: "B" };
  assert.equal(heroArchetype(attributes), "general");
});

test("a hero with dominant force is a warrior-type", () => {
  const attributes: HeroAttributes = { leadership: "B", force: "S", intelligence: "C", charisma: "B", vitality: "B" };
  assert.equal(heroArchetype(attributes), "warrior");
});

test("a hero with dominant intelligence is a strategist-type", () => {
  const attributes: HeroAttributes = { leadership: "C", force: "B", intelligence: "S", charisma: "B", vitality: "B" };
  assert.equal(heroArchetype(attributes), "strategist");
});

test("a hero with leadership/force/intelligence close together is an allrounder", () => {
  const attributes: HeroAttributes = { leadership: "A", force: "B", intelligence: "A", charisma: "D", vitality: "D" };
  assert.equal(heroArchetype(attributes), "allrounder");
});

test("charisma never drives the archetype, even when it's the highest stat", () => {
  const attributes: HeroAttributes = { leadership: "B", force: "C", intelligence: "D", charisma: "SS", vitality: "B" };
  // leadership (B) is highest among leadership/force/intelligence -> general,
  // despite charisma being far higher than all three.
  assert.equal(heroArchetype(attributes), "general");
});

test("vitality never drives the archetype, even when it's the highest stat", () => {
  const attributes: HeroAttributes = { leadership: "B", force: "C", intelligence: "D", charisma: "C", vitality: "SS" };
  // leadership (B) is highest among leadership/force/intelligence -> general,
  // despite vitality being far higher than all three.
  assert.equal(heroArchetype(attributes), "general");
});

test("a tie among leadership/force/intelligence breaks toward leadership first", () => {
  const attributes: HeroAttributes = { leadership: "S", force: "S", intelligence: "C", charisma: "B", vitality: "B" };
  assert.equal(heroArchetype(attributes), "general");
});

test("a tie between force and intelligence (leadership lower) breaks toward force", () => {
  const attributes: HeroAttributes = { leadership: "C", force: "S", intelligence: "S", charisma: "B", vitality: "B" };
  assert.equal(heroArchetype(attributes), "warrior");
});

test("an all-D hero is still an allrounder, not a crash", () => {
  const attributes: HeroAttributes = { leadership: "D", force: "D", intelligence: "D", charisma: "D", vitality: "D" };
  assert.equal(heroArchetype(attributes), "allrounder");
});

test("heroOverallGrade averages all five attributes, including vitality", () => {
  const attributes: HeroAttributes = { leadership: "SS", force: "SS", intelligence: "SS", charisma: "SS", vitality: "SS" };
  assert.equal(heroOverallGrade(attributes), "SS");
});

test("heroOverallGrade is pulled down by a weak charisma even with strong combat stats", () => {
  const attributes: HeroAttributes = { leadership: "S", force: "S", intelligence: "S", charisma: "D", vitality: "S" };
  // scores 5,5,5,1,5 -> average 4.2 -> A
  assert.equal(heroOverallGrade(attributes), "A");
});

test("heroOverallGrade is pulled down by a weak vitality even with strong combat stats", () => {
  const attributes: HeroAttributes = { leadership: "S", force: "S", intelligence: "S", charisma: "S", vitality: "D" };
  // scores 5,5,5,5,1 -> average 4.2 -> A
  assert.equal(heroOverallGrade(attributes), "A");
});

test("heroCombatStats scales attack with force and defense with leadership, ignoring intelligence/charisma", () => {
  const attributes: HeroAttributes = { leadership: "B", force: "S", intelligence: "SS", charisma: "SS", vitality: "A" };
  const stats = heroCombatStats(attributes, "infantry");
  // force S -> score 5, leadership B -> score 3
  assert.equal(stats.attack, 5 * 5);
  assert.equal(stats.defense, 3 * 4);
});

test("heroCombatStats gives a higher grade strictly more attack, all else equal", () => {
  const weaker = heroCombatStats(
    { leadership: "B", force: "C", intelligence: "C", charisma: "C", vitality: "C" },
    "infantry",
  );
  const stronger = heroCombatStats(
    { leadership: "B", force: "A", intelligence: "C", charisma: "C", vitality: "C" },
    "infantry",
  );
  assert.ok(stronger.attack > weaker.attack);
  assert.equal(stronger.defense, weaker.defense);
  assert.equal(stronger.maxHealth, weaker.maxHealth);
});

test("heroCombatStats scales maxHealth with vitality, independent of force/leadership", () => {
  const weaker = heroCombatStats(
    { leadership: "S", force: "S", intelligence: "C", charisma: "C", vitality: "C" },
    "infantry",
  );
  const stronger = heroCombatStats(
    { leadership: "S", force: "S", intelligence: "C", charisma: "C", vitality: "A" },
    "infantry",
  );
  // vitality A -> score 4
  assert.equal(stronger.maxHealth, 4 * 20);
  assert.ok(stronger.maxHealth > weaker.maxHealth);
  assert.equal(stronger.attack, weaker.attack);
  assert.equal(stronger.defense, weaker.defense);
});

test("heroCombatStats derives range from unitType, shared with UNIT_TYPE_CATALOG", () => {
  const attributes: HeroAttributes = { leadership: "B", force: "B", intelligence: "B", charisma: "B", vitality: "B" };
  assert.equal(heroCombatStats(attributes, "infantry").range, null);
  assert.equal(heroCombatStats(attributes, "cavalry").range, null);
  assert.equal(heroCombatStats(attributes, "archer").range, 2);
  assert.equal(heroCombatStats(attributes, "siege").range, 3);
});

test("heroBaseMovement mirrors UNIT_TYPE_CATALOG's baseMovement for the hero's unitType", () => {
  // A solo hero now moves on its own fixed unitType (2026-07-28 - the
  // former "unit" HeroAssignment mode was removed), sharing the same
  // per-type movement numbers as units instead of having a separate stat.
  assert.equal(heroBaseMovement("infantry"), 2);
  assert.equal(heroBaseMovement("archer"), 2);
  assert.equal(heroBaseMovement("cavalry"), 4);
  assert.equal(heroBaseMovement("siege"), 1);
});
