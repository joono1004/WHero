import type { CoreGrade } from "../../lib/game/grade.ts";

// No grade-color convention existed anywhere in the codebase yet (Codex's
// lib/world/prototype/faction-visual.ts explicitly notes "hero grade
// colours remain separate" without defining them) - standard low-to-high
// RPG rarity ladder: gray -> green -> blue -> purple -> gold -> orange-red.
// Shared between HeroSelectScreen (card badge/grade values) and
// GameLobbyScreen (hero-list portrait ring) - both need the same ladder.
export const GRADE_COLOR: Record<CoreGrade, string> = {
  D: "#9aa5a3",
  C: "#7bc47f",
  B: "#6ea8e0",
  A: "#b98cf0",
  S: "#f0c419",
  SS: "#ff6b57",
};
