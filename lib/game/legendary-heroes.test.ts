import assert from "node:assert/strict";
import test from "node:test";
import { heroArchetype, heroOverallGrade } from "./hero-definition.ts";
import { LEGENDARY_HEROES } from "./legendary-heroes.ts";

test("there are exactly 3 legendary heroes with unique ids", () => {
  assert.equal(LEGENDARY_HEROES.length, 3);
  const ids = new Set(LEGENDARY_HEROES.map((hero) => hero.id));
  assert.equal(ids.size, 3);
});

test("every legendary hero averages to an A overall grade", () => {
  for (const hero of LEGENDARY_HEROES) {
    assert.equal(
      heroOverallGrade(hero.attributes),
      "A",
      `${hero.name} should average to A, got attributes ${JSON.stringify(hero.attributes)}`,
    );
  }
});

test("the 3 legendary heroes cover general/warrior/strategist, one each", () => {
  const archetypes = LEGENDARY_HEROES.map((hero) => heroArchetype(hero.attributes));
  assert.deepEqual(new Set(archetypes), new Set(["general", "warrior", "strategist"]));
});

test("관우 is the general-type", () => {
  const guanYu = LEGENDARY_HEROES.find((hero) => hero.id === "guan-yu")!;
  assert.equal(heroArchetype(guanYu.attributes), "general");
});

test("조운 is the warrior-type", () => {
  const zhaoYun = LEGENDARY_HEROES.find((hero) => hero.id === "zhao-yun")!;
  assert.equal(heroArchetype(zhaoYun.attributes), "warrior");
});

test("제갈량 is the strategist-type", () => {
  const zhugeLiang = LEGENDARY_HEROES.find((hero) => hero.id === "zhuge-liang")!;
  assert.equal(heroArchetype(zhugeLiang.attributes), "strategist");
});

test("each legendary hero's fixed unitType matches the user's assignment", () => {
  // 제갈량's real unitType is "책사" (undesigned - see the TODO in
  // legendary-heroes.ts), so this only checks 관우/조운 for now.
  const guanYu = LEGENDARY_HEROES.find((hero) => hero.id === "guan-yu")!;
  const zhaoYun = LEGENDARY_HEROES.find((hero) => hero.id === "zhao-yun")!;
  assert.equal(guanYu.unitType, "cavalry");
  assert.equal(zhaoYun.unitType, "cavalry");
});
