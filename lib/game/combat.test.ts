import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCombatHealthToHero,
  applyCombatHealthToUnit,
  heroCombatant,
  HERO_RECOVERY_TURNS,
  MELEE_RANGE,
  resolveAttack,
  unitCombatant,
} from "./combat.ts";
import type { Combatant } from "./combat.ts";
import type { HeroDefinition } from "./hero-definition.ts";
import { isHeroRecovering, ZERO_ATTRIBUTE_PROGRESS } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import type { Unit } from "./unit.ts";

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return { attack: 10, defense: 2, health: 30, maxHealth: 30, range: null, ...overrides };
}

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    factionId: "faction-1",
    unitType: "infantry",
    position: { row: 0, column: 0 },
    stats: { attack: 10, defense: 2, maxHealth: 30, movement: 3, range: null },
    health: 30,
    movementRemaining: 3,
    ...overrides,
  };
}

function makeHeroDefinition(overrides: Partial<HeroDefinition> = {}): HeroDefinition {
  return {
    id: "hero-def-1",
    name: "테스트영웅",
    description: "",
    attributes: { leadership: "B", force: "B", intelligence: "B", charisma: "B", vitality: "B" },
    unitType: "infantry",
    domesticSpecialties: { gold: "없음", food: "없음", troops: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: [],
    skills: [],
    ...overrides,
  };
}

function makeHeroState(overrides: Partial<HeroState> = {}): HeroState {
  return {
    heroId: "hero-def-1",
    level: 1,
    experience: 0,
    health: 100,
    items: [],
    assignment: { mode: "solo", position: { row: 0, column: 0 } },
    attributeProgress: ZERO_ATTRIBUTE_PROGRESS,
    deploymentPriority: false,
    ...overrides,
  };
}

// --- resolveAttack: base damage/defeat ---

test("resolveAttack deals attack-minus-defense damage to the defender", () => {
  const attacker = makeCombatant({ attack: 10 });
  const defender = makeCombatant({ defense: 3, health: 30 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.damageDealt, 7);
  assert.equal(result.defenderHealthAfter, 23);
});

test("resolveAttack floors damage at 1 even when defense exceeds attack", () => {
  const attacker = makeCombatant({ attack: 2 });
  const defender = makeCombatant({ defense: 50, health: 30 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.damageDealt, 1);
});

test("resolveAttack marks the defender defeated when health drops to 0 or below", () => {
  const attacker = makeCombatant({ attack: 100 });
  const defender = makeCombatant({ defense: 0, health: 10 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.defenderHealthAfter, 0);
  assert.equal(result.defenderDefeated, true);
});

test("a defeated defender never counters, regardless of range", () => {
  const attacker = makeCombatant({ attack: 100, range: null });
  const defender = makeCombatant({ defense: 0, health: 10, range: null });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, false);
  assert.equal(result.counterDamageDealt, 0);
  assert.equal(result.attackerHealthAfter, attacker.health);
});

// --- resolveAttack: the range/counterattack rule ---

test("melee vs melee: the defender counters by default (both at MELEE_RANGE)", () => {
  const attacker = makeCombatant({ attack: 5, range: null });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: null });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, true);
  assert.equal(result.counterDamageDealt, 8 - attacker.defense);
});

test("a melee attacker charging a ranged defender still eats a counter", () => {
  const attacker = makeCombatant({ attack: 5, defense: 2, range: null });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: 3 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, true);
});

test("a ranged attacker striking a melee target escapes the counter entirely", () => {
  const attacker = makeCombatant({ attack: 5, defense: 2, health: 100, range: 3 });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: null });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, false);
  assert.equal(result.attackerHealthAfter, attacker.health);
});

test("equal-range ranged attacker vs ranged defender still counters", () => {
  const attacker = makeCombatant({ attack: 5, defense: 2, health: 100, range: 3 });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: 3 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, true);
});

test("a longer-range attacker vs a shorter-range defender escapes the counter", () => {
  const attacker = makeCombatant({ attack: 5, defense: 2, health: 100, range: 4 });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: 2 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, false);
});

test("a shorter-range attacker vs a longer-range defender still counters", () => {
  const attacker = makeCombatant({ attack: 5, defense: 2, health: 100, range: 2 });
  const defender = makeCombatant({ attack: 8, defense: 1, health: 100, range: 4 });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, true);
});

test("MELEE_RANGE is 1, the treated range for a null (근접) combatant", () => {
  assert.equal(MELEE_RANGE, 1);
});

test("a countered attacker can be defeated by the counter", () => {
  const attacker = makeCombatant({ attack: 10, defense: 0, health: 5, range: null });
  const defender = makeCombatant({ attack: 20, defense: 0, health: 100, range: null });
  const result = resolveAttack(attacker, defender);
  assert.equal(result.countered, true);
  assert.equal(result.attackerHealthAfter, 0);
  assert.equal(result.attackerDefeated, true);
});

test("resolveAttack does not mutate its inputs", () => {
  const attacker = makeCombatant({ health: 30 });
  const defender = makeCombatant({ health: 30 });
  resolveAttack(attacker, defender);
  assert.equal(attacker.health, 30);
  assert.equal(defender.health, 30);
});

// --- adapters ---

test("unitCombatant reads attack/defense/health/range straight from the unit", () => {
  const unit = makeUnit({ stats: { attack: 7, defense: 3, maxHealth: 40, movement: 2, range: 2 }, health: 25 });
  const combatant = unitCombatant(unit);
  assert.deepEqual(combatant, { attack: 7, defense: 3, health: 25, maxHealth: 40, range: 2 });
});

test("heroCombatant derives attack/defense/maxHealth from grade attributes, range from unitType, and current health from state", () => {
  const definition = makeHeroDefinition({
    attributes: { leadership: "A", force: "S", intelligence: "D", charisma: "D", vitality: "B" },
    unitType: "siege",
  });
  const state = makeHeroState({ health: 12 });
  const combatant = heroCombatant(definition, state);
  // force S -> 5*5=25 attack, leadership A -> 4*4=16 defense, vitality B -> 3*20=60 maxHealth
  assert.equal(combatant.attack, 25);
  assert.equal(combatant.defense, 16);
  assert.equal(combatant.maxHealth, 60);
  assert.equal(combatant.health, 12);
  // siege's range comes straight from UNIT_TYPE_CATALOG (unit-production.ts), same as a siege unit.
  assert.equal(combatant.range, 3);
});

// --- applying outcomes back ---

test("applyCombatHealthToUnit updates health when the unit survives", () => {
  const unit = makeUnit({ health: 30 });
  const updated = applyCombatHealthToUnit(unit, 12, false);
  assert.ok(updated);
  assert.equal(updated?.health, 12);
});

test("applyCombatHealthToUnit returns null (destroyed) when the unit is defeated", () => {
  const unit = makeUnit({ health: 30 });
  assert.equal(applyCombatHealthToUnit(unit, 0, true), null);
});

test("applyCombatHealthToHero updates health when the hero survives", () => {
  const hero = makeHeroState({ health: 100 });
  const updated = applyCombatHealthToHero(hero, 40, false);
  assert.equal(updated.health, 40);
  assert.equal(isHeroRecovering(updated), false);
});

test("applyCombatHealthToHero sends a defeated hero to recover instead of removing them", () => {
  const hero = makeHeroState({ health: 100 });
  const updated = applyCombatHealthToHero(hero, 0, true);
  assert.equal(isHeroRecovering(updated), true);
  assert.deepEqual(updated.assignment, { mode: "recovering", turnsRemaining: HERO_RECOVERY_TURNS });
});
