import type { ResourceSiteKind } from "./resource-site-visual";

export type ResourceBuildTerrain = "plain" | "forest" | "hill" | "blocked";

export type ResourceBonusContext = {
  kind: ResourceSiteKind;
  terrain: ResourceBuildTerrain;
  adjacentFreshWater: boolean;
  adjacentResourceKinds: ResourceSiteKind[];
};

export function resourceCapacityForOutpostLevel(level: number) {
  return Math.max(1, Math.min(4, Math.floor(level)));
}

export function canBuildResourceOnTerrain(terrain: ResourceBuildTerrain) {
  return terrain === "plain" || terrain === "forest" || terrain === "hill";
}

export function resourceProductionMultiplier({
  kind,
  terrain,
  adjacentFreshWater,
  adjacentResourceKinds,
}: ResourceBonusContext) {
  if (kind === "farm" && adjacentFreshWater) return 2;
  if (kind === "logging" && terrain === "forest") return 2;
  if (kind === "mine" && terrain === "hill") return 2;
  if (kind === "market" && adjacentResourceKinds.includes("market")) return 2;
  return 1;
}
