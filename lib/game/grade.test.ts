import assert from "node:assert/strict";
import test from "node:test";
import { averageGrade, gradeToScore, nextGrade, pipsRequiredForNextGrade, scoreToGrade } from "./grade.ts";
import type { CoreGrade } from "./grade.ts";

test("gradeToScore is strictly increasing from D to SS", () => {
  const order: CoreGrade[] = ["D", "C", "B", "A", "S", "SS"];
  const scores = order.map(gradeToScore);
  for (let i = 1; i < scores.length; i += 1) {
    assert.ok(scores[i] > scores[i - 1], `${order[i]} should score higher than ${order[i - 1]}`);
  }
});

test("scoreToGrade round-trips gradeToScore for every grade", () => {
  const order: CoreGrade[] = ["D", "C", "B", "A", "S", "SS"];
  for (const grade of order) {
    assert.equal(scoreToGrade(gradeToScore(grade)), grade);
  }
});

test("scoreToGrade clamps out-of-range scores instead of throwing", () => {
  assert.equal(scoreToGrade(-5), "D");
  assert.equal(scoreToGrade(0), "D");
  assert.equal(scoreToGrade(100), "SS");
});

test("averageGrade of a single grade is that grade", () => {
  assert.equal(averageGrade(["A"]), "A");
});

test("averageGrade of identical grades is that grade", () => {
  assert.equal(averageGrade(["S", "S", "S", "S"]), "S");
});

test("averageGrade rounds to the nearest grade", () => {
  // D=1, C=2 -> average 1.5 -> rounds up to score 2 -> C
  assert.equal(averageGrade(["D", "C"]), "C");
  // S=5, A=4, B=3, C=2 -> average 3.5 -> rounds up to score 4 -> A
  assert.equal(averageGrade(["S", "A", "B", "C"]), "A");
});

test("averageGrade throws on an empty list rather than returning a fake grade", () => {
  assert.throws(() => averageGrade([]));
});

test("pipsRequiredForNextGrade increases from D to S", () => {
  const order: Array<Exclude<CoreGrade, "SS">> = ["D", "C", "B", "A", "S"];
  const costs = order.map(pipsRequiredForNextGrade);
  for (let i = 1; i < costs.length; i += 1) {
    assert.ok(costs[i]! > costs[i - 1]!, `${order[i]} should cost more than ${order[i - 1]}`);
  }
});

test("pipsRequiredForNextGrade is null for SS (no next grade)", () => {
  assert.equal(pipsRequiredForNextGrade("SS"), null);
});

test("nextGrade steps through the whole scale and stops at SS", () => {
  assert.equal(nextGrade("D"), "C");
  assert.equal(nextGrade("C"), "B");
  assert.equal(nextGrade("B"), "A");
  assert.equal(nextGrade("A"), "S");
  assert.equal(nextGrade("S"), "SS");
  assert.equal(nextGrade("SS"), null);
});
