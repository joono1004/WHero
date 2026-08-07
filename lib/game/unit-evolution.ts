import { gradeToScore } from "./grade.ts";
import type { Faction } from "./faction.ts";
import type { ItemId, UnitTypeId } from "./ids.ts";
import { canAffordResearch, researchUpgradeCost, MAX_RESEARCH_LEVEL } from "./research.ts";
import type { ResearchCost } from "./research.ts";
import {
  ROOT_UNIT_TYPE,
  UNIT_TYPE_CATALOG,
  isRootUnitType,
  researchLevelToUnitGrade,
} from "./unit-production.ts";
import type { TroopLine, UnitGrade } from "./unit-production.ts";

// 2026-08-07 진화 트리 방향: 병과 계열(TroopLine)마다 뿌리 노드 + 진화
// 노드들이 있고, 노드 하나하나가 독립적으로 D~A 등급을 쌓는다(부모 등급이
// 자식에게 이어지지 않음 - 사용자 명시 방향). 이 파일이 그 상태(레벨/
// 해금/출전 선택)를 다루는 순수 함수들의 모음 - research.ts가 예전에
// 병과 4종까지 다루던 자리를 대체.

export type TroopLevels = Record<UnitTypeId, number>;

export const ZERO_TROOP_LEVELS: TroopLevels = {};

export function troopLevel(levels: TroopLevels, unitType: UnitTypeId): number {
  return levels[unitType] ?? 0;
}

export function troopGrade(levels: TroopLevels, unitType: UnitTypeId): UnitGrade {
  return researchLevelToUnitGrade(troopLevel(levels, unitType));
}

export function troopUpgradeCost(levels: TroopLevels, unitType: UnitTypeId): ResearchCost | null {
  return researchUpgradeCost(troopLevel(levels, unitType));
}

// Raises one unlocked node's own level by one (same gold/researchResource
// cost curve as research.ts's economy upgrades - shared via
// researchUpgradeCost). Throws if the node is already at MAX_RESEARCH_LEVEL,
// unaffordable, or not actually unlocked yet - same UI-precheck convention
// as the rest of this codebase (see research.ts's upgradeResearch).
export function upgradeTroopLevel(faction: Faction, unitType: UnitTypeId): Faction {
  if (!isUnitTypeUnlockedFor(faction, unitType)) {
    throw new Error(`${unitType} is not unlocked for faction ${faction.id}`);
  }
  const cost = troopUpgradeCost(faction.troopLevels, unitType);
  if (!cost) {
    throw new Error(`${unitType} is already at the max level (${MAX_RESEARCH_LEVEL})`);
  }
  if (!canAffordResearch(faction.resources, cost)) {
    throw new Error(`cannot afford the next ${unitType} level`);
  }
  return {
    ...faction,
    troopLevels: { ...faction.troopLevels, [unitType]: troopLevel(faction.troopLevels, unitType) + 1 },
    resources: {
      ...faction.resources,
      gold: faction.resources.gold - cost.gold,
      researchResource: faction.resources.researchResource - cost.researchResource,
    },
  };
}

export function isUnitTypeUnlockedFor(faction: Faction, unitType: UnitTypeId): boolean {
  return isRootUnitType(unitType) || faction.unlockedUnitTypes.includes(unitType);
}

function gradeAtLeast(grade: UnitGrade, required: UnitGrade): boolean {
  return gradeToScore(grade) >= gradeToScore(required);
}

// Everything that has to be true before evolveUnitType can run - split out
// so the UI can show *why* a node is locked (disable the button) without
// duplicating the checks. Returns a reason string, or null when eligible.
export function unitEvolutionBlockedReason(faction: Faction, targetUnitType: UnitTypeId): string | null {
  const node = UNIT_TYPE_CATALOG[targetUnitType];
  if (!node) return `존재하지 않는 병과입니다 (${targetUnitType})`;
  if (!node.unlock || !node.parentId) return `${node?.label ?? targetUnitType}은(는) 진화 대상이 아닙니다`;
  if (isUnitTypeUnlockedFor(faction, targetUnitType)) return `이미 해금된 병과입니다`;
  const parentNode = UNIT_TYPE_CATALOG[node.parentId];
  if (!isUnitTypeUnlockedFor(faction, node.parentId)) return `${parentNode.label}이(가) 먼저 해금되어야 합니다`;

  const unlock = node.unlock;
  if (unlock.requiredParentGrade) {
    const parentGrade = troopGrade(faction.troopLevels, node.parentId);
    if (!gradeAtLeast(parentGrade, unlock.requiredParentGrade)) {
      return `${parentNode.label} 등급이 ${unlock.requiredParentGrade} 이상이어야 합니다 (현재 ${parentGrade})`;
    }
  }
  if (unlock.requiredUnitTypeIds) {
    const missing = unlock.requiredUnitTypeIds.filter((id) => !isUnitTypeUnlockedFor(faction, id));
    if (missing.length > 0) {
      const missingLabels = missing.map((id) => UNIT_TYPE_CATALOG[id]?.label ?? id).join(", ");
      return `${missingLabels}이(가) 먼저 해금되어야 합니다`;
    }
  }
  if (unlock.requiredItemId && !faction.itemInventory.includes(unlock.requiredItemId)) {
    return `진화 아이템이 필요합니다`;
  }
  if (faction.resources.gold < unlock.gold || faction.resources.researchResource < unlock.researchResource) {
    return `자원이 부족합니다`;
  }
  return null;
}

export function canEvolveUnitType(faction: Faction, targetUnitType: UnitTypeId): boolean {
  return unitEvolutionBlockedReason(faction, targetUnitType) === null;
}

// Unlocks a new evolution node: spends its gold/researchResource cost (and
// consumes one requiredItemId from faction.itemInventory, if the node needs
// one), adds it to unlockedUnitTypes at level 0 (a node's grade never
// inherits its parent's - this session's explicit direction), and makes it
// the line's active (out-producing) evolution, since picking one is what
// the player was doing by evolving into it. Throws with
// unitEvolutionBlockedReason's message if any precondition isn't met -
// callers (UI) should check canEvolveUnitType first.
export function evolveUnitType(faction: Faction, targetUnitType: UnitTypeId): Faction {
  const reason = unitEvolutionBlockedReason(faction, targetUnitType);
  if (reason) {
    throw new Error(`cannot evolve into ${targetUnitType}: ${reason}`);
  }
  const node = UNIT_TYPE_CATALOG[targetUnitType];
  const unlock = node.unlock as NonNullable<typeof node.unlock>;
  const itemInventory = unlock.requiredItemId
    ? removeFirst(faction.itemInventory, unlock.requiredItemId)
    : faction.itemInventory;
  return {
    ...faction,
    unlockedUnitTypes: [...faction.unlockedUnitTypes, targetUnitType],
    troopLevels: { ...faction.troopLevels, [targetUnitType]: 0 },
    itemInventory,
    activeEvolution: { ...faction.activeEvolution, [node.line]: targetUnitType },
    resources: {
      ...faction.resources,
      gold: faction.resources.gold - unlock.gold,
      researchResource: faction.resources.researchResource - unlock.researchResource,
    },
  };
}

function removeFirst(items: ItemId[], itemId: ItemId): ItemId[] {
  const index = items.indexOf(itemId);
  if (index === -1) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

// Which node of a line is currently selected to be produced ("출전 병과") -
// defaults to the line's root until the player evolves into (and thereby
// selects) something else.
export function activeEvolutionFor(faction: Faction, line: TroopLine): UnitTypeId {
  return faction.activeEvolution[line] ?? ROOT_UNIT_TYPE[line];
}

// Switches a line's active (out-producing) evolution to any node the
// faction has already unlocked - doesn't unlock anything itself. Throws if
// the target isn't unlocked yet or belongs to a different line.
export function setActiveEvolution(faction: Faction, line: TroopLine, unitType: UnitTypeId): Faction {
  const node = UNIT_TYPE_CATALOG[unitType];
  if (!node || node.line !== line) {
    throw new Error(`${unitType} does not belong to line ${line}`);
  }
  if (!isUnitTypeUnlockedFor(faction, unitType)) {
    throw new Error(`${unitType} is not unlocked for faction ${faction.id}`);
  }
  return { ...faction, activeEvolution: { ...faction.activeEvolution, [line]: unitType } };
}
