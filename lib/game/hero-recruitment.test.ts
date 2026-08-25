import assert from "node:assert/strict";
import test from "node:test";
import { LEGENDARY_HEROES } from "./legendary-heroes.ts";
import { heroFragmentGrade, HERO_FRAGMENT_ITEM_ID, resolveRecruitmentDraws } from "./hero-recruitment.ts";

test("중복으로 뽑힌 영웅은 해당 등급 영웅 조각으로 전환된다", () => {
  const hero = LEGENDARY_HEROES[0];
  const result = resolveRecruitmentDraws([hero], [hero.id]);
  assert.deepEqual(result.recruitedHeroes, []);
  assert.deepEqual(result.fragmentGrades, ["A"]);
});

test("열 번 모집 안의 같은 영웅도 첫 장 뒤에는 조각으로 전환된다", () => {
  const hero = LEGENDARY_HEROES[0];
  const result = resolveRecruitmentDraws([hero, hero], []);
  assert.deepEqual(result.recruitedHeroes, [hero]);
  assert.deepEqual(result.fragmentGrades, ["A"]);
});

test("등급별 영웅 조각 아이템 ID를 다시 등급으로 찾을 수 있다", () => {
  assert.equal(heroFragmentGrade(HERO_FRAGMENT_ITEM_ID.S), "S");
  assert.equal(heroFragmentGrade("unrelated-item"), null);
});
