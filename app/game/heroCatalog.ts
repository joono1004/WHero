import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { ALL_HERO_DEFINITIONS } from "../../lib/game/hero-roster.ts";
import { STARTING_HEROES } from "../../lib/game/starting-heroes.ts";
import { HERO_PORTRAIT } from "./heroPortraits.ts";
import { supabase } from "./supabaseClient.ts";

export type PublishedHeroCatalog = {
  definitions: HeroDefinition[];
  starterDefinitions: HeroDefinition[];
};

type CatalogRow = {
  id: string;
  availability: "starter" | "recruitable" | "hidden";
  portrait_path: string | null;
  definition: unknown;
};

const VALID_GRADES = new Set(["D", "C", "B", "A", "S", "SS"]);

function isHeroDefinition(value: unknown): value is HeroDefinition {
  if (!value || typeof value !== "object") return false;
  const hero = value as HeroDefinition;
  const attributes = hero.attributes;
  return typeof hero.id === "string" && typeof hero.name === "string" && typeof hero.description === "string"
    && !!attributes && VALID_GRADES.has(attributes.leadership) && VALID_GRADES.has(attributes.force)
    && VALID_GRADES.has(attributes.intelligence) && VALID_GRADES.has(attributes.charisma) && VALID_GRADES.has(attributes.vitality)
    && Array.isArray(hero.traits) && Array.isArray(hero.skills) && !!hero.domesticSpecialties;
}

// The app is still playable offline: a missing table, a failed request, or an
// unfinished administrator edit simply keeps the bundled hero definitions.
export async function loadPublishedHeroCatalog(): Promise<PublishedHeroCatalog | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("hero_catalog")
    .select("id, availability, portrait_path, definition")
    .neq("availability", "hidden");
  if (error || !data) return null;
  const rows = (data as CatalogRow[]).filter((row) => isHeroDefinition(row.definition));
  if (!rows.length) return null;
  for (const row of rows) {
    if (row.portrait_path) HERO_PORTRAIT[row.id] = row.portrait_path;
  }
  // A published row overrides its bundled counterpart, but does not make
  // newly added bundled heroes disappear when an older database only has
  // the original six rows. This also preserves offline play as the full
  // roster grows over time.
  const publishedById = new Map(rows.map((row) => [row.id, row.definition as HeroDefinition]));
  const definitions = [
    ...ALL_HERO_DEFINITIONS.map((hero) => publishedById.get(hero.id) ?? hero),
    ...rows.filter((row) => !ALL_HERO_DEFINITIONS.some((hero) => hero.id === row.id)).map((row) => row.definition as HeroDefinition),
  ];
  const starterIds = new Set(STARTING_HEROES.map((hero) => hero.id));
  return {
    definitions,
    starterDefinitions: definitions.filter((hero) => starterIds.has(hero.id)),
  };
}

export const BUNDLED_HERO_DEFINITIONS = ALL_HERO_DEFINITIONS;
