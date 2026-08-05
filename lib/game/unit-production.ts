import type { CoreGrade } from "./grade.ts";
import { gradeToScore } from "./grade.ts";
import type { UnitId, FactionId } from "./ids.ts";
import type { TroopResearchKind } from "./research.ts";
import type { HexCoordinate } from "./hex.ts";
import type { Unit } from "./unit.ts";

// Units produced on a map (task 10), per the user's spec: a unit's grade is
// baked in from the producing faction's *pre-map* research investment
// (WorldState.researchSnapshot, set once when entering the world - research
// can currently only be done from the lobby, so this is equivalent to
// "current research" during a campaign, but snapshotting makes that
// intentional rather than incidental). Only force(무력)/vitality(체력) are
// graded for units (unlike heroes' four/five stats) - this session's
// direction - and the grade cap is A, never S/SS.
export type UnitGrade = Exclude<CoreGrade, "SS" | "S">;

// Base movement/range per troop research category - there's no separate
// "unit type" catalog yet beyond the four research categories themselves;
// terrain-specialization research (renaming e.g. 보병 -> 산악병 and
// upgrading movement/range further) is an explicitly deferred extension
// (2026-07-27 direction) - see docs/SYSTEM_LAYER.md.
export const UNIT_TYPE_CATALOG: Record<TroopResearchKind, { label: string; baseMovement: number; range: number | null }> = {
  infantry: { label: "보병", baseMovement: 2, range: null },
  archer: { label: "궁병", baseMovement: 2, range: 2 },
  cavalry: { label: "기병", baseMovement: 4, range: null },
  siege: { label: "공성병기", baseMovement: 1, range: 3 },
};

// Infantry needs no research investment at all; every other troop type
// needs at least one level invested before it can be produced (this
// session's direction - point 10).
export function isUnitTypeUnlocked(unitType: TroopResearchKind, researchLevel: number): boolean {
  if (unitType === "infantry") return true;
  return researchLevel >= 1;
}

// Draft, unplaytested thresholds mapping a 0-10 research level onto the
// unit grade it produces. Deliberately capped at A (index of "A" in
// grade.ts's GRADE_ORDER) - S/SS are hero-only.
export function researchLevelToUnitGrade(researchLevel: number): UnitGrade {
  if (researchLevel >= 8) return "A";
  if (researchLevel >= 5) return "B";
  if (researchLevel >= 2) return "C";
  return "D";
}

// Draft combat-stat scaling, smaller than hero-definition.ts's
// heroCombatStats constants so a lone unit reads as weaker than a hero of
// the same grade - units are meant to be the numerous, disposable side of
// combat. Both attack and defense/health come from the same grade (this
// session's direction treats a troop type's research level as one combined
// quality dial, not separate force/vitality tracks).
const ATTACK_PER_GRADE_POINT = 3;
const DEFENSE_PER_GRADE_POINT = 2;
const HEALTH_PER_GRADE_POINT = 15;

export type UnitCombatStats = { attack: number; defense: number; maxHealth: number };

export function unitCombatStatsFromGrade(grade: UnitGrade): UnitCombatStats {
  const score = gradeToScore(grade);
  return {
    attack: score * ATTACK_PER_GRADE_POINT,
    defense: score * DEFENSE_PER_GRADE_POINT,
    maxHealth: score * HEALTH_PER_GRADE_POINT,
  };
}

// Builds a freshly-produced unit at full health, using the catalog's base
// movement/range and stats derived from the given research level (pass
// WorldState.researchSnapshot[unitType] - see the module doc above). Throws
// if the unit type isn't unlocked at that research level, since the caller
// (city.ts's queueUnitProduction) is expected to have already gated this.
export function createProducedUnit(params: {
  id: UnitId;
  factionId: FactionId;
  unitType: TroopResearchKind;
  position: HexCoordinate;
  researchLevel: number;
}): Unit {
  if (!isUnitTypeUnlocked(params.unitType, params.researchLevel)) {
    throw new Error(`${params.unitType} is not unlocked at research level ${params.researchLevel}`);
  }
  const catalogEntry = UNIT_TYPE_CATALOG[params.unitType];
  const grade = researchLevelToUnitGrade(params.researchLevel);
  const stats = unitCombatStatsFromGrade(grade);
  return {
    id: params.id,
    factionId: params.factionId,
    unitType: params.unitType,
    position: params.position,
    stats: {
      attack: stats.attack,
      defense: stats.defense,
      maxHealth: stats.maxHealth,
      movement: catalogEntry.baseMovement,
      range: catalogEntry.range,
    },
    health: stats.maxHealth,
    movementRemaining: catalogEntry.baseMovement,
  };
}
