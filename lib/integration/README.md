# lib/integration

The adapter boundary between `lib/game` (game rules, owned by Claude) and
`lib/world` (map generation/rendering, owned by Codex), per
`docs/CLAUDE_HANDOFF.md`. `lib/game` must not import `lib/world`, React, or
Three.js directly; anything `lib/game` needs from the generated map is
defined here as a type/contract, and supplied by whoever wires the two
sides together once `docs/WORLD_ENGINE_ARCHITECTURE.md`'s migration is far
enough along to merge.

## Wired so far

- `movement-cost.ts` — `MovementCost`, the per-hex entry-cost callback
  `lib/game/movement.ts`'s pathfinding (`reachableHexes`/`shortestPath`/
  `moveUnit`) calls instead of reading terrain itself. Tests currently pass
  a flat cost-1 function; the real implementation will read
  `lib/world`'s generated terrain once the two sides agree on terrain
  categories (see below).

## Not yet wired (tracked, not implemented)

These are called out in code comments across `lib/game` (`city.ts`,
`world-entry.ts`, `map-candidates.ts`) and `docs/SYSTEM_LAYER.md`'s "연동
계약" section; listed here as one index so both sides know what's still
open. None of these have an interface yet - adding one before the
underlying rule is agreed would just be a second thing to keep in sync by
hand.

- **Terrain categories.** `lib/world`'s `CoastKind`
  (`land`/`beach`/`cliff`/`shallow`/`deep`) and cluster terrain
  (`forest`/`mountain`/`hill`/`wetland`) aren't yet mapped to anything
  `MovementCost` implementations or combat/city rules can reference by
  name.
- **Hero/unit spawn placement.** `world-entry.ts` uses a flat, unseeded
  placeholder position instead of a real "start near your faction, N
  passable hexes from the edge" placement, because that needs real terrain
  + faction-position data from the world engine.
- **Outer-territory resource tiles.** `city.ts`'s in-city facilities
  (barracks/farm/market/mine) are a distinct concept from occupying a
  terrain resource tile outside a city's borders (mines/farms/markets a
  unit can be sent to hold) - the latter depends on real terrain and is
  deferred.
- **`MapTypeId`/`MapTierId`.** `lib/game/world.ts` currently duplicates
  these (and their display info) by hand from `app/world-prototype.tsx`
  rather than importing them, per the no-cross-import boundary. Once
  `lib/world/config` is mergeable, this should become an import instead of
  a hand-synced copy.

## Explicitly not duplicated

- **Hex coordinates.** `lib/game/hex.ts` independently implements the same
  odd-r offset convention as `lib/world/hex/hex-grid.ts` (row/column,
  identical neighbor formula) so the two already agree on what a
  `{row, column}` means - `lib/game/hex.ts` doesn't import
  `lib/world/hex/hex-grid.ts` (that file also imports `three`, which
  `lib/game` must not depend on), and no second/divergent hex system should
  be introduced. When the branches merge, `lib/game/hex.ts`'s
  non-rendering functions could plausibly be dropped in favor of importing
  from `lib/world/hex` directly - left as-is for now since that's a merge-time
  decision, not a cleanup one.
- **Terrain ID list.** No enum/union of terrain types is defined anywhere
  in `lib/game` - see "Terrain categories" above.
