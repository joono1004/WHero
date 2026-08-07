import { cityFacilityYieldPerTurn } from "./city.ts";
import type { City, ProductionOrder } from "./city.ts";
import type { Faction } from "./faction.ts";
import { heroCombatStats } from "./hero-definition.ts";
import type { HeroDefinition } from "./hero-definition.ts";
import {
  cityYieldWithHeroBonus,
  heroRegenPerTurn,
  productionTurnsBonus,
  recoveryTurnsBonus,
} from "./hero-assignment.ts";
import { hexEquals } from "./hex.ts";
import type { HexCoordinate } from "./hex.ts";
import { isHeroInCity, isHeroRecovering, isHeroSolo, tickHeroRecovery } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import { findHeroDefinition } from "./hero-roster.ts";
import type { SaveGame } from "./save.ts";
import { createProducedUnit } from "./unit-production.ts";
import type { Unit } from "./unit.ts";
import { isWorldConquered } from "./world-progress.ts";

// The turn engine (task 7): the one place that advances world.turn and
// refills what's spent during a turn. It owns what already has a home in
// the data model with no undecided game-design values attached: the turn
// counter, unit movement points, ticking down a recovering hero's timer
// (task 9), applying city facility yields and advancing unit production
// queues (task 10), all boosted by a stationed hero's specialty (task 11 -
// see hero-assignment.ts for the 훈련/상업/농업/채굴/회복/방어 bonuses).
// Anything whose rules are still undecided (governor income - task 13,
// rebellions - task 14, AI faction behavior) stays out of this file;
// endTurn is the hook those systems will plug a per-turn step into once
// their own designs land, not the place to guess at them now.
//
// There's also no separate "AI faction turn" step yet - with no AI decision
// logic built, ending the player's turn immediately becomes the start of
// the next one. That collapses back into a real per-faction turn order once
// combat or an AI system needs one to act within.

// A city with a 회복(recovery)-specialty hero heals units/heroes "in the
// region" each turn - since there's no territory-radius system yet, that's
// approximated as "sitting at exactly the city's position" (this session's
// proxy, task 11).
type RegenSpot = { position: HexCoordinate; factionId: string; amount: number };

// Ends the current turn: advances the counter, restores every unit's
// movement, ticks every recovering hero closer to returning (extra-fast if
// any of their faction's cities has a 회복 specialist, task 11), credits
// every city's facility yield to its faction (boosted by a matching
// specialty), advances every city's unit production queue (faster with a
// 훈련 specialist; completed orders spawn a real Unit using the producing
// world's troopLevelsSnapshot, task 10), and heals units/heroes sitting at a
// 회복-specialist city's position. Throws if no world is active - the UI is
// expected to only expose "턴 종료" from MapPlayScreen, which only renders
// when save.world is set.
export function endTurn(save: SaveGame, now: string): SaveGame {
  if (!save.world) {
    throw new Error("cannot end a turn when no world is active");
  }
  const world = save.world;

  const units: Record<string, Unit> = {};
  for (const [id, unit] of Object.entries(save.units)) {
    units[id] = { ...unit, movementRemaining: unit.stats.movement };
  }

  const factions: Record<string, Faction> = { ...save.factions };
  const cities: Record<string, City> = {};
  const regenSpots: RegenSpot[] = [];
  let maxRecoveryTurnsBonus = 0;
  let nextUnitIndex = 0;

  for (const [cityId, city] of Object.entries(save.cities)) {
    const owner = factions[city.factionId];
    if (!owner) {
      cities[cityId] = city;
      continue;
    }

    const stationedHero: HeroDefinition | null = city.heroId ? (findHeroDefinition(city.heroId) ?? null) : null;

    const resources = { ...owner.resources };
    const yieldThisTurn = cityYieldWithHeroBonus(cityFacilityYieldPerTurn(city), stationedHero);
    for (const [key, amount] of Object.entries(yieldThisTurn)) {
      const resourceKey = key as keyof typeof resources;
      resources[resourceKey] += amount ?? 0;
    }

    const productionTick = 1 + productionTurnsBonus(stationedHero);
    const remainingQueue: ProductionOrder[] = [];
    const newUnitIds: string[] = [];
    for (const order of city.productionQueue) {
      const turnsRemaining = order.turnsRemaining - productionTick;
      if (turnsRemaining > 0) {
        remainingQueue.push({ ...order, turnsRemaining });
        continue;
      }
      const unitId = `${cityId}-unit-${world.turn}-${nextUnitIndex}`;
      nextUnitIndex += 1;
      units[unitId] = createProducedUnit({
        id: unitId,
        factionId: city.factionId,
        unitType: order.unitType,
        position: city.position,
        researchLevel: world.troopLevelsSnapshot[order.unitType] ?? 0,
      });
      newUnitIds.push(unitId);
    }

    const regenAmount = heroRegenPerTurn(stationedHero);
    if (regenAmount > 0) {
      regenSpots.push({ position: city.position, factionId: city.factionId, amount: regenAmount });
      maxRecoveryTurnsBonus = Math.max(maxRecoveryTurnsBonus, recoveryTurnsBonus(stationedHero));
    }

    cities[cityId] = { ...city, productionQueue: remainingQueue };
    factions[city.factionId] = {
      ...owner,
      resources,
      unitIds: newUnitIds.length > 0 ? [...owner.unitIds, ...newUnitIds] : owner.unitIds,
    };
  }

  if (regenSpots.length > 0) {
    for (const [id, unit] of Object.entries(units)) {
      const spot = regenSpots.find((candidate) => candidate.factionId === unit.factionId && hexEquals(candidate.position, unit.position));
      if (spot) {
        units[id] = { ...unit, health: Math.min(unit.health + spot.amount, unit.stats.maxHealth) };
      }
    }
  }

  const heroes: HeroState[] = save.heroes.map((hero) => {
    if (isHeroRecovering(hero)) {
      const definition = findHeroDefinition(hero.heroId);
      const maxHealth = definition ? heroCombatStats(definition.attributes, definition.unitType).maxHealth : 0;
      return tickHeroRecovery(hero, maxHealth, maxRecoveryTurnsBonus);
    }
    if (regenSpots.length > 0 && (isHeroSolo(hero) || isHeroInCity(hero))) {
      const position = hero.assignment.mode === "solo" ? hero.assignment.position : null;
      const spot = position ? regenSpots.find((candidate) => hexEquals(candidate.position, position)) : null;
      // A city-stationed hero is, by definition, at their own city's
      // position - find that city's regen spot directly by cityId instead
      // of needing a position lookup.
      const stationedSpot =
        hero.assignment.mode === "city"
          ? regenSpots.find((candidate) => {
              const city = save.cities[hero.assignment.mode === "city" ? hero.assignment.cityId : ""];
              return city ? hexEquals(candidate.position, city.position) : false;
            })
          : null;
      const matched = spot ?? stationedSpot;
      if (matched) {
        const definition = findHeroDefinition(hero.heroId);
        const maxHealth = definition ? heroCombatStats(definition.attributes, definition.unitType).maxHealth : hero.health;
        return { ...hero, health: Math.min(hero.health + matched.amount, maxHealth) };
      }
    }
    return hero;
  });

  const nextTurnWorld = { ...world, turn: world.turn + 1 };

  return {
    ...save,
    // Recomputed every turn (task 12) rather than only right after a
    // capture, so a world that started already-conquered (shouldn't happen
    // in practice, but keeps this the single source of truth) or one whose
    // factions changed some other way still ends up correct.
    world: { ...nextTurnWorld, conquered: isWorldConquered(nextTurnWorld, factions) },
    units,
    heroes,
    factions,
    cities,
    updatedAt: now,
  };
}
