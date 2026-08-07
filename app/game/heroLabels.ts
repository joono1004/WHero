import type { HeroArchetype, HeroUnitTypeKind } from "../../lib/game/hero-definition.ts";
import { UNIT_TYPE_CATALOG } from "../../lib/game/unit-production.ts";

// Korean display labels for hero-definition enums. Shared across every
// screen that renders a hero (selection, main screen, later unit/city
// assignment screens) so the wording stays consistent in one place.
export const ARCHETYPE_LABEL: Record<HeroArchetype, string> = {
  general: "장군형",
  warrior: "무력형",
  strategist: "지략형",
  allrounder: "만능형",
};

// 2026-08-07 (병과 진화 트리 방향): 병사 병과가 4종 고정에서
// unit-production.ts의 UnitTypeId 트리로 바뀌면서, 여기 따로 라벨 표를
// 두는 대신 그 카탈로그의 label을 그대로 모아 쓴다 - 루트/진화 노드 어느
// unitType이 와도(제갈량의 "strategist"처럼) 항상 값이 있다.
export const UNIT_TYPE_LABEL: Record<HeroUnitTypeKind, string> = Object.fromEntries(
  Object.values(UNIT_TYPE_CATALOG).map((node) => [node.id, node.label]),
);

// 특기 이름/효과 표시는 hero-trait.ts의 HERO_TRAIT_CATALOG을 직접 참조 -
// 등급이 없어져서 (DOMESTIC_LABEL/TRAIT_LABEL처럼) enum -> 한글 라벨만
// 따로 둘 필요가 없어짐(카탈로그 자체에 이미 name이 있음).
