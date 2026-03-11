# Unit Lag Investigation

## The Problem

Warcraft III enforces a **per-player hard cap on the number of orders** that can be queued simultaneously. When a single player owns too many units, new move/attack orders cannot be processed until earlier ones are resolved, causing units to appear unresponsive or "laggy." This lag is **isolated to the individual player** — other players are unaffected.

The root cause is pathfinding: each unit owned by a player that is actively pathing consumes an order slot. Once the cap is hit, the player's units stall.

---

## Current Solution: Client Slot Allocation

The system mitigates this by **splitting each player's units across two WC3 player handles** — the real player and an allocated "client" slot from an unused player slot. This effectively doubles the order queue capacity per human player.

### Key Components

| Component | File | Role |
|-----------|------|------|
| `ClientManager` | [src/app/game/services/client-manager.ts](src/app/game/services/client-manager.ts) | Core singleton that allocates and manages client slots |
| `UnitLagManager` | [src/app/game/services/unit-lag-manager.ts](src/app/game/services/unit-lag-manager.ts) | Coordinates unit tracking and provides alliance-check wrappers |
| `MinimapIconManager` | [src/app/managers/minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts) | Replaces native minimap icons with custom frames so client-owned units show the correct player color |
| `Spawner` | [src/app/spawner/spawner.ts](src/app/spawner/spawner.ts) | Creates units under the client slot instead of the real player |
| Game settings | [src/configs/game-settings.ts](src/configs/game-settings.ts) | `CLIENT_ALLOCATION_ENABLED` master toggle (currently `true`) |

---

## How It Works End-to-End

### 1. Client Slot Allocation (Turn 1)

On the first turn, [`GameLoopState.onStartTurn()`](src/app/game/game-mode/base-game-mode/game-loop-state.ts#L166) calls `ClientManager.allocateClientSlot()`.

The allocation process:
1. **Checks prerequisites**: `CLIENT_ALLOCATION_ENABLED` must be `true`, allocation must not have been done before, and there must be ≤11 active players (constant `MAX_PLAYERS_FOR_CLIENT_ALLOCATION`).
2. **Finds available slots**: Collects empty player slots and players that left with no units/cities via `PlayerManager`.
3. **Assigns one client slot per active player**: Each human player gets an unused WC3 player slot as their "client."
4. **Sets up alliances**: Grants full shared advanced control, shared vision, shared spells, and all alliance flags between the real player and their client (and team allies).
5. **Syncs appearance**: Sets the client slot's color and name to match the real player so units look identical.

After allocation, the scoreboard is refreshed to account for the new shared-control relationships.

### 2. Unit Spawning

In [`Spawner.step()`](src/app/spawner/spawner.ts#L68), units are created under the **client slot** rather than the real player:

```typescript
let u: unit = CreateUnit(
    ClientManager.getInstance().getClientOrPlayer(this.getOwner()),
    this.spawnType,
    GetUnitX(this.unit),
    GetUnitY(this.unit),
    270
);
```

`getClientOrPlayer(player)` returns the client slot if one was allocated, otherwise falls back to the player itself. This is the **fundamental fix** — it distributes pathfinding load across two player handles.

After creation:
- `UnitLagManager.trackUnit(u)` — registers for minimap icon management
- `UnitAddType(u, UNIT_TYPE.SPAWN)` — marks as a spawn unit
- `MinimapIconManager.registerIfValid(u)` — creates custom minimap dot with correct player color
- Unit is tracked in `spawnMap` keyed by the **real owner** (resolved via `ClientManager.getOwnerOfUnit`)

### 3. Ownership Resolution

Since units are technically owned by a different WC3 player (the client slot), all ownership checks go through `ClientManager`:

| Method | Purpose |
|--------|---------|
| `getClientOrPlayer(player)` | Returns the client slot for spawning units |
| `getOwner(player)` | Reverse lookup — given a client slot, returns the real player |
| `getOwnerOfUnit(unit)` | Resolves the real owner of a unit even if owned by a client slot |
| `isPlayerOrClientOwnerOfUnit(unit, player)` | Checks if unit belongs to player or their client |
| `isAnyClientOwnerOfUnit(unit)` | Checks if unit belongs to any client slot |

### 4. Alliance Checks

The `UnitLagManager` provides static wrappers around WC3's native `IsUnitAlly`/`IsUnitEnemy`:

```typescript
public static IsUnitAlly(unit: unit, player: player): boolean {
    return IsUnitAlly(unit, player)
}

public static IsUnitEnemy(unit: unit, player: player): boolean {
    return IsUnitEnemy(unit, player)
}
```

These wrappers are used in guard death handling ([replace-guard.ts](src/app/triggers/unit_death/replace-guard.ts), [allied-kill-handler.ts](src/app/triggers/unit_death/allied-kill-handler.ts), [invalid-guard-handler.ts](src/app/triggers/unit_death/invalid-guard-handler.ts)) to correctly resolve ownership across client slot boundaries.

### 5. Minimap Icon Management

Since units owned by client slots would normally show the wrong color on the minimap, `MinimapIconManager` replaces WC3's native minimap icons entirely:

- **Hides native icons**: Sets `UNIT_BF_HIDE_MINIMAP_DISPLAY = true` on tracked units
- **Creates custom frames**: Uses `BACKDROP` SimpleFrames positioned over the minimap
- **Resolves correct color**: Uses `ClientManager.getOwnerOfUnit()` to look up the real player and apply their color
- **Frame pooling**: Pre-allocates 2,000 frames (`INITIAL_POOL_SIZE`) at initialization to avoid runtime lag spikes
- **Periodic updates**: Runs every 0.2 seconds to update positions (for moving units), colors, and fog-of-war visibility

### 6. Unit Death

When a unit dies:
1. Real owner is resolved via `ClientManager.getOwnerOfUnit()`
2. `UnitLagManager.untrackUnit()` — removes minimap icon, returns frame to pool
3. `Spawner.onDeath()` — decrements the `spawnMap` count (keyed by real owner)

---

## Flow Diagram

```
Game Start
    │
    ▼
Turn 1 → GameLoopState.onStartTurn()
    │
    ▼
ClientManager.allocateClientSlot()
    ├── Find empty/left player slots
    ├── Assign one client slot per active player
    ├── Set alliance (shared advanced control, vision)
    └── Sync names and colors
    │
    ▼
Each Turn → Spawner.step() for each country
    ├── Create units under CLIENT slot (not real player)
    │   └── ClientManager.getClientOrPlayer(owner)
    ├── UnitLagManager.trackUnit(u)
    │   └── MinimapIconManager.registerTrackedUnit(u)
    │       └── Hide native minimap dot → create custom colored frame
    └── Track units in spawnMap keyed by REAL owner
    │
    ▼
Unit Dies → UnitDeathEvent
    ├── Resolve real owner via ClientManager.getOwnerOfUnit()
    ├── UnitLagManager.untrackUnit() → remove minimap icon, return frame to pool
    └── Spawner.onDeath() → decrement spawnMap count
    │
    ▼
Alliance Checks (city capture, guard replacement, etc.)
    └── UnitLagManager.IsUnitAlly / IsUnitEnemy
        └── Native check
```

---

## Configuration

| Setting | Value | Location |
|---------|-------|----------|
| `CLIENT_ALLOCATION_ENABLED` | `true` | [game-settings.ts](src/configs/game-settings.ts#L63) |
| `FORCE_CUSTOM_MINIMAP_ICONS` | `true` | [game-settings.ts](src/configs/game-settings.ts#L125) |
| `MAX_PLAYERS_FOR_CLIENT_ALLOCATION` | `11` | [client-manager.ts](src/app/game/services/client-manager.ts#L16) |
| `INITIAL_POOL_SIZE` (minimap frames) | `2000` | [minimap-icon-manager.ts](src/app/managers/minimap-icon-manager.ts#L38) |

---

## Constraints and Limitations

1. **Player slot requirement**: The system needs at least as many empty player slots as there are active human players. With WC3's 24-slot limit and `MAX_PLAYERS_FOR_CLIENT_ALLOCATION = 11`, it works for games with ≤11 players (leaving ≥13 slots available as clients).
2. **One-time allocation**: Client slots are allocated once on Turn 1 and cannot be re-allocated mid-game.
3. **Scoreboard side effects**: After allocation, the scoreboard must be toggled off/on and fully updated to prevent shared-control clients from overriding display.
4. **Minimap overhead**: Custom minimap icons require a 0.2-second periodic timer and 2,000+ pre-allocated frames, adding some baseline overhead.
5. **Ownership indirection**: Every ownership check in the codebase must go through `ClientManager` rather than using raw `GetOwningPlayer()`, adding complexity throughout the codebase.
