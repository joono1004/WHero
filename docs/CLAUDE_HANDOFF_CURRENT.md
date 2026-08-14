# Current handoff — 2026-08-14

This file is the current, readable supplement to `CLAUDE_HANDOFF.md`.
Read this first for the live `main` branch state. Production is deployed from
`main` to https://world-in-hero.vercel.app/.

## Product vocabulary confirmed with the planner

- A **country** is the selectable point on the world map.
- A country contains one or more **regions**. The UI currently uses a castle
  icon for a region, but it is only a visual marker: the actual game unit is
  comparable to a city/county/province, not necessarily a castle.
- Selecting a world-map country flag opens that country's map. It must never
  open a battle briefing directly.
- Selecting a region on a country map shows its information. Its **Battle**
  button opens the battle briefing.
- Country 1 is the tutorial: `매우 작은 섬나라 - 시작섬`. It has exactly one
  region, so conquering that one region conquers the country.
- Future countries can have several regions; all of their regions must be
  conquered to conquer the country.

## Current screen flow

```
World map country flag
  -> country map
  -> region/castle marker selected
  -> Battle button
  -> battle briefing
  -> Battle start
  -> generated hex-map battle
```

Relevant implementation files:

- `app/game/screens/GameLobbyScreen.tsx` — world map, country map and region
  selection; `selectCountry` intentionally only opens a country map.
- `app/game/GameEntry.tsx` — routes a regional battle request into
  `battle-briefing`.
- `app/game/screens/BattleBriefingScreen.tsx` — current briefing screen.
- `app/game/screens/MapPlayScreen.tsx` — actual full-screen battle map.

### Important known limitation

`BattleBriefingScreen` begins a hidden `GameWorldMap` preload after the
briefing has painted, so the briefing does not freeze before appearing.
However, clicking **Battle Start** still navigates to `MapPlayScreen`, which
mounts its own map renderer. The generated terrain is deterministic from the
same seed, but the canvas is recreated. If changing this, preserve the
planner's intended behavior: briefing first, background preparation while
heroes can be inspected, then immediate battle display after `전투 시작`.

## Briefing presentation direction

The briefing is a bright daytime **commander's tent**. Historical commanders
stand around a large round wooden table to discuss the operation. It must not
be a dark modal or a generic panel.

Current briefing content for Country 1:

```
매우 작은 섬나라 - 시작섬
목표 : 적 주둔지를 모두 점령하세요.
```

Region names and objectives are deliberately data-driven future work. They
will be fixed when each country/region art is designed. Do not restore the old
`N번째 세계 · 지형 · 규모` player-facing wording.

### Tabletop terrain models

The terrain is not a literal generated hex map preview. It is a low-relief,
miniature war-game model embedded directly in the **pale parchment centre of
the round table**:

- no floating tray, bowl, circular board, or separate map disc;
- very low terrain, tiny forts/flags/trees and shallow resin water;
- terrain itself shows the broad type at a glance;
- the pale parchment area of the table is the measurement reference.

Size rule for future art (measure against the pale parchment centre only):

| Terrain model coverage | Game sizes using it |
| --- | --- |
| 30% | 매우 작은, 작은 |
| 60% | 보통, 큰, 거대 |
| 90% | 초거대, 광대한 |

Therefore each terrain needs only three background/model variants, not seven.

Current starting-island asset, already used by the briefing:

- `public/art/briefing/command-tent-island-sea-v4.png`
  - 30% land model in the table centre;
  - surrounding shallow sea is deliberately much wider than the land, so it
    clearly reads as an island;
  - use this as the visual quality/composition reference.

Related older/intermediate briefing assets remain in the repository but are
not the active reference. Do not reuse the separate circular island tray
design.

## Terrain names and map generator

Current generator IDs in `lib/world/config/map-config.ts` must remain stable
until migration is explicitly agreed. Their current player-facing names are:

| Current ID | Display name |
| --- | --- |
| `inland` | 평야 (renamed from 내륙) |
| `continent` | 섬 (renamed from 대륙) |
| `archipelago` | 군도 |
| `highlands` | 고산 |
| `riverlands` | 대하천 |

Planned future generator types, not yet implemented: **사막, 설산, 화산**.

At full expansion, terrain-model art count is 8 terrain types × 3 model sizes
= 24. For the currently implemented five types, it is 15. The tutorial
starting island can remain its own special 30% asset.

## Account flow

- Main-menu registration is a modal (`MainMenuScreen.tsx`), not a screen
  replacement.
- Registration calls `registerAccountWithEmail` in `app/game/account.ts`,
  which uses Supabase `signUp`, not the guest-account `updateUser` link path.
- Sign-in uses `signInWithEmail`.
- Account errors shown to players must be Korean. Unknown Supabase messages
  intentionally fall back to a generic Korean error rather than revealing raw
  English provider messages.
- Real deletion of Supabase auth users requires a server-side/service-role
  admin flow. The current client can only delete cloud save rows.

## Development / release notes

- Latest handoff baseline commit at writing: `dff48cd` (`Expand sea around
  starter island model`).
- Use `pnpm run build` before handing work back.
- Do not stage user-owned untracked files such as `.codex-remote-attachments/`,
  `tmp/`, generated `*-source.png` files, or `public/art/title/motion/`.
- GitHub `main` is connected to Vercel production. Pushes to main deploy to
  https://world-in-hero.vercel.app/.
