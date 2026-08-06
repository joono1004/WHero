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
// 병과를 직접 지정함 - 장포 기병, 위연 보병, 서서 궁병 (관우/조운/제갈량은
// legendary-heroes.ts 참고). 전투에 실제로 쓰이는 건 이동력/사거리뿐
// (레벨 초안, 조정 가능).
//
// traits (2026-08-xx, 내정+구 TraitKind 통합): domesticSpecialties의
// troops/gold/food 등급을 새 특기 카탈로그(hero-trait.ts)로 느슨하게 옮김 -
// troops -> talent(인재), gold -> trade(상인), food -> farming(농사).
// domesticSpecialties 필드 자체는 hero-assignment.ts가 아직 그대로 쓰고
// 있어서 지우지 않음(legendary-heroes.ts 상단 주석 참고).
//
// skills (2026-08-xx, hero-skill.ts): 첫 번째 슬롯 영웅만 charge(돌격)를
// 줬음 - 기병 돌진과 자연스럽게 맞아떨어지는 조합. 위연/서서는 뚜렷한
// 근거가 없어서 억지로 채우지 않고 빈 배열로 둠.
//
// 2026-08-06: 사용자 요청으로 첫 번째 슬롯을 감녕(보병) -> 장포(기병)로
// 교체함. 능력치/domesticSpecialties/traits/skills 수치는 감녕 시절
// 그대로 유지 - turn.test.ts/hero-roster.test.ts가 STARTING_HEROES[0]의
// 이 값들(특히 domesticSpecialties.troops="B")에 기대는 어서션을 갖고
// 있어서, id/name/description/unitType만 바꾸고 밸런스 수치는 건드리지
// 않음(불필요한 리밸런스 방지). 장포는 장비의 아들로, 기병+돌격 조합이
// 감녕의 보병+돌격보다 오히려 더 자연스러운 플레이버 fit.
export const STARTING_HEROES: HeroDefinition[] = [
  {
    id: "zhang-bao",
    name: "장포",
    description: "장비의 아들로 태어나 아버지를 닮아 용맹함이 남달랐던 촉한의 맹장. 관우의 원수를 갚기 위한 오나라 원정에 앞장선 무력형 영웅.",
    attributes: { leadership: "B", force: "S", intelligence: "C", charisma: "C", vitality: "A" },
    unitType: "cavalry",
    domesticSpecialties: { troops: "B", gold: "없음", food: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["talent"],
    skills: ["charge"],
  },
  {
    id: "wei-yan",
    name: "위연",
    description: "뛰어난 지휘 재능을 지녔으나 반골이라는 평가로 끝내 신뢰받지 못한 비운의 장수. 자오곡 기습안을 건의한 장군형 영웅.",
    attributes: { leadership: "S", force: "B", intelligence: "C", charisma: "C", vitality: "B" },
    unitType: "infantry",
    domesticSpecialties: { troops: "A", gold: "없음", food: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["talent"],
    skills: [],
  },
  {
    id: "xu-shu",
    name: "서서",
    description: "유비를 섬기다 어머니가 인질로 잡혀 조조 진영으로 떠난 비운의 책사. 재능을 다 펼치지 못했다는 지략형 영웅.",
    attributes: { leadership: "C", force: "C", intelligence: "S", charisma: "B", vitality: "C" },
    unitType: "archer",
    domesticSpecialties: { gold: "B", food: "B", troops: "없음", iron: "없음", recovery: "없음", defense: "없음" },
    traits: ["trade", "farming"],
    skills: [],
  },
];
