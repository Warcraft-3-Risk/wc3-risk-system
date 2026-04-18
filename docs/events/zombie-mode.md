# Zombie Outbreak Event

## Motivation

A periodic PvE threat that forces players to divert attention from conquest. Neutral zombie units spawn at random cities, attack-move toward players, and convert killed units into new zombies. The outbreak is temporary and self-limiting — it creates chaos and then ends, leaving players to deal with the aftermath.

## Event Rules

### Trigger

The Zombie Outbreak is one of the FFA random events (see [ffa-random-events.md](../gameplay/ffa-random-events.md)). It can fire every 5 turns like any other event in the pool. Announced 1 turn early with outbreak cities highlighted on the minimap.

### Outbreak Behavior

1. **City Selection:** 3–5 random neutral (unowned) cities are chosen as outbreak sites.
2. **Initial Spawn:** Each outbreak city spawns 3 zombie units on activation.
3. **Attack-Move:** Spawned zombies immediately attack-move toward the nearest player-owned city.
4. **Duration:** The outbreak lasts 3 turns. After 3 turns, all event-spawned zombies and their conversions are killed off (removed from the map).

### Zombie Conversion

When a zombie kills a non-building, non-guard player unit:

1. A new zombie is created at the dying unit's location.
2. The new zombie inherits the base zombie unit type (not the victim's type).
3. The new zombie immediately attack-moves toward the nearest player-owned city.

Conversion is **skipped** when:
- The dying unit is a guard — standard guard replacement runs instead. Prevents instant city capture cascades.
- The dying unit is itself a zombie — prevents zombie-on-zombie duplication loops.

### Zombie Unit Type

Zombies use a dedicated unit type (`UNIT_ID.ZOMBIE`). Stats roughly equivalent to Riflemen:

- Low-moderate HP and damage
- Melee or very short range
- No special abilities
- Ground-only (no naval zombies)

Requires a new unit entry in each map's World Editor object data (`.w3x`).

### City Interaction

- Zombies do **not** capture cities. If a zombie kills a guard and no player claims the city, it stays neutral and gets a dummy guard via the existing invalid-guard-handler.
- Outbreak cities are chosen from neutral territory only — never from player-owned cities.

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/app/events/zombie-outbreak.ts` | Event handler: city selection, spawning, conversion, cleanup timer |
| `src/app/events/zombie-spawn-logic.ts` | Pure function for spawn count (testable) |
| `src/configs/zombie-settings.ts` | Balance constants |

### Modified Files

| File | Change |
|------|--------|
| `src/configs/unit-id.ts` | Add `ZOMBIE` unit type ID |
| `src/app/triggers/unit_death/unit-death-event.ts` | Hook zombie conversion on kill (only during active outbreak) |
| `src/app/events/random-event-pool.ts` | Register Zombie Outbreak in the event pool |
| Object data in each `.w3x` map | Add zombie unit definition |

### Constants

**File:** `src/configs/zombie-settings.ts`

```typescript
/** Number of neutral cities chosen as outbreak sites. */
export const ZOMBIE_OUTBREAK_CITY_COUNT_MIN = 3;
export const ZOMBIE_OUTBREAK_CITY_COUNT_MAX = 5;

/** Zombies spawned per outbreak city. */
export const ZOMBIE_SPAWN_PER_CITY = 3;

/** How many turns the outbreak lasts before cleanup. */
export const ZOMBIE_OUTBREAK_DURATION = 3;
```

### Event Handler

**File:** `src/app/events/zombie-outbreak.ts`

Responsibilities:

1. **`activate()`** — Called when the event fires:
   - Pick 3–5 random neutral cities using synced RNG.
   - Spawn `ZOMBIE_SPAWN_PER_CITY` zombie units at each city.
   - Issue attack-move orders toward nearest player-owned city.
   - Track all spawned zombies in a set (for cleanup and conversion tracking).
   - Start a turn counter for duration.

2. **`onZombieKill(dyingUnit, killingUnit)`** — Called from unit death event when the killer is a zombie and the outbreak is active:
   - Skip if dying unit is a guard, building, or zombie.
   - Create new zombie at dying unit's position.
   - Add to tracked set.
   - Issue attack-move toward nearest player city.

3. **`onTurnEnd()`** — Decrement duration counter. When it reaches 0:
   - Kill all tracked zombie units (remove from map).
   - Clear tracked set.
   - Announce outbreak ended.

### Conversion Hook

**File:** `src/app/triggers/unit_death/unit-death-event.ts`

```typescript
if (zombieOutbreakActive && killingUnit && GetUnitTypeId(killingUnit) === UNIT_ID.ZOMBIE) {
    ZombieOutbreak.getInstance().onZombieKill(dyingUnit, killingUnit);
}
```

### Nearest-City Targeting

```typescript
function findNearestPlayerCity(x: number, y: number, cities: Iterable<City>): City | undefined
```

Simple min-distance scan over all cities not owned by `NEUTRAL_HOSTILE`. If no player city exists, zombies idle.

## Testing

### Pure Logic Tests (Vitest)

- Spawn count clamped between min/max city count.
- Conversion skipped for guards, buildings, and zombie-on-zombie.
- Duration counter decrements correctly and triggers cleanup.

### Manual Testing

- Outbreak cities are highlighted during preview turn.
- Zombies spawn at chosen neutral cities only.
- Zombie kills convert player units into new zombies.
- Guard kills do NOT convert.
- All zombies are removed after 3 turns.
- No desync in multiplayer.
- Conversion snowball feels containable with concentrated force.

## Edge Cases

- **No neutral cities on map:** Event is skipped, reroll a different event from the pool.
- **Fewer neutral cities than minimum:** Use all available neutral cities.
- **Zombie kills guard, no player nearby:** City stays neutral, dummy guard created. City is not added back to outbreak pool.
- **Unit count concern:** 3–5 cities × 3 zombies = 9–15 initial. Conversions bounded by player units lost. The 3-turn expiry caps total growth.
- **Naval cities:** Ground-only zombies spawned at port cities will path to nearest land-accessible player city. If no land path exists, they idle.
- **Replay safety:** City selection and spawning use synced RNG, all logic is deterministic. Replay-safe.

## Source of Truth in Code

- `src/app/events/zombie-outbreak.ts` — event orchestration, spawn, conversion, cleanup
- `src/app/events/zombie-spawn-logic.ts` — pure spawn logic
- `src/configs/zombie-settings.ts` — balance constants
- `src/app/triggers/unit_death/unit-death-event.ts` — conversion hook
