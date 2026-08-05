import { createFaction, PLAYER_FACTION_ID } from "./faction.ts";
import { heroCombatStats } from "./hero-definition.ts";
import { ZERO_ATTRIBUTE_PROGRESS } from "./hero.ts";
import type { HeroState } from "./hero.ts";
import { generateInitialMapCandidates } from "./map-candidates.ts";
import type { SaveGame } from "./save.ts";
import { SAVE_SCHEMA_VERSION } from "./save.ts";
import { STARTING_HEROES } from "./starting-heroes.ts";

export type NewGameParams = {
  factionName: string;
  heroId: string;
  seed: number;
  now: string;
};

// Builds the SaveGame for a brand-new game: the chosen starting hero (level
// 1, standing solo at the origin hex), a lone player faction, and a single
// map candidate to challenge from the lobby. No active world yet - entering
// one is a deliberate lobby action (see world-entry.ts's enterMapCandidate),
// not an automatic result of hero selection (this session's lobby/
// candidate-map correction). Pure and deterministic: same inputs always
// produce the same save, so the caller supplies `seed`/`now` rather than
// this function reaching for Math.random()/Date.now() itself (keeps it
// testable without a clock).
export function createNewSaveGame(params: NewGameParams): SaveGame {
  const heroDefinition = STARTING_HEROES.find((hero) => hero.id === params.heroId);
  if (!heroDefinition) {
    throw new Error(`unknown starting hero id: ${params.heroId}`);
  }

  const heroState: HeroState = {
    heroId: heroDefinition.id,
    level: 1,
    experience: 0,
    health: heroCombatStats(heroDefinition.attributes, heroDefinition.unitType).maxHealth,
    items: [],
    assignment: { mode: "solo", position: { row: 0, column: 0 } },
    attributeProgress: ZERO_ATTRIBUTE_PROGRESS,
    deploymentPriority: true,
  };

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    factionName: params.factionName,
    heroes: [heroState],
    world: null,
    nextMapCandidates: generateInitialMapCandidates(params.seed),
    clearedWorlds: {},
    factions: {
      [PLAYER_FACTION_ID]: createFaction({
        id: PLAYER_FACTION_ID,
        name: params.factionName,
        isPlayerControlled: true,
      }),
    },
    units: {},
    cities: {},
    createdAt: params.now,
    updatedAt: params.now,
  };
}
