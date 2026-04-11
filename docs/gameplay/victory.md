# 🏆 Victory & Elimination

> WC3 Risk games end when a player (or team) achieves dominance through city control or elimination of all opponents. This page covers win conditions, overtime mechanics, and player elimination.

[← Back to Wiki Home](./README.md)

---

## Table of Contents

- [Victory Conditions](#victory-conditions)
- [City Count Victory](#city-count-victory)
- [Elimination Victory](#elimination-victory)
- [Overtime](#overtime)
- [Player Status System](#player-status-system)
- [Nomad State](#nomad-state)
- [Victory Flow](#victory-flow)
- [Examples](#examples)

---

## Victory Conditions

There are two ways to win:

```mermaid
flowchart TD
    Check["Victory Check<br/>(every tick)"]
    Check --> E{"Only 1 player/team<br/>remaining?"}
    E -- Yes --> EWin["Elimination Victory<br/>(highest priority)"]
    E -- No --> C{"Any player at<br/>60% cities?"}
    C -- Yes --> Count{"How many at<br/>threshold?"}
    C -- No --> Continue["Game Continues"]
    Count -- 1 Player --> CWin["City Count Victory"]
    Count -- 2+ Players --> Tie["TIE → Overtime Begins"]
```

| Priority | Condition | Description |
|----------|-----------|-------------|
| 1 (highest) | **Elimination** | Only one player/team has living units |
| 2 | **City Count** | One player controls ≥60% of all cities |
| 3 | **Tie → Overtime** | Multiple players at threshold simultaneously |

---

## City Count Victory

The primary win condition — control enough cities to dominate the map.

### Formula

```
citiesNeeded = ⌈totalCities × CITIES_TO_WIN_RATIO⌉
```

### Constants

| Setting | Value | Description |
|---------|-------|-------------|
| `CITIES_TO_WIN_RATIO` | 0.60 | 60% of cities needed to win |
| `CITIES_TO_WIN_WARNING_RATIO` | 0.70 | 70% — remaining cities for warning |

### Cities Needed Per Map

| Map | Total Cities | Cities to Win (60%) | Warning at (70% remaining) |
|-----|-------------|---------------------|-----------------------------|
| **Europe** | 233 | 140 | ~163 |
| **Asia** | 229 | 138 | ~160 |
| **World** | 555 | 333 | ~389 |

### Victory State Machine

```mermaid
stateDiagram-v2
    [*] --> UNDECIDED: Game starts
    UNDECIDED --> DECIDED: 1 player reaches threshold
    UNDECIDED --> TIE: 2+ players reach threshold
    TIE --> DECIDED: Overtime resolves to 1 winner
    TIE --> TIE: Overtime continues (still tied)
    DECIDED --> [*]: Game ends
```

| State | Meaning |
|-------|---------|
| `UNDECIDED` | No player has reached the city threshold |
| `DECIDED` | Exactly one player meets the win condition |
| `TIE` | Two or more players tied at the threshold |

---

## Elimination Victory

If all but one player (or team) are eliminated, the last standing wins immediately — even if they don't hold 60% of cities.

```mermaid
flowchart TD
    Start["Player loses<br/>all cities"] --> Units{"Has surviving<br/>units?"}
    Units -- Yes --> Nomad["Enter NOMAD state<br/>(60 seconds)"]
    Units -- No --> Dead["Marked DEAD"]
    Nomad --> Timer{"60 seconds<br/>elapsed?"}
    Timer -- Still has units --> Alive["Return to ALIVE<br/>if cities recaptured"]
    Timer -- No cities after 60s --> Dead
    Dead --> Check{"Only 1 player/team<br/>remaining?"}
    Check -- Yes --> Victory["Elimination Victory!"]
    Check -- No --> Continue["Game continues"]
```

---

## Overtime

When two or more players reach the city threshold simultaneously, overtime begins.

### Overtime Mechanics

```mermaid
flowchart TD
    Tie["TIE detected:<br/>2+ players at threshold"] --> OT["Overtime begins"]
    OT --> Reduce["Each OT turn:<br/>citiesNeeded -= 1"]
    Reduce --> Check{"Single winner<br/>above new threshold?"}
    Check -- Yes --> Win["Victory declared"]
    Check -- No --> NextTurn["Next OT turn"]
    NextTurn --> Reduce
```

### Formula

```
citiesNeeded(overtime) = max(1, ⌈totalCities × winRatio⌉ - overtimeModifier × turnsInOvertime)
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `OVERTIME_MODIFIER` | 1 | Cities subtracted per overtime turn |

### Example Overtime Progression (Europe, 233 cities)

| OT Turn | Cities Needed | Change |
|---------|--------------|--------|
| 0 (Tie detected) | 140 | — |
| 1 | 139 | -1 |
| 2 | 138 | -1 |
| 3 | 137 | -1 |
| ... | ... | ... |
| 139 | 1 | Minimum |

> Overtime gradually lowers the bar until one player has more cities than the other, preventing infinite games.

---

## Player Status System

Each player has a status that determines their capabilities:

```mermaid
stateDiagram-v2
    [*] --> ALIVE: Game starts
    ALIVE --> NOMAD: Lost all cities (has units)
    ALIVE --> DEAD: Lost all cities (no units)
    ALIVE --> LEFT: Disconnected
    ALIVE --> STFU: Muted by vote

    NOMAD --> ALIVE: Recaptured a city
    NOMAD --> DEAD: 60s timeout / no units
    NOMAD --> LEFT: Disconnected

    DEAD --> LEFT: Disconnected

    STFU --> ALIVE: Mute expires (300s)
    STFU --> NOMAD: Lost cities while muted
    STFU --> LEFT: Disconnected
```

### Status Details

| Status | Color | Income | Units | Duration |
|--------|-------|--------|-------|----------|
| 🟢 **ALIVE** | `\|cFF00FF00Alive\|r` (Green) | Full | Active | Until eliminated |
| 🟠 **NOMAD** | `\|cFFFE8A0ENmd\|r` (Orange) | 4 gold | Active (with debuff timer) | 60 seconds |
| 🔴 **DEAD** | `\|cFFFF0005Dead\|r` (Red) | 1 gold | Debuffed (FFA) / Teammate-controlled (Teams) | Permanent |
| ⬛ **LEFT** | `\|cFF65656ALeft\|r` (Gray) | 0 gold | Abandoned | Permanent |
| 🟡 **STFU** | `\|cfffe890dSTFU\|r` (Gold) | Normal | Active | 300 seconds (5 min) |

---

## Nomad State

Nomad is a grace period for players who lose all cities but still have units.

### Rules

```mermaid
flowchart TD
    Trigger["Player loses<br/>last city"] --> HasUnits{"Has any<br/>surviving units?"}
    HasUnits -- No --> Dead["Immediately DEAD"]
    HasUnits -- Yes --> Nomad["Enter NOMAD<br/>60-second timer starts"]
    Nomad --> Recapture{"Captures a<br/>city?"}
    Recapture -- Yes --> Alive["Return to ALIVE!"]
    Recapture -- No --> Timeout{"60 seconds<br/>elapsed?"}
    Timeout -- No --> Nomad
    Timeout -- Yes --> Dead2["Marked DEAD"]
```

| Parameter | Value |
|-----------|-------|
| Duration | 60 seconds |
| Income | 4 gold/turn (base only) |
| Country bonuses | None (no cities) |

> **Strategic tip:** Nomad players should immediately attempt to recapture a city. The 60-second window gives exactly one turn to mount a comeback.

---

## Victory Flow

Complete victory check flow each tick:

```mermaid
flowchart TD
    Tick["Every 1-second tick"] --> Single{"Only 1 active<br/>player/team?"}
    Single -- Yes --> ElimWin["ELIMINATION VICTORY"]
    Single -- No --> Count["Count cities per player"]
    Count --> Threshold{"Any player at<br/>≥ citiesNeeded?"}
    Threshold -- No --> Undecided["UNDECIDED<br/>Game continues"]
    Threshold -- Yes --> HowMany{"How many<br/>at threshold?"}
    HowMany -- 1 --> CityWin["CITY COUNT VICTORY"]
    HowMany -- 2+ --> TieCheck{"Already in<br/>overtime?"}
    TieCheck -- No --> StartOT["Start OVERTIME<br/>citiesNeeded -= 1/turn"]
    TieCheck -- Yes --> ContinueOT["Continue OVERTIME<br/>citiesNeeded -= 1"]
```

---

## Examples

### Example 1: Standard City Victory (Europe)

```
Map: Europe (233 cities)
Cities to win: 140

Turn 15:
  Player A: 142 cities ✅ (≥ 140)
  Player B: 55 cities
  Player C: 36 cities

→ Result: Player A wins by city count!
```

### Example 2: Elimination Victory

```
Turn 20:
  Player A: 80 cities, 50 units
  Player B: 0 cities, 3 units (NOMAD, 45s remaining)
  Player C: 0 cities, 0 units (DEAD)

Turn 21 (60 seconds later):
  Player A: 85 cities, 55 units
  Player B: 0 cities, 0 units (DEAD — nomad expired)
  Player C: DEAD

→ Result: Player A wins by elimination!
```

### Example 3: Overtime Scenario

```
Turn 30:
  Player A: 141 cities ✅
  Player B: 140 cities ✅
  → TIE detected! Overtime begins.

Overtime Turn 1 (citiesNeeded = 139):
  Player A: 143 cities ✅
  Player B: 138 cities ❌
  → Player A wins! Only one player above new threshold.
```

### Example 4: Nomad Comeback

```
Turn 12:
  Player B loses last city → enters NOMAD (60s timer)
  Player B has 8 Riflemen near an enemy city

Turn 12 (30 seconds later):
  Player B captures an unguarded city
  → Player B returns to ALIVE!
  → Nomad timer cancelled
```

---

## Source Code Reference

| File | Purpose |
|------|---------|
| `src/app/managers/victory-logic.ts` | Pure victory calculation logic |
| `src/app/managers/victory-manager.ts` | Victory state management |
| `src/app/game/game-mode/utillity/on-player-status.ts` | Player status transitions |
| `src/configs/game-settings.ts` | `CITIES_TO_WIN_RATIO`, `OVERTIME_MODIFIER`, `NOMAD_DURATION` |

---

[← Units & Combat](./units.md) · [Back to Wiki Home](./README.md) · [Maps & Territories →](./maps.md)
