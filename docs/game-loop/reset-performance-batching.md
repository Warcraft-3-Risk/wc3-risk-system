# Reset Performance Batching

## Motivation

The match reset flow (triggered by `-ng` after game over) previously executed all WC3 API calls in a single frame. Country resets alone involve `RemoveUnit`, `CreateUnit`, and `SetUnitOwner` for every city's guard, barracks, cop, and spawner — hundreds of calls that caused a visible lag spike. Tree scanning on every mortar/artillery attack event added further per-frame cost during gameplay.

## Current Behavior

### Country Reset Batching

`resetCountries()` is async and processes countries in batches of 5 with a 0.1s yield between batches. This spreads the heavy WC3 API calls (guard rebuild, barracks/cop ownership transfer) across multiple frames.

### Unit Removal Early Exit

`removeUnits()` checks `SharedSlotManager.getUnitCount()` across all player slots before entering the enumeration loop. If no tracked field units exist, it returns immediately — skipping expensive `GroupEnumUnitsOfPlayer` calls entirely.

### Tree Attack Queue

`TreeManager` no longer calls `EnumDestructablesInRect` on every mortar/artillery attack event. Instead:

1. The attack trigger pushes `{x, y}` hit positions into a queue (near-zero cost per attack).
2. A periodic timer (every 10 seconds) drains the queue and batch-scans for nearby trees.
3. The `damagedOrDestroyed` Set deduplicates trees found from overlapping hit positions.

Tree death events still add to the tracking set immediately via the existing death trigger.

### Tree Reset Batching

`TreeManager.reset()` processes damaged/destroyed trees in batches of 100 with 0.1s yields. After restoring life, trees are set invulnerable for 3 seconds (then invulnerability is removed in batches) to prevent immediate re-destruction during the async window.

## Constraints and Safety Rules

- Each `Wait.forSeconds` call creates its own timer — see `wait-timer-concurrency-note.md`.
- `resetCountries()` must be awaited at the call site. Fire-and-forget would cause `this.nextState()` to run before countries finish resetting.
- The hit queue uses a swap-and-drain pattern: the queue reference is replaced with an empty array before processing, so new hits arriving during processing go into the fresh array.
- `SharedSlotManager.reset()` clears `slotUnitCounts`, so the early exit in `removeUnits` works correctly on the second reset onward (counts are zero after the first reset clears them).

## Source of Truth in Code

- `src/app/game/game-mode/utillity/reset-countries.ts` — batched country reset
- `src/app/game/game-mode/utillity/remove-units.ts` — early exit on zero unit count
- `src/app/game/services/tree-service.ts` — hit queue, queue processor timer, batched reset
- `src/app/utils/tree-reset-logic.ts` — pure logic (computeBatches, drainHitQueue)
- `src/app/game/game-mode/base-game-mode/reset-state.ts` — reset orchestration
