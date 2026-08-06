import { appointHeroAsGovernor, isHeroEnlistable } from "./hero.ts";
import type { HeroId, WorldId } from "./ids.ts";
import type { SaveGame } from "./save.ts";

// 영주 임명 (task 13, 2026-08-06 lobby redesign direction): assigns an idle
// hero to govern a previously-cleared world, optionally naming that world
// for the first time. hero.ts's appointHeroAsGovernor already existed
// (used by world-entry.test.ts fixtures) as the low-level "set this hero's
// assignment" step - this wraps it with the actual validation and
// ClearedWorldRecord bookkeeping a real UI entry point needs (world-entry.ts's
// completeActiveWorld also writes governorHeroId, but only ever to null,
// when a world is first cleared).
//
// What governing actually produces (real-time wood/gold/iron/gem income)
// is explicitly NOT part of this function - still undecided/unbuilt, per
// this session's direction to ship the assignment/naming UI first and
// figure out production afterward.
export function appointGovernor(save: SaveGame, worldId: WorldId, heroId: HeroId, name?: string): SaveGame {
  const region = save.clearedWorlds[worldId];
  if (!region) {
    throw new Error(`cannot appoint a governor to ${worldId}, which isn't a cleared world`);
  }
  if (region.governorHeroId) {
    throw new Error(`${worldId} already has a governor`);
  }
  const hero = save.heroes.find((candidate) => candidate.heroId === heroId);
  if (!hero) {
    throw new Error(`cannot appoint ${heroId} as governor - not in this save's roster`);
  }
  if (!isHeroEnlistable(hero)) {
    throw new Error(`cannot appoint ${heroId} as governor - not idle (already governing/recovering/enlisted)`);
  }

  return {
    ...save,
    clearedWorlds: {
      ...save.clearedWorlds,
      [worldId]: { ...region, governorHeroId: heroId, name: name?.trim() ? name.trim() : region.name },
    },
    heroes: save.heroes.map((candidate) =>
      candidate.heroId === heroId ? appointHeroAsGovernor(candidate, worldId) : candidate,
    ),
  };
}
