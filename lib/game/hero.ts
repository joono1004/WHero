import type { HeroAttributes, HeroDefinition, HeroUnitTypeKind } from "./hero-definition.ts";
import type { HexCoordinate } from "./hex.ts";
import type { CityId, HeroId, ItemId, WorldId } from "./ids.ts";

// The static hero template (stats, specialties) lives in hero-definition.ts.
// This file is the live, per-save instance: level/experience/items/current
// assignment for a hero the player has acquired, referencing its
// HeroDefinition by id.

export type Item = {
  id: ItemId;
  name: string;
  description: string;
};

export const MAX_ITEMS_PER_HERO = 2;

// A hero is always in exactly one of five modes (GAME_VISION.md, plus
// "recovering" from task 9 and "enlisted" from task 10). The former "unit"
// mode (a hero traveling with, and buffing, a specific unit) was removed
// (2026-07-28) - heroes and units now always move independently, each
// using its own unitType/병과 (hero-definition.ts's HeroUnitTypeKind) for
// movement/range rather than heroes riding along with a unit for a stat
// buff. See hero-assignment.ts for what's left of task 11's bonuses (city
// stationing only).
// - solo: moves and fights independently on the map, tracking its own position
// - city: stationed in a city, boosting its production (formula: task 10/11)
// - governor: appointed lord of a previously-cleared world (task 13). Per
//   the user's 2026-07-28 direction, this is explicitly NOT an on-map
//   combat/movement ability (unlike solo) - the governed world isn't
//   played on anymore, so heroCombatStats-style numbers don't apply there.
//   Instead the governor's grades should scale up how much resource that
//   cleared world keeps producing per turn (which resource(s), and the
//   exact formula, are still undecided - task 13 hasn't started). Exactly
//   one governor per world - see ClearedWorldRecord.governorHeroId. This is
//   how heroes past the per-map deployment limit stay useful instead of
//   sitting idle. NOTE: rebellion-suppression dispatch (task 14) is a
//   separate, unrelated mechanic - sending some other hero to a governed
//   world to put down a rebellion doesn't change anyone's assignment.
// - recovering: defeated in combat (task 9) - this session's explicit
//   direction is that, unlike a plain unit, a hero doesn't leave the roster
//   for good. They vanish from the map ("죽은 것처럼 사라짐") and sit out
//   for `turnsRemaining` more turns (ticked down by turn.ts's endTurn),
//   after which they reappear solo at GARRISON_RETURN_POSITION.
// - enlisted: committed to a world's roster (up to 5, chosen before
//   entering - world-entry.ts's enterMapCandidate) but not yet physically
//   on the map. Only the first enlisted hero starts solo; the rest sit
//   here until city-actions.ts's checkHeroSummons promotes them to solo as
//   the faction's city count grows (this session's direction - point 8).
export type HeroAssignment =
  | { mode: "solo"; position: HexCoordinate }
  | { mode: "city"; cityId: CityId }
  | { mode: "governor"; worldId: WorldId }
  | { mode: "recovering"; turnsRemaining: number }
  | { mode: "enlisted"; worldId: WorldId };

// Where a recovering hero reappears once recovery finishes. A placeholder
// until a real "garrison"/home-city concept exists (task 10/13) - for now
// it's the same default position new-game.ts starts a fresh hero at.
export const GARRISON_RETURN_POSITION: HexCoordinate = { row: 0, column: 0 };

export type AttributeKey = keyof HeroAttributes;

// Pips filled toward each attribute's next grade (see grade.ts's
// pipsRequiredForNextGrade). Nothing currently adds pips here - the
// level-up/breakthrough system that would is still undecided - so this
// starts (and stays, for now) at all zeros. It exists so the hero detail
// screen has something real to render a gauge from instead of faking it.
export type AttributeProgress = Record<AttributeKey, number>;

export const ZERO_ATTRIBUTE_PROGRESS: AttributeProgress = {
  leadership: 0,
  force: 0,
  intelligence: 0,
  charisma: 0,
  vitality: 0,
};

export type HeroState = {
  heroId: HeroId;
  level: number;
  experience: number;
  // Current combat health (task 9). Max health is derived from the hero's
  // grade attributes (see hero-definition.ts's heroCombatStats), not stored
  // here - only the current value, which changes with combat and recovery.
  health: number;
  items: Item[];
  assignment: HeroAssignment;
  attributeProgress: AttributeProgress;
  // Player-set "send this hero out first" marker (the star). Doesn't move
  // the hero itself - it's read by whatever later picks which heroes deploy
  // to a new world (task 11/12), not enforced by anything yet.
  deploymentPriority: boolean;
  // 병과 진화 결과 (2026-08-07, 사용자 방향): null이면 아직 진화하지 않아
  // definition.unitType 그대로 - evolveHero가 정의(HeroDefinition)의
  // evolution.targetUnitType으로 채운다. definition은 정적 템플릿이라
  // per-save로 바뀌는 이 값은 여기 HeroState에 둔다 - currentHeroUnitType
  // 이 이 필드와 definition.unitType 중 실제로 쓸 값을 골라준다.
  evolvedUnitType: HeroUnitTypeKind | null;
};

// 이 영웅이 지금 실제로 쓰는 병과 - 진화했으면 evolvedUnitType, 아니면
// definition.unitType. heroCombatStats/heroBaseMovement를 부르는 곳(전투/
// 이동 계산)은 definition.unitType을 직접 읽지 말고 항상 이 함수를 거쳐야
// 진화 이후에도 값이 맞는다.
export function currentHeroUnitType(definition: HeroDefinition, hero: HeroState): HeroUnitTypeKind {
  return hero.evolvedUnitType ?? definition.unitType;
}

// 레벨+아이템 조건을 만족해 진화할 수 있는지 - definition.evolution이
// null이면(이 영웅은 진화가 없음) false, 이미 진화했어도 false(1단계
// 진화만 지원 - 사용자가 다단계 영웅 진화까지는 아직 말하지 않음).
export function canEvolveHero(definition: HeroDefinition, hero: HeroState): boolean {
  const evolution = definition.evolution;
  if (!evolution) return false;
  if (hero.evolvedUnitType !== null) return false;
  if (hero.level < evolution.requiredLevel) return false;
  return hero.items.some((item) => item.id === evolution.requiredItemId);
}

// 진화를 실행 - 진화 아이템을 소비하고 evolvedUnitType을 채운다. 조건
// 미충족 시 throw (다른 모듈과 같은 UI 사전 검사 컨벤션 - canEvolveHero를
// 먼저 확인).
export function evolveHero(definition: HeroDefinition, hero: HeroState): HeroState {
  if (!canEvolveHero(definition, hero)) {
    throw new Error(`${hero.heroId} cannot evolve right now`);
  }
  const evolution = definition.evolution!;
  return {
    ...hero,
    evolvedUnitType: evolution.targetUnitType,
    items: hero.items.filter((item) => item.id !== evolution.requiredItemId),
  };
}

export function isHeroSolo(hero: HeroState): boolean {
  return hero.assignment.mode === "solo";
}

export function isHeroInCity(hero: HeroState): boolean {
  return hero.assignment.mode === "city";
}

export function isHeroGoverning(hero: HeroState): boolean {
  return hero.assignment.mode === "governor";
}

// The world this hero governs, or null if they aren't a governor right now.
// UI-facing label formatting ("OO영주") is left to the caller.
export function governedWorldId(hero: HeroState): WorldId | null {
  return hero.assignment.mode === "governor" ? hero.assignment.worldId : null;
}

export function isHeroRecovering(hero: HeroState): boolean {
  return hero.assignment.mode === "recovering";
}

export function isHeroEnlisted(hero: HeroState): boolean {
  return hero.assignment.mode === "enlisted";
}

// Eligible to be picked for a new campaign's enlistment list
// (world-entry.ts's enterMapCandidate) - a governor has a standing
// commitment elsewhere, a recovering hero physically can't travel yet, and
// an already-enlisted hero would only happen from a bug (enlistment always
// starts from a roster where the prior campaign's enlisted heroes have
// already been reset - see world-entry.ts's completeActiveWorld).
export function isHeroEnlistable(hero: HeroState): boolean {
  return !isHeroGoverning(hero) && !isHeroRecovering(hero) && !isHeroEnlisted(hero);
}

// Heroes deployed in the active world (solo/city) count against the
// per-world deployment limit; a governor, a hero recovering off-map, or a
// hero enlisted but not yet summoned does not - none of them occupy a
// deployment slot in the current world.
export function isHeroDeployed(hero: HeroState): boolean {
  return (
    hero.assignment.mode !== "governor" &&
    hero.assignment.mode !== "recovering" &&
    hero.assignment.mode !== "enlisted"
  );
}

export function sendHeroSolo(hero: HeroState, position: HexCoordinate): HeroState {
  return { ...hero, assignment: { mode: "solo", position } };
}

export function assignHeroToCity(hero: HeroState, cityId: CityId): HeroState {
  return { ...hero, assignment: { mode: "city", cityId } };
}

export function appointHeroAsGovernor(hero: HeroState, worldId: WorldId): HeroState {
  return { ...hero, assignment: { mode: "governor", worldId } };
}

// Commits a hero to a world's campaign roster without placing them on the
// map yet (task 10's enlistment mechanic) - city-actions.ts's
// checkHeroSummons is what eventually moves them to solo.
export function enlistHeroFor(hero: HeroState, worldId: WorldId): HeroState {
  return { ...hero, assignment: { mode: "enlisted", worldId } };
}

// Sends a defeated hero to recover (task 9's combat rules) - they vanish
// from the map for `turnsRemaining` turns, whatever their assignment was
// before. health is zeroed since it's meaningless while recovering (not
// read again until tickHeroRecovery restores it on return).
export function beginHeroRecovery(hero: HeroState, turnsRemaining: number): HeroState {
  return { ...hero, health: 0, assignment: { mode: "recovering", turnsRemaining } };
}

// One turn of recovery (called from turn.ts's endTurn for every recovering
// hero). A non-recovering hero passes through unchanged. `maxHealth` is the
// hero's full health total (hero-definition.ts's heroCombatStats) - needed
// here because recovery completion restores health, and this module has no
// way to look up a hero's definition itself. `extraTurns` (default 0) is a
// faction-wide speedup from a 회복(recovery)-specialty hero stationed
// somewhere (hero-assignment.ts's recoveryTurnsBonus, task 11) - on top of
// the normal 1 turn.
export function tickHeroRecovery(hero: HeroState, maxHealth: number, extraTurns = 0): HeroState {
  if (hero.assignment.mode !== "recovering") return hero;
  const turnsRemaining = hero.assignment.turnsRemaining - (1 + extraTurns);
  if (turnsRemaining <= 0) {
    return { ...hero, health: maxHealth, assignment: { mode: "solo", position: GARRISON_RETURN_POSITION } };
  }
  return { ...hero, assignment: { mode: "recovering", turnsRemaining } };
}

export function setDeploymentPriority(hero: HeroState, priority: boolean): HeroState {
  return { ...hero, deploymentPriority: priority };
}

export function equipItem(hero: HeroState, item: Item): HeroState {
  if (hero.items.length >= MAX_ITEMS_PER_HERO) {
    throw new Error(`${hero.heroId} already has ${MAX_ITEMS_PER_HERO} items equipped`);
  }
  if (hero.items.some((equipped) => equipped.id === item.id)) {
    throw new Error(`${hero.heroId} already has item ${item.id} equipped`);
  }
  return { ...hero, items: [...hero.items, item] };
}

export function unequipItem(hero: HeroState, itemId: ItemId): HeroState {
  return { ...hero, items: hero.items.filter((item) => item.id !== itemId) };
}
