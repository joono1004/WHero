import type { HeroDefinition } from "./hero-definition.ts";

// The 3 heroes offered to a new player at hero-selection (task 5). Each
// targets a B-grade overall average with one clearly dominant (S) archetype
// stat - deliberately less complete than LEGENDARY_HEROES, so there's room
// to grow both in level and in later hero acquisition. Picked from Romance
// of the Three Kingdoms since GAME_VISION.md calls for "역사 영웅"; these
// three are well-known but read as unproven/promising rather than
// already-legendary, which fits a starting roster better than top-tier
// picks like Guan Yu or Zhuge Liang (see legendary-heroes.ts for those).
// unitType (2026-07-28, "영웅이 부대에 편승" 기능 제외 결정에 따른
// unitTypeSpecialties -> 고정 unitType 개정): 사용자가 노출된 6명 전원의
// 병과를 직접 지정함 - 감녕 보병, 위연 보병, 서서 궁병 (관우/조운/제갈량은
// legendary-heroes.ts 참고). 전투에 실제로 쓰이는 건 이동력/사거리뿐
// (레벨 초안, 조정 가능).
//
// traits (2026-08-xx, 내정+구 TraitKind 통합): domesticSpecialties의
// troops/gold/food 등급을 새 특기 카탈로그(hero-trait.ts)로 느슨하게 옮김 -
// troops -> talent(인재), gold -> trade(상인), food -> farming(농사).
// domesticSpecialties 필드 자체는 hero-assignment.ts가 아직 그대로 쓰고
// 있어서 지우지 않음(legendary-heroes.ts 상단 주석 참고).
export const STARTING_HEROES: HeroDefinition[] = [
  {
    id: "gan-ning",
    name: "감녕",
    description: "해적 출신에서 오나라의 충성스러운 맹장으로 성장한 인물. 종을 매단 야습으로 유명한 무력형 영웅.",
    attributes: { leadership: "B", force: "S", intelligence: "C", charisma: "C", vitality: "A" },
    unitType: "infantry",
    domesticSpecialties: { troops: "B", gold: "없음", food: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["talent"],
  },
  {
    id: "wei-yan",
    name: "위연",
    description: "뛰어난 지휘 재능을 지녔으나 반골이라는 평가로 끝내 신뢰받지 못한 비운의 장수. 자오곡 기습안을 건의한 장군형 영웅.",
    attributes: { leadership: "S", force: "B", intelligence: "C", charisma: "C", vitality: "B" },
    unitType: "infantry",
    domesticSpecialties: { troops: "A", gold: "없음", food: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["talent"],
  },
  {
    id: "xu-shu",
    name: "서서",
    description: "유비를 섬기다 어머니가 인질로 잡혀 조조 진영으로 떠난 비운의 책사. 재능을 다 펼치지 못했다는 지략형 영웅.",
    attributes: { leadership: "C", force: "C", intelligence: "S", charisma: "B", vitality: "C" },
    unitType: "archer",
    domesticSpecialties: { gold: "B", food: "B", troops: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["trade", "farming"],
  },
];
