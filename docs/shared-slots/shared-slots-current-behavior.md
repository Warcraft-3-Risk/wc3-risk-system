# Shared Slots: Current System Behavior

## Motivation

Shared-slot ownership reduces per-player order saturation by spreading unit ownership across available non-active player handles.

## Current Behavior

Shared slot orchestration is centralized in SharedSlotManager:

- maintains slot-to-player and player-to-slots mappings
- tracks per-slot unit counts
- re-evaluates redistribution as player and unit state changes
- keeps alliance/control relationships aligned with slot assignments

Redistribution is designed to be idempotent and deterministic.

## Redistribution Model

High-level steps:

1. Collect active and eliminated players.
2. Reclaim slots that are truly free (unit count zero and valid eligibility).
3. Keep occupied eliminated slots as pending-free.
4. Build an available pool from reclaimed/unassigned eligible slots.
5. Compute fair target slot counts per active player.
6. Move eligible donor slots and wire receiver ownership.

## Ownership Resolution Contract

Gameplay systems should resolve ownership through manager helpers:

- getOwner(playerHandle)
- getOwnerOfUnit(unit)
- getSharedSlotOrPlayer(player)

Raw handle ownership checks can be wrong when shared slots are active.

## Unit Count Contract

Correct redistribution depends on accurate counts:

- increment on creation/training/reassignment into a slot
- decrement on death/removal from a slot

Count drift leads to delayed or incorrect freeing and redistribution.

## Constraints and Safety Rules

- gated by SHARED_SLOT_ALLOCATION_ENABLED
- deterministic ordering used for stable assignment behavior
- redistribution avoids invalid contexts (for example no active players)
- replay-safe behavior must still respect global handle parity constraints

## Source of Truth in Code

- src/app/game/services/shared-slot-manager.ts
- src/app/game/services/unit-lag-manager.ts
- src/app/triggers/unit-trained-event.ts
- src/app/triggers/unit_death/unit-death-event.ts
- src/app/city/components/guard.ts
- src/app/game/services/distribution-service/standard-distribution-service.ts
