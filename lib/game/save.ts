import type { City } from "./city.ts";
import type { Faction } from "./faction.ts";
import { isHeroDeployed } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import type { MapCandidate } from "./map-candidates.ts";
import type { Unit } from "./unit.ts";
import type { ClearedWorldRecord, WorldState } from "./world.ts";

export const SAVE_SCHEMA_VERSION = 1;

// A SaveGame is the whole of a player's progress: everything that would
// otherwise be lost by closing the tab. `world` is null while the player is
// in the lobby choosing among `nextMapCandidates` (this session's
// lobby/candidate-map correction - entering a live map is a deliberate
// player action, not an automatic result of hero selection or of clearing
// the previous one). Exactly one of {world non-null} / {nextMapCandidates
// non-empty} holds at a time - see findSaveGameIssues. When a world is
// conquered, `world` goes back to null, the just-finished world is archived
// into `clearedWorlds` (so a hero can be appointed governor there, see
// hero.ts's "governor" assignment mode), `nextMapCandidates` is refreshed,
// and `heroes`/`factions` (level, experience, items, resources, research)
// are kept as-is. That's what gives inheritance its effect without a
// separate persistent-profile type. The hero roster itself is expected to
// grow over time (events/gacha on clearing a world), not stay fixed at the
// starting 3 - most heroes will end up idle or parked once the roster
// outgrows a single world's heroDeploymentLimit.
export type SaveGame = {
  schemaVersion: number;
  factionName: string;
  heroes: HeroState[];
  world: WorldState | null;
  nextMapCandidates: MapCandidate[];
  clearedWorlds: Record<string, ClearedWorldRecord>;
  factions: Record<string, Faction>;
  units: Record<string, Unit>;
  cities: Record<string, City>;
  createdAt: string;
  updatedAt: string;
};

// Structural referential-integrity check: every id one entity points at
// actually exists elsewhere in the save, the hero<->unit/city/region links
// agree from both sides (stored redundantly for O(1) lookups from either
// side - see docs/SYSTEM_LAYER.md - so they can drift apart if a caller
// updates only one side), and the per-world deployment limit is respected.
// Returns an empty array when the save is consistent. Intended for task 4
// (local save/load) to reject or flag corrupted/hand-edited localStorage data
// instead of crashing later at an unrelated call site.
export function findSaveGameIssues(save: SaveGame): string[] {
  const issues: string[] = [];

  // Exactly one of {an active world} / {candidates to choose from} should
  // hold - the player is either playing a map or picking one in the lobby,
  // never both and never neither.
  if (save.world === null && save.nextMapCandidates.length === 0) {
    issues.push("neither world nor nextMapCandidates is set - the player has no active map and nothing to choose");
  }
  if (save.world !== null && save.nextMapCandidates.length > 0) {
    issues.push("both world and nextMapCandidates are set - candidates should be cleared once a world is entered");
  }

  if (save.world) {
    if (!save.world.factionIds.includes(save.world.playerFactionId)) {
      issues.push(`world.playerFactionId (${save.world.playerFactionId}) is not listed in world.factionIds`);
    }

    if (save.clearedWorlds[save.world.id]) {
      issues.push(`world.id (${save.world.id}) is both the active world and listed in clearedWorlds`);
    }

    for (const factionId of save.world.factionIds) {
      const faction = save.factions[factionId];
      if (!faction) {
        issues.push(`world references faction ${factionId}, which is missing from factions`);
        continue;
      }
      for (const unitId of faction.unitIds) {
        if (!save.units[unitId]) {
          issues.push(`faction ${factionId} references unit ${unitId}, which is missing from units`);
        }
      }
      for (const cityId of faction.cityIds) {
        if (!save.cities[cityId]) {
          issues.push(`faction ${factionId} references city ${cityId}, which is missing from cities`);
        }
      }
      // capitalCityId can outlive faction.cityIds (world-progress.ts's
      // captureEnemyCity leaves it pointing at the now-enemy-owned capital
      // so elimination can be recomputed from it) - it just has to still
      // exist somewhere in save.cities.
      if (faction.capitalCityId && !save.cities[faction.capitalCityId]) {
        issues.push(`faction ${factionId} references capital city ${faction.capitalCityId}, which is missing from cities`);
      }
    }
  }

  const heroesById = new Map(save.heroes.map((hero) => [hero.heroId, hero]));

  const deployedCount = save.heroes.filter(isHeroDeployed).length;
  if (save.world && deployedCount > save.world.heroDeploymentLimit) {
    issues.push(
      `${deployedCount} heroes are deployed in the active world, over the limit of ${save.world.heroDeploymentLimit}`,
    );
  }

  for (const hero of save.heroes) {
    if (hero.assignment.mode === "city") {
      const city = save.cities[hero.assignment.cityId];
      if (!city) {
        issues.push(`hero ${hero.heroId} is stationed in city ${hero.assignment.cityId}, which is missing`);
      } else if (city.heroId !== hero.heroId) {
        issues.push(
          `hero ${hero.heroId} is stationed in city ${city.id}, but city.heroId is ${city.heroId ?? "null"}`,
        );
      }
    }
    if (hero.assignment.mode === "governor") {
      const region = save.clearedWorlds[hero.assignment.worldId];
      if (!region) {
        issues.push(`hero ${hero.heroId} governs world ${hero.assignment.worldId}, which is not a cleared world`);
      } else if (region.governorHeroId !== hero.heroId) {
        issues.push(
          `hero ${hero.heroId} governs cleared world ${region.id}, but region.governorHeroId is ${region.governorHeroId ?? "null"}`,
        );
      }
    }
    if (hero.assignment.mode === "enlisted") {
      if (!save.world || save.world.id !== hero.assignment.worldId) {
        issues.push(`hero ${hero.heroId} is enlisted for world ${hero.assignment.worldId}, which isn't the active world`);
      } else if (!save.world.enlistedHeroIds.includes(hero.heroId)) {
        issues.push(`hero ${hero.heroId} is enlisted for the active world but missing from its enlistedHeroIds`);
      }
    }
  }

  for (const city of Object.values(save.cities)) {
    if (!city.heroId) continue;
    const hero = heroesById.get(city.heroId);
    if (!hero) {
      issues.push(`city ${city.id} references hero ${city.heroId}, which is not in heroes`);
    } else if (!(hero.assignment.mode === "city" && hero.assignment.cityId === city.id)) {
      issues.push(`city ${city.id} claims hero ${city.heroId}, but that hero's assignment says otherwise`);
    }
  }
  for (const region of Object.values(save.clearedWorlds)) {
    if (!region.governorHeroId) continue;
    const hero = heroesById.get(region.governorHeroId);
    if (!hero) {
      issues.push(`cleared world ${region.id} references governor ${region.governorHeroId}, which is not in heroes`);
    } else if (!(hero.assignment.mode === "governor" && hero.assignment.worldId === region.id)) {
      issues.push(
        `cleared world ${region.id} claims governor ${region.governorHeroId}, but that hero's assignment says otherwise`,
      );
    }
  }

  return issues;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkHeroShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (typeof value.heroId !== "string") errors.push(`${path}.heroId must be a string`);
  if (typeof value.level !== "number") errors.push(`${path}.level must be a number`);
  if (typeof value.experience !== "number") errors.push(`${path}.experience must be a number`);
  if (typeof value.health !== "number") errors.push(`${path}.health must be a number`);
  if (!Array.isArray(value.items)) errors.push(`${path}.items must be an array`);
  if (typeof value.deploymentPriority !== "boolean") {
    errors.push(`${path}.deploymentPriority must be a boolean`);
  }
  if (value.evolvedUnitType !== null && typeof value.evolvedUnitType !== "string") {
    errors.push(`${path}.evolvedUnitType must be a string or null`);
  }
  const progress = value.attributeProgress;
  if (!isPlainObject(progress)) {
    errors.push(`${path}.attributeProgress must be an object`);
  } else {
    for (const key of ["leadership", "force", "intelligence", "charisma", "vitality"]) {
      if (typeof progress[key] !== "number") {
        errors.push(`${path}.attributeProgress.${key} must be a number`);
      }
    }
  }
  const assignment = value.assignment;
  if (!isPlainObject(assignment) || typeof assignment.mode !== "string") {
    errors.push(`${path}.assignment must be an object with a mode`);
  } else if (!["solo", "city", "governor", "recovering", "enlisted"].includes(assignment.mode)) {
    errors.push(`${path}.assignment.mode is not a recognized mode: ${assignment.mode}`);
  }
  return errors;
}

function checkWorldShape(value: unknown, path: string): string[] {
  if (value === null) return [];
  if (!isPlainObject(value)) return [`${path} is not an object or null`];
  const errors: string[] = [];
  if (typeof value.id !== "string") errors.push(`${path}.id must be a string`);
  if (typeof value.worldIndex !== "number") errors.push(`${path}.worldIndex must be a number`);
  if (!isPlainObject(value.generation)) errors.push(`${path}.generation must be an object`);
  if (!Array.isArray(value.factionIds)) errors.push(`${path}.factionIds must be an array`);
  if (typeof value.playerFactionId !== "string") errors.push(`${path}.playerFactionId must be a string`);
  if (!Array.isArray(value.exploredHexes)) errors.push(`${path}.exploredHexes must be an array`);
  if (typeof value.turn !== "number") errors.push(`${path}.turn must be a number`);
  if (typeof value.conquered !== "boolean") errors.push(`${path}.conquered must be a boolean`);
  if (typeof value.heroDeploymentLimit !== "number") errors.push(`${path}.heroDeploymentLimit must be a number`);
  if (!Array.isArray(value.enlistedHeroIds)) errors.push(`${path}.enlistedHeroIds must be an array`);
  if (!isPlainObject(value.troopLevelsSnapshot)) errors.push(`${path}.troopLevelsSnapshot must be an object`);
  return errors;
}

function checkMapCandidateShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (typeof value.worldIndex !== "number") errors.push(`${path}.worldIndex must be a number`);
  if (!isPlainObject(value.generation)) errors.push(`${path}.generation must be an object`);
  return errors;
}

function checkRecordOf(
  value: unknown,
  path: string,
  checkEntry: (entry: unknown, entryPath: string) => string[],
): string[] {
  if (!isPlainObject(value)) return [`${path} must be an object`];
  const errors: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    errors.push(...checkEntry(entry, `${path}.${key}`));
  }
  return errors;
}

function checkClearedWorldShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (typeof value.id !== "string") errors.push(`${path}.id must be a string`);
  if (value.governorHeroId !== null && typeof value.governorHeroId !== "string") {
    errors.push(`${path}.governorHeroId must be a string or null`);
  }
  return errors;
}

function checkFactionShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (!Array.isArray(value.unitIds)) errors.push(`${path}.unitIds must be an array`);
  if (!Array.isArray(value.cityIds)) errors.push(`${path}.cityIds must be an array`);
  const resources = value.resources;
  if (!isPlainObject(resources)) {
    errors.push(`${path}.resources must be an object`);
  } else {
    for (const key of ["gold", "food", "iron", "researchResource"]) {
      if (typeof resources[key] !== "number") errors.push(`${path}.resources.${key} must be a number`);
    }
  }
  const research = value.research;
  if (!isPlainObject(research)) {
    errors.push(`${path}.research must be an object`);
  } else {
    for (const key of ["gold", "food"]) {
      if (typeof research[key] !== "number") errors.push(`${path}.research.${key} must be a number`);
    }
  }
  if (!isPlainObject(value.troopLevels)) errors.push(`${path}.troopLevels must be an object`);
  if (!Array.isArray(value.unlockedUnitTypes)) errors.push(`${path}.unlockedUnitTypes must be an array`);
  if (!isPlainObject(value.activeEvolution)) errors.push(`${path}.activeEvolution must be an object`);
  if (!Array.isArray(value.itemInventory)) errors.push(`${path}.itemInventory must be an array`);
  if (value.capitalCityId !== null && typeof value.capitalCityId !== "string") {
    errors.push(`${path}.capitalCityId must be a string or null`);
  }
  if (value.eliminationReason !== null && value.eliminationReason !== "captured" && value.eliminationReason !== "surrendered") {
    errors.push(`${path}.eliminationReason must be "captured", "surrendered", or null`);
  }
  return errors;
}

function checkUnitShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (typeof value.id !== "string") errors.push(`${path}.id must be a string`);
  return errors;
}

function checkCityShape(value: unknown, path: string): string[] {
  if (!isPlainObject(value)) return [`${path} is not an object`];
  const errors: string[] = [];
  if (typeof value.id !== "string") errors.push(`${path}.id must be a string`);
  if (value.heroId !== null && typeof value.heroId !== "string") {
    errors.push(`${path}.heroId must be a string or null`);
  }
  return errors;
}

// Checks that a parsed JSON value has the shape findSaveGameIssues (and the
// rest of the system layer) can safely dereference, without trusting that
// localStorage actually contains what this app last wrote there (hand
// edits, a browser extension, a future incompatible version...). Returns an
// empty array when the shape looks safe to treat as a SaveGame.
export function checkSaveGameShape(value: unknown): string[] {
  if (!isPlainObject(value)) return ["save data is not an object"];
  const errors: string[] = [];
  if (typeof value.schemaVersion !== "number") errors.push("schemaVersion must be a number");
  if (typeof value.factionName !== "string") errors.push("factionName must be a string");
  if (typeof value.createdAt !== "string") errors.push("createdAt must be a string");
  if (typeof value.updatedAt !== "string") errors.push("updatedAt must be a string");

  if (!Array.isArray(value.heroes)) {
    errors.push("heroes must be an array");
  } else {
    value.heroes.forEach((hero, index) => errors.push(...checkHeroShape(hero, `heroes[${index}]`)));
  }

  errors.push(...checkWorldShape(value.world, "world"));
  if (!Array.isArray(value.nextMapCandidates)) {
    errors.push("nextMapCandidates must be an array");
  } else {
    value.nextMapCandidates.forEach((candidate, index) =>
      errors.push(...checkMapCandidateShape(candidate, `nextMapCandidates[${index}]`)),
    );
  }
  errors.push(...checkRecordOf(value.clearedWorlds, "clearedWorlds", checkClearedWorldShape));
  errors.push(...checkRecordOf(value.factions, "factions", checkFactionShape));
  errors.push(...checkRecordOf(value.units, "units", checkUnitShape));
  errors.push(...checkRecordOf(value.cities, "cities", checkCityShape));

  return errors;
}

export type ParseSaveGameResult = { ok: true; save: SaveGame } | { ok: false; errors: string[] };

// The full trip from a raw string (as read from localStorage) to a SaveGame
// that's safe to use: JSON parse, shape check, schema version check, then
// the referential-integrity check above. Never throws - every failure mode
// comes back as { ok: false, errors }.
export function parseSaveGame(raw: string): ParseSaveGameResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["save data is not valid JSON"] };
  }

  const shapeErrors = checkSaveGameShape(value);
  if (shapeErrors.length > 0) return { ok: false, errors: shapeErrors };

  const save = value as SaveGame;
  if (save.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`unsupported save schema version ${save.schemaVersion} (expected ${SAVE_SCHEMA_VERSION})`],
    };
  }

  const integrityErrors = findSaveGameIssues(save);
  if (integrityErrors.length > 0) return { ok: false, errors: integrityErrors };

  return { ok: true, save };
}
