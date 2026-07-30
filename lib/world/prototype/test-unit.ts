/**
 * Temporary, map-facing unit visuals. Gameplay unit definitions remain in
 * lib/game so the renderer can be swapped without changing game rules.
 */
export const UNIT_VISUAL_SAMPLES = [
  {
    id: "infantry",
    name: "보병",
    accent: "#a9473f",
    visual: {
      image: "/art/units/infantry-chibi-map-v3.webp",
      scale: { width: 1.4, height: 1.75 },
    },
    emblem: {
      image: "/art/units/infantry-emblem-v3.webp",
      scale: { width: 1.4, height: 1.4 },
    },
  },
  {
    id: "archer",
    name: "궁병",
    accent: "#b48a32",
    visual: {
      image: "/art/units/archer-chibi-map-v3.webp",
      scale: { width: 1.4, height: 1.75 },
    },
    emblem: {
      image: "/art/units/archer-emblem-v3.webp",
      scale: { width: 1.4, height: 1.4 },
    },
  },
  {
    id: "cavalry",
    name: "기병",
    accent: "#3f6f9c",
    visual: {
      image: "/art/units/cavalry-chibi-map-v3.webp",
      scale: { width: 1.46, height: 1.825 },
    },
    emblem: {
      image: "/art/units/cavalry-emblem-v3.webp",
      scale: { width: 1.4, height: 1.4 },
    },
  },
] as const;

export type UnitVisualSample = (typeof UNIT_VISUAL_SAMPLES)[number];
