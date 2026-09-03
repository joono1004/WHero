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
  history: string;
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
  { id: "iron-ge", name: "철극", category: "weapon", grade: "C", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 5, terrainBonuses: [], history: "극은 창과 도끼의 기능을 함께 지닌 고대 중국의 대표적인 장병기입니다.", description: "창과 도끼를 겸한 고대 병기." },
  { id: "long-spear", name: "장창", category: "weapon", grade: "B", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 8, terrainBonuses: [], history: "긴 창은 동아시아 기병 운용에서 오랫동안 핵심 무기로 쓰였습니다.", description: "기병 돌격을 위한 긴 창." },
  { id: "repeating-crossbow", name: "연노", category: "weapon", grade: "A", allowedUnitTypes: ["archer"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "연속 발사를 위한 쇠뇌 장치는 중국 고대 병기 기록에 남아 있습니다.", description: "연속 사격을 위한 쇠뇌." },
  { id: "fuchai-spear", name: "부차모", category: "weapon", grade: "S", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 16, terrainBonuses: [], history: "오왕 부차의 이름이 새겨진 청동 창으로 알려진 유물입니다.", description: "오왕 부차의 이름이 새겨진 청동 창." },
  { id: "goujian-sword", name: "구천검", category: "weapon", grade: "SS", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 20, terrainBonuses: [], history: "월왕 구천의 이름이 새겨진 춘추 시대의 청동검입니다.", description: "월왕 구천의 이름이 새겨진 청동검." },

  { id: "lamellar-armor", name: "찰갑", category: "armor", grade: "D", allowedUnitTypes: [], effectKind: "defense", effectValue: 3, terrainBonuses: [], history: "작은 금속 조각을 끈으로 엮어 만든 동아시아의 전통 갑옷 양식입니다.", description: "작은 금속 조각을 엮은 전통 갑옷." },
  { id: "chain-mail", name: "쇄자갑", category: "armor", grade: "C", allowedUnitTypes: [], effectKind: "defense", effectValue: 5, terrainBonuses: [], history: "금속 고리를 연결해 만든 갑옷으로, 유라시아 전역에서 사용되었습니다.", description: "쇠고리를 촘촘히 이은 유라시아 갑옷." },
  { id: "dujeong-gap", name: "두정갑", category: "armor", grade: "B", allowedUnitTypes: [], effectKind: "defense", effectValue: 8, terrainBonuses: [], history: "천 위에 금속 못을 박아 보강한 갑옷으로 조선 시대에 널리 쓰였습니다.", description: "금속 못으로 보강한 조선의 갑옷." },
  { id: "mingguang-armor", name: "명광갑", category: "armor", grade: "A", allowedUnitTypes: [], effectKind: "defense", effectValue: 12, terrainBonuses: [], history: "가슴의 금속 원판 장식으로 알려진 중국 고대 갑옷 양식입니다.", description: "빛을 반사하는 금속 원판 흉갑." },
  { id: "gold-thread-jade-suit", name: "금루옥의", category: "armor", grade: "S", allowedUnitTypes: [], effectKind: "defense", effectValue: 16, terrainBonuses: [], history: "한나라 황족의 장례에 쓰인 옥 조각 의복으로, 금실로 옥편을 엮었습니다.", description: "금실로 옥편을 엮은 한나라 유물." },
  { id: "maximilian-armor", name: "막시밀리안갑", category: "armor", grade: "SS", allowedUnitTypes: [], effectKind: "defense", effectValue: 20, terrainBonuses: [], history: "16세기 유럽에서 유행한 세로 골 장식의 판금 갑옷 양식입니다.", description: "세로 골 장식이 빛나는 유럽 판금갑." },

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
