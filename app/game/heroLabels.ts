import type {
  DomesticSpecialtyKind,
  HeroArchetype,
  HeroUnitTypeKind,
  TraitKind,
} from "../../lib/game/hero-definition.ts";

// Korean display labels for hero-definition enums. Shared across every
// screen that renders a hero (selection, main screen, later unit/city
// assignment screens) so the wording stays consistent in one place.
export const ARCHETYPE_LABEL: Record<HeroArchetype, string> = {
  general: "장군형",
  warrior: "무력형",
  strategist: "지략형",
  allrounder: "만능형",
};

export const DOMESTIC_LABEL: Record<DomesticSpecialtyKind, string> = {
  troops: "훈련",
  gold: "상업",
  food: "농업",
  iron: "채굴",
  recovery: "회복",
  defense: "방어",
};

// 병사 병과 이름 그대로 재사용(research.ts의 TroopResearchKind와 동일 값) -
// heroLabels.ts가 이미 각 enum 라벨을 이 파일에 따로 두는 패턴을 따름.
export const UNIT_TYPE_LABEL: Record<HeroUnitTypeKind, string> = {
  infantry: "보병",
  archer: "궁병",
  cavalry: "기병",
  siege: "공성",
};

export const TRAIT_LABEL: Record<TraitKind, string> = {
  charge: "돌격",
  magic: "요술",
};
