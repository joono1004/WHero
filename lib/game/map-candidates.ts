import type { MapTierId, MapTypeId, WorldGenerationParams } from "./world.ts";
import { MAP_TIER_ORDER } from "./world.ts";

export type MapCandidate = {
  worldIndex: number;
  generation: WorldGenerationParams;
};

const ALL_MAP_TYPES: MapTypeId[] = ["inland", "continent", "archipelago", "highlands", "riverlands"];
const CURRENT_TERRAIN_VERSION = "v1";

// The size step (mapTier) is automatic, not a player choice (this session's
// direction) - it climbs one tier per world, capping at the largest.
export function mapTierForWorldIndex(worldIndex: number): MapTierId {
  const index = Math.min(Math.max(worldIndex - 1, 0), MAP_TIER_ORDER.length - 1);
  return MAP_TIER_ORDER[index];
}

// Small deterministic hash local to candidate selection - a different
// concern from terrain generation (world-prototype.tsx has its own), it only
// needs to be reproducible from the save's seed, not to match Codex's hash.
function pick<T>(items: T[], seed: number, salt: number): T {
  let value = Math.imul(seed ^ salt, 2654435761) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  return items[value % items.length];
}

// The very first map a new game offers: exactly one candidate, no choice
// (this session's direction - choices only start appearing after a clear).
export function generateInitialMapCandidates(seed: number): MapCandidate[] {
  const mapType = pick(ALL_MAP_TYPES, seed, 1);
  return [
    {
      worldIndex: 1,
      generation: { seed: seed + 1, mapType, mapTier: mapTierForWorldIndex(1), terrainVersion: CURRENT_TERRAIN_VERSION },
    },
  ];
}

// After clearing a world, the lobby offers 2 candidates for the next one:
// distinct terrain types, both at the next (automatic) size tier.
export function generateNextMapCandidates(seed: number, clearedWorldIndex: number): MapCandidate[] {
  const nextWorldIndex = clearedWorldIndex + 1;
  const tier = mapTierForWorldIndex(nextWorldIndex);
  const salt = clearedWorldIndex * 97;
  const firstType = pick(ALL_MAP_TYPES, seed, salt + 1);
  const secondType = pick(
    ALL_MAP_TYPES.filter((type) => type !== firstType),
    seed,
    salt + 2,
  );
  return [firstType, secondType].map((mapType, index) => ({
    worldIndex: nextWorldIndex,
    generation: {
      seed: seed + nextWorldIndex * 1000 + index,
      mapType,
      mapTier: tier,
      terrainVersion: CURRENT_TERRAIN_VERSION,
    },
  }));
}
