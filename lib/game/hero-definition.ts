import { averageGrade, gradeToScore } from "./grade.ts";
import type { CoreGrade, SpecialtyGrade } from "./grade.ts";
import type { HeroId } from "./ids.ts";
import type { TroopResearchKind } from "./research.ts";
import { UNIT_TYPE_CATALOG } from "./unit-production.ts";

// 통솔력/무력/지력/매력/체력. Every hero has some level in each (never
// "없음") - see grade.ts for why CoreGrade vs SpecialtyGrade are separate
// types. vitality (체력) was added after the other four (this session's
// direction) specifically to back heroCombatStats's maxHealth below,
// instead of that being derived from force+leadership as a stopgap.
export type HeroAttributes = {
  leadership: CoreGrade;
  force: CoreGrade;
  intelligence: CoreGrade;
  charisma: CoreGrade;
  vitality: CoreGrade;
};

// 장군형(통솔력 우세) / 무력형(무력 우세) / 지략형(지력 우세) / 만능형(고르게 높음).
export type HeroArchetype = "general" | "warrior" | "strategist" | "allrounder";

// Draft rule - easy to revisit if it doesn't feel right in play: leadership,
// force, and intelligence compete for the archetype (charisma and vitality
// sit out - charisma reads as a diplomacy/domestic stat and vitality as raw
// toughness, neither is a combat role the way the other three are).
// If the three are within one grade step of each other, the hero reads as
// balanced rather than specialized -> allrounder. Otherwise whichever is
// highest wins; a tie among the top score breaks leadership > force >
// intelligence.
export function heroArchetype(attributes: HeroAttributes): HeroArchetype {
  const leadership = gradeToScore(attributes.leadership);
  const force = gradeToScore(attributes.force);
  const intelligence = gradeToScore(attributes.intelligence);
  const highest = Math.max(leadership, force, intelligence);
  const lowest = Math.min(leadership, force, intelligence);
  if (highest - lowest <= 1) return "allrounder";
  if (leadership === highest) return "general";
  if (force === highest) return "warrior";
  return "strategist";
}

// Overall hero grade shown to the player: the average of all five attributes.
export function heroOverallGrade(attributes: HeroAttributes): CoreGrade {
  return averageGrade([
    attributes.leadership,
    attributes.force,
    attributes.intelligence,
    attributes.charisma,
    attributes.vitality,
  ]);
}

// 내정특기: 훈련(병사생산) / 상업(금생산) / 농업(식량생산) / 채굴(철생산) /
// 회복(영역내 병사·영웅 체력 회복력) / 방어(도시 방어력). Started as just
// gold/food/troops (내정=domestic/economy); grew to 6 with task 11's
// follow-up direction, which also folds in things that aren't really
// "domestic" in the economic sense (recovery, defense) - kept the field/
// type name as-is anyway rather than repainting every file that already
// uses it, so read "내정특기" loosely as "도시 배속 특기" (a city-stationed
// hero's specialty) going forward.
export type DomesticSpecialtyKind = "gold" | "food" | "troops" | "iron" | "recovery" | "defense";

// 영웅의 고정 병과 (2026-07-28, "영웅을 부대에 배속" 기능 제외 결정에
// 따라 이전의 "병과별 등급"(unitTypeSpecialties: 4개 병과 각각에 등급,
// 부대 동행 시너지 판정용)을 대체): 영웅도 병사처럼 병과(보병/궁병/기병/
// 공성) 하나를 고정으로 가진다 - 부대와 영웅이 각자 독립적으로 이동하기로
// 하면서, "부대에 탄 영웅이 그 부대와 병과가 맞는지" 판정 대신 "영웅
// 자신이 어떤 병과로 움직이는지"가 필요해졌기 때문. 이동력/사거리는
// unit-production.ts의 UNIT_TYPE_CATALOG을 병사와 그대로 공유한다(같은
// 병과면 영웅도 병사와 동일한 기준으로 움직이고 공격 범위를 가짐) - 아래
// heroCombatStats의 range, 그리고 영웅 단독 이동에 필요한 이동력은
// UNIT_TYPE_CATALOG[unitType].baseMovement를 그대로 쓰면 된다.
export type HeroUnitTypeKind = TroopResearchKind;

// 특기 (2026-07-28, 이전엔 "ranged"도 여기 있었으나 원거리 여부가 이제
// 병과로 정해지므로 제거함 - 궁병/공성 병과는 UNIT_TYPE_CATALOG상 이미
// range가 있고, 나머지 병과는 근접): 돌격/요술처럼 병과와 무관한 전투
// 특기 자리만 마련해둔 상태 - 전부 "없음"이고 아직 아무 효과가 없다.
export type TraitKind = "charge" | "magic";

// Draft combat stats derived from a hero's grade attributes (task 9 -
// combat rules). No playtesting has happened yet, so every constant here is
// an adjustable placeholder. Force drives attack, leadership drives
// defense, vitality drives health - intelligence/charisma read as
// domestic/strategic stats and don't factor into raw combat power. Hero
// level isn't factored in either - the leveling curve itself is still
// undecided (docs/SYSTEM_LAYER.md) - so two heroes with the same grades hit
// the same numbers regardless of level for now.
const ATTACK_PER_GRADE_POINT = 5;
const DEFENSE_PER_GRADE_POINT = 4;
const HEALTH_PER_GRADE_POINT = 20;

export type HeroCombatStats = {
  attack: number;
  defense: number;
  maxHealth: number;
  range: number | null;
};

export function heroCombatStats(attributes: HeroAttributes, unitType: HeroUnitTypeKind): HeroCombatStats {
  return {
    attack: gradeToScore(attributes.force) * ATTACK_PER_GRADE_POINT,
    defense: gradeToScore(attributes.leadership) * DEFENSE_PER_GRADE_POINT,
    maxHealth: gradeToScore(attributes.vitality) * HEALTH_PER_GRADE_POINT,
    range: UNIT_TYPE_CATALOG[unitType].range,
  };
}

// A solo hero's movement budget (movement.ts's MovementCost/reachableHexes
// callers need a number, not a hex-by-hex cost) - shared with units of the
// same unitType rather than a separate hero-only stat, per the "영웅은
// 영웅대로 이동" direction (2026-07-28).
export function heroBaseMovement(unitType: HeroUnitTypeKind): number {
  return UNIT_TYPE_CATALOG[unitType].baseMovement;
}

// The static template for a hero (name, portrait-worthy description, and its
// full stat sheet). HeroState (hero.ts) is the live, per-save instance
// (level/experience/items/current assignment) that references one of these
// by id. Region/cleared-map specialty isn't modeled yet - it's tied to the
// still-undecided reward for task 13 (docs/SYSTEM_LAYER.md).
export type HeroDefinition = {
  id: HeroId;
  name: string;
  description: string;
  attributes: HeroAttributes;
  unitType: HeroUnitTypeKind;
  domesticSpecialties: Record<DomesticSpecialtyKind, SpecialtyGrade>;
  traits: Record<TraitKind, SpecialtyGrade>;
};
