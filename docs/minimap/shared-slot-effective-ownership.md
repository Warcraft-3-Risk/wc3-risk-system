# Shared-Slot Effective Ownership On The Minimap

## Motivation

Shared slots let one actual player own more units than a single Warcraft III player slot can comfortably handle. The cost is that some units are raw-owned by helper slots instead of the actual player. Most gameplay code resolves this through effective ownership: a raw shared-slot player maps back to the actual matched player.

The minimap needs that same effective-ownership presentation. This is especially important for the local player's own units. Warcraft III's native minimap uses white to indicate units owned by the local player. A unit owned through a shared slot is effectively yours, but its raw owner is not you, so the native minimap does not show it as white.

That is the core reason custom minimap unit tracking exists.

## Current Behavior

Custom minimap tracking must remain responsible for moving units that need effective-ownership presentation.

Local player-color overrides are still useful, but they are not a complete minimap replacement. Calling `SetPlayerColor` locally can make health bars and other player-color surfaces match the intended color. It does not make Warcraft III's native minimap classify a raw shared-slot unit as owned by the local player.

Example:

- Raw red has three allocated shared slots.
- Units on those shared slots can be locally colored red.
- The actual red player still expects effectively owned units to appear white on the minimap.
- Native minimap blips for those shared-slot units appear as the raw/effective color, not white, because their raw owner is not the local player.

So city-only custom minimap is not currently viable. Cities still need custom minimap rendering for fog memory, and shared-slot units still need custom minimap rendering for local ownership semantics.

## Constraints And Safety Rules

- Do not remove moving-unit custom minimap tracking just because local `SetPlayerColor` fixes health bars.
- Preserve the local player's white minimap ownership cue for units owned through shared slots.
- Keep unit model coloring separate from minimap ownership presentation.
- Keep player-color refreshes separate from minimap ownership presentation.
- Keep player name color coding separate from both unit model color and minimap color.
- Do not let ally color mode refreshes reveal city ownership changes hidden by fog.
- Do not let guard-owner swaps reveal hidden city ownership through fog.
- Treat city minimap memory and moving-unit minimap ownership as related but different responsibilities.

## Responsibility Split

### Unit Model Color

`AllyColorFilterManager.applyColorFilter(unit)` owns unit model color. It should still run after ownership-sensitive events such as spawn, training, transport unload, transport death cargo restoration, guard release, and shared-slot redistribution when needed.

### Player Color And Health Bars

Local `SetPlayerColor` owns health bar and player-color surfaces. It should still refresh during setup, persisted ally color mode load, ally color mode toggles, and start-of-turn shared-slot redistribution.

### Player Names

Color-coded player names own display-name clarity. This prevents alive shared-slot players from appearing with misleading names when local player-color overrides are active.

### City Minimap

Custom city minimap rendering owns fog-safe city memory:

- unexplored cities remain black,
- enemy cities in fog keep their last legally observed color,
- ownership changes under fog do not reveal the new owner,
- ally color mode toggles do not reveal hidden ownership changes,
- camera position overlay tooltip colors follow the intended ally color mode rules.

### Moving-Unit Minimap

Custom moving-unit minimap rendering owns effective minimap ownership:

- local effective-owned shared-slot units can appear as self/white,
- allied shared-slot units can appear as allied,
- enemy shared-slot units can appear as enemy,
- factual ally color mode can show the intended effective/factual player color without losing the self ownership cue.

## Source Of Truth In Code

- `src/app/game/services/shared-slot-manager.ts`: raw slot allocation, effective owner resolution, ownership revision.
- `src/app/managers/minimap-icon-manager.ts`: custom city and moving-unit minimap presentation.
- `src/app/managers/ally-color-filter-manager.ts`: unit model color and local player-color refreshes.
- `src/app/game/game-mode/base-game-mode/setup-state.ts`: setup-time color refresh for persisted ally color mode.
- `src/app/game/game-mode/base-game-mode/game-loop-state.ts`: start-of-turn shared-slot redistribution and color refresh.
- `src/app/spawner/spawner.ts`: spawned unit ownership, tracked-data bookkeeping, color application, minimap registration.
- `src/app/triggers/unit-trained-event.ts`: trained unit ownership, tracked-data bookkeeping, color application, minimap registration.
- `src/app/managers/transport-manager.ts`: transport load/unload and cargo restoration minimap/color paths.
- `src/app/city/components/guard.ts`: guard minimap hiding/release behavior.

## Future Simplification Direction

The current conclusion does not mean the moving-unit minimap code should never be simplified. It means simplification must preserve effective ownership on the minimap.

Promising directions:

- split city minimap code and moving-unit minimap code into separate managers,
- rename moving-unit minimap tracking around effective ownership instead of generic lag handling,
- track only units whose native minimap behavior cannot represent the desired effective ownership,
- reduce transport unload polling to the smallest color/minimap delay Warcraft III requires,
- add tests or manual checklists specifically for shared-slot units appearing white for their effective local owner.

Do not pursue a city-only custom minimap unless native minimap behavior can be made to respect effective ownership, including the local player's white self-ownership cue.
