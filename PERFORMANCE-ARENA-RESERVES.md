# Performance impact of the Arena and Reserves game types on Standard mode

**Verdict:** neither game type measurably costs a Standard (FFA) game anything. Both stay switched off unless their
game type is picked, and a Standard game only ever reaches a few early-exit checks.

This covers every place where Arena or Reserves code is reached during a Standard game, checked against the code
(Reserves: commit `7fec82c`, Arena: the Arena game type changes).

## Code that runs during the match

| Where | Runs when | Added cost in Standard | From |
|---|---|---|---|
| `src/app/triggers/enter-region-event.ts` / `leave-region-event.ts`: `isArena()` check at the top | Every time a unit enters or leaves a city area (the most frequent event in this list) | 1 singleton lookup + 1 number comparison, then the normal guard logic runs unchanged | Arena |
| `src/app/city/city.ts` `validGuardHandler`: `IsUnitHidden(unit)` | Once per candidate unit whenever a guard is validated or replaced (region events, guard deaths) | 1 cheap native call per candidate unit. **The largest added cost, still negligible** | Reserves |
| `src/app/triggers/unit-trained-event.ts`: `ReserveManager.registerUnit` | Every trained unit | 1 method call that returns straight away (`if (!this.isActive) return`) | Reserves |
| `src/app/spawner/spawner.ts`: `ReserveManager.registerUnit` | Every spawned unit | Same early return | Reserves |
| `src/app/city/components/guard.ts` (`set` / `release`): `ReserveManager.registerUnit` | Every guard change | Same early return | Reserves |
| `src/app/triggers/spell-effect-event.ts`: `SEND_TO_RESERVES` case | Only when that ability is cast | **0**: units only get the ability when Reserves is active | Reserves |

## Once per match or less

| Where | Runs when | Added cost in Standard | From |
|---|---|---|---|
| `EnableReservesState` in `StandardMode` | Once per match | 1 extra state transition + 1 check | Reserves |
| `ResetState`: `ReserveManager.reset()` | Once per restart | Early return | Reserves |
| `SetupState`: 3× `isArena()` | Once per match | 3 comparisons | Arena |
| `mode-selection.ts` / `event-coordinator.ts` | Once per game | A couple of comparisons | Arena |

## Never runs in Standard (zero cost)

| What | Detail |
|---|---|
| Reserves triggers, timers, buttons, hotkeys, budget tick | Only created inside `ReserveManager.activate()`, which only the Reserves game type calls |
| `ArenaManager` (terrain flood fill, boundary timer, army spawns, hidden and disarmed cities) | Never created in Standard - even its constructor doesn't run, because nothing asks for it |
| Arena states, round timer, session board live K/D and W/L/D markers | Only Arena and promode use the session board; Standard has none |
| Unit damage trigger (`unit-damaged-event.ts`) | Unchanged - no Arena code in it |

## Map size and load time

| What | Detail |
|---|---|
| Script size | About 1,600 more lines of Lua for Arena and about 900 for Reserves. Slightly larger map file and a few KB more memory; no ongoing CPU cost |
| Settings created at load (`UNIT_GOLD_COSTS`, `ARENA_ARMIES`, arena list) | A few small tables built once at map start |
| Admiral removal | Marginally *less* work: one fewer entry in the unit statistics tracking (`TRACKED_UNITS`) |

## Getting it to exactly zero (optional, not done)

The only checks that run often are the four high-frequency rows of the first table. Leaving out `IsUnitHidden` (it is
required), the other three could be removed completely:

- register the Arena check on the region triggers only when Arena is picked;
- call `ReserveManager.registerUnit` only when Reserves is active.

That would mean extra wiring for a gain no one could measure, so it is left as is.
