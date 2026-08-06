import { createCity } from "./city.ts";
import type { City } from "./city.ts";
import { createFaction, PLAYER_FACTION_ID } from "./faction.ts";
import type { Faction } from "./faction.ts";
import {
  enlistHeroFor,
  isHeroEnlistable,
  isHeroEnlisted,
  isHeroGoverning,
  isHeroInCity,
  sendHeroSolo,
} from "./hero.ts";
import type { HeroState } from "./hero.ts";
import type { CityId, FactionId, HeroId } from "./ids.ts";
import { generateNextMapCandidates } from "./map-candidates.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";
import type { SaveGame } from "./save.ts";
import { MAP_TIER_INFO } from "./world.ts";
import type { WorldState } from "./world.ts";

// Up to 5 heroes can be enlisted for a campaign before entering it (this
// session's direction - point 8). Only the first starts on the map; the
// rest are summoned as the faction's city count grows - see
// city-actions.ts's checkHeroSummons.
export const MAX_ENLISTED_HEROES = 5;

// Where the first enlisted hero starts. A placeholder - the user's actual
// rule (spawn at the corner diagonally farthest from the most enemy
// factions, within 3 passable hexes) needs real terrain/faction-position
// data that isn't wired up yet (same "deferred until map integration" gap
// as tasks 8/9) - see docs/SYSTEM_LAYER.md.
const DEFAULT_SPAWN_POSITION = { row: 0, column: 0 };

// Rival (AI) factions, spawned fresh for every world (task 12). This is
// deliberately minimal - a name, one capital city, nothing else (no units,
// no combat/economy stats) - because real AI strength-by-map-size and AI
// turn behavior are both still undecided (this session's direction,
// "추후 논의"). It exists at all only so the confirmed victory condition
// (capture a rival's capital -> that faction is defeated; every rival
// defeated -> world conquered, world-progress.ts) has something real to
// operate on and can be exercised end-to-end (see MapPlayScreen.tsx's
// temporary "적 수도 점령 (테스트)" button) instead of sitting untestable
// like a pure function with no caller. Rival count comes from
// MAP_TIER_INFO[mapTier].factions (2-8, includes the player) - same source
// the lobby's map-candidate cards already display. Capital positions are a
// flat placeholder offset (not seeded, not terrain-aware) for the same
// reason DEFAULT_SPAWN_POSITION is - real placement needs terrain data that
// isn't wired up yet.
const RIVAL_CAPITAL_COLUMN_SPACING = 10;

function generateRivalFactions(worldId: string, mapTier: WorldState["generation"]["mapTier"]): { factions: Faction[]; cities: City[] } {
  const rivalCount = MAP_TIER_INFO[mapTier].factions - 1;
  const factions: Faction[] = [];
  const cities: City[] = [];
  for (let i = 0; i < rivalCount; i++) {
    const factionId = `${worldId}-rival-${i + 1}` as FactionId;
    const cityId = `${worldId}-rival-${i + 1}-capital` as CityId;
    const position = { row: 0, column: (i + 1) * RIVAL_CAPITAL_COLUMN_SPACING };
    const city = createCity({ id: cityId, factionId, name: `${i + 1}세력 수도`, position });
    cities.push(city);
    factions.push({
      ...createFaction({ id: factionId, name: `${i + 1}세력`, isPlayerControlled: false }),
      cityIds: [cityId],
      capitalCityId: cityId,
    });
  }
  return { factions, cities };
}

// Moves the player from the lobby into a live map: picks one of the offered
// candidates, turns it into the active WorldState, and clears the candidate
// list (see save.ts's "exactly one of {world}/{nextMapCandidates}"
// invariant). `enlistedHeroIds` is the player's pre-map roster pick (1-5
// heroes, ordered - order is summon priority); the first is placed on the
// map immediately, the rest go into HeroAssignment's "enlisted" mode.
// Throws if a world is already active, the index is out of range, the
// enlistment list is empty/oversized, or it references a hero that doesn't
// exist or isn't currently enlistable (governing or recovering) - the UI is
// expected to only offer eligible heroes and enforce the 1-5 count.
export function enterMapCandidate(
  save: SaveGame,
  candidateIndex: number,
  enlistedHeroIds: HeroId[],
  now: string,
): SaveGame {
  if (save.world !== null) {
    throw new Error("cannot enter a map candidate while a world is already active");
  }
  const candidate = save.nextMapCandidates[candidateIndex];
  if (!candidate) {
    throw new Error(`no map candidate at index ${candidateIndex}`);
  }
  if (enlistedHeroIds.length === 0 || enlistedHeroIds.length > MAX_ENLISTED_HEROES) {
    throw new Error(`must enlist between 1 and ${MAX_ENLISTED_HEROES} heroes, got ${enlistedHeroIds.length}`);
  }

  const heroesById = new Map(save.heroes.map((hero) => [hero.heroId, hero]));
  for (const heroId of enlistedHeroIds) {
    const hero = heroesById.get(heroId);
    if (!hero) {
      throw new Error(`enlisted hero ${heroId} is not in the roster`);
    }
    if (!isHeroEnlistable(hero)) {
      throw new Error(`hero ${heroId} cannot be enlisted right now (governing or recovering)`);
    }
  }

  const worldId = `world-${candidate.generation.seed}`;
  const [firstHeroId, ...restHeroIds] = enlistedHeroIds;
  const restIds = new Set(restHeroIds);
  const heroes = save.heroes.map((hero) => {
    if (hero.heroId === firstHeroId) return sendHeroSolo(hero, DEFAULT_SPAWN_POSITION);
    if (restIds.has(hero.heroId)) return enlistHeroFor(hero, worldId);
    return hero;
  });

  const { factions: rivalFactions, cities: rivalCities } = generateRivalFactions(worldId, candidate.generation.mapTier);
  const factions = { ...save.factions };
  for (const faction of rivalFactions) factions[faction.id] = faction;
  const cities = { ...save.cities };
  for (const city of rivalCities) cities[city.id] = city;

  const world: WorldState = {
    id: worldId,
    worldIndex: candidate.worldIndex,
    generation: candidate.generation,
    factionIds: [PLAYER_FACTION_ID, ...rivalFactions.map((faction) => faction.id)],
    playerFactionId: PLAYER_FACTION_ID,
    exploredHexes: [],
    turn: 1,
    conquered: false,
    heroDeploymentLimit: enlistedHeroIds.length,
    enlistedHeroIds,
    researchSnapshot: save.factions[PLAYER_FACTION_ID]?.research ?? ZERO_RESEARCH_LEVELS,
  };

  return {
    ...save,
    world,
    heroes,
    factions,
    cities,
    nextMapCandidates: [],
    updatedAt: now,
  };
}

// Archives the active world as cleared and returns the player to the lobby
// with fresh candidates for the next one. Doesn't evaluate any clear
// condition itself - the caller decides when to call this. Before task 12,
// that meant "whenever the player clicks the test button"; now that
// world.conquered is real (world-progress.ts's isWorldConquered, recomputed
// every turn by turn.ts and after every capture), MapPlayScreen.tsx gates
// its "정복 완료" button on that flag instead of allowing it unconditionally
// - but this function still doesn't re-check it itself, so a caller that
// skips that gate (tests, future scripted content) isn't blocked.
//
// Only the player faction persists across worlds (see faction.ts's
// PLAYER_FACTION_ID doc comment) - other factions, and all units/cities,
// were scoped to the world that just ended and are discarded here. Heroes
// stationed in a city lose that assignment (the city it pointed at no
// longer exists) and fall back to solo; heroes who were enlisted but never
// summoned (task 10) do too - the campaign they were queued for is over.
// Governors are unaffected since a world can't already have a governor
// before it's been cleared.
export function completeActiveWorld(save: SaveGame, now: string): SaveGame {
  const world = save.world;
  if (!world) {
    throw new Error("cannot complete a world when none is active");
  }

  const clearedWorlds = {
    ...save.clearedWorlds,
    [world.id]: {
      id: world.id,
      worldIndex: world.worldIndex,
      generation: world.generation,
      clearedAt: now,
      governorHeroId: null,
      name: null,
    },
  };

  const heroes: HeroState[] = save.heroes.map((hero) => {
    if (isHeroGoverning(hero)) return hero;
    if (isHeroInCity(hero) || isHeroEnlisted(hero)) {
      return sendHeroSolo(hero, DEFAULT_SPAWN_POSITION);
    }
    return hero;
  });

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const factions = playerFaction
    ? { [PLAYER_FACTION_ID]: { ...playerFaction, cityIds: [], unitIds: [] } }
    : { ...save.factions };

  return {
    ...save,
    world: null,
    nextMapCandidates: generateNextMapCandidates(world.generation.seed, world.worldIndex),
    clearedWorlds,
    heroes,
    factions,
    units: {},
    cities: {},
    updatedAt: now,
  };
}
