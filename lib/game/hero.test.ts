import assert from "node:assert/strict";
import test from "node:test";
import {
  appointHeroAsGovernor,
  assignHeroToCity,
  beginHeroRecovery,
  canEvolveHero,
  currentHeroUnitType,
  enlistHeroFor,
  equipItem,
  evolveHero,
  GARRISON_RETURN_POSITION,
  governedWorldId,
  isHeroDeployed,
  isHeroEnlistable,
  isHeroEnlisted,
  isHeroGoverning,
  isHeroInCity,
  isHeroRecovering,
  isHeroSolo,
  MAX_ITEMS_PER_HERO,
  sendHeroSolo,
  setDeploymentPriority,
  tickHeroRecovery,
  unequipItem,
  ZERO_ATTRIBUTE_PROGRESS,
} from "./hero.ts";
import type { HeroState, Item } from "./hero.ts";
import type { HeroDefinition } from "./hero-definition.ts";

function makeHeroDefinition(overrides: Partial<HeroDefinition> = {}): HeroDefinition {
  return {
    id: "hero-def-1",
    name: "테스트영웅",
    description: "",
    attributes: { leadership: "B", force: "B", intelligence: "B", charisma: "B", vitality: "B" },
    unitType: "cavalry",
    domesticSpecialties: { gold: "없음", food: "없음", troops: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: [],
    skills: [],
    evolution: { targetUnitType: "cavalry_heavy", requiredLevel: 5, requiredItemId: "evolution-item-cavalry-heavy" },
    ...overrides,
  };
}

function makeHero(overrides: Partial<HeroState> = {}): HeroState {
  return {
    heroId: "hero-1",
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

test("a hero can move solo, tracking its own position", () => {
  const hero = makeHero();
  assert.equal(isHeroSolo(hero), true);
  assert.deepEqual(hero.assignment, { mode: "solo", position: { row: 0, column: 0 } });
});

// --- 병과 진화 (2026-08-07) ---

test("currentHeroUnitType falls back to the definition's unitType before evolving", () => {
  const definition = makeHeroDefinition();
  const hero = makeHero();
  assert.equal(currentHeroUnitType(definition, hero), "cavalry");
});

test("canEvolveHero is false without the definition having an evolution, without the level, or without the item", () => {
  const definition = makeHeroDefinition();
  assert.equal(canEvolveHero(makeHeroDefinition({ evolution: null }), makeHero()), false);
  assert.equal(canEvolveHero(definition, makeHero({ level: 5 })), false, "missing the item");
  assert.equal(
    canEvolveHero(definition, makeHero({ level: 1, items: [{ id: "evolution-item-cavalry-heavy", name: "", description: "" }] })),
    false,
    "below the required level",
  );
});

test("canEvolveHero is true once level and item both meet the requirement", () => {
  const definition = makeHeroDefinition();
  const hero = makeHero({ level: 5, items: [{ id: "evolution-item-cavalry-heavy", name: "", description: "" }] });
  assert.equal(canEvolveHero(definition, hero), true);
});

test("evolveHero sets evolvedUnitType and consumes the evolution item", () => {
  const definition = makeHeroDefinition();
  const hero = makeHero({ level: 5, items: [{ id: "evolution-item-cavalry-heavy", name: "", description: "" }] });
  const evolved = evolveHero(definition, hero);
  assert.equal(evolved.evolvedUnitType, "cavalry_heavy");
  assert.deepEqual(evolved.items, []);
  assert.equal(currentHeroUnitType(definition, evolved), "cavalry_heavy");
});

test("evolveHero throws when the hero isn't eligible yet", () => {
  const definition = makeHeroDefinition();
  assert.throws(() => evolveHero(definition, makeHero({ level: 1 })));
});

test("a hero can't evolve a second time", () => {
  const definition = makeHeroDefinition();
  const alreadyEvolved = makeHero({ level: 5, evolvedUnitType: "cavalry_heavy" });
  assert.equal(canEvolveHero(definition, alreadyEvolved), false);
});

test("sendHeroSolo moves a hero to a new independent position", () => {
  const moved = sendHeroSolo(makeHero(), { row: 3, column: 5 });
  assert.equal(isHeroSolo(moved), true);
  assert.deepEqual(moved.assignment, { mode: "solo", position: { row: 3, column: 5 } });
});

test("assignHeroToCity switches the hero to city mode", () => {
  const inCity = assignHeroToCity(makeHero(), "city-1");
  assert.equal(isHeroInCity(inCity), true);
  assert.deepEqual(inCity.assignment, { mode: "city", cityId: "city-1" });
});

test("a hero can only be in one mode at a time: moving it elsewhere replaces, never stacks", () => {
  const inCity = assignHeroToCity(makeHero(), "city-1");
  assert.deepEqual(inCity.assignment, { mode: "city", cityId: "city-1" });

  const backToSolo = sendHeroSolo(inCity, { row: 2, column: 2 });
  assert.equal(isHeroSolo(backToSolo), true);
  assert.equal(isHeroInCity(backToSolo), false);
});

test("assignment helpers do not mutate the original hero object", () => {
  const original = makeHero();
  assignHeroToCity(original, "city-1");
  assert.deepEqual(original.assignment, { mode: "solo", position: { row: 0, column: 0 } });
});

test("appointHeroAsGovernor puts the hero in charge of a previously-cleared world", () => {
  const governing = appointHeroAsGovernor(makeHero(), "world-1");
  assert.equal(isHeroGoverning(governing), true);
  assert.deepEqual(governing.assignment, { mode: "governor", worldId: "world-1" });
});

test("isHeroDeployed is true for solo/city and false for governor, recovering, or enlisted", () => {
  assert.equal(isHeroDeployed(makeHero()), true);
  assert.equal(isHeroDeployed(assignHeroToCity(makeHero(), "city-1")), true);
  assert.equal(isHeroDeployed(appointHeroAsGovernor(makeHero(), "world-1")), false);
  assert.equal(isHeroDeployed(beginHeroRecovery(makeHero(), 3)), false);
  assert.equal(isHeroDeployed(enlistHeroFor(makeHero(), "world-1")), false);
});

test("enlistHeroFor commits a hero to a world's roster without placing them on the map", () => {
  const enlisted = enlistHeroFor(makeHero(), "world-1");
  assert.equal(isHeroEnlisted(enlisted), true);
  assert.deepEqual(enlisted.assignment, { mode: "enlisted", worldId: "world-1" });
});

test("isHeroEnlistable is false for a governor, a recovering hero, or an already-enlisted hero", () => {
  assert.equal(isHeroEnlistable(makeHero()), true);
  assert.equal(isHeroEnlistable(appointHeroAsGovernor(makeHero(), "world-1")), false);
  assert.equal(isHeroEnlistable(beginHeroRecovery(makeHero(), 3)), false);
  assert.equal(isHeroEnlistable(enlistHeroFor(makeHero(), "world-1")), false);
});

test("beginHeroRecovery replaces any prior assignment with recovering and zeroes health", () => {
  const inCity = assignHeroToCity(makeHero(), "city-1");
  const recovering = beginHeroRecovery(inCity, 3);
  assert.equal(isHeroRecovering(recovering), true);
  assert.deepEqual(recovering.assignment, { mode: "recovering", turnsRemaining: 3 });
  assert.equal(recovering.health, 0);
});

test("tickHeroRecovery counts down turnsRemaining without finishing early", () => {
  const recovering = beginHeroRecovery(makeHero(), 3);
  const afterOneTick = tickHeroRecovery(recovering, 100);
  assert.deepEqual(afterOneTick.assignment, { mode: "recovering", turnsRemaining: 2 });
  assert.equal(afterOneTick.health, 0);
});

test("tickHeroRecovery returns the hero to solo at the garrison with full health once turns run out", () => {
  let hero = beginHeroRecovery(makeHero(), 2);
  hero = tickHeroRecovery(hero, 100);
  hero = tickHeroRecovery(hero, 100);
  assert.deepEqual(hero.assignment, { mode: "solo", position: GARRISON_RETURN_POSITION });
  assert.equal(hero.health, 100);
  assert.equal(isHeroRecovering(hero), false);
});

test("tickHeroRecovery is a no-op for a hero that isn't recovering", () => {
  const hero = makeHero();
  assert.deepEqual(tickHeroRecovery(hero, 100), hero);
});

test("governedWorldId returns the world id for a governor", () => {
  const governing = appointHeroAsGovernor(makeHero(), "world-1");
  assert.equal(governedWorldId(governing), "world-1");
});

test("governedWorldId is null for a non-governor", () => {
  assert.equal(governedWorldId(makeHero()), null);
  assert.equal(governedWorldId(assignHeroToCity(makeHero(), "city-1")), null);
});

test("setDeploymentPriority toggles the star flag without touching anything else", () => {
  const starred = setDeploymentPriority(makeHero(), true);
  assert.equal(starred.deploymentPriority, true);
  const unstarred = setDeploymentPriority(starred, false);
  assert.equal(unstarred.deploymentPriority, false);
});

function makeItem(id: string): Item {
  return { id, name: `아이템 ${id}`, description: "테스트용 아이템" };
}

test("equipItem adds an item to an empty loadout", () => {
  const equipped = equipItem(makeHero(), makeItem("item-1"));
  assert.deepEqual(equipped.items, [makeItem("item-1")]);
});

test(`equipItem allows up to ${MAX_ITEMS_PER_HERO} items`, () => {
  let hero = makeHero();
  for (let i = 0; i < MAX_ITEMS_PER_HERO; i += 1) {
    hero = equipItem(hero, makeItem(`item-${i}`));
  }
  assert.equal(hero.items.length, MAX_ITEMS_PER_HERO);
});

test(`equipItem throws past the ${MAX_ITEMS_PER_HERO}-item cap`, () => {
  let hero = makeHero();
  for (let i = 0; i < MAX_ITEMS_PER_HERO; i += 1) {
    hero = equipItem(hero, makeItem(`item-${i}`));
  }
  assert.throws(() => equipItem(hero, makeItem("one-too-many")));
});

test("equipItem throws when the same item id is already equipped", () => {
  const hero = equipItem(makeHero(), makeItem("item-1"));
  assert.throws(() => equipItem(hero, makeItem("item-1")));
});

test("unequipItem removes an item by id", () => {
  const hero = equipItem(makeHero(), makeItem("item-1"));
  const unequipped = unequipItem(hero, "item-1");
  assert.deepEqual(unequipped.items, []);
});

test("unequipItem is a no-op for an id that isn't equipped", () => {
  const hero = equipItem(makeHero(), makeItem("item-1"));
  const unchanged = unequipItem(hero, "not-equipped");
  assert.deepEqual(unchanged.items, [makeItem("item-1")]);
});
