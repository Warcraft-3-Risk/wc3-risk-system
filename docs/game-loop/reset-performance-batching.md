# Reset Performance Batching

## Motivation

The match reset flow (triggered by `-ng` after game over) previously executed all WC3 API calls in a single frame. Country resets alone involve `RemoveUnit`, `CreateUnit`, and `SetUnitOwner` for every city's guard, barracks, cop, and spawner — hundreds of calls that caused a visible lag spike.

## Current Behavior

### Country Reset Batching

`resetCountries()` is async and processes countries in batches of 5 with a 0.1s yield between batches. This spreads the heavy WC3 API calls (guard rebuild, barracks/cop ownership transfer) across multiple frames.

### Unit Removal Early Exit

`removeUnits()` checks `SharedSlotManager.getUnitCount()` across all player slots before entering the enumeration loop. If no tracked field units exist, it returns immediately — skipping expensive `GroupEnumUnitsOfPlayer` calls entirely.

## Constraints and Safety Rules

- Each `Wait.forSeconds` call creates its own timer — see `wait-timer-concurrency-note.md`.
- `resetCountries()` must be awaited at the call site. Fire-and-forget would cause `this.nextState()` to run before countries finish resetting.
- `SharedSlotManager.reset()` clears `slotUnitCounts`, so the early exit in `removeUnits` works correctly on the second reset onward (counts are zero after the first reset clears them).

## Source of Truth in Code

- `src/app/game/game-mode/utillity/reset-countries.ts` — batched country reset
- `src/app/game/game-mode/utillity/remove-units.ts` — early exit on zero unit count
- `src/app/game/game-mode/base-game-mode/reset-state.ts` — reset orchestration
