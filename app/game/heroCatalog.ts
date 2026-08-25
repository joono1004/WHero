import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { ALL_HERO_DEFINITIONS } from "../../lib/game/hero-roster.ts";
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
  const definitions = rows.map((row) => row.definition as HeroDefinition);
  return {
    definitions,
    starterDefinitions: rows.filter((row) => row.availability === "starter").map((row) => row.definition as HeroDefinition),
  };
}

export const BUNDLED_HERO_DEFINITIONS = ALL_HERO_DEFINITIONS;
