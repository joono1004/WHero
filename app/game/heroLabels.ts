import type { HeroArchetype, HeroUnitTypeKind } from "../../lib/game/hero-definition.ts";

// Korean display labels for hero-definition enums. Shared across every
// screen that renders a hero (selection, main screen, later unit/city
// assignment screens) so the wording stays consistent in one place.
export const ARCHETYPE_LABEL: Record<HeroArchetype, string> = {
  general: "장군형",
  warrior: "무력형",
  strategist: "지략형",
  allrounder: "만능형",
};

// 병사 병과 이름 그대로 재사용(research.ts의 TroopResearchKind와 동일 값) -
// heroLabels.ts가 이미 각 enum 라벨을 이 파일에 따로 두는 패턴을 따름.
export const UNIT_TYPE_LABEL: Record<HeroUnitTypeKind, string> = {
  infantry: "보병",
  archer: "궁병",
  cavalry: "기병",
  siege: "공성",
};

// 특기 이름/효과 표시는 hero-trait.ts의 HERO_TRAIT_CATALOG을 직접 참조 -
// 등급이 없어져서 (DOMESTIC_LABEL/TRAIT_LABEL처럼) enum -> 한글 라벨만
// 따로 둘 필요가 없어짐(카탈로그 자체에 이미 name이 있음).
