export const HEX_SIZE = 0.92;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

export type MapTierId =
  | "mini"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "colossal"
  | "world";

export type MapTier = {
  id: MapTierId;
  label: string;
  factions: number;
  columns: number;
  rows: number;
};

export type MapTypeId =
  | "inland"
  | "continent"
  | "archipelago"
  | "highlands"
  | "riverlands";

export type WorldMapType = {
  id: MapTypeId;
  label: string;
  description: string;
};

export const MAP_TYPES: WorldMapType[] = [
  { id: "inland", label: "내륙", description: "바다 없이 넓게 이어지는 육지" },
  { id: "continent", label: "대륙", description: "하나의 큰 대륙과 외곽 바다" },
  { id: "archipelago", label: "군도", description: "육지 70%·바다 30%의 여러 섬" },
  { id: "highlands", label: "고산", description: "바다 없는 산맥·고원·협곡" },
  { id: "riverlands", label: "대하천", description: "바다 5% 미만의 강·호수·습지" },
];

export const MAP_TIERS: MapTier[] = [
  { id: "mini", label: "미니", factions: 2, columns: 30, rows: 26 },
  { id: "small", label: "소형", factions: 3, columns: 36, rows: 33 },
  { id: "medium", label: "중형", factions: 4, columns: 42, rows: 38 },
  { id: "large", label: "대형", factions: 5, columns: 47, rows: 42 },
  { id: "huge", label: "거대", factions: 6, columns: 52, rows: 46 },
  { id: "colossal", label: "초거대", factions: 7, columns: 57, rows: 49 },
  { id: "world", label: "월드", factions: 8, columns: 62, rows: 52 },
];

export type MapRuntimeConfig = {
  tier: MapTier;
  mapType: WorldMapType;
  columns: number;
  rows: number;
  width: number;
  depth: number;
};

export function createMapRuntimeConfig(
  tierId: MapTierId,
  mapTypeId: MapTypeId,
): MapRuntimeConfig {
  const tier = MAP_TIERS.find((candidate) => candidate.id === tierId) ?? MAP_TIERS[2];
  const mapType =
    MAP_TYPES.find((candidate) => candidate.id === mapTypeId) ?? MAP_TYPES[1];

  return {
    tier,
    mapType,
    columns: tier.columns,
    rows: tier.rows,
    width: tier.columns * HEX_WIDTH,
    depth: HEX_SIZE * 2 + (tier.rows - 1) * 1.5 * HEX_SIZE,
  };
}

export const SEA_LEVEL = -0.32;
export const DEEP_WATER_EDGE = -0.18;
export const SHORELINE = -0.02;
export const BEACH_INNER_EDGE = 0.16;
export const COAST_TRANSITION_EDGE = 0.3;
export const BEACH_CORE_EDGE =
  SHORELINE + (BEACH_INNER_EDGE - SHORELINE) * 0.15;
export const BEACH_VISUAL_EDGE =
  SHORELINE + (BEACH_INNER_EDGE - SHORELINE) * 0.38;
export const BEACH_FADE_START =
  SHORELINE + (BEACH_CORE_EDGE - SHORELINE) * 0.72;
export const BEACH_LOGICAL_EDGE = BEACH_VISUAL_EDGE + 0.018;

export const PLAIN_VISUAL_RULE = {
  textureRepeatX: 8,
  textureRepeatZ: 6,
  baseColor: "#ffffff",
  roughness: 0.96,
} as const;
