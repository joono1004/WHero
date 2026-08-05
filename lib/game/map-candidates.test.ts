import assert from "node:assert/strict";
import { test } from "node:test";
import { generateInitialMapCandidates, generateNextMapCandidates, mapTierForWorldIndex } from "./map-candidates.ts";

test("mapTierForWorldIndex climbs one tier per world and caps at the largest", () => {
  assert.equal(mapTierForWorldIndex(1), "mini");
  assert.equal(mapTierForWorldIndex(2), "small");
  assert.equal(mapTierForWorldIndex(7), "world");
  assert.equal(mapTierForWorldIndex(8), "world");
  assert.equal(mapTierForWorldIndex(100), "world");
});

test("generateInitialMapCandidates returns exactly one mini-tier candidate for world 1", () => {
  const candidates = generateInitialMapCandidates(12345);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].worldIndex, 1);
  assert.equal(candidates[0].generation.mapTier, "mini");
});

test("generateInitialMapCandidates is deterministic given the same seed", () => {
  assert.deepEqual(generateInitialMapCandidates(777), generateInitialMapCandidates(777));
});

test("generateNextMapCandidates returns exactly two candidates with distinct terrain types", () => {
  const candidates = generateNextMapCandidates(12345, 1);
  assert.equal(candidates.length, 2);
  assert.notEqual(candidates[0].generation.mapType, candidates[1].generation.mapType);
});

test("generateNextMapCandidates advances the tier by one relative to the cleared world", () => {
  const candidates = generateNextMapCandidates(12345, 1);
  for (const candidate of candidates) {
    assert.equal(candidate.worldIndex, 2);
    assert.equal(candidate.generation.mapTier, "small");
  }
});

test("generateNextMapCandidates is deterministic given the same seed and cleared world index", () => {
  assert.deepEqual(generateNextMapCandidates(555, 3), generateNextMapCandidates(555, 3));
});

test("generateNextMapCandidates varies with the cleared world index (different rolls across clears)", () => {
  const seed = 42;
  const rolls = [1, 2, 3, 4, 5].map((clearedWorldIndex) =>
    JSON.stringify(generateNextMapCandidates(seed, clearedWorldIndex)),
  );
  assert.ok(new Set(rolls).size > 1, "expected candidate rolls to differ across cleared world indexes");
});
