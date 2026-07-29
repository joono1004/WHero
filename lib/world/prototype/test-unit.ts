/**
 * Temporary, map-facing unit visuals. Gameplay unit definitions remain in
 * lib/game so the renderer can be swapped without changing game rules.
 */
export const UNIT_VISUAL_SAMPLES = [
  {
    id: "infantry",
    name: "보병",
    accent: "#a9473f",
    assignedHeroId: "wei-yan",
    visual: {
      image: "/art/units/infantry-classic-single-v2.webp",
      scale: { width: 1.02, height: 1.52 },
    },
    emblem: {
      image: "/art/units/infantry-emblem-v1.svg",
      scale: { width: 1.02, height: 1.02 },
    },
  },
  {
    id: "archer",
    name: "궁병",
    accent: "#b48a32",
    assignedHeroId: "huang-zhong",
    visual: {
      image: "/art/units/archer-classic-single-v2.webp",
      scale: { width: 1.02, height: 1.46 },
    },
    emblem: {
      image: "/art/units/archer-emblem-v1.svg",
      scale: { width: 1.02, height: 1.02 },
    },
  },
  {
    id: "cavalry",
    name: "기병",
    accent: "#3f6f9c",
    assignedHeroId: "guan-yu",
    visual: {
      image: "/art/units/cavalry-classic-single-v2.webp",
      scale: { width: 1.32, height: 1.4 },
    },
    emblem: {
      image: "/art/units/cavalry-emblem-v1.svg",
      scale: { width: 1.02, height: 1.02 },
    },
  },
] as const;

export type UnitVisualSample = (typeof UNIT_VISUAL_SAMPLES)[number];
