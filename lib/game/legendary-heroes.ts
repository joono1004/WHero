import type { HeroDefinition } from "./hero-definition.ts";

// Higher-grade heroes intended for later acquisition (events/gacha on
// clearing a world - GAME_VISION.md), not the starting roster. These were
// originally drafted as starting heroes, but read as too iconic/complete to
// hand a brand-new player - Guan Yu, Zhao Yun, and Zhuge Liang are the
// genre's top-tier legends, so they're kept here instead as what a player
// might eventually pull. See starting-heroes.ts for the actual starters.
//
// Task 11's 3 new domestic specialties (iron/recovery/defense) each got a
// loose thematic fit here rather than "없음" across the board, so the
// mechanics have at least one real hero to demo: 관우 -> defense (famously
// held Jingzhou for years), 조운 -> recovery (rescued Liu Shan at
// Changban - a protector/rescuer read), 제갈량 -> iron (improved military
// equipment like the 연노/목우유마 - a stretch, but the least arbitrary fit
// among the three). Starting heroes were left at "없음" for all three -
// see starting-heroes.ts.
//
// 2026-07-28 후속 개정 (지형특기 -> 병과특기, 사거리 -> 특기): 같은
// 이유로 legendary 셋에만 실제 병과 값을 줌 - 관우 -> infantry(총사령관
// 격으로 본대를 이끄는 이미지), 조운 -> cavalry(장판파 돌파 - 이전에도
// terrainSpecialties.plains S였던 자리를 그대로 승계, hero-assignment.ts의
// 기병 시너지 데모 영웅), 제갈량 -> archer(연노 개량 - 궁병 병기 발명과
// 가장 가까운 병과). traits(원사/돌격/요술)는 셋 다 "없음" - 이전
// rangeSpecialty도 셋 다 null(근접)이었으니 그대로 유지, 새 원거리
// 영웅을 임의로 만들지 않음. 스타팅 영웅도 전부 "없음" - starting-heroes.ts
// 참고.
//
// 2026-07-28 재개정 (영웅 부대 편승 기능 제외 -> unitTypeSpecialties를
// 고정 unitType 하나로 대체): 처음엔 위에서 골라둔 "주 병과"를 그대로
// unitType으로 승격했었으나, 이후 사용자가 노출된 6명 전원의 병과를 직접
// 지정하면서 관우는 infantry -> cavalry로 정정됨 (조운도 cavalry, 시작
// 영웅은 starting-heroes.ts 참고).
//
// 제갈량은 사용자가 "책사"(판타지 마법사 계열 - 직접 공격 없이 마법형
// 공격/회복)로 지정했었는데, 그동안 UNIT_TYPE_CATALOG에 대응 항목이 없어
// 임시로 archer를 대신 두고 있었다. 2026-08-07 병과 진화 트리 방향으로
// unit-production.ts에 "strategist"(책사) 루트 노드가 생기면서 이 스톱갭을
// 걷어내고 실제 unitType으로 승격함 - legendary-heroes.test.ts의 관련
// 주석/어서션도 함께 갱신.
//
// evolution (2026-08-07): 병사와 달리 영웅의 진화는 선택형이 아니라
// 영웅마다 정해진 상위 병과 하나 - 아직 데이터가 없어 대부분 null. 관우만
// 데모로 cavalry -> cavalry_heavy(중기병) 진화 조건을 채워둠(레벨5 +
// 진화 아이템, draft 수치 - 실제 밸런스 아님, hero.ts의 canEvolveHero/
// evolveHero가 조건 검사·전환을 담당).
export const LEGENDARY_HEROES: HeroDefinition[] = [
  {
    id: "guan-yu",
    name: "관우",
    description: "형주를 지키며 수군을 운용한 촉한의 명장. 통솔력과 무력을 겸비한 장군형 영웅.",
    attributes: { leadership: "S", force: "A", intelligence: "B", charisma: "A", vitality: "S" },
    unitType: "cavalry",
    domesticSpecialties: { troops: "A", food: "B", gold: "없음", iron: "없음", recovery: "없음", defense: "B" },
    // 특기 매핑은 위 domesticSpecialties와 느슨한 대응(2026-08-xx 방향):
    // troops A -> talent(인재), food B -> farming(농사). recovery/iron엔
    // 아직 대응하는 특기가 카탈로그에 없어서(hero-trait.ts) 뺌 - 나중에
    // 추가되면 다시 볼 것. defense B는 애초엔 여기 ironwall(철벽) 특기로
    // 매핑했었으나, 철벽이 스킬(hero-skill.ts, 전투 중 사용하는 액티브)로
    // 재분류되면서 skills로 옮김 - "형주를 오래 지킨" 이미지에 잘 맞음.
    traits: ["talent", "farming"],
    skills: ["ironwall"],
    evolution: { targetUnitType: "cavalry_heavy", requiredLevel: 5, requiredItemId: "evolution-item-cavalry-heavy" },
  },
  {
    id: "zhao-yun",
    name: "조운",
    description: "장판파에서 단신으로 적진을 돌파한 촉한의 맹장. 압도적인 무력을 지닌 무력형 영웅.",
    attributes: { leadership: "B", force: "S", intelligence: "B", charisma: "A", vitality: "A" },
    unitType: "cavalry",
    domesticSpecialties: { troops: "B", food: "C", gold: "없음", iron: "없음", recovery: "B", defense: "없음" },
    traits: ["talent", "farming"],
    skills: [],
    evolution: null,
  },
  {
    id: "zhuge-liang",
    name: "제갈량",
    // 사용자가 이 영웅의 실제 병과를 "책사"(근접 공격 없음, 마법형 공격/
    // 회복 - 판타지 마법사 계열)로 지정했고, 이제 unit-production.ts에
    // strategist 노드가 생겨서 실제 값으로 승격함(2026-08-07).
    description: "오장원과 기산에서 지략을 펼친 촉한의 승상. 내정과 계략에 능한 지략형 영웅.",
    attributes: { leadership: "B", force: "C", intelligence: "SS", charisma: "A", vitality: "B" },
    unitType: "strategist",
    domesticSpecialties: { food: "S", gold: "A", troops: "B", iron: "B", recovery: "없음", defense: "없음" },
    traits: ["farming", "trade", "talent"],
    skills: [],
    evolution: null,
  },
];
