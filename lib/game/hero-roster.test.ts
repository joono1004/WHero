import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_HERO_DEFINITIONS,
  buildHeroListEntries,
  compareByArchetype,
  compareByGrade,
  compareByLevel,
  findHeroDefinition,
} from "./hero-roster.ts";
import { ZERO_ATTRIBUTE_PROGRESS } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import { LEGENDARY_HEROES } from "./legendary-heroes.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";

function heroState(heroId: string, overrides: Partial<HeroState> = {}): HeroState {
  return {
    heroId,
    level: 1,
    experience: 0,
    health: 100,
    items: [],
    assignment: { mode: "solo", position: { row: 0, column: 0 } },
    attributeProgress: ZERO_ATTRIBUTE_PROGRESS,
    deploymentPriority: false,
    evolvedUnitType: null,
    ...overrides,
  };
}

test("ALL_HERO_DEFINITIONS contains every starting and legendary hero, no duplicates", () => {
  assert.equal(ALL_HERO_DEFINITIONS.length, STARTING_HEROES.length + LEGENDARY_HEROES.length);
  const ids = new Set(ALL_HERO_DEFINITIONS.map((hero) => hero.id));
  assert.equal(ids.size, ALL_HERO_DEFINITIONS.length);
});

test("findHeroDefinition finds a starting hero", () => {
  const hero = findHeroDefinition(STARTING_HEROES[0].id);
  assert.equal(hero?.id, STARTING_HEROES[0].id);
});

test("findHeroDefinition finds a legendary hero", () => {
  const hero = findHeroDefinition(LEGENDARY_HEROES[0].id);
  assert.equal(hero?.id, LEGENDARY_HEROES[0].id);
});

test("findHeroDefinition returns undefined for an unknown id", () => {
  assert.equal(findHeroDefinition("not-a-real-hero"), undefined);
});

test("buildHeroListEntries pairs each state with its definition", () => {
  const states = [heroState(STARTING_HEROES[0].id), heroState(LEGENDARY_HEROES[0].id)];
  const entries = buildHeroListEntries(states);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].definition.id, STARTING_HEROES[0].id);
  assert.equal(entries[1].definition.id, LEGENDARY_HEROES[0].id);
});

test("buildHeroListEntries silently drops a state whose definition can't be found", () => {
  const entries = buildHeroListEntries([heroState("not-a-real-hero"), heroState(STARTING_HEROES[0].id)]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].definition.id, STARTING_HEROES[0].id);
});

test("compareByGrade sorts higher grades first, not alphabetically", () => {
  // Starting heroes are all B-grade, legendary heroes are all A-grade
  // (docs/SYSTEM_LAYER.md task 3) - if this ever regressed to a naive
  // string compare, "B" would incorrectly sort before "A".
  const entries = buildHeroListEntries([heroState(STARTING_HEROES[0].id), heroState(LEGENDARY_HEROES[0].id)]);
  const sorted = [...entries].sort(compareByGrade);
  assert.equal(sorted[0].definition.id, LEGENDARY_HEROES[0].id);
  assert.equal(sorted[1].definition.id, STARTING_HEROES[0].id);
});

test("compareByLevel sorts higher levels first", () => {
  const entries = buildHeroListEntries([
    heroState(STARTING_HEROES[0].id, { level: 3 }),
    heroState(STARTING_HEROES[1].id, { level: 9 }),
    heroState(STARTING_HEROES[2].id, { level: 1 }),
  ]);
  const sorted = [...entries].sort(compareByLevel);
  assert.deepEqual(
    sorted.map((entry) => entry.state.level),
    [9, 3, 1],
  );
});

test("compareByArchetype groups general/warrior/strategist/allrounder in a stable order", () => {
  // zhang-bao=warrior, wei-yan=general, xu-shu=strategist
  const zhangBao = STARTING_HEROES.find((hero) => hero.id === "zhang-bao")!;
  const weiYan = STARTING_HEROES.find((hero) => hero.id === "wei-yan")!;
  const xuShu = STARTING_HEROES.find((hero) => hero.id === "xu-shu")!;
  const entries = buildHeroListEntries([heroState(zhangBao.id), heroState(xuShu.id), heroState(weiYan.id)]);
  const sorted = [...entries].sort(compareByArchetype);
  assert.deepEqual(
    sorted.map((entry) => entry.definition.id),
    [weiYan.id, zhangBao.id, xuShu.id],
  );
});
