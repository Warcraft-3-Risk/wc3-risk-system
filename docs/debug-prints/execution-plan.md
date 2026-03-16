# Debug Prints — Execution Plan

## Overview

Replace the single `SHOW_DEBUG_PRINTS` boolean with a per-category `DEBUG_PRINTS` config object. The `debugPrint` function gains an optional `category` parameter — callers without a category always print (or use a `general` fallback), so old code keeps working as-is and migration is incremental.

**Total estimated scope:** 3 files changed, ~250 call sites updated across 28 files.

---

## Phase 1 — Infrastructure (no caller changes)

### Step 1.1: Add `DEBUG_PRINTS` config and `DC` constants to `game-settings.ts`

Add the category config object alongside the existing `SHOW_DEBUG_PRINTS` toggle:

```ts
export const DEBUG_PRINTS = {
	master: true,
	ratingSync: true,
	ratingManager: true,
	slotCount: true,
	redistribute: true,
	neutralize: true,
	clientManager: true,
	killTracker: true,
	victory: true,
	drawManager: true,
	gameMode: true,
	transport: true,
	spawner: true,
	events: true,
	city: true,
	player: true,
	unitLag: true,
	minimap: true,
	winTracker: true,
	distribution: true,
};
```

Derive a union type and export a **constants object** (`DC` — short for Debug Category) for compile-time safe usage at call sites:

```ts
export type DebugCategory = keyof typeof DEBUG_PRINTS;

// Compile-time verified constants — use DC.ratingSync instead of 'ratingSync' string literals.
// Adding/removing a key in DEBUG_PRINTS automatically updates this object.
export const DC: { readonly [K in DebugCategory]: K } = Object.keys(DEBUG_PRINTS).reduce((acc, key) => {
	acc[key as DebugCategory] = key;
	return acc;
}, {} as any);
```

> **Why `DC`?** Callers write `DC.ratingSync` instead of `'ratingSync'`. This gives:
>
> - **Compile-time error** if you typo `DC.ratingSnyc` (property doesn't exist)
> - **Autocomplete** — VS Code suggests all valid categories when you type `DC.`
> - **Rename safety** — renaming a key in `DEBUG_PRINTS` via refactor updates `DC` automatically
> - **Find-all-references** — click `DC.ratingSync` to find every call site for that category
>
> The raw `DebugCategory` type is still exported for cases where a string literal is preferred (e.g. in tests), and TypeScript still validates those at compile time.

Keep `SHOW_DEBUG_PRINTS` as-is — it becomes the `master` kill switch until all callers are migrated, then it can be removed in favor of `DEBUG_PRINTS.master`.

### Step 1.2: Update `debugPrint()` signature in `debug-print.ts`

Replace the `...args` rest parameter with a typed `category` parameter. The function checks `master` first, then the specific category. Callers without a category default to always printing (backward compatible):

```ts
import { DEBUG_PRINTS, DebugCategory } from 'src/configs/game-settings';

export function debugPrint(message: string, category?: DebugCategory): void {
	if (!DEBUG_PRINTS.master) return;
	if (category && !DEBUG_PRINTS[category]) return;

	print(`${HexColors.RED}DEBUG:|r ${message}`);

	if (SAVE_DEBUG_LOGS_TO_FILE) {
		DebugLogger.getInstance().addLog(message);
	}
}
```

> **Key change:** The old `...args` rest parameter is **removed**. No callers use it meaningfully today (the one caller in `win-tracker.ts` that passes a second arg is fixed in Step 1.2b below). This is critical because `...args: any[]` would silently swallow invalid category strings — killing compile-time safety.
>
> With this signature, `debugPrint('msg', 'typo')` is a **compile error** because `'typo'` is not assignable to `DebugCategory`.

### Step 1.2b: Fix `win-tracker.ts` caller

The single caller that passes extra args:

```ts
// BEFORE
debugPrint(`Played matches: ${playedMatchCount}`, 'WinTracker');

// AFTER
debugPrint(`Played matches: ${playedMatchCount}`, DC.winTracker);
```

This must happen in Phase 1 since removing `...args` would otherwise cause a build error here.

### Step 1.3: Verify build passes

Run the build after Phase 1. All existing callers that pass only a message string work unchanged. The `win-tracker.ts` caller is already fixed. Any future typo like `debugPrint('msg', 'ratingSnyc')` will now fail the build.

---

## Phase 2 — Migrate callers (incremental, per-subsystem)

Each sub-step adds a `category` parameter to `debugPrint` calls in the listed files. Steps are **independent** and can be done in any order. Each step should be followed by a build check.

The pattern for each call site is:

```ts
import { DC } from 'src/configs/game-settings';

// BEFORE
debugPrint(`[RATING SYNC] ========== SYNC START ==========`);

// AFTER
debugPrint(`[RATING SYNC] ========== SYNC START ==========`, DC.ratingSync);
```

> Each file that gains a category param will need to add `DC` to its imports from `game-settings.ts` (or add the import if one doesn't exist). Using `DC.ratingSync` instead of `'ratingSync'` ensures compile-time verification and enables autocomplete/find-all-references.

- `src/app/rating/rating-sync-manager.ts`

All calls prefixed with `[RATING SYNC]` → add `'ratingSync'` as second arg.

### Step 2.2: `ratingManager` (~25 calls, 1 file)

- `src/app/rating/rating-manager.ts`

All calls prefixed with `[RatingManager]` → add `'ratingManager'`.

### Step 2.3: `slotCount` (~20 calls, 7 files)

- `src/app/game/services/client-manager.ts` — `[SlotCount]` prefixed calls only
- `src/app/spawner/spawner.ts`
- `src/app/triggers/unit-trained-event.ts`
- `src/app/city/components/guard.ts`
- `src/app/game/game-mode/base-game-mode/game-loop-state.ts` — `[SlotCount]` lines only
- `src/app/game/services/distribution-service/standard-distribution-service.ts`
- `src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts` — `[SlotCount]` line only

### Step 2.4: `redistribute` (~25 calls, 3 files)

- `src/app/game/services/client-manager.ts` — `[Redistribute]` prefixed calls only
- `src/app/game/game-mode/base-game-mode/game-loop-state.ts` — `[Redistribute]` lines only
- `src/app/triggers/unit_death/unit-death-event.ts` — `[Redistribute]` line only

### Step 2.5: `neutralize` (~8 calls, 1 file)

- `src/app/game/services/client-manager.ts` — `[Neutralize]` prefixed calls only

### Step 2.6: `clientManager` (~12 calls, 1 file)

- `src/app/game/services/client-manager.ts` — `ClientManager:` prefixed calls (slot allocation, alliances, resets)

### Step 2.7: `killTracker` (~5 calls, 2 files)

- `src/app/managers/unit-kill-tracker.ts`
- `src/app/triggers/unit_death/unit-death-event.ts` — `[KILL TRACKER]`/`[TRACKER]` lines only

### Step 2.8: `victory` (~4 calls, 1 file)

- `src/app/managers/victory-manager.ts`

### Step 2.9: `drawManager` (1 call, 1 file)

- `src/app/managers/w3c-draw-manager.ts`

### Step 2.10: `gameMode` (~30 calls, 9 files)

- `src/app/game/game-mode/mode/w3c-mode.ts`
- `src/app/game/game-mode/mode/base-mode.ts`
- `src/app/game/game-mode/base-game-mode/reset-state.ts`
- `src/app/game/game-mode/base-game-mode/game-loop-state.ts` — non-SlotCount/non-Redistribute calls
- `src/app/game/game-mode/capital-game-mode/capitals-selection-state.ts`
- `src/app/game/game-mode/capital-game-mode/capitals-game-loop-state.ts`
- `src/app/game/game-mode/capital-game-mode/capitals-distribute-state.ts`
- `src/app/game/game-mode/capital-game-mode/capitals-distribute-capitals-state.ts` — non-SlotCount calls
- `src/app/game/game-mode/promode-game-mode/promode-game-loop-state.ts`
- `src/app/game/game-mode/w3c-mode/w3c-game-over-state.ts`
- `src/app/game/game-mode/utillity/remove-units.ts`

### Step 2.11: `transport` (~8 calls, 1 file)

- `src/app/managers/transport-manager.ts`

### Step 2.12: `events` (~1 unique call, 1 file)

- `src/app/triggers/unit_death/unit-death-event.ts` — the bare `Unit Death Event Triggered` message only

### Step 2.13: `city` (~5 calls, 1 file)

- `src/app/city/land-city.ts`

### Step 2.14: `player` (3 calls, 1 file)

- `src/app/player/player-manager.ts`

### Step 2.15: `unitLag` (2 calls, 1 file)

- `src/app/game/services/unit-lag-manager.ts`

### Step 2.16: `minimap` (~18 calls, 1 file)

- `src/app/managers/minimap-icon-manager.ts`

### Step 2.17: `winTracker` (1 call, 1 file)

- `src/app/game/services/win-tracker.ts`
- Already fixed in Phase 1 Step 1.2b — no additional work needed.

### Step 2.18: `distribution` (1 call, 1 file)

- `src/app/game/services/distribution-service/standard-distribution-service.ts`

---

## Phase 3 — Cleanup

### Step 3.1: Remove `SHOW_DEBUG_PRINTS`

Once all callers pass a category:

1. Remove `SHOW_DEBUG_PRINTS` from `game-settings.ts`
2. Remove its import from `debug-print.ts`
3. `DEBUG_PRINTS.master` is now the sole kill switch

### Step 3.2: Remove import-only dead imports

Remove unused `debugPrint` imports from files that have zero active calls (unless you plan to add calls soon):

- `src/main.ts`
- `src/app/triggers/spell-effect-event.ts`
- `src/app/triggers/ownership-change-event.ts`
- `src/app/triggers/city-selected-event.ts`
- `src/app/triggers/unit-upgrade-event.ts`
- `src/app/triggers/unit-issue-order-event.ts`
- `src/app/triggers/unit_death/unit-damaged-event.ts`
- `src/app/triggers/unit_death/handle-guard-death.ts`
- `src/app/quests/quests.ts`
- `src/app/game/game-mode/utillity/on-player-status.ts`

### Step 3.3: Final build & test

Verify the build succeeds and test in-game with various category profiles.

---

## Migration Priority

Recommended order for Phase 2 to cover the most impactful subsystems first:

| Priority | Step | Category        | Why                                            |
| -------- | ---- | --------------- | ---------------------------------------------- |
| 1        | 2.1  | `ratingSync`    | 68 calls — single biggest noise source         |
| 2        | 2.2  | `ratingManager` | 25 calls — second biggest, same subsystem      |
| 3        | 2.10 | `gameMode`      | 30 calls across 9 files — broad state logging  |
| 4        | 2.3  | `slotCount`     | 20 calls — high-frequency per-unit noise       |
| 5        | 2.4  | `redistribute`  | 25 calls — important to isolate from slotCount |
| 6        | 2.16 | `minimap`       | 18 calls — all in one file, easy win           |
| 7        | 2.6  | `clientManager` | 12 calls — completes client-manager.ts         |
| 8        | 2.5  | `neutralize`    | 8 calls — completes client-manager.ts          |
| 9        | 2.11 | `transport`     | 8 calls — one file, easy                       |
| 10       | rest | remaining       | Low call counts — quick cleanup passes         |

---

## Key Design Decisions

1. **Compile-time verified categories via `DC` constants.** Callers use `DC.ratingSync` instead of magic strings. TypeScript rejects typos, enables autocomplete, and supports find-all-references. The `DebugCategory` type is derived from `DEBUG_PRINTS` keys, so adding/removing a category in one place updates everything.

2. **No `...args` rest parameter.** The old `...args: any[]` would silently accept any string in arg2 — defeating type safety. It's removed; all message content must be in the first `message` string (which is already the case for 249 of 250 call sites).

3. **Category in arg2, not a separate function per category.** Keeps the API surface small and avoids 20 wrapper functions.

4. **Optional category = always print.** Backward compatible — uncategorized calls still print when `master` is on. No existing code breaks during incremental migration.

5. **No runtime overhead when disabled.** The check is a simple object property lookup before any string interpolation. Lua compiles template literals eagerly, but the `print()` call (which is the expensive part in WC3) is skipped.

6. **Prefixes stay in the messages.** The `[RATING SYNC]` etc. prefixes in the message strings remain — they're useful for log file grep/search. The category flag just controls whether the message prints at all.
