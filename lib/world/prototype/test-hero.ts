/**
 * Temporary bridge for the world-map prototype.
 *
 * The canonical hero model remains on Claude's game-system branch. Keep this
 * file intentionally small so it can be replaced by `lib/game` after that
 * branch is merged.
 */
export const WEI_YAN_TEST_HERO = {
  id: "wei-yan",
  name: "위연",
  title: "기습을 꿈꾸는 야전 장군",
  description:
    "뛰어난 지휘 재능을 지녔으나 끝내 온전히 신뢰받지 못한 촉한의 장수입니다.",
  image: {
    map: "/art/heroes/wei-yan-map-v1.webp",
    portrait: "/art/heroes/wei-yan-portrait-v1.webp",
  },
  attributes: {
    leadership: "S",
    force: "B",
    intelligence: "C",
    charisma: "C",
    vitality: "B",
  },
  domesticSpecialty: {
    name: "훈련",
    grade: "A",
  },
  prototypeExploration: {
    movement: 4,
    sight: 2,
  },
} as const;

export type TestHeroDefinition = typeof WEI_YAN_TEST_HERO;
