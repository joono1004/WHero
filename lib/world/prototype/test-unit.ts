export const UNIT_VISUAL_SAMPLES = [
  {
    id: "infantry",
    name: "보병",
    accent: "#a9473f",
    image: "/art/units/infantry-sd-ground-v3.webp",
    fullScale: { width: 2.08, height: 1.78 },
    assignedHeroId: "wei-yan",
  },
  {
    id: "archer",
    name: "궁병",
    accent: "#b48a32",
    image: "/art/units/archer-sd-ground-v3.webp",
    fullScale: { width: 2.08, height: 1.71 },
    assignedHeroId: "huang-zhong",
  },
  {
    id: "cavalry",
    name: "기병",
    accent: "#3f6f9c",
    image: "/art/units/cavalry-sd-ground-v3.webp",
    fullScale: { width: 2.35, height: 2.08 },
    assignedHeroId: "guan-yu",
  },
] as const;

export type UnitVisualSample = (typeof UNIT_VISUAL_SAMPLES)[number];
