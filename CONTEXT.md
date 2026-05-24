# wc3-risk-system Context

This file defines project vocabulary that should stay consistent across code,
tests, docs, and architecture discussions.

## Domain Terms

### City

A capturable map location. A city owns a barracks, a circle of power, and a
city guard. The city owner is the player credited with owning the city.

### City Guard

The unit currently assigned to defend a city. A city guard is tracked in
`UnitToCity`, carries guard marker state, and is repositioned to the city's
guard coordinates when assigned.

### Guard Candidate

A living, unloaded, non-structure, non-transport, non-dummy unit that can become
a city guard. Candidate selection may search defender-owned units, defender-allied
units, attacker-affiliated units, or create a dummy guard when no candidate is
available.

### Dummy Guard

A synthetic guard unit created when no real guard candidate can be assigned.
Dummy guards should be owned by the player that the guard death resolution says
owns the city after the death.

### Raw Owner

The Warcraft III player slot returned by `GetOwningPlayer(unit)`. For shared-slot
units this is the physical slot that owns the unit, not necessarily the active
match player who controls it.

### Effective Owner

The active match player that should receive gameplay credit/control for a raw
owner. For a shared slot, this is the player recorded by `SharedSlotManager`. For
a normal player slot, this is the raw owner.

### Tracked Match Player

A player handle present in `PlayerManager.players`. Empty slots, observer-only
slots, neutral slots, and freed shared slots are not tracked match players.

### Shared Slot

A non-active player slot assigned to an active match player to reduce unit lag.
Units can physically belong to the shared slot while logically belonging to the
effective owner.

### Freed Shared Slot

A shared slot that has been removed from `SharedSlotManager` ownership mappings,
usually because all units on that slot died and the slot was redistributed.
After this point, resolving a unit by raw owner alone can return an empty player
slot instead of the original effective owner.

### Death Context

A snapshot captured at the start of a unit death event. It records the dying
unit, killing unit, raw owners, and effective owners before shared-slot unit
counts or redistribution can mutate owner mappings.

### Guard Death Resolution

The process that decides which unit becomes the new city guard and which player
owns the city after a guard dies. It should consume a death context rather than
re-resolving mutable owner state after redistribution.

## Architectural Terms

### Module

Anything with an interface and an implementation.

### Interface

Everything a caller must know to use a module correctly: types, invariants,
ordering, error modes, and configuration.

### Seam

Where a module's interface lives; a place behavior can change without editing
the caller.

### Adapter

A concrete implementation at a seam, usually translating between domain logic
and Warcraft III runtime handles or globals.

### Locality

Change, bugs, and knowledge concentrated in one module instead of spread across
many callers.

### Leverage

The behavior callers get from a module relative to how much of its interface
they must understand.
