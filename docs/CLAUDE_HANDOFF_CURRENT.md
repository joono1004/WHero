# Current handoff — 2026-09-08

This file is the current, readable supplement to `CLAUDE_HANDOFF.md`.
Read this first for the live `main` branch state. Production is deployed from
`main` to https://world-in-hero.vercel.app/.

## Codex UI / content implementation update — 2026-08-14 to 2026-09-08

This section supersedes older assumptions that the game UI is only a simple
prototype. The planner and Codex have iterated the playable mobile-landscape
flow extensively. Keep the visual direction below unless the planner changes
it explicitly.

### Visual direction confirmed

- Target play area is **844 × 390 landscape mobile**. The visual language is
  historical strategy: parchment, dark wood, brass/gold trim, readable warm
  text, and restrained blue only for player/positive state.
- First screen is a bright, historical-hero composition with the `영웅스토리
  (HERO STORY)` logo and an illustrated start button. It has gentle
  atmosphere-only animation (light, dust, central gathering burst); avoid
  reintroducing moving hero portrait layers because they caused ghosting.
- Menus, lobby, map, roster, recruiting and treasure screens are now bespoke
  screens, not plain debug panels. Do not replace their asset-driven style
  with generic HTML controls.

### Account, persistence and administration

- Players sign in or register from the **main menu**, using email + password.
  A successful first login proceeds directly to faction naming; a returning
  player continues directly to their progress. The old separate login screen
  is not the desired entry flow.
- Cloud saves and login use Supabase. Player progress is intended to persist
  at safe turn-end points; offline resource accrual is designed around stored
  timestamps. Do not return to local-only guest saves without explicit
  approval.
- Administrator email: `ljhs1004@gmail.com`. `/admin` is desktop-oriented and
  has hero and treasure tabs. Hero/treasure entries are edited individually
  there; CSV import/export was intentionally removed.
- Admin treasure list and treasure editor now show the same treasure art and
  grade badge used in the game. Unknown/new treasure IDs fall back to the
  category icon until their specific art is wired.
- Admin login/registration errors must remain Korean. Do not expose raw
  Supabase English errors.

### Core player flow and lobby

```
first screen -> main menu / sign-in -> faction naming -> first hero choice
-> lobby -> country map / world map -> region -> briefing -> battle map
```

- The lobby is a parchment-on-desk composition. It has player portrait/title,
  resources, mail/bell/system icons, a collapsible system menu, left menu,
  message ribbon and deployed-hero bar.
- The system menu must render above the lobby map **and above the top-bar
  background**. It includes settings, developer mode and exit.
- Developer mode on the world map supports adding/dragging country flags,
  shows country number plus x/y percentage and can export coordinates. It is
  a planner layout tool; positions still require code/data review before
  becoming permanent map content.

### World map / country map rules and art

- A country is a world-map flag point; conquered countries use the conquered
  blue flag. Country flags and their connection lines are separate overlays,
  not baked into the world-map art.
- Lines use a thin blue/gold route style. Their endpoints are deliberately
  offset to the **left** of each flag pole/base to visually meet the intended
  point; do not draw thick bands or dotted cyan lines.
- Only countries connected to conquered countries are revealed. Current test
  graph is below; it is also the implementation/data reference:

  ```
  1 -> 2, 3       2 -> 4, 5       3 -> 6, 8
  4 -> 6, 11      5 -> 6, 8       6 -> 7, 9
  7 -> 10, 12     8 -> 7, 9       9 -> 10, 13
  10 -> 14        11 -> 12        12 -> 13
  13 -> 14        14 -> none
  ```

- Country 1 is the tutorial `매우 작은 섬나라 - 시작섬`; it has one region.
  A region is shown by a castle icon but means a city/county/province-sized
  play area, not necessarily a literal castle.
- Selecting an unconquered region shows a light, compact side information
  panel and a battle button beneath that selected castle. Do not use the old
  large teal information plaque. Conquered regions switch their action to
  `소탕` (its actual rules remain future work).
- World map and country map art use soft edge fading into the lobby parchment.
  World map composition is a landmass that continues to the upper/right as
  unknown land, with sea mainly left/bottom. Do not replace the chosen world
  map asset with a different generated continent.

### Battle briefing and map handoff

- The briefing is a bright commander tent with commanders around a round
  wooden table. The table centre shows a **miniature terrain model**, not a
  literal generated hex-map screenshot or floating tray.
- Player copy is now data-facing: `[나라 이름] - [지역명]` and `목표 : …`.
  Do not restore the earlier `N번째 세계 · 지형 · 규모` copy.
- The briefing should paint first and then begin map preparation in the
  background. Status copy advances through travel/forming-up/prepared states;
  `전투 시작` activates after preparation. The current renderer recreation
  limitation remains described later in this document.

### Hero roster, recruitment and crystals

- Lobby `영웅` opens the historical **영웅정보** screen. Left hero cards show a
  face-focused portrait, hero name, small `출전` toggle, overall grade/level,
  unit/archetype, and a third line for `일반` or `영주 [나라 이름]`.
  At least one hero must remain deployed.
- Centre detail uses five individual attribute grades (통솔/무력/지력/체력/매력)
  with their own grade art and progress requirements. The overall grade is
  the summary, not an independent upgrade track.
- Right side contains **소유 보물** equipment slots and the **가방**. Equipment
  slots are weapon/armor/mount/other. Empty-slot art intentionally has muted
  gold line icons without textual labels.
- The bag has four columns with square cells. Its top/bottom aligns to the
  owned-equipment slot area; fixed-size cells scroll inside the bag rather
  than shrinking to fit. Five full rows should be visible and the sixth may
  be partly visible, indicating more content below.
- Treasures use unique inventory instance IDs (`treasure:<definition-id>:…`).
  Equipping one duplicate must not mark every copy equipped. Clicking a
  treasure in the bag or equipped slot opens a tooltip with name, grade,
  effect, description and equip/unequip action.
- Hero crystals (`SS결정` through `D결정`) are awarded for duplicate hero
  recruitment. They now also open a tooltip: grade art, owned quantity and
  description that they are used to upgrade attributes of heroes of the same
  grade. Crystal upgrade mechanics are still future work.
- `영웅 모집` and `보물 탐색` leave the roster header and open dedicated full
  screens. Hero recruitment uses the existing selection-card design and a
  cloud/light reveal. A single continuous session can show up to **five**
  cards; new cards are added in a centred layout. Duplicate hero claim sends
  crystal art toward the claim button before closing.

### Treasure exploration, equipment and data

- `보물 탐색` is an ancient ruin scene with a closed/open treasure chest,
  treasure-card reveal and the same five-result maximum. The reveal timing and
  cloud effect should match hero recruitment; do not re-add a `?` card.
- Treasure cards use the special orange/gold relic frame, large grade art,
  centred treasure art, two-line effect text when terrain movement applies,
  fixed name position and a two-line left-aligned short description. The card
  is intentionally different from royal hero-card framing.
- Inventory-sized treasure art and reward-card-sized treasure art have
  different visual scales. Reward card art must use its own placement rules;
  do not size it from the small inventory icon.
- Treasure categories and intended simple effect direction:
  - weapon: attack; infantry = sword/dao/axe/mace, cavalry = sword/spear/halberd,
    archer = bow/crossbow/firearm, strategist = fan/art-of-war book;
  - armor: defence;
  - mount: movement, with higher grades also terrain movement bonuses;
  - other: currently health, later may expand to distinct effects.
- Grade baseline: weapons/armor/health treasures run from D `+3` to SS `+20`.
  Mount baseline: D +1, C +2, B +3, A +3 + one terrain, S +3 + two terrains,
  SS +4 + three terrains. Exact balancing remains open.
- `청룡언월도` is categorised as a **cavalry spear** so cavalry Guan Yu can
  equip it. Preserve this explicit exception/decision.

### Current packaged heroes and treasure art

- Hero roster has expanded beyond the original starters. Current named heroes
  include 장포, 위연, 서서, 관우, 제갈량, 조운, 황충, 장비, 하후연, 하후돈,
  허저, 서황, 이순신, 세종대왕, 잔다르크 and 나폴레옹. Their definitions are
  the source of truth; portraits are mapped in `app/game/heroPortraits.ts`.
- All currently defined treasures have individual images in
  `public/art/treasures/`. Runtime mapping lives in
  `app/game/screens/HeroRosterScreen.tsx` (`TREASURE_ART`); keep admin's
  mapping in `app/admin/page.tsx` in sync when adding a new treasure.

### Release safety

- Latest documented UI commit at writing: `be97586` (`Show hero crystal
  details in inventory`). Later commits may exist; check `git log` before
  continuing.
- Build command: `pnpm run build`.
- Production is deployed by pushing the intended tracked files to `main`.
  Never stage user-owned attachments, temp folders or source/reference art
  files listed in the release note below.

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
