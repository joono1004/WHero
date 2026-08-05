import type { ResearchCategory } from "../../lib/game/research.ts";

export const RESEARCH_LABEL: Record<ResearchCategory, string> = {
  gold: "금생산",
  food: "식량생산",
  infantry: "보병",
  archer: "궁병",
  cavalry: "기병",
  siege: "공성병기",
};

export const ECONOMY_RESEARCH_CATEGORIES: ResearchCategory[] = ["gold", "food"];
export const TROOP_RESEARCH_CATEGORIES: ResearchCategory[] = ["infantry", "archer", "cavalry", "siege"];
