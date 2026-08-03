export type FactionVisualId =
  | "player"
  | "enemy-1"
  | "enemy-2"
  | "enemy-3"
  | "enemy-4"
  | "enemy-5"
  | "enemy-6"
  | "enemy-7";

export type FactionVisual = {
  id: FactionVisualId;
  label: string;
  color: string;
  darkColor: string;
};

/**
 * Map-readable faction colours. Hero grade colours remain separate, so these
 * colours belong to ground rings, flags, camp canvas and compact LOD tokens.
 */
export const FACTION_VISUALS: readonly FactionVisual[] = [
  { id: "player", label: "사용자", color: "#2f86df", darkColor: "#174f91" },
  { id: "enemy-1", label: "적 1", color: "#d9544d", darkColor: "#8f292b" },
  { id: "enemy-2", label: "적 2", color: "#e58a32", darkColor: "#96501f" },
  { id: "enemy-3", label: "적 3", color: "#9868d4", darkColor: "#59388d" },
  { id: "enemy-4", label: "적 4", color: "#21a79e", darkColor: "#11665f" },
  { id: "enemy-5", label: "적 5", color: "#d85c9e", darkColor: "#8f315f" },
  { id: "enemy-6", label: "적 6", color: "#d3b53f", darkColor: "#856d1d" },
  { id: "enemy-7", label: "적 7", color: "#697386", darkColor: "#353c49" },
] as const;

export function factionVisual(id: FactionVisualId) {
  return FACTION_VISUALS.find((faction) => faction.id === id) ?? FACTION_VISUALS[0];
}
