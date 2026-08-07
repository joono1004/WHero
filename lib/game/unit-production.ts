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

// 병과 계열 (2026-08-07, 진화 트리 방향): 기존 4개 병과 연구 카테고리에
// 책사(마법사 계열 - 근접 없음, 화공/수공 등 원거리 마법 공격)를 5번째
// 계열로 추가. 각 계열은 트리의 뿌리(root) 노드 하나에서 시작해 연구로
// 진화 노드가 갈라져 나간다 - 아래 UNIT_TYPE_CATALOG 참고.
export type TroopLine = "infantry" | "archer" | "cavalry" | "siege" | "strategist";

export const TROOP_LINES: TroopLine[] = ["infantry", "archer", "cavalry", "siege", "strategist"];

// 책사 계열의 공격 속성 - "physical"은 일반 병과(물리 공격), 나머지는 책사
// 진화가 갈라지는 방향(화공/수공/회복 - 사용자 2026-08-07 방향: 기본
// 책사는 화공, 진화하면 수공을 쓸 수 있게 되는 등). 실제 전투 효과(화상/
// 침수/치유 로직)는 아직 미정 - 지금은 표시/데이터 용도의 draft 필드.
export type AttackElement = "physical" | "fire" | "water" | "heal";

// 진화 노드 하나를 해금하는 조건 (2026-08-07 방향):
// - requiredParentGrade: 부모 노드의 등급(researchLevelToUnitGrade)이 이
//   이상이어야 함 (없으면 등급 조건 없음 - 지금 카탈로그에서는 루트만
//   해당, 루트는 unlock 자체가 null이라 안 쓰임)
// - gold/researchResource: 해금에 드는 자원 비용
// - requiredItemId: 진화 전용 아이템이 필요한 노드만 존재 (아이템을 얻는
//   경로는 별도 작업 범위 - 지금은 faction.itemInventory에 이미 있다고
//   가정하고 소비만 함)
// - requiredUnitTypeIds: 다른 계열의 특정 노드가 먼저 해금되어 있어야
//   하는 교차 계열 선행조건 (사용자: "다른 계열의 병과가 진화되어야
//   열리는 병과도 있게 할꺼야")
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
  parentId: UnitTypeId | null;
  baseMovement: number;
  range: number | null;
  meleeCapable: boolean;
  attackElement: AttackElement;
  // null for a line's root node (always available, no unlock to perform) -
  // every evolution node has one.
  unlock: UnitTypeUnlock | null;
};

// The troop evolution tree (2026-08-07 direction, replacing the old flat
// 4-entry catalog - see docs/SYSTEM_LAYER.md's "terrain-specialization
// research" deferred-extension note, this is that extension). Each line
// starts at a root (always unlocked) and branches into 3+ tiers of evolved
// variants; branches can fan out (multiple children per parent) and a node
// can require another *line's* node to already be unlocked
// (requiredUnitTypeIds). The exact tree shape/names below are a draft
// example demonstrating every mechanic (branching, cross-line prereq,
// item-gated node, 3+ tiers, strategist's fire/water split) - the user has
// explicitly not finalized the real tree content yet, so treat node ids/
// labels/costs here as easy to redesign, not as locked balance.
//
// A node's own grade (D~A, via researchLevelToUnitGrade) is tracked
// independently per node (unit-evolution.ts's TroopLevels) - evolving to a
// child does NOT carry over the parent's level; the child starts back at D
// and must be leveled up again (this session's explicit direction).
export const UNIT_TYPE_CATALOG: Record<UnitTypeId, UnitTypeNode> = {
  infantry: {
    id: "infantry",
    label: "보병",
    line: "infantry",
    parentId: null,
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: null,
  },
  infantry_mountain: {
    id: "infantry_mountain",
    label: "산악병",
    line: "infantry",
    parentId: "infantry",
    baseMovement: 3,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: { requiredParentGrade: "C", gold: 300, researchResource: 100 },
  },
  infantry_shield: {
    id: "infantry_shield",
    label: "방패병",
    line: "infantry",
    parentId: "infantry",
    baseMovement: 2,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: { requiredParentGrade: "C", gold: 300, researchResource: 100 },
  },
  infantry_ranger: {
    id: "infantry_ranger",
    label: "정찰병",
    line: "infantry",
    parentId: "infantry_mountain",
    baseMovement: 4,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: { requiredParentGrade: "B", gold: 600, researchResource: 250, requiredItemId: "evolution-item-ranger" },
  },
  archer: {
    id: "archer",
    label: "궁병",
    line: "archer",
    parentId: null,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "physical",
    unlock: null,
  },
  archer_longbow: {
    id: "archer_longbow",
    label: "장궁병",
    line: "archer",
    parentId: "archer",
    baseMovement: 2,
    range: 3,
    meleeCapable: false,
    attackElement: "physical",
    unlock: { requiredParentGrade: "C", gold: 300, researchResource: 100 },
  },
  cavalry: {
    id: "cavalry",
    label: "기병",
    line: "cavalry",
    parentId: null,
    baseMovement: 4,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: null,
  },
  cavalry_heavy: {
    id: "cavalry_heavy",
    label: "중기병",
    line: "cavalry",
    parentId: "cavalry",
    baseMovement: 4,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: { requiredParentGrade: "C", gold: 350, researchResource: 120 },
  },
  // 교차 계열 선행조건 예시: 보병 계열이 산악병까지 진화되어 있어야 기병
  // 계열의 용기병이 풀림 (사용자: "다른 계열의 병과가 진화되어야 열리는
  // 병과도 있게 할꺼야").
  cavalry_dragoon: {
    id: "cavalry_dragoon",
    label: "용기병",
    line: "cavalry",
    parentId: "cavalry_heavy",
    baseMovement: 5,
    range: null,
    meleeCapable: true,
    attackElement: "physical",
    unlock: {
      requiredParentGrade: "B",
      gold: 700,
      researchResource: 300,
      requiredUnitTypeIds: ["infantry_mountain"],
    },
  },
  siege: {
    id: "siege",
    label: "공성병기",
    line: "siege",
    parentId: null,
    baseMovement: 1,
    range: 3,
    meleeCapable: false,
    attackElement: "physical",
    unlock: null,
  },
  siege_catapult: {
    id: "siege_catapult",
    label: "투석기",
    line: "siege",
    parentId: "siege",
    baseMovement: 1,
    range: 4,
    meleeCapable: false,
    attackElement: "physical",
    unlock: { requiredParentGrade: "C", gold: 400, researchResource: 150 },
  },
  // 책사 (2026-08-07): 판타지 마법사 계열 - 근접 불가, 원거리 공격만.
  // 기본형은 화공, 진화하면 수공을 쓸 수 있음(사용자 방향 - 화공/수공의
  // 실제 전투 효과는 나중에 별도로 설계 예정, 지금은 attackElement만
  // 구분해둠). legendary-heroes.ts의 제갈량이 원래 이 노드를 기다리던
  // 스톱갭(archer)이었음.
  strategist: {
    id: "strategist",
    label: "책사",
    line: "strategist",
    parentId: null,
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "fire",
    unlock: null,
  },
  strategist_water: {
    id: "strategist_water",
    label: "책사(수공)",
    line: "strategist",
    parentId: "strategist",
    baseMovement: 2,
    range: 2,
    meleeCapable: false,
    attackElement: "water",
    unlock: { requiredParentGrade: "C", gold: 350, researchResource: 150 },
  },
};

export const ROOT_UNIT_TYPE: Record<TroopLine, UnitTypeId> = {
  infantry: "infantry",
  archer: "archer",
  cavalry: "cavalry",
  siege: "siege",
  strategist: "strategist",
};

export function isRootUnitType(unitType: UnitTypeId): boolean {
  return UNIT_TYPE_CATALOG[unitType]?.parentId === null;
}

export function childrenOfUnitType(parentId: UnitTypeId): UnitTypeNode[] {
  return Object.values(UNIT_TYPE_CATALOG).filter((node) => node.parentId === parentId);
}

export function unitTypesInLine(line: TroopLine): UnitTypeNode[] {
  return Object.values(UNIT_TYPE_CATALOG).filter((node) => node.line === line);
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
