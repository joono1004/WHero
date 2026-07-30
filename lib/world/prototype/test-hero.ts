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
      map: "/art/heroes/guan-yu-chibi-map-v2.webp",
      outline: "/art/heroes/guan-yu-chibi-outline-v5.webp",
      portrait: "/art/heroes/guan-yu-chibi-face-v2.webp",
      badge: "/art/heroes/guan-yu-chibi-badge-v4.webp",
      badgeOutline: "/art/heroes/guan-yu-chibi-badge-outline-v4.webp",
    },
    // Mounted figures need a broader footprint; do not shrink the rider just
    // to force the horse into the same visual box as a foot hero.
    fullScale: { width: 3.05, height: 3.45 },
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
      map: "/art/heroes/huang-zhong-chibi-map-v2.webp",
      outline: "/art/heroes/huang-zhong-chibi-outline-v5.webp",
      portrait: "/art/heroes/huang-zhong-chibi-face-v2.webp",
      badge: "/art/heroes/huang-zhong-chibi-badge-v4.webp",
      badgeOutline: "/art/heroes/huang-zhong-chibi-badge-outline-v4.webp",
    },
    fullScale: { width: 2.25, height: 2.48 },
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
      map: "/art/heroes/wei-yan-chibi-map-v2.webp",
      outline: "/art/heroes/wei-yan-chibi-outline-v5.webp",
      portrait: "/art/heroes/wei-yan-chibi-face-v2.webp",
      badge: "/art/heroes/wei-yan-chibi-badge-v4.webp",
      badgeOutline: "/art/heroes/wei-yan-chibi-badge-outline-v4.webp",
    },
    fullScale: { width: 2.28, height: 2.54 },
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
      map: "/art/heroes/zhao-yun-chibi-map-v2.webp",
      outline: "/art/heroes/zhao-yun-chibi-outline-v5.webp",
      portrait: "/art/heroes/zhao-yun-chibi-face-v2.webp",
      badge: "/art/heroes/zhao-yun-chibi-badge-v4.webp",
      badgeOutline: "/art/heroes/zhao-yun-chibi-badge-outline-v4.webp",
    },
    fullScale: { width: 2.85, height: 3.12 },
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
