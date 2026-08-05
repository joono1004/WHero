import type { HeroDefinition } from "./hero-definition.ts";
import { heroCombatStats } from "./hero-definition.ts";
import type { HeroState } from "./hero.ts";
import { beginHeroRecovery } from "./hero.ts";
import type { Unit } from "./unit.ts";

// Combat rules (task 9), confirmed by the user: attacks are always
// hero:hero or hero:unit (a plain unit can fight too, per GAME_VISION.md -
// this engine is generic over "anything with combat stats", so unit:unit
// works the same way). Turn-based - the attacker strikes first; if the
// defender survives, they counter back UNLESS the attacker has a strictly
// longer range than the defender. Melee (no range specialty/unit range) is
// treated as range 1 for that comparison, which makes the rule collapse to
// one consistent line: melee vs melee counters (neither outranges the
// other), a melee attacker charging a ranged defender still eats a counter
// (1 is never > the defender's range), and only a ranged attacker that
// truly outranges its target escapes the counter entirely.
export const MELEE_RANGE = 1;
const MIN_DAMAGE = 1;

// How many turns a defeated hero spends recovering before returning to the
// map (task 9's user-confirmed rule: heroes retreat and recover, units are
// destroyed outright). Draft/adjustable - no playtesting has set this yet.
export const HERO_RECOVERY_TURNS = 3;

export type Combatant = {
  attack: number;
  defense: number;
  health: number;
  maxHealth: number;
  range: number | null;
};

// No rider bonus anymore - units used to optionally carry a hero "riding
// with" them for a stat buff (hero.ts's former "unit" assignment mode),
// removed (2026-07-28) now that heroes always fight/move as their own
// independent combatant (heroCombatant below) rather than boosting a unit.
export function unitCombatant(unit: Unit): Combatant {
  return {
    attack: unit.stats.attack,
    defense: unit.stats.defense,
    health: unit.health,
    maxHealth: unit.stats.maxHealth,
    range: unit.stats.range,
  };
}

export function heroCombatant(definition: HeroDefinition, state: HeroState): Combatant {
  const stats = heroCombatStats(definition.attributes, definition.unitType);
  return {
    attack: stats.attack,
    defense: stats.defense,
    health: state.health,
    maxHealth: stats.maxHealth,
    range: stats.range,
  };
}

export type CombatResult = {
  damageDealt: number;
  defenderHealthAfter: number;
  defenderDefeated: boolean;
  countered: boolean;
  counterDamageDealt: number;
  attackerHealthAfter: number;
  attackerDefeated: boolean;
};

// Resolves one attack: attacker hits defender, then (if defender survives
// and doesn't have a range disadvantage against them) defender hits back.
// Pure - doesn't know whether either side is a hero or a unit, doesn't
// touch SaveGame. Damage formula (attack - defense, floored at MIN_DAMAGE
// so combat always progresses) is a draft placeholder like the stat
// constants in hero-definition.ts's heroCombatStats - not playtested.
export function resolveAttack(attacker: Combatant, defender: Combatant): CombatResult {
  const damageDealt = Math.max(attacker.attack - defender.defense, MIN_DAMAGE);
  const defenderHealthAfter = Math.max(defender.health - damageDealt, 0);
  const defenderDefeated = defenderHealthAfter <= 0;

  if (defenderDefeated) {
    return {
      damageDealt,
      defenderHealthAfter,
      defenderDefeated: true,
      countered: false,
      counterDamageDealt: 0,
      attackerHealthAfter: attacker.health,
      attackerDefeated: false,
    };
  }

  const attackerRange = attacker.range ?? MELEE_RANGE;
  const defenderRange = defender.range ?? MELEE_RANGE;
  const countered = attackerRange <= defenderRange;

  if (!countered) {
    return {
      damageDealt,
      defenderHealthAfter,
      defenderDefeated: false,
      countered: false,
      counterDamageDealt: 0,
      attackerHealthAfter: attacker.health,
      attackerDefeated: false,
    };
  }

  const counterDamageDealt = Math.max(defender.attack - attacker.defense, MIN_DAMAGE);
  const attackerHealthAfter = Math.max(attacker.health - counterDamageDealt, 0);
  return {
    damageDealt,
    defenderHealthAfter,
    defenderDefeated: false,
    countered: true,
    counterDamageDealt,
    attackerHealthAfter,
    attackerDefeated: attackerHealthAfter <= 0,
  };
}

// Applies a resolved health outcome back onto a unit. Units don't retreat
// and recover like heroes (this session's explicit direction) - a defeated
// unit is just gone, so this returns null for the caller to remove from
// save.units (and its faction's unitIds) instead of some "dead" unit value.
export function applyCombatHealthToUnit(unit: Unit, healthAfter: number, defeated: boolean): Unit | null {
  if (defeated) return null;
  return { ...unit, health: healthAfter };
}

// Applies a resolved health outcome back onto a hero. A defeated hero
// doesn't leave the roster - they retreat to recover (hero.ts's
// "recovering" assignment mode, ticked down by turn.ts's endTurn).
export function applyCombatHealthToHero(hero: HeroState, healthAfter: number, defeated: boolean): HeroState {
  if (defeated) return beginHeroRecovery(hero, HERO_RECOVERY_TURNS);
  return { ...hero, health: healthAfter };
}
