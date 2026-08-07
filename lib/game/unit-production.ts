import type { CoreGrade } from "./grade.ts";
import { gradeToScore } from "./grade.ts";
import type { UnitId, FactionId, ItemId, UnitTypeId } from "./ids.ts";
import type { HexCoordinate } from "./hex.ts";
import type { Unit } from "./unit.ts";

// Units produced on a map (task 10), per the user's spec: a unit's grade is
// baked in from the producing faction's *pre-map* research investment
// (WorldState.troopLevelsSnapshot, set once when entering the world -
// research can currently only be done from the lobby, so this is equivalent
// to "current research" during a campaign, but snapshotting makes that
// intentional rather than incidental). Only force(무력)/vitality(체력) are
// graded for units (unlike heroes' four/five stats) - this session's
// direction - and the grade cap is A, never S/SS.
export type UnitGrade = Exclude<CoreGrade, "SS" | "S">;

// 병과 계열 (2026-08-08 방향 개정: "좌측 기본 계열 → 우측으로 갈수록
// 진화" 표 형태로 확정하면서, 공성을 별도 계열로 두지 않고 궁병 계열의
// 상위 단계(화차/충차/발석차/벽력거)로 흡수함 - 5계열 → 4계열. 책사(마법사
// 계열 - 근접 없음, 원거리 마법 공격)는 그대로 유지. 각 계열은 뿌리(root)
// 노드에서 시작해 아래 UNIT_TYPE_CATALOG의 tier 0~5를 순서대로 밟는다.
export type TroopLine = "infantry" | "archer" | "cavalry" | "strategist";

export const TROOP_LINES: TroopLine[] = ["infantry", "archer", "cavalry", "strategist"];

// 한 계열 안에서 이 노드가 몇 번째 단계인지 (0=기본, 1~5=진화 단계). 지금은
// 분기 없는 외길이라 tier 하나로 표 위치(왼쪽→오른쪽 칸)가 그대로
// 정해진다 - 분기가 생기면(사용자: "분기는 나중에 추가") 이 필드의 의미를
// "같은 열에 여러 후보가 있을 수 있다"로 넓혀야 할 수 있음.
export const MAX_TROOP_TIER = 5;

// 책사 계열의 공격 속성 - "physical"은 일반 병과(물리 공격), 나머지는 책사
// 진화가 갈라지는 방향(화공/수공/회복 - 사용자 2026-08-07 방향: 기본
// 책사는 화공, 진화하면 수공을 쓸 수 있게 되는 등). 실제 전투 효과(화상/
// 침수/치유 로직)는 아직 미정 - 지금은 표시/데이터 용도의 draft 필드.
export type AttackElement = "physical" | "fire" | "water" | "heal";

// 진화 노드 하나를 해금하는 조건 (2026-08-07 방향, requiredItemId/
// requiredUnitTypeIds는 분기가 돌아올 때 쓸 인프라로 타입만 남겨두고
// 지금 카탈로그 데이터에서는 안 씀 - 사용자: "분기는 나중에 추가"):
// - requiredParentGrade: 부모 노드의 등급(researchLevelToUnitGrade)이 이
//   이상이어야 함
// - gold/researchResource: 해금에 드는 자원 비용
// - requiredItemId: 진화 전용 아이템이 필요한 노드 (분기 복귀 시 사용 예정)
// - requiredUnitTypeIds: 다른 계열의 특정 노드가 먼저 해금되어 있어야
//   하는 교차 계열 선행조건 (분기 복귀 시 사용 예정)
export type UnitTypeUnlock = {
  requiredParentGrade?: UnitGrade;
  gold: number;
  researchResource: number;
  requiredItemId?: ItemId;
  requiredUnitTypeIds?: UnitTypeId[];
};

export type UnitTypeNode = {
  id: UnitTypeId;
  label: string;
  line: TroopLine;
  // null for a line's root node, otherwise the node this one evolves from.
  // 지금은 외길이라 항상 정확히 하나의 이전 노드를 가리킴.
  parentId: UnitTypeId | null;
  // 0=기본, 1~MAX_TROOP_TIER=진화 단계 - "왼쪽 기본, 오른쪽으로 갈수록
  // 진화" 표에서 이 노드가 놓일 열.
  tier: number;
  baseMovement: number;
  range: number | null;
  meleeCapable: boolean;
  attackElement: AttackElement;
  // null for a line's root node (always available, no unlock to perform) -
  // every evolution node has one.
  unlock: UnitTypeUnlock | null;
};

// tier 1~5 노드의 해금 비용 곡선 - tier가 깊을수록 등급 조건/자원 비용이
// 오른다. Draft, unplaytested (다른 비용 곡선들과 마찬가지로 조정 가능).
function tierUnlock(tier: number): UnitTypeUnlock {
  const requiredParentGrade: UnitGrade = tier <= 2 ? "C" : tier <= 4 ? "B" : "A";
  return { requiredParentGrade, gold: 300 * tier, researchResource: 100 * tier };
}

// The troop evolution tree (2026-08-08 방향: "좌측 기본 계열 → 우측으로
// 갈수록 진화" 표 형태로 확정). 계열마다 뿌리(tier 0)에서 시작해 tier
// 5까지 외길로 이어진다 - 분기(같은 tier에 여러 후보)와 교차 계열
// 선행조건은 사용자가 "나중에 추가"로 명시적으로 미룸(위 UnitTypeUnlock의
// requiredItemId/requiredUnitTypeIds는 그때 쓸 인프라로 타입만 남겨둠).
// 이름은 사용자가 준 예시(보병-검병-산악병, 궁병-석궁병-화차-충차-발석차,
// 기병-철기병, 책사-참모) + 사용자 요청으로 제안한 나머지 단계들 - 여전히
// draft, 사용자가 다시 바꿀 수 있음.
//
// A node's own grade (D~A, via researchLevelToUnitGrade) is tracked
// independently per node (unit-evolution.ts's TroopLevels) - evolving to a
// child does NOT carry over the parent's level; the child starts back at D
// and must be leveled up again (this session's explicit direction).
export const UNIT_TYPE_CATALOG: Record<UnitTypeId, UnitTypeNode> = {
  // 보병: 보병 - 검병 - 산악병 - 중보병 - 철갑보병 - 근위보병
  infantry: {
    id: "infantry",
    label: "보병",
    line: "infantry",
    parentId: null,
    tier: 0,
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: null,
  },
  infantry_swordsman: {
    id: "infantry_swordsman",
    label: "검병",
    line: "infantry",
    parentId: "infantry",
    tier: 1,
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(1),
  },
  infantry_mountain: {
    id: "infantry_mountain",
    label: "산악병",
    line: "infantry",
    parentId: "infantry_swordsman",
    tier: 2,
    baseMovement: 3,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(2),
  },
  infantry_heavy: {
    id: "infantry_heavy",
    label: "중보병",
    line: "infantry",
    parentId: "infantry_mountain",
    tier: 3,
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(3),
  },
  infantry_armored: {
    id: "infantry_armored",
    label: "철갑보병",
    line: "infantry",
    parentId: "infantry_heavy",
    tier: 4,
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(4),
  },
  infantry_guard: {
    id: "infantry_guard",
    label: "근위보병",
    line: "infantry",
    parentId: "infantry_armored",
    tier: 5,
    baseMovement: 3,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(5),
  },

  // 궁병: 궁병 - 석궁병 - 화차 - 충차 - 발석차 - 벽력거 (사용자 방향으로
  // 공성 계열을 별도로 두지 않고 궁병 상위 단계에 흡수).
  archer: {
    id: "archer",
    label: "궁병",
    line: "archer",
    parentId: null,
    tier: 0,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "physical",
    unlock: null,
  },
  archer_crossbow: {
    id: "archer_crossbow",
    label: "석궁병",
    line: "archer",
    parentId: "archer",
    tier: 1,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "physical",
    unlock: tierUnlock(1),
  },
  archer_fire_cart: {
    id: "archer_fire_cart",
    label: "화차",
    line: "archer",
    parentId: "archer_crossbow",
    tier: 2,
    baseMovement: 2,
    range: 3,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(2),
  },
  archer_ram: {
    id: "archer_ram",
    label: "충차",
    line: "archer",
    parentId: "archer_fire_cart",
    tier: 3,
    baseMovement: 1,
    range: 3,
    meleeCapable: false,
    attackElement: "physical",
    unlock: tierUnlock(3),
  },
  archer_trebuchet: {
    id: "archer_trebuchet",
    label: "발석차",
    line: "archer",
    parentId: "archer_ram",
    tier: 4,
    baseMovement: 1,
    range: 4,
    meleeCapable: false,
    attackElement: "physical",
    unlock: tierUnlock(4),
  },
  archer_thunder_cart: {
    id: "archer_thunder_cart",
    label: "벽력거",
    line: "archer",
    parentId: "archer_trebuchet",
    tier: 5,
    baseMovement: 1,
    range: 4,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(5),
  },

  // 기병: 기병 - 철기병 - 중기병 - 창기병 - 용기병 - 비룡기병
  cavalry: {
    id: "cavalry",
    label: "기병",
    line: "cavalry",
    parentId: null,
    tier: 0,
    baseMovement: 4,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: null,
  },
  cavalry_ironclad: {
    id: "cavalry_ironclad",
    label: "철기병",
    line: "cavalry",
    parentId: "cavalry",
    tier: 1,
    baseMovement: 4,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(1),
  },
  cavalry_heavy: {
    id: "cavalry_heavy",
    label: "중기병",
    line: "cavalry",
    parentId: "cavalry_ironclad",
    tier: 2,
    baseMovement: 5,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(2),
  },
  cavalry_lancer: {
    id: "cavalry_lancer",
    label: "창기병",
    line: "cavalry",
    parentId: "cavalry_heavy",
    tier: 3,
    baseMovement: 5,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(3),
  },
  cavalry_dragoon: {
    id: "cavalry_dragoon",
    label: "용기병",
    line: "cavalry",
    parentId: "cavalry_lancer",
    tier: 4,
    baseMovement: 6,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(4),
  },
  cavalry_wyvern: {
    id: "cavalry_wyvern",
    label: "비룡기병",
    line: "cavalry",
    parentId: "cavalry_dragoon",
    tier: 5,
    baseMovement: 6,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: tierUnlock(5),
  },

  // 책사: 책사 - 참모 - 군사 - 방사 - 도사 - 신선 (판타지 마법사 계열 -
  // 근접 불가, 원거리만. legendary-heroes.ts의 제갈량이 원래 이 노드를
  // 기다리던 스톱갭(archer)이었음. 화공/수공 같은 속성 분기는 사용자가
  // "나중에 추가"로 미룬 분기 기능과 함께 다시 다룰 예정 - 지금은 전
  // tier가 화공으로 통일).
  strategist: {
    id: "strategist",
    label: "책사",
    line: "strategist",
    parentId: null,
    tier: 0,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "fire",
    unlock: null,
  },
  strategist_advisor: {
    id: "strategist_advisor",
    label: "참모",
    line: "strategist",
    parentId: "strategist",
    tier: 1,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(1),
  },
  strategist_marshal: {
    id: "strategist_marshal",
    label: "군사",
    line: "strategist",
    parentId: "strategist_advisor",
    tier: 2,
    baseMovement: 2,
    range: 3,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(2),
  },
  strategist_mystic: {
    id: "strategist_mystic",
    label: "방사",
    line: "strategist",
    parentId: "strategist_marshal",
    tier: 3,
    baseMovement: 2,
    range: 3,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(3),
  },
  strategist_taoist: {
    id: "strategist_taoist",
    label: "도사",
    line: "strategist",
    parentId: "strategist_mystic",
    tier: 4,
    baseMovement: 2,
    range: 4,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(4),
  },
  strategist_immortal: {
    id: "strategist_immortal",
    label: "신선",
    line: "strategist",
    parentId: "strategist_taoist",
    tier: 5,
    baseMovement: 2,
    range: 4,
    meleeCapable: false,
    attackElement: "fire",
    unlock: tierUnlock(5),
  },
};

export const ROOT_UNIT_TYPE: Record<TroopLine, UnitTypeId> = {
  infantry: "infantry",
  archer: "archer",
  cavalry: "cavalry",
  strategist: "strategist",
};

export function isRootUnitType(unitType: UnitTypeId): boolean {
  return UNIT_TYPE_CATALOG[unitType]?.parentId === null;
}

export function childrenOfUnitType(parentId: UnitTypeId): UnitTypeNode[] {
  return Object.values(UNIT_TYPE_CATALOG).filter((node) => node.parentId === parentId);
}

// tier 0(기본) → tier MAX_TROOP_TIER 순서로 정렬된 한 계열의 전체 사슬 -
// "왼쪽 기본, 오른쪽으로 갈수록 진화" 표를 그대로 그릴 수 있는 순서.
export function unitTypesInLine(line: TroopLine): UnitTypeNode[] {
  return Object.values(UNIT_TYPE_CATALOG)
    .filter((node) => node.line === line)
    .sort((a, b) => a.tier - b.tier);
}

// Root-line production gating only (infantry needs no research investment
// at all; every other *root* needs at least one level invested before it
// can be produced - this session's direction, point 10). Evolution nodes
// (non-root) aren't gated by this - producing one requires the node to be
// in the faction's unlockedUnitTypes first (unit-evolution.ts's
// evolveUnitType), which is a separate, one-time unlock rather than a
// research-level threshold; city.ts/unit-evolution.ts check that
// separately before ever calling createProducedUnit with a non-root type.
export function isUnitTypeUnlocked(unitType: UnitTypeId, researchLevel: number): boolean {
  if (!isRootUnitType(unitType)) return true;
  if (unitType === "infantry") return true;
  return researchLevel >= 1;
}

// Draft, unplaytested thresholds mapping a 0-10 research level onto the
// unit grade it produces. Deliberately capped at A (index of "A" in
// grade.ts's GRADE_ORDER) - S/SS are hero-only. Shared by every node in the
// tree - each node's *own* level (unit-evolution.ts's TroopLevels) feeds
// this independently.
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
// WorldState.troopLevelsSnapshot's level for this unitType - see the module
// doc above). Throws if a *root* unit type isn't unlocked at that research
// level, since the caller (city.ts's queueUnitProduction) is expected to
// have already gated this; a non-root (evolution) unitType is trusted to
// have already been confirmed unlocked by the caller (unit-evolution.ts),
// since this function has no access to faction.unlockedUnitTypes.
export function createProducedUnit(params: {
  id: UnitId;
  factionId: FactionId;
  unitType: UnitTypeId;
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
