import {
  BUNDLED_TREASURE_DEFINITIONS,
  type TreasureDefinition,
} from "../../lib/game/treasure-definition.ts";
import { supabase } from "./supabaseClient.ts";

type CatalogRow = {
  id: string;
  definition: unknown;
};

const GRADES = new Set(["D", "C", "B", "A", "S", "SS"]);
const CATEGORIES = new Set(["weapon", "armor", "mount", "other"]);
const EFFECTS = new Set(["attack", "defense", "movement", "health"]);

function isTreasureDefinition(value: unknown): value is TreasureDefinition {
  if (!value || typeof value !== "object") return false;
  const treasure = value as TreasureDefinition;
  return typeof treasure.id === "string" && typeof treasure.name === "string"
    && CATEGORIES.has(treasure.category) && GRADES.has(treasure.grade)
    && EFFECTS.has(treasure.effectKind) && typeof treasure.effectValue === "number"
    && Array.isArray(treasure.allowedUnitTypes) && Array.isArray(treasure.terrainBonuses)
    && typeof treasure.history === "string" && typeof treasure.description === "string";
}

// Published administrator changes replace their bundled counterpart. When the
// database is offline or not configured, the game continues to use its local
// historical treasure catalogue.
export async function loadPublishedTreasureCatalog(): Promise<TreasureDefinition[]> {
  if (!supabase) return BUNDLED_TREASURE_DEFINITIONS;
  const { data, error } = await supabase.from("treasure_catalog").select("id, definition").eq("published", true);
  if (error || !data) return BUNDLED_TREASURE_DEFINITIONS;
  const rows = (data as CatalogRow[]).filter((row) => isTreasureDefinition(row.definition));
  if (!rows.length) return BUNDLED_TREASURE_DEFINITIONS;
  const publishedById = new Map(rows.map((row) => [row.id, row.definition as TreasureDefinition]));
  return [
    ...BUNDLED_TREASURE_DEFINITIONS.map((treasure) => publishedById.get(treasure.id) ?? treasure),
    ...rows.filter((row) => !BUNDLED_TREASURE_DEFINITIONS.some((treasure) => treasure.id === row.id)).map((row) => row.definition as TreasureDefinition),
  ];
}

export { BUNDLED_TREASURE_DEFINITIONS };
