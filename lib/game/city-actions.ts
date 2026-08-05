import { canFoundAdditionalCity, canFoundCityAt, createCity, MIN_CITY_FOUNDING_DISTANCE } from "./city.ts";
import type { City } from "./city.ts";
import { PLAYER_FACTION_ID } from "./faction.ts";
import { isHeroEnlisted, isHeroSolo, sendHeroSolo } from "./hero.ts";
import type { HeroId } from "./ids.ts";
import type { HexCoordinate } from "./hex.ts";
import type { SaveGame } from "./save.ts";

// Founds a new city at `position` for the given (solo) hero, moving them
// there and leaving them solo afterward rather than auto-stationing them
// in it - if founding consumed the hero into "city" mode, a lone founder
// would have nowhere to go once they'd built their first city (no one left
// solo to found a second one, or to do anything else) until a later hero
// got summoned, which itself requires a second city to exist. Leaving them
// free avoids that bootstrapping deadlock; stationing a hero in a city
// (hero.ts's assignHeroToCity) is left as a separate, later player choice
// - task 11 territory. Throws if: no world is active, the hero isn't in
// the roster or isn't moving solo, the position is within
// MIN_CITY_FOUNDING_DISTANCE of one of the faction's existing cities, or
// (point 7) this would be a second-or-later city while none of the
// faction's existing cities has reached "small" (소도시) yet. Also runs
// checkHeroSummons afterward, since city count just changed (point 8).
export function foundCity(save: SaveGame, heroId: HeroId, position: HexCoordinate, name: string, now: string): SaveGame {
  if (!save.world) {
    throw new Error("cannot found a city when no world is active");
  }
  const hero = save.heroes.find((candidate) => candidate.heroId === heroId);
  if (!hero) {
    throw new Error(`hero ${heroId} is not in the roster`);
  }
  if (!isHeroSolo(hero)) {
    throw new Error(`hero ${heroId} must be moving solo to found a city`);
  }

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  if (!playerFaction) {
    throw new Error("player faction is missing from this save");
  }
  const existingCities = playerFaction.cityIds
    .map((id) => save.cities[id])
    .filter((city): city is City => Boolean(city));

  if (!canFoundCityAt(position, existingCities.map((city) => city.position))) {
    throw new Error(`position is within ${MIN_CITY_FOUNDING_DISTANCE} hexes of an existing city`);
  }
  if (!canFoundAdditionalCity(existingCities.map((city) => city.tier))) {
    throw new Error("the faction needs at least one city at 소도시 (small) or better before founding another");
  }

  const cityId = `city-${save.world.id}-${existingCities.length + 1}`;
  const city = createCity({ id: cityId, factionId: PLAYER_FACTION_ID, name, position });

  const heroes = save.heroes.map((candidate) => (candidate.heroId === heroId ? sendHeroSolo(candidate, position) : candidate));
  const factions = {
    ...save.factions,
    [PLAYER_FACTION_ID]: {
      ...playerFaction,
      cityIds: [...playerFaction.cityIds, cityId],
      // The first city a faction founds is its 수도 (task 12) - this only
      // ever fires once per world since existingCities.length === 0 is only
      // true before any city exists.
      capitalCityId: existingCities.length === 0 ? cityId : playerFaction.capitalCityId,
    },
  };
  const cities = { ...save.cities, [cityId]: city };

  return checkHeroSummons({ ...save, heroes, factions, cities, updatedAt: now }, position, now);
}

// Promotes enlisted-but-not-yet-summoned heroes to solo as the player
// faction's city count grows (this session's direction - point 8): with N
// cities founded, up to N of the enlisted heroes (in enlistment order) are
// on the map - the very first is already solo from world-entry.ts's
// enterMapCandidate before any city exists, so a city count of 0 is
// treated the same as 1 for this purpose. Newly-summoned heroes appear at
// `spawnPosition` (the city that triggered this check, when called from
// foundCity). A no-op when no world is active.
export function checkHeroSummons(save: SaveGame, spawnPosition: HexCoordinate, now: string): SaveGame {
  const world = save.world;
  if (!world) return save;

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const cityCount = playerFaction ? playerFaction.cityIds.length : 0;
  const summonableCount = Math.min(world.enlistedHeroIds.length, Math.max(1, cityCount));
  const summonableIds = new Set(world.enlistedHeroIds.slice(0, summonableCount));

  const heroes = save.heroes.map((hero) =>
    isHeroEnlisted(hero) && summonableIds.has(hero.heroId) ? sendHeroSolo(hero, spawnPosition) : hero,
  );

  return { ...save, heroes, updatedAt: now };
}
