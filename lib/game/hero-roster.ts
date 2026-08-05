import { gradeToScore } from "./grade.ts";
import { heroArchetype, heroOverallGrade } from "./hero-definition.ts";
import type { HeroArchetype, HeroDefinition } from "./hero-definition.ts";
import type { HeroState } from "./hero.ts";
import { LEGENDARY_HEROES } from "./legendary-heroes.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";
import type { HeroId } from "./ids.ts";

// The full pool a HeroState.heroId can reference: starting heroes plus the
// higher-grade pool intended for later acquisition (events/gacha). Screens
// that need to display a hero the player already has (not the selection
// screen itself) should look up by id across both rather than assuming
// STARTING_HEROES alone, since gacha-acquired heroes (not built yet) will
// come from LEGENDARY_HEROES.
export const ALL_HERO_DEFINITIONS: HeroDefinition[] = [...STARTING_HEROES, ...LEGENDARY_HEROES];

export function findHeroDefinition(heroId: HeroId): HeroDefinition | undefined {
  return ALL_HERO_DEFINITIONS.find((hero) => hero.id === heroId);
}

// A hero the player has (live state) paired with its static template, which
// is what every sort/display in a hero list actually needs together.
export type HeroListEntry = { state: HeroState; definition: HeroDefinition };

export function buildHeroListEntries(heroes: HeroState[]): HeroListEntry[] {
  return heroes.flatMap((state) => {
    const definition = findHeroDefinition(state.heroId);
    return definition ? [{ state, definition }] : [];
  });
}

const ARCHETYPE_SORT_ORDER: HeroArchetype[] = ["general", "warrior", "strategist", "allrounder"];

// Descending: best grade first. Plain string/alphabetical comparison would
// be wrong here - "SS" sorts before "A" alphabetically, which is backwards -
// so this always goes through gradeToScore instead.
export function compareByGrade(a: HeroListEntry, b: HeroListEntry): number {
  return gradeToScore(heroOverallGrade(b.definition.attributes)) - gradeToScore(heroOverallGrade(a.definition.attributes));
}

export function compareByArchetype(a: HeroListEntry, b: HeroListEntry): number {
  return (
    ARCHETYPE_SORT_ORDER.indexOf(heroArchetype(a.definition.attributes)) -
    ARCHETYPE_SORT_ORDER.indexOf(heroArchetype(b.definition.attributes))
  );
}

// Descending: highest level first.
export function compareByLevel(a: HeroListEntry, b: HeroListEntry): number {
  return b.state.level - a.state.level;
}
