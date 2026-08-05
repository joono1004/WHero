import type { FactionResources } from "./faction.ts";

// 내정 연구: 금생산 / 식량생산.
export type EconomyResearchKind = "gold" | "food";
// 병과 연구: 보병 / 궁병 / 기병 / 공성병기.
export type TroopResearchKind = "infantry" | "archer" | "cavalry" | "siege";
export type ResearchCategory = EconomyResearchKind | TroopResearchKind;

export type ResearchLevels = Record<ResearchCategory, number>;

export const ZERO_RESEARCH_LEVELS: ResearchLevels = {
  gold: 0,
  food: 0,
  infantry: 0,
  archer: 0,
  cavalry: 0,
  siege: 0,
};

// Draft cap and cost curve - not confirmed with the user, easy to retune.
// What each level actually improves (production %, unit stats, ...) isn't
// decided either; this only tracks and gates the level number itself.
export const MAX_RESEARCH_LEVEL = 10;

export type ResearchCost = { gold: number; researchResource: number };

export function researchUpgradeCost(currentLevel: number): ResearchCost | null {
  if (currentLevel >= MAX_RESEARCH_LEVEL) return null;
  const nextLevel = currentLevel + 1;
  return { gold: 100 * nextLevel, researchResource: 50 * nextLevel };
}

export function canAffordResearch(resources: FactionResources, cost: ResearchCost): boolean {
  return resources.gold >= cost.gold && resources.researchResource >= cost.researchResource;
}

export type ResearchUpgradeResult = { levels: ResearchLevels; resources: FactionResources };

// Spends gold + researchResource (task 13's cleared-region yield) to raise
// one category by one level. Throws instead of silently no-op-ing when the
// category is maxed or unaffordable - callers (UI) should check
// researchUpgradeCost/canAffordResearch first and disable the button rather
// than relying on this throw for normal flow.
export function upgradeResearch(
  levels: ResearchLevels,
  resources: FactionResources,
  category: ResearchCategory,
): ResearchUpgradeResult {
  const cost = researchUpgradeCost(levels[category]);
  if (!cost) {
    throw new Error(`${category} research is already at the max level (${MAX_RESEARCH_LEVEL})`);
  }
  if (!canAffordResearch(resources, cost)) {
    throw new Error(`cannot afford the next ${category} research level`);
  }
  return {
    levels: { ...levels, [category]: levels[category] + 1 },
    resources: {
      ...resources,
      gold: resources.gold - cost.gold,
      researchResource: resources.researchResource - cost.researchResource,
    },
  };
}
