# World engine architecture

## Purpose

The world engine is shared infrastructure. It generates deterministic map data
from a seed and exposes that data to both the renderer and the game-rule layer.
Rendering objects such as `THREE.Mesh`, React state, and pointer events must not
be stored in world data.

## Directory ownership

```text
lib/world/
  config/       map tiers, map types, numeric generation thresholds
  model/        shared serializable world and hex types
  hex/          pointy-top odd-row hex coordinates and neighborhood rules
  generation/   seeded terrain, coast, water, river and biome generation
  validation/   deterministic generation and playability checks

components/world/
  React controls, legends and information panels

rendering/world/
  Three.js scene, terrain materials, map objects, camera and pointer input

lib/game/
  turn, faction, city, unit, hero, research and combat rules

lib/integration/
  adapters between generated world data and game rules
```

## Dependency direction

```text
lib/world/model + lib/world/hex
          ↑
lib/world/generation
          ↑
lib/integration ← lib/game
          ↑
rendering/world ← components/world
```

- `lib/world` must not import from `app`, `components`, or `rendering`.
- `lib/game` may use shared hex and world types but must not import Three.js or
  React.
- Rendering reads world/game snapshots. It never decides movement cost, combat
  results, ownership, or save data.
- UI components issue commands and display results. They do not generate maps.

## Current migration status

Completed:

- Map tier and map-type configuration moved to `lib/world/config`.
- Shared coast and diagnostic models moved to `lib/world/model`.
- Hex coordinate and neighbor functions moved to `lib/world/hex`.
- Seed hash and terrain/biome noise moved to `lib/world/generation`.
- Coast, water-body and beach classification moved to
  `lib/world/generation/coast-classifier.ts`.
- Controls, terrain legend and selected-hex popup moved to
  `components/world`.

Pending before gameplay integration:

- Move landmass and biome generation out of `app/world-prototype.tsx`.
- Move river path generation out of the React component.
- Introduce a serializable `WorldMapSnapshot` containing all generated cells.
- Move Three.js terrain/coast/river/object rendering into `rendering/world`.
- Move camera and pointer handling into a controller.
- Add deterministic snapshot and map-validity tests.

These remaining steps should be completed incrementally. Every extraction must
preserve the visible map and the output produced by an existing seed.

## Shared map identity

Every saved or shared map must carry:

```ts
type WorldMapIdentity = {
  seed: number;
  generatorVersion: number;
  tierId: MapTierId;
  mapTypeId: MapTypeId;
};
```

Changing a generation rule requires increasing `generatorVersion` when the
change would produce a different map from the same identity.
