import type { EconomyResearchKind } from "../../lib/game/research.ts";
import type { TroopLine } from "../../lib/game/unit-production.ts";

export const RESEARCH_LABEL: Record<EconomyResearchKind, string> = {
  gold: "금생산",
  food: "식량생산",
};

export const ECONOMY_RESEARCH_CATEGORIES: EconomyResearchKind[] = ["gold", "food"];

export const TROOP_LINE_LABEL: Record<TroopLine, string> = {
  infantry: "보병",
  archer: "궁병",
  cavalry: "기병",
  siege: "공성병기",
  strategist: "책사",
};
