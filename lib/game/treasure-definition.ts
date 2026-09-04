import type { CoreGrade } from "./grade.ts";

export type TreasureCategory = "weapon" | "armor" | "mount" | "other";
export type TreasureEffectKind = "attack" | "defense" | "movement" | "health";
export type TreasureUnitType = "infantry" | "cavalry" | "archer" | "strategist";

export type TreasureDefinition = {
  id: string;
  name: string;
  category: TreasureCategory;
  grade: CoreGrade;
  /** 무기는 병과 제한을 가지며, 나머지 세 종류는 빈 배열로 전체 영웅이 장착한다. */
  allowedUnitTypes: TreasureUnitType[];
  effectKind: TreasureEffectKind;
  effectValue: number;
  terrainBonuses: string[];
  /** 이전 저장 데이터 호환용 보조 필드. 게임에서는 description 하나만 표시한다. */
  history?: string;
  description: string;
};

export const TREASURE_CATEGORY_LABEL: Record<TreasureCategory, string> = {
  weapon: "무기",
  armor: "방어구",
  mount: "탈것",
  other: "기타",
};

export const TREASURE_EFFECT_LABEL: Record<TreasureEffectKind, string> = {
  attack: "공격",
  defense: "방어",
  movement: "이동",
  health: "체력",
};

export const TREASURE_UNIT_TYPE_LABEL: Record<TreasureUnitType, string> = {
  infantry: "보병",
  cavalry: "기병",
  archer: "궁병",
  strategist: "책사",
};

export const TREASURE_TERRAIN_LABEL: Record<string, string> = {
  plain: "평야",
  forest: "숲",
  mountain: "산악",
  desert: "사막",
  hill: "언덕",
};

export function treasureEffectText(treasure: TreasureDefinition): string {
  const basic = `${TREASURE_EFFECT_LABEL[treasure.effectKind]} +${treasure.effectValue}`;
  if (treasure.category !== "mount" || treasure.terrainBonuses.length === 0) return basic;
  return `${basic} · ${treasure.terrainBonuses.map((terrain) => TREASURE_TERRAIN_LABEL[terrain] ?? terrain).join("·")} 이동 향상`;
}

export function canUnitTypeEquipTreasure(treasure: TreasureDefinition, unitType: TreasureUnitType): boolean {
  return treasure.allowedUnitTypes.length === 0 || treasure.allowedUnitTypes.includes(unitType);
}

// 보물은 상점 장비가 아니라, 실제 역사 기록·유물·문헌에서 이름을 가져온 단품이다.
// 수치와 장착 효과는 이후 전투 밸런스 단계에서 조정할 수 있도록 여기에서 한 번에 관리한다.
export const BUNDLED_TREASURE_DEFINITIONS: TreasureDefinition[] = [
  { id: "han-ring-pommel-sword", name: "환수도", category: "weapon", grade: "D", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 3, terrainBonuses: [], history: "한나라 시기에 널리 쓰인 고리 손잡이 도검 양식입니다.", description: "고리 손잡이가 남은 한나라 도검." },
  { id: "seven-star-sword", name: "칠성보도", category: "weapon", grade: "C", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 5, terrainBonuses: [], history: "일곱 별을 새긴 보검은 동아시아 설화와 고전에서 길상과 권위를 상징합니다.", description: "일곱 별을 새긴 길상의 보검." },
  { id: "male-female-swords", name: "자웅일대검", category: "weapon", grade: "B", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 8, terrainBonuses: [], history: "삼국지에서 유비가 지닌 한 쌍의 보검으로 널리 알려져 있습니다.", description: "유비가 지닌 것으로 전하는 한 쌍의 검." },
  { id: "goding-sword", name: "고정도", category: "weapon", grade: "B", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 8, terrainBonuses: [], history: "고정도는 삼국지의 여러 인물이 쓴 명검으로 전해지는 이름입니다.", description: "삼국지 명장들의 손에 전해진 명검." },
  { id: "green-dragon-blade", name: "청룡언월도", category: "weapon", grade: "A", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "관우의 무기로 널리 알려진 언월도입니다.", description: "관우의 이름과 함께 전해지는 언월도." },
  { id: "serpent-spear", name: "장팔사모", category: "weapon", grade: "A", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "장비의 무기로 널리 알려진 긴 사모입니다.", description: "장비의 호방함을 닮은 긴 사모." },
  { id: "dragon-spear", name: "용담창", category: "weapon", grade: "A", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "조운의 무기로 널리 알려진 창입니다.", description: "조운의 용맹을 상징하는 은빛 창." },
  { id: "zhuge-crossbow", name: "제갈연노", category: "weapon", grade: "A", allowedUnitTypes: ["archer"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "제갈량의 이름으로 전해지는 연발 쇠뇌입니다.", description: "연속 사격을 위한 제갈가의 연노." },
  { id: "fuchai-halberd", name: "부차모", category: "weapon", grade: "S", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 16, terrainBonuses: [], history: "오왕 부차와 연관되어 전해지는 고대 병기입니다.", description: "오왕의 기세를 담은 푸른 장병기." },
  { id: "blue-steel-sword", name: "청강검", category: "weapon", grade: "S", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 16, terrainBonuses: [], history: "청강검은 푸른 강철의 빛을 지닌 명검을 이르는 이름으로 전해집니다.", description: "푸른 강철의 물결이 흐르는 명검." },
  { id: "fangtian-halberd", name: "방천화극", category: "weapon", grade: "S", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 16, terrainBonuses: [], history: "여포의 무기로 널리 알려진 화려한 극입니다.", description: "여포의 이름과 함께 전해지는 화극." },
  { id: "goujian-sword", name: "구천검", category: "weapon", grade: "SS", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 20, terrainBonuses: [], history: "월왕 구천의 이름이 새겨진 춘추 시대의 청동검입니다.", description: "월왕 구천의 이름이 새겨진 청동검." },

  { id: "fish-scale-armor", name: "어린갑", category: "armor", grade: "D", allowedUnitTypes: [], effectKind: "defense", effectValue: 3, terrainBonuses: [], history: "물고기 비늘을 겹친 듯한 갑옷 양식으로, 고대부터 널리 쓰였습니다.", description: "물고기 비늘처럼 겹친 고대의 비늘 갑옷." },
  { id: "dujeong-gap", name: "두정갑", category: "armor", grade: "C", allowedUnitTypes: [], effectKind: "defense", effectValue: 5, terrainBonuses: [], history: "조선 시대 장수가 입던 갑옷으로, 천 위에 금속 못을 박아 보강했습니다.", description: "조선의 장수가 입던 금속 못 장식 갑옷." },
  { id: "chain-mail", name: "쇄자갑", category: "armor", grade: "B", allowedUnitTypes: [], effectKind: "defense", effectValue: 8, terrainBonuses: [], history: "수천 개의 쇠고리를 연결해 만든 갑옷으로, 유라시아 전역에서 사용되었습니다.", description: "수천 개의 쇠고리를 엮어 만든 전장의 갑옷." },
  { id: "mingguang-armor", name: "명광갑", category: "armor", grade: "A", allowedUnitTypes: [], effectKind: "defense", effectValue: 12, terrainBonuses: [], history: "가슴의 금속 원판이 빛을 반사해 이름 붙은 당나라 시대의 갑옷입니다.", description: "햇빛을 반사하는 금속 원판을 단 당나라의 갑옷." },
  { id: "gold-thread-jade-suit", name: "금루옥의", category: "armor", grade: "S", allowedUnitTypes: [], effectKind: "defense", effectValue: 16, terrainBonuses: [], history: "한나라 황족의 장례에 쓰인 옥 조각 의복으로, 금실로 옥편을 엮었습니다.", description: "황족을 위해 금실로 옥편을 엮어 만든 한나라 유물." },
  { id: "maximilian-armor", name: "막시밀리안갑", category: "armor", grade: "SS", allowedUnitTypes: [], effectKind: "defense", effectValue: 20, terrainBonuses: [], history: "16세기 유럽에서 유행한 세로 골 장식의 판금 갑옷 양식입니다.", description: "세로 골이 빛나는 유럽 군주의 판금 갑옷." },

  { id: "jeju-horse", name: "제주마", category: "mount", grade: "D", allowedUnitTypes: [], effectKind: "movement", effectValue: 1, terrainBonuses: [], history: "제주에서 오랫동안 길러진 한국의 토종 말입니다.", description: "제주의 바람을 견딘 토종 말." },
  { id: "wusun-horse", name: "오손마", category: "mount", grade: "C", allowedUnitTypes: [], effectKind: "movement", effectValue: 2, terrainBonuses: [], history: "한나라 기록에 등장하는 서역 오손 지역의 말입니다.", description: "서역 오손에서 온 준마." },
  { id: "ferghana-horse", name: "대완마", category: "mount", grade: "B", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: [], history: "한무제가 얻고자 했던 서역 대완의 명마로 기록됩니다.", description: "한무제가 찾던 전설의 서역마." },
  { id: "mongolian-horse", name: "몽골마", category: "mount", grade: "A", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: ["plain"], history: "초원 유목 문화와 함께 발전한 몽골의 말입니다.", description: "초원을 누빈 몽골의 전통 군마." },
  { id: "arabian-horse", name: "아라비아마", category: "mount", grade: "S", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: ["plain", "desert"], history: "아라비아 반도에서 오랫동안 길러진 지구력 높은 말 품종입니다.", description: "모래바람을 견딘 아라비아 명마." },
  { id: "akhal-teke", name: "아할테케", category: "mount", grade: "SS", allowedUnitTypes: [], effectKind: "movement", effectValue: 4, terrainBonuses: ["plain", "desert", "hill"], history: "중앙아시아 투르크메니스탄에서 이어져 온 오래된 말 품종입니다.", description: "황금빛 털로 알려진 중앙아시아 명마." },

  { id: "tiger-tally", name: "호부", category: "other", grade: "D", allowedUnitTypes: [], effectKind: "health", effectValue: 3, terrainBonuses: [], history: "호랑이 모양으로 만든 군사 동원 표식으로, 명령의 진위를 확인하는 데 쓰였습니다.", description: "군령의 진위를 가르는 호랑이 부절." },
  { id: "jade-belt-hook", name: "옥대구", category: "other", grade: "C", allowedUnitTypes: [], effectKind: "health", effectValue: 5, terrainBonuses: [], history: "한나라 귀족 문화에서 사용된 옥 장식의 허리띠 고리입니다.", description: "용머리를 새긴 한나라 옥 장식." },
  { id: "jade-bi", name: "옥벽", category: "other", grade: "B", allowedUnitTypes: [], effectKind: "health", effectValue: 8, terrainBonuses: [], history: "가운데에 구멍을 낸 원형 옥으로, 고대 중국 의례와 권위를 상징했습니다.", description: "의례와 권위를 상징한 원형 옥." },
  { id: "taiping-jing", name: "태평경", category: "other", grade: "A", allowedUnitTypes: [], effectKind: "health", effectValue: 12, terrainBonuses: [], history: "후한 말 황건적과 연관되어 전해지는 도교 경전입니다.", description: "후한 말에 전해진 도교 경전." },
  { id: "shanghan-lun", name: "상한론", category: "other", grade: "S", allowedUnitTypes: [], effectKind: "health", effectValue: 16, terrainBonuses: [], history: "후한 말 장중경이 남긴 의학서로 전해집니다.", description: "장중경이 남긴 의학의 기록." },
  { id: "huangdi-neijing", name: "황제내경", category: "other", grade: "SS", allowedUnitTypes: [], effectKind: "health", effectValue: 20, terrainBonuses: [], history: "중국 전통 의학의 기초로 여겨지는 고대 의학서입니다.", description: "전통 의학의 뿌리가 된 고대 경전." },
];
