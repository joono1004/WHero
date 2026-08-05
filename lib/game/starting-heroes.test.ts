import assert from "node:assert/strict";
import test from "node:test";
import { heroArchetype, heroOverallGrade } from "./hero-definition.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";

test("there are exactly 3 starting heroes with unique ids", () => {
  assert.equal(STARTING_HEROES.length, 3);
  const ids = new Set(STARTING_HEROES.map((hero) => hero.id));
  assert.equal(ids.size, 3);
});

test("every starting hero averages to a B overall grade", () => {
  for (const hero of STARTING_HEROES) {
    assert.equal(
      heroOverallGrade(hero.attributes),
      "B",
      `${hero.name} should average to B, got attributes ${JSON.stringify(hero.attributes)}`,
    );
  }
});

test("every starting hero has exactly one S-grade signature attribute", () => {
  for (const hero of STARTING_HEROES) {
    const grades = Object.values(hero.attributes);
    const sCount = grades.filter((grade) => grade === "S").length;
    assert.equal(sCount, 1, `${hero.name} should have exactly one S attribute, got ${JSON.stringify(hero.attributes)}`);
  }
});

test("the 3 starting heroes cover general/warrior/strategist, one each", () => {
  const archetypes = STARTING_HEROES.map((hero) => heroArchetype(hero.attributes));
  assert.deepEqual(new Set(archetypes), new Set(["general", "warrior", "strategist"]));
});

test("감녕 is the warrior-type", () => {
  const ganNing = STARTING_HEROES.find((hero) => hero.id === "gan-ning")!;
  assert.equal(heroArchetype(ganNing.attributes), "warrior");
});

test("위연 is the general-type", () => {
  const weiYan = STARTING_HEROES.find((hero) => hero.id === "wei-yan")!;
  assert.equal(heroArchetype(weiYan.attributes), "general");
});

test("서서 is the strategist-type", () => {
  const xuShu = STARTING_HEROES.find((hero) => hero.id === "xu-shu")!;
  assert.equal(heroArchetype(xuShu.attributes), "strategist");
});

test("no starting hero has a charge or magic trait (placeholders only, none assigned yet)", () => {
  for (const hero of STARTING_HEROES) {
    assert.equal(hero.traits.charge, "없음");
    assert.equal(hero.traits.magic, "없음");
  }
});

test("no starting hero shares an id with a legendary-pool hero", async () => {
  const { LEGENDARY_HEROES } = await import("./legendary-heroes.ts");
  const legendaryIds = new Set(LEGENDARY_HEROES.map((hero) => hero.id));
  for (const hero of STARTING_HEROES) {
    assert.ok(!legendaryIds.has(hero.id), `${hero.id} should not overlap with the legendary pool`);
  }
});
