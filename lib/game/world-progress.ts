import { captureCity } from "./city.ts";
import type { City } from "./city.ts";
import { isFactionEliminated } from "./faction.ts";
import type { Faction } from "./faction.ts";
import { sendHeroSolo } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import type { CityId, FactionId } from "./ids.ts";
import type { SaveGame } from "./save.ts";
import type { WorldState } from "./world.ts";

// World progress (task 12): "정복" per the user's confirmed victory
// condition - capturing a rival faction's capital defeats that faction
// (world-progress.ts's captureEnemyCity), and a world counts as conquered
// once every non-player faction in it is defeated (isWorldConquered below).
// Surrender is the user's other confirmed defeat path (a hopeless AI faction
// gives up instead of forcing the player to grind them out) but the
// decision of *when* an AI can't win needs an AI-power comparison that
// doesn't exist yet (this session's direction - AI stats and AI turn
// behavior are both still "추후 논의") - so surrenderFaction is the
// state-transition mechanism only, with no real AI deciding when to call
// it. Since Codex's map/terrain engine isn't done yet either (so there's no
// live way for the player to actually corner an AI faction), the user asked
// for a manual "적 세력 항복 (테스트)" button (MapPlayScreen.tsx) that calls
// surrenderRivalFaction directly - same temporary-trigger convention as
// captureEnemyCity's "적 수도 점령 (테스트)" button, standing in for the
// real thing until both the AI-power system and the map exist.
//
// AI factions themselves are a minimal placeholder for now too
// (world-entry.ts's enterMapCandidate spawns one per rival with just a
// capital city, no units, no stats) - just enough for this module's
// capture/elimination logic to have something real to operate on and be
// exercised end-to-end. Real AI faction generation (strength scaled to the
// map's type/size) and AI movement are separate, deferred work.

export function isWorldConquered(world: WorldState, factions: Record<FactionId, Faction>): boolean {
  return world.factionIds
    .filter((factionId) => factionId !== world.playerFactionId)
    .every((factionId) => {
      const faction = factions[factionId];
      return faction ? isFactionEliminated(faction) : true;
    });
}

// Marks a faction as having given up rather than being defeated in battle.
// A no-op (returns the faction unchanged) if it's already eliminated, so
// this never overwrites an existing "captured" with "surrendered" or vice
// versa. Pure - see surrenderRivalFaction below for the SaveGame-level
// version that's actually wired to a UI trigger.
export function surrenderFaction(faction: Faction): Faction {
  if (isFactionEliminated(faction)) return faction;
  return { ...faction, eliminationReason: "surrendered" };
}

// SaveGame-level counterpart to captureEnemyCity, for the other confirmed
// defeat path. Marks `factionId` as surrendered and recomputes
// world.conquered - doesn't touch cities/units, unlike a capture, since a
// surrendering faction just gives up rather than losing anything by force.
// Throws if no world is active, the faction is missing, or `factionId` is
// the player's own faction (the player can't surrender to themselves).
// Currently only called from MapPlayScreen.tsx's temporary "적 세력 항복
// (테스트)" button - see the module doc comment for why this exists as a
// manual trigger instead of a real AI decision.
export function surrenderRivalFaction(save: SaveGame, factionId: FactionId, now: string): SaveGame {
  const world = save.world;
  if (!world) {
    throw new Error("cannot surrender a faction when no world is active");
  }
  if (factionId === world.playerFactionId) {
    throw new Error("the player faction cannot surrender to itself");
  }
  const faction = save.factions[factionId];
  if (!faction) {
    throw new Error(`faction ${factionId} is missing from this save`);
  }

  const factions: Record<FactionId, Faction> = { ...save.factions, [factionId]: surrenderFaction(faction) };

  return {
    ...save,
    world: { ...world, conquered: isWorldConquered(world, factions) },
    factions,
    updatedAt: now,
  };
}

// Transfers `cityId` from its current owner to `capturingFactionId`, and -
// if that city was the losing faction's capital - marks them defeated
// ("captured"). Any hero stationed in the city falls back to solo, same as
// world-entry.ts's completeActiveWorld does when a unit/city a hero was
// riding with/stationed in stops existing out from under them (here it
// still exists, just isn't theirs anymore, but the effect on the hero is
// the same). Throws if the city or either faction is missing, or if the
// city already belongs to the capturing faction - callers (currently just
// MapPlayScreen's test button) are expected to only offer this against a
// city that's actually still enemy-held.
export function captureEnemyCity(save: SaveGame, cityId: CityId, capturingFactionId: FactionId, now: string): SaveGame {
  const city = save.cities[cityId];
  if (!city) {
    throw new Error(`cannot capture city ${cityId}, which doesn't exist`);
  }
  if (city.factionId === capturingFactionId) {
    throw new Error(`city ${cityId} already belongs to faction ${capturingFactionId}`);
  }
  const losingFaction = save.factions[city.factionId];
  const capturingFaction = save.factions[capturingFactionId];
  if (!losingFaction) {
    throw new Error(`city ${cityId}'s owning faction ${city.factionId} is missing from this save`);
  }
  if (!capturingFaction) {
    throw new Error(`capturing faction ${capturingFactionId} is missing from this save`);
  }

  const previousHeroId = city.heroId;
  const capturedCity: City = captureCity(city, capturingFactionId);

  const eliminated = cityId === losingFaction.capitalCityId;
  const factions: Record<FactionId, Faction> = {
    ...save.factions,
    [city.factionId]: {
      ...losingFaction,
      cityIds: losingFaction.cityIds.filter((id) => id !== cityId),
      eliminationReason: eliminated ? "captured" : losingFaction.eliminationReason,
    },
    [capturingFactionId]: {
      ...capturingFaction,
      cityIds: [...capturingFaction.cityIds, cityId],
    },
  };

  const heroes: HeroState[] = previousHeroId
    ? save.heroes.map((hero) => (hero.heroId === previousHeroId ? sendHeroSolo(hero, city.position) : hero))
    : save.heroes;

  const world = save.world ? { ...save.world, conquered: isWorldConquered(save.world, factions) } : save.world;

  return {
    ...save,
    world,
    cities: { ...save.cities, [cityId]: capturedCity },
    factions,
    heroes,
    updatedAt: now,
  };
}
