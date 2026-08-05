import type { FactionResources } from "./faction.ts";
import { gradeToScore } from "./grade.ts";
import type { SpecialtyGrade } from "./grade.ts";
import type { DomesticSpecialtyKind, HeroDefinition } from "./hero-definition.ts";

// Hero assignment bonuses (task 11): what a hero stationed in a city
// actually contributes, per GAME_VISION.md's "도시에 배속되면 생산력 증가"
// principle, plus the user's follow-up direction expanding city specialties
// to 6 kinds. Every constant here is a draft, unplaytested guess, same as
// heroCombatStats/researchLevelToUnitGrade elsewhere - easy to retune.
//
// This module used to also cover a "unit rider" buff (a hero traveling
// with, and buffing, a specific unit's stats/movement/range) - removed
// (2026-07-28) along with HeroAssignment's "unit" mode, now that heroes
// always move independently on their own fixed unitType/병과
// (hero-definition.ts) rather than riding along with a unit.
//
// These are pure "given a hero, what's the bonus" functions - applying them
// (city yield/production/regen in turn.ts) is each call site's job, since
// this module has no opinion on *which* hero is stationed in *which* city.
// That link lives in City.heroId (city.ts); callers are expected to have
// already confirmed the hero is actually assigned there.

// --- city-stationed hero bonuses ---

// A hero stationed in a city boosts the resource their specialty matches
// (상업/농업/채굴 -> 시장/농장/광산 facility yield). 훈련 (troops) doesn't
// map to a resource - it speeds up unit production instead, see
// productionTurnsBonus below. 회복/방어 don't affect yield at all - see
// heroRegenPerTurn/cityDefenseBonusFromHero. Every grade step
// (gradeToScore, 1-6) adds 10% - "없음" (no specialty in that category)
// contributes nothing.
const YIELD_BONUS_PER_GRADE_POINT = 0.1;

function specialtyMultiplier(grade: SpecialtyGrade): number {
  if (grade === "없음") return 1;
  return 1 + gradeToScore(grade) * YIELD_BONUS_PER_GRADE_POINT;
}

const YIELD_SPECIALTY_FOR_RESOURCE: Partial<Record<keyof FactionResources, DomesticSpecialtyKind>> = {
  gold: "gold",
  food: "food",
  iron: "iron",
};

// Scales a city's base facility yield by its stationed hero's matching
// specialty (상업 -> 시장/gold, 농업 -> 농장/food, 채굴 -> 광산/iron).
// `definition` is null when the city has no stationed hero (City.heroId
// === null), in which case the yield passes through unchanged.
export function cityYieldWithHeroBonus(
  baseYield: Partial<FactionResources>,
  definition: HeroDefinition | null,
): Partial<FactionResources> {
  if (!definition) return baseYield;
  const boosted: Partial<FactionResources> = {};
  for (const [key, amount] of Object.entries(baseYield)) {
    const resourceKey = key as keyof FactionResources;
    const specialty = YIELD_SPECIALTY_FOR_RESOURCE[resourceKey];
    const multiplier = specialty ? specialtyMultiplier(definition.domesticSpecialties[specialty]) : 1;
    boosted[resourceKey] = Math.round((amount ?? 0) * multiplier);
  }
  return boosted;
}

// A hero stationed in a city with any 훈련 (troops) specialty speeds up
// that city's unit production queue - an extra turn shaved off every
// order's turnsRemaining each turn, on top of the normal 1. Flat regardless
// of grade for now (draft) - "없음" contributes nothing.
const TROOPS_SPECIALTY_PRODUCTION_BONUS = 1;

export function productionTurnsBonus(definition: HeroDefinition | null): number {
  if (!definition) return 0;
  return definition.domesticSpecialties.troops === "없음" ? 0 : TROOPS_SPECIALTY_PRODUCTION_BONUS;
}

// A hero stationed in a city with a 방어 (defense) specialty adds to that
// city's wall defense bonus (city.ts's cityWallDefenseBonus, tier-based).
// Not wired into combat.ts yet - there's still no map-driven "attack a
// city" trigger (same gap as tasks 8/9), so this is exposed and tested but
// unused until that exists.
const DEFENSE_BONUS_PER_GRADE_POINT = 5;

export function cityDefenseBonusFromHero(definition: HeroDefinition | null): number {
  if (!definition) return 0;
  const grade = definition.domesticSpecialties.defense;
  return grade === "없음" ? 0 : gradeToScore(grade) * DEFENSE_BONUS_PER_GRADE_POINT;
}

// A hero stationed in a city with a 회복 (recovery) specialty heals every
// turn - applied by turn.ts to units and heroes "in the region" (this
// session's proxy for that, since there's no territory-radius system yet:
// units/heroes sitting at exactly the city's position, plus the stationed
// hero themselves). "없음" heals nothing.
const REGEN_PER_GRADE_POINT = 3;

export function heroRegenPerTurn(definition: HeroDefinition | null): number {
  if (!definition) return 0;
  const grade = definition.domesticSpecialties.recovery;
  return grade === "없음" ? 0 : gradeToScore(grade) * REGEN_PER_GRADE_POINT;
}

// A 회복 specialist stationed anywhere in the faction also speeds up
// recovering (task 9's "defeated hero waiting to return") heroes - they
// have no position to be "in range" of a specific city's regen, so this is
// a flat, faction-wide bonus rather than a per-city one. Flat regardless of
// grade for now (draft), same simplification as productionTurnsBonus.
const RECOVERY_TURNS_BONUS = 1;

export function recoveryTurnsBonus(definition: HeroDefinition | null): number {
  if (!definition) return 0;
  return definition.domesticSpecialties.recovery === "없음" ? 0 : RECOVERY_TURNS_BONUS;
}
