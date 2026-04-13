# Game Mode Simulation Analysis

## Objective

Simulate complete game start, mode picking, game state transitions, and terminations for **FFA** (StandardMode) and **Promode 1v1** (PromodeMode) without the WC3 runtime.

---

## What Can Be Simulated Today (No Production Changes Needed)

The existing pure logic module (`src/app/utils/game-mode-logic.ts`) already covers:

| Feature | Function | Tests |
|---------|----------|-------|
| Mode selection routing | `resolveGameMode()` | 8 tests |
| State sequences per mode | `getStateSequence()` | 20+ tests |
| State sequence invariants | `validateStateSequence()` | 5+ tests |
| Match lifecycle FSM | `transitionMatchState()` | 6 tests |
| Restart logic | `canRestart()` | 4 tests |
| Player event routing | `resolvePlayerEvent()` | 15+ tests |
| State machine queue simulation | `simulateStateMachine()` | 3 tests |

These test **decision logic** but not **game flow** — they verify individual functions, not connected sequences of state transitions with player events happening mid-game.

---

## What Needs New Pure Logic Extraction

To simulate complete FFA and Promode 1v1 games, we need to model:

### 1. Turn Progression Logic

**Production location:** `GameLoopState.onEnterState()` (lines 52–93)

The game loop runs a `CreateTimer` that ticks every `TICK_DURATION_IN_SECONDS`, decrementing `tickCounter`. When it reaches 0, a new turn starts.

**Pure logic to extract:**
```typescript
interface TurnResult {
  newTickCounter: number;
  turnEnded: boolean;
  newTurnNumber: number;
}
function processTick(tickCounter: number, turnNumber: number, turnDuration: number): TurnResult
```

**WC3 dependencies to abstract away:** `CreateTimer`, `TimerStart`, `PauseTimer`, `DestroyTimer` — all timer management. The tick/turn math is pure.

### 2. Victory Check Logic

**Production locations:**
- `GameLoopState.endIfLastActivePlayer()` — checks if only 1 active entity remains
- `VictoryManager.haveAllOpponentsBeenEliminated()` — callback-based check
- `VictoryManager.updateAndGetGameState()` — updates `GAME_VICTORY_STATE`

**Pure logic to extract:**
```typescript
type VictoryState = 'UNDECIDED' | 'TIE' | 'DECIDED';
function checkVictory(activePlayers: number, citiesToWin: number, cityCounts: Map<string, number>): VictoryState
function shouldMatchEnd(activePlayers: number): boolean
```

**WC3 dependencies:** None for the core math. `VictoryManager` wraps player/team queries but the decision is pure.

### 3. Promode Auto-Loss Logic

**Production location:** `ProModeGameLoopState.onEndTurn()` (lines 10–77)

At end of each turn, checks if any participant has ≤ half the opponent's city count. If so, they're eliminated.

**Pure logic to extract:**
```typescript
interface PromodeAutoLossResult {
  eliminated: string[];
  warnings: string[];
}
function checkPromodeAutoLoss(
  participants: { id: string; cityCount: number }[],
  warningRatio: number
): PromodeAutoLossResult
```

**WC3 dependencies:** `ParticipantEntityManager` queries and `localMessage` calls. Core math is pure.

### 4. Fog/Day-Night Cycle Logic

**Production location:** `GameLoopState.updateFogSettings()` (lines 115–166)

Phase calculation: `(turn - 1) % 4` maps to dusk/night/dawn/day.

**Pure logic to extract:**
```typescript
type DayPhase = 'day' | 'dusk' | 'night' | 'dawn';
function getDayPhase(turn: number): DayPhase
function getTimeOfDay(phase: DayPhase): number
function isFogActive(phase: DayPhase): boolean
```

**WC3 dependencies:** `SetTimeOfDay`, `SetTimeOfDayScale` — pure setters.

### 5. Player Elimination Flow

**Production locations:**
- `BaseState.onPlayerDead()` — finalizes rating, calls `onPlayerDeadHandle()`
- `GameLoopState.onPlayerDead()` — applies eliminated buff in FFA, checks victory
- `onPlayerDeadHandle()` in `on-player-status.ts` — messaging, transport cleanup

**Pure logic to extract:**
```typescript
interface EliminationResult {
  playerEliminated: boolean;
  shouldCheckVictory: boolean;
  shouldApplyDebuff: boolean;  // FFA only
  matchShouldEnd: boolean;
}
function processElimination(
  playerId: string,
  isFFA: boolean,
  activePlayersRemaining: number
): EliminationResult
```

### 6. Income Distribution

**Production location:** `GameLoopState.onStartTurn()` — `IncomeManager.giveIncome(player)`

**Pure logic to extract:**
Already extracted in `income-logic.ts`. We can reuse `calculateIncome()` in simulation.

### 7. FFA Restart Blocking

**Production location:** `GameOverState.onPlayerRestart()` (lines 124–130)

FFA blocks restart; non-FFA proceeds to next state (ResetState).

**Already extracted** as `canRestart()` in game-mode-logic.ts.

---

## Simulation Architecture

### Core: `GameSimulation` class

A pure-logic class that models one complete game from mode selection through termination:

```typescript
interface SimPlayer {
  id: string;
  cityCount: number;
  isActive: boolean;
  isHuman: boolean;
}

interface SimConfig {
  mode: 'FFA' | 'Promode1v1';
  playerCount: number;
  citiesToWin: number;
  turnDuration: number;
  nightFogEnabled: boolean;
}

interface SimEvent {
  turn: number;
  type: 'playerDead' | 'playerLeft' | 'cityCapture' | 'forfeit' | 'restart';
  playerId: string;
  targetPlayerId?: string;
}

interface SimTurnSnapshot {
  turn: number;
  phase: DayPhase;
  fogActive: boolean;
  players: SimPlayer[];
  matchState: MatchState;
  victoryState: VictoryState;
  eliminated: string[];  // Players eliminated this turn
}

class GameSimulation {
  // Initialize game
  static createFFA(playerCount: number, citiesToWin: number): GameSimulation
  static createPromode1v1(citiesToWin: number): GameSimulation
  
  // Inject events
  scheduleEvent(event: SimEvent): void
  
  // Run simulation
  runTurn(): SimTurnSnapshot
  runUntilEnd(maxTurns: number): SimTurnSnapshot[]
  
  // Query state
  getMatchState(): MatchState
  getActivePlayers(): SimPlayer[]
  getWinner(): string | undefined
}
```

### What This Enables

1. **FFA simulation:** Start with N players, inject city capture events, verify victory conditions trigger at correct thresholds, verify fog cycle matches expected phase per turn, verify restart is blocked.

2. **Promode 1v1 simulation:** Start with 2 players, inject city captures, verify auto-loss at 2x deficit, verify fog/day-night cycle, verify restart allowed after game over.

3. **Full lifecycle test:** Mode selection → state transitions → game loop → victory → game over → reset → (optional) restart.

---

## What Existing Code Must Change

### No production behavior changes required.

All new logic is **extracted as pure functions** that mirror production behavior. The production code continues to use its WC3-dependent implementations. The pure logic serves as a testable specification.

### New files:
- `src/app/utils/game-simulation-logic.ts` — Pure simulation logic
- `tests/game-simulation.test.ts` — Comprehensive simulation tests
- `docs/game-simulation-analysis.md` — This document

### No modifications to existing files.

---

## Test Plan

### FFA (StandardMode) Scenarios

1. **Basic FFA game flow:** 8 players, one player reaches city threshold → victory
2. **Player elimination cascade:** Players die one by one until 1 remains
3. **Player leave during game:** Leave triggers elimination check, may end game
4. **Fog/night cycle:** Verify phase transitions across turns (day→dusk→night→dawn→day)
5. **Turn progression:** Tick counter decrements correctly, turns advance
6. **Restart blocked in FFA:** Verify restart is always rejected
7. **Income distribution:** Verify income given to active players each turn start

### Promode 1v1 Scenarios

8. **Basic 1v1 flow:** 2 players, one reaches city threshold
9. **Auto-loss at 2x deficit:** Player with ≤ half opponent's cities auto-eliminated
10. **Warning at approaching deficit:** Warning message generated near 2x threshold
11. **Forfeit handling:** -ff eliminates player, triggers victory
12. **Restart allowed after game over:** Non-FFA allows restart from postMatch
13. **Player leave → automatic win:** Opponent wins when player disconnects

### Cross-Mode Scenarios

14. **Mode selection → correct state sequence:** FFA selects StandardMode (10 states), Promode selects PromodeMode (10 states)
15. **Full lifecycle: mode selection → game → victory → reset → restart:** Multiple game cycles
16. **Match state transitions:** modeSelection→preMatch→inProgress→postMatch→preMatch (restart)

---

## Implementation Order

1. Extract `processTick()`, `getDayPhase()`, `getTimeOfDay()`, `isFogActive()` (turn/fog logic)
2. Extract `checkVictory()`, `shouldMatchEnd()` (victory logic)  
3. Extract `checkPromodeAutoLoss()` (promode-specific)
4. Extract `processElimination()` (player death flow)
5. Build `GameSimulation` class combining all above
6. Write FFA scenario tests (7 tests)
7. Write Promode 1v1 scenario tests (6 tests)
8. Write cross-mode lifecycle tests (3 tests)
9. Run full regression suite
