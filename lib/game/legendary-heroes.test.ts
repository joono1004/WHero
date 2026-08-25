import assert from "node:assert/strict";
import test from "node:test";
import { heroArchetype, heroOverallGrade } from "./hero-definition.ts";
import { LEGENDARY_HEROES } from "./legendary-heroes.ts";

test("there are exactly 13 legendary heroes with unique ids", () => {
  assert.equal(LEGENDARY_HEROES.length, 13);
  const ids = new Set(LEGENDARY_HEROES.map((hero) => hero.id));
  assert.equal(ids.size, 13);
});

test("every legendary hero is at least B overall grade", () => {
  for (const hero of LEGENDARY_HEROES) {
    assert.ok(["A", "B"].includes(heroOverallGrade(hero.attributes)), `${hero.name} should be at least B overall`);
  }
});

test("legendary heroes cover general, warrior, and strategist archetypes", () => {
  const archetypes = LEGENDARY_HEROES.map((hero) => heroArchetype(hero.attributes));
  const unique = new Set(archetypes);
  assert.ok(unique.has("general") && unique.has("warrior") && unique.has("strategist"));
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
  const guanYu = LEGENDARY_HEROES.find((hero) => hero.id === "guan-yu")!;
  const zhaoYun = LEGENDARY_HEROES.find((hero) => hero.id === "zhao-yun")!;
  const zhugeLiang = LEGENDARY_HEROES.find((hero) => hero.id === "zhuge-liang")!;
  assert.equal(guanYu.unitType, "cavalry");
  assert.equal(zhaoYun.unitType, "cavalry");
  // 2026-08-07: strategist(책사) 노드가 생기면서 archer 스톱갭을 걷어냄.
  assert.equal(zhugeLiang.unitType, "strategist");
  assert.equal(LEGENDARY_HEROES.find((hero) => hero.id === "huang-zhong")?.unitType, "archer");
  assert.equal(LEGENDARY_HEROES.find((hero) => hero.id === "zhang-fei")?.unitType, "cavalry");
  assert.equal(LEGENDARY_HEROES.find((hero) => hero.id === "xiahou-yuan")?.unitType, "archer");
  assert.equal(LEGENDARY_HEROES.find((hero) => hero.id === "napoleon")?.unitType, "archer");
});
