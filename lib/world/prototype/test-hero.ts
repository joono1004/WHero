/**
 * Temporary visual bridge for the world-map prototype.
 *
 * Canonical hero rules remain on Claude's game-system branch. These records
 * only describe the four map-readable class silhouettes used by the LOD test.
 */
export const HERO_LOD_SAMPLES = [
  {
    id: "guan-yu",
    name: "관우",
    unitClass: "기병",
    title: "청룡도를 든 기마 지휘관",
    accent: "#43824c",
    grade: "전설",
    aura: "#f2c45d",
    image: {
      map: "/art/heroes/guan-yu-classic-map-v3.webp",
      portrait: "/art/heroes/guan-yu-classic-portrait-v3.webp",
      badge: "/art/heroes/guan-yu-classic-badge-v3.webp",
    },
    fullScale: { width: 2.45, height: 3.45 },
  },
  {
    id: "huang-zhong",
    name: "황충",
    unitClass: "궁병",
    title: "활과 화살통이 보이는 노장",
    accent: "#bc8e2d",
    grade: "영웅",
    aura: "#b9dc69",
    image: {
      map: "/art/heroes/huang-zhong-classic-map-v3.webp",
      portrait: "/art/heroes/huang-zhong-classic-portrait-v3.webp",
      badge: "/art/heroes/huang-zhong-classic-badge-v3.webp",
    },
    fullScale: { width: 1.72, height: 2.4 },
  },
  {
    id: "wei-yan",
    name: "위연",
    unitClass: "보병",
    title: "대도와 적갈색 갑주의 야전 장군",
    accent: "#ae3a31",
    grade: "희귀",
    aura: "#8ec7ff",
    image: {
      map: "/art/heroes/wei-yan-classic-map-v3.webp",
      portrait: "/art/heroes/wei-yan-classic-portrait-v3.webp",
      badge: "/art/heroes/wei-yan-classic-badge-v3.webp",
    },
    fullScale: { width: 1.78, height: 2.65 },
  },
  {
    id: "zhao-yun",
    name: "조운",
    unitClass: "창병",
    title: "긴 창과 청백색 갑주의 돌격 장수",
    accent: "#457eb3",
    grade: "영웅",
    aura: "#d798ff",
    image: {
      map: "/art/heroes/zhao-yun-classic-map-v3.webp",
      portrait: "/art/heroes/zhao-yun-classic-portrait-v3.webp",
      badge: "/art/heroes/zhao-yun-classic-badge-v3.webp",
    },
    fullScale: { width: 1.78, height: 2.54 },
  },
] as const;

export const WEI_YAN_TEST_HERO = {
  ...HERO_LOD_SAMPLES[2],
  description:
    "뛰어난 지휘 재능을 지녔으나 끝내 온전히 신뢰받지 못한 촉한의 장수입니다.",
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

export type HeroLodSample = (typeof HERO_LOD_SAMPLES)[number];
