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
  { id: "han-ring-pommel-sword", name: "환수도", category: "weapon", grade: "D", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 3, terrainBonuses: [], history: "한나라 시기에 널리 쓰인 고리 손잡이 도검 양식입니다.", description: "한나라 군관의 환수도. 절제된 형태 속에 오래된 전장의 기개가 남아 있습니다." },
  { id: "iron-ge", name: "철극", category: "weapon", grade: "C", allowedUnitTypes: ["infantry"], effectKind: "attack", effectValue: 5, terrainBonuses: [], history: "극은 창과 도끼의 기능을 함께 지닌 고대 중국의 대표적인 장병기입니다.", description: "철로 단련한 극. 보병의 진형을 단단하게 지켜 온 무기입니다." },
  { id: "long-spear", name: "장창", category: "weapon", grade: "B", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 8, terrainBonuses: [], history: "긴 창은 동아시아 기병 운용에서 오랫동안 핵심 무기로 쓰였습니다.", description: "말 위에서 쓰도록 제작된 장창. 한 번의 돌격에 전열을 꿰뚫습니다." },
  { id: "repeating-crossbow", name: "연노", category: "weapon", grade: "A", allowedUnitTypes: ["archer"], effectKind: "attack", effectValue: 12, terrainBonuses: [], history: "연속 발사를 위한 쇠뇌 장치는 중국 고대 병기 기록에 남아 있습니다.", description: "연달아 화살을 쏘아내는 쇠뇌. 거리를 지키는 궁병에게 어울립니다." },
  { id: "fuchai-spear", name: "부차모", category: "weapon", grade: "S", allowedUnitTypes: ["cavalry"], effectKind: "attack", effectValue: 16, terrainBonuses: [], history: "오왕 부차의 이름이 새겨진 청동 창으로 알려진 유물입니다.", description: "왕의 이름을 품은 청동 창. 끝없는 전장을 향한 기세를 담았습니다." },
  { id: "goujian-sword", name: "구천검", category: "weapon", grade: "SS", allowedUnitTypes: ["infantry", "cavalry"], effectKind: "attack", effectValue: 20, terrainBonuses: [], history: "월왕 구천의 이름이 새겨진 춘추 시대의 청동검입니다.", description: "세월에도 빛을 잃지 않은 월왕의 검. 전설이 아니라 남아 있는 역사입니다." },

  { id: "lamellar-armor", name: "찰갑", category: "armor", grade: "D", allowedUnitTypes: [], effectKind: "defense", effectValue: 3, terrainBonuses: [], history: "작은 금속 조각을 끈으로 엮어 만든 동아시아의 전통 갑옷 양식입니다.", description: "수많은 조각을 엮어 만든 갑옷. 누군가의 생환을 위해 견뎌 왔습니다." },
  { id: "chain-mail", name: "쇄자갑", category: "armor", grade: "C", allowedUnitTypes: [], effectKind: "defense", effectValue: 5, terrainBonuses: [], history: "금속 고리를 연결해 만든 갑옷으로, 유라시아 전역에서 사용되었습니다.", description: "촘촘한 쇠고리가 충격을 흘려보내는 갑옷입니다." },
  { id: "dujeong-gap", name: "두정갑", category: "armor", grade: "B", allowedUnitTypes: [], effectKind: "defense", effectValue: 8, terrainBonuses: [], history: "천 위에 금속 못을 박아 보강한 갑옷으로 조선 시대에 널리 쓰였습니다.", description: "수많은 못으로 보강한 갑옷. 실용성과 위엄을 함께 지녔습니다." },
  { id: "mingguang-armor", name: "명광갑", category: "armor", grade: "A", allowedUnitTypes: [], effectKind: "defense", effectValue: 12, terrainBonuses: [], history: "가슴의 금속 원판 장식으로 알려진 중국 고대 갑옷 양식입니다.", description: "빛을 반사하는 흉갑이 전장의 시선을 끌어당깁니다." },
  { id: "gold-thread-jade-suit", name: "금루옥의", category: "armor", grade: "S", allowedUnitTypes: [], effectKind: "defense", effectValue: 16, terrainBonuses: [], history: "한나라 황족의 장례에 쓰인 옥 조각 의복으로, 금실로 옥편을 엮었습니다.", description: "수천 장의 옥편을 금실로 잇습니다. 한 왕실의 시간이 깃든 보호구입니다." },
  { id: "maximilian-armor", name: "막시밀리안갑", category: "armor", grade: "SS", allowedUnitTypes: [], effectKind: "defense", effectValue: 20, terrainBonuses: [], history: "16세기 유럽에서 유행한 세로 골 장식의 판금 갑옷 양식입니다.", description: "정교한 골 장식이 빛을 쪼개는 전신 갑옷. 명장의 생존을 위한 걸작입니다." },

  { id: "jeju-horse", name: "제주마", category: "mount", grade: "D", allowedUnitTypes: [], effectKind: "movement", effectValue: 1, terrainBonuses: [], history: "제주에서 오랫동안 길러진 한국의 토종 말입니다.", description: "작지만 강인한 제주마. 먼 길을 묵묵히 함께합니다." },
  { id: "wusun-horse", name: "오손마", category: "mount", grade: "C", allowedUnitTypes: [], effectKind: "movement", effectValue: 2, terrainBonuses: [], history: "한나라 기록에 등장하는 서역 오손 지역의 말입니다.", description: "서역의 바람을 품은 준마. 낯선 길을 두려워하지 않습니다." },
  { id: "ferghana-horse", name: "대완마", category: "mount", grade: "B", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: [], history: "한무제가 얻고자 했던 서역 대완의 명마로 기록됩니다.", description: "천 리를 달린다는 전설의 서역마. 한 왕조의 원정이 이 말을 찾아 떠났습니다." },
  { id: "mongolian-horse", name: "몽골마", category: "mount", grade: "A", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: ["plain"], history: "초원 유목 문화와 함께 발전한 몽골의 말입니다.", description: "끝없는 초원을 누빈 말. 평야에서 더욱 힘을 발휘합니다." },
  { id: "arabian-horse", name: "아라비아마", category: "mount", grade: "S", allowedUnitTypes: [], effectKind: "movement", effectValue: 3, terrainBonuses: ["plain", "desert"], history: "아라비아 반도에서 오랫동안 길러진 지구력 높은 말 품종입니다.", description: "뜨거운 모래바람을 이겨 낸 명마. 평야와 사막을 가리지 않습니다." },
  { id: "akhal-teke", name: "아할테케", category: "mount", grade: "SS", allowedUnitTypes: [], effectKind: "movement", effectValue: 4, terrainBonuses: ["plain", "desert", "hill"], history: "중앙아시아 투르크메니스탄에서 이어져 온 오래된 말 품종입니다.", description: "황금빛 털로 알려진 중앙아시아의 명마. 거친 길까지 제 발처럼 달립니다." },

  { id: "tiger-tally", name: "호부", category: "other", grade: "D", allowedUnitTypes: [], effectKind: "health", effectValue: 3, terrainBonuses: [], history: "호랑이 모양으로 만든 군사 동원 표식으로, 명령의 진위를 확인하는 데 쓰였습니다.", description: "둘로 나뉜 호랑이 부절. 맞물리는 순간, 군령의 무게가 전해집니다." },
  { id: "jade-belt-hook", name: "옥대구", category: "other", grade: "C", allowedUnitTypes: [], effectKind: "health", effectValue: 5, terrainBonuses: [], history: "한나라 귀족 문화에서 사용된 옥 장식의 허리띠 고리입니다.", description: "용머리를 새긴 옥 장식. 몸을 지키는 길한 기운을 품습니다." },
  { id: "jade-bi", name: "옥벽", category: "other", grade: "B", allowedUnitTypes: [], effectKind: "health", effectValue: 8, terrainBonuses: [], history: "가운데에 구멍을 낸 원형 옥으로, 고대 중국 의례와 권위를 상징했습니다.", description: "둥근 옥에 새겨진 시간의 흔적. 지닌 이의 기력을 굳게 붙듭니다." },
  { id: "taiping-jing", name: "태평경", category: "other", grade: "A", allowedUnitTypes: [], effectKind: "health", effectValue: 12, terrainBonuses: [], history: "후한 말 황건적과 연관되어 전해지는 도교 경전입니다.", description: "난세의 백성이 의지했던 경전. 마음을 다잡아 전장에서도 흐트러지지 않습니다." },
  { id: "shanghan-lun", name: "상한론", category: "other", grade: "S", allowedUnitTypes: [], effectKind: "health", effectValue: 16, terrainBonuses: [], history: "후한 말 장중경이 남긴 의학서로 전해집니다.", description: "병과 상처를 살피는 의학의 기록. 위기 속에서도 생명을 붙듭니다." },
  { id: "huangdi-neijing", name: "황제내경", category: "other", grade: "SS", allowedUnitTypes: [], effectKind: "health", effectValue: 20, terrainBonuses: [], history: "중국 전통 의학의 기초로 여겨지는 고대 의학서입니다.", description: "몸과 기운의 이치를 담은 오래된 기록. 영웅의 생명력을 끌어올립니다." },
];
