import type { EconomyResearchKind } from "../../lib/game/research.ts";
import { MAX_TROOP_TIER } from "../../lib/game/unit-production.ts";
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
  strategist: "책사",
};

// "기본 - 1단계 - 2단계 - ... - 5단계" 표 헤더 (2026-08-08, 좌측 계열/
// 우측 진화 단계 표 방향) - MAX_TROOP_TIER+1개(0=기본 포함).
export const TROOP_TIER_LABEL: string[] = ["기본", ...Array.from({ length: MAX_TROOP_TIER }, (_, i) => `${i + 1}단계`)];
