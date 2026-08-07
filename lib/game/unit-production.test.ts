import assert from "node:assert/strict";
import test from "node:test";
import {
  createProducedUnit,
  isUnitTypeUnlocked,
  researchLevelToUnitGrade,
  UNIT_TYPE_CATALOG,
  unitCombatStatsFromGrade,
} from "./unit-production.ts";

test("isUnitTypeUnlocked: infantry is always producible, even at research level 0", () => {
  assert.equal(isUnitTypeUnlocked("infantry", 0), true);
  assert.equal(isUnitTypeUnlocked("infantry", 10), true);
});

test("isUnitTypeUnlocked: archer/cavalry/strategist need at least 1 research level", () => {
  for (const unitType of ["archer", "cavalry", "strategist"] as const) {
    assert.equal(isUnitTypeUnlocked(unitType, 0), false);
    assert.equal(isUnitTypeUnlocked(unitType, 1), true);
  }
});

test("researchLevelToUnitGrade never exceeds A (units cap below hero grades)", () => {
  for (let level = 0; level <= 10; level += 1) {
    const grade = researchLevelToUnitGrade(level);
    assert.ok(["D", "C", "B", "A"].includes(grade));
  }
});

test("researchLevelToUnitGrade is monotonically non-decreasing with research level", () => {
  const scores = { D: 1, C: 2, B: 3, A: 4 };
  let previous = 0;
  for (let level = 0; level <= 10; level += 1) {
    const score = scores[researchLevelToUnitGrade(level)];
    assert.ok(score >= previous);
    previous = score;
  }
});

test("researchLevelToUnitGrade reaches A at the max research level", () => {
  assert.equal(researchLevelToUnitGrade(10), "A");
});

test("unitCombatStatsFromGrade scales attack/defense/maxHealth with grade", () => {
  const weak = unitCombatStatsFromGrade("D");
  const strong = unitCombatStatsFromGrade("A");
  assert.ok(strong.attack > weak.attack);
  assert.ok(strong.defense > weak.defense);
  assert.ok(strong.maxHealth > weak.maxHealth);
});

test("createProducedUnit uses the catalog's base movement/range for the unit type", () => {
  const unit = createProducedUnit({
    id: "unit-1",
    factionId: "faction-1",
    unitType: "archer",
    position: { row: 2, column: 3 },
    researchLevel: 1,
  });
  assert.equal(unit.stats.movement, UNIT_TYPE_CATALOG.archer.baseMovement);
  assert.equal(unit.stats.range, UNIT_TYPE_CATALOG.archer.range);
  assert.equal(unit.movementRemaining, UNIT_TYPE_CATALOG.archer.baseMovement);
});

test("createProducedUnit starts at full health and the given position", () => {
  const unit = createProducedUnit({
    id: "unit-1",
    factionId: "faction-1",
    unitType: "infantry",
    position: { row: 2, column: 3 },
    researchLevel: 5,
  });
  assert.equal(unit.health, unit.stats.maxHealth);
  assert.deepEqual(unit.position, { row: 2, column: 3 });
});

test("createProducedUnit's stats scale with the given research level", () => {
  const weak = createProducedUnit({
    id: "unit-1",
    factionId: "faction-1",
    unitType: "infantry",
    position: { row: 0, column: 0 },
    researchLevel: 0,
  });
  const strong = createProducedUnit({
    id: "unit-2",
    factionId: "faction-1",
    unitType: "infantry",
    position: { row: 0, column: 0 },
    researchLevel: 10,
  });
  assert.ok(strong.stats.attack > weak.stats.attack);
  assert.ok(strong.stats.maxHealth > weak.stats.maxHealth);
});

test("createProducedUnit throws for a locked unit type at research level 0", () => {
  assert.throws(() =>
    createProducedUnit({
      id: "unit-1",
      factionId: "faction-1",
      unitType: "cavalry",
      position: { row: 0, column: 0 },
      researchLevel: 0,
    }),
  );
});
