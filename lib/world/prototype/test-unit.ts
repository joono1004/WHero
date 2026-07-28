export const UNIT_VISUAL_SAMPLES = [
  {
    id: "infantry",
    name: "보병",
    accent: "#a9473f",
    image: "/art/units/infantry-map-v1.webp",
    fullScale: { width: 2.15, height: 2.72 },
    assignedHeroId: "wei-yan",
  },
  {
    id: "archer",
    name: "궁병",
    accent: "#b48a32",
    image: "/art/units/archer-map-v1.webp",
    fullScale: { width: 2.12, height: 2.72 },
    assignedHeroId: "huang-zhong",
  },
  {
    id: "cavalry",
    name: "기병",
    accent: "#3f6f9c",
    image: "/art/units/cavalry-map-v1.webp",
    fullScale: { width: 2.65, height: 2.65 },
    assignedHeroId: "guan-yu",
  },
] as const;

export type UnitVisualSample = (typeof UNIT_VISUAL_SAMPLES)[number];
