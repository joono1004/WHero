export const UNIT_DISPLAY_MODES = [
  { id: "sd", name: "SD 대표 1명" },
  { id: "realistic", name: "반실사 대표 1명" },
  { id: "emblem", name: "병과 문양" },
] as const;

export const UNIT_VISUAL_SAMPLES = [
  {
    id: "infantry",
    name: "보병",
    accent: "#a9473f",
    assignedHeroId: "wei-yan",
    visuals: {
      sd: {
        image: "/art/units/infantry-sd-single-v1.webp",
        scale: { width: 1.42, height: 1.52 },
      },
      realistic: {
        image: "/art/units/infantry-real-single-v1.webp",
        scale: { width: 1.22, height: 1.64 },
      },
      emblem: {
        image: "/art/units/infantry-emblem-v1.svg",
        scale: { width: 1.12, height: 1.12 },
      },
    },
  },
  {
    id: "archer",
    name: "궁병",
    accent: "#b48a32",
    assignedHeroId: "huang-zhong",
    visuals: {
      sd: {
        image: "/art/units/archer-sd-single-v1.webp",
        scale: { width: 1.44, height: 1.44 },
      },
      realistic: {
        image: "/art/units/archer-real-single-v1.webp",
        scale: { width: 1.25, height: 1.62 },
      },
      emblem: {
        image: "/art/units/archer-emblem-v1.svg",
        scale: { width: 1.12, height: 1.12 },
      },
    },
  },
  {
    id: "cavalry",
    name: "기병",
    accent: "#3f6f9c",
    assignedHeroId: "guan-yu",
    visuals: {
      sd: {
        image: "/art/units/cavalry-sd-single-v1.webp",
        scale: { width: 1.75, height: 1.62 },
      },
      realistic: {
        image: "/art/units/cavalry-real-single-v1.webp",
        scale: { width: 1.65, height: 1.56 },
      },
      emblem: {
        image: "/art/units/cavalry-emblem-v1.svg",
        scale: { width: 1.12, height: 1.12 },
      },
    },
  },
] as const;

export type UnitDisplayMode = (typeof UNIT_DISPLAY_MODES)[number]["id"];
export type UnitVisualSample = (typeof UNIT_VISUAL_SAMPLES)[number];
