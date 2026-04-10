# Game Mode & State Transition — Execution Plan

## Objective

Full test coverage for all 5 game modes and their state machine transitions, ensuring games can successfully start, progress through all states, complete, restart, and handle player events (death, left, forfeit, restart) correctly at each phase.

## Background

The game uses a state machine pattern (`BaseMode<T>` → `BaseState<T>[]`) where:
- Each mode defines an ordered state sequence (10–13 states)
- States are consumed via `shift()` — each `nextState()` call advances to the next
- When all states are exhausted, the mode restarts by emitting `EVENT_SET_GAME_MODE`
- `GlobalGameData.matchState` tracks the lifecycle: `modeSelection → preMatch → inProgress → postMatch`

### 5 Game Modes

| Mode | Trigger | States | Special Behavior |
|------|---------|--------|-----------------|
| **StandardMode** | Default (no promode, no capitals, no W3C) | 10 | Basic Risk gameplay |
| **PromodeMode** | `Promode=1` or `Promode=3` (chaos) | 10 | Promode-specific countdown/loop |
| **CapitalsMode** | `GameType='Capitals'` | 13 | Capital selection + distribution |
| **W3CMode** | `W3C_MODE_ENABLED=true` | 11 | All states wrapped for early victory, best-of-3 |
| **EqualizedPromodeMode** | `Promode=2` | 10 | 2-round fair system, auto-restart after Round 1 |

### Mode Selection Priority (in `EventCoordinator.applyGameMode`)

```
if gameType == 'Capitals' → CapitalsMode
else if W3C_MODE_ENABLED → W3CMode  
else if isEqualizedPromode() → EqualizedPromodeMode
else if isPromode() || isChaosPromode() → PromodeMode
else → StandardMode
```

## Steps

### Step 1: Extract pure game-mode-logic.ts
- [x] Create `src/app/utils/game-mode-logic.ts` with pure functions
- [x] `resolveGameMode(settings)` — mirrors `applyGameMode` priority logic
- [x] `getStateSequence(modeName)` — returns expected state class names in order
- [x] `validateStateSequence(sequence)` — checks invariants (starts with UpdatePlayerStatus, ends with Reset)
- [x] `transitionMatchState(current, event)` — match state machine transitions
- [x] `canRestart(matchState, isFFA)` — restart eligibility logic
- [x] `resolveRound(currentRound, round1Winner, round2Winner)` — equalized promode round resolution

### Step 2: Test mode selection routing
- [x] Standard mode selected when no special flags
- [x] Promode selected when Promode=1
- [x] Chaos promode selected when Promode=3 (same mode class as promode)
- [x] EqualizedPromode selected when Promode=2
- [x] Capitals mode selected when GameType='Capitals' (overrides promode)
- [x] W3C mode selected when W3C_MODE_ENABLED (overrides all except capitals)
- [x] Capitals + W3C → Capitals wins (capitals is checked first)

### Step 3: Test state sequences per mode
- [x] StandardMode has exactly 10 states in correct order
- [x] PromodeMode has exactly 10 states in correct order
- [x] CapitalsMode has exactly 13 states in correct order
- [x] W3CMode has exactly 11 states in correct order
- [x] EqualizedPromodeMode has exactly 10 states in correct order
- [x] All modes start with UpdatePlayerStatusState
- [x] All modes end with ResetState
- [x] All modes contain SetupState (always 2nd)
- [x] All modes contain a GameLoop variant
- [x] All modes contain a GameOver variant

### Step 4: Test match lifecycle transitions
- [x] Initial state is 'modeSelection'
- [x] modeSelection → preMatch (via SetupState)
- [x] preMatch → inProgress (via GameLoopState)
- [x] inProgress → postMatch (via victory or last player)
- [x] postMatch → preMatch (via ResetState + mode restart)
- [x] Invalid transitions are rejected (e.g. modeSelection → postMatch)
- [x] matchCount increments on each preMatch entry

### Step 5: Test player events at each lifecycle phase
- [x] Player death during inProgress → check victory conditions
- [x] Player left during inProgress → check victory conditions  
- [x] Player forfeit → delegates to onPlayerDead with forfeit=true
- [x] Player restart during postMatch (non-FFA) → advance to ResetState
- [x] Player restart during postMatch (FFA) → blocked with error
- [x] Player restart during inProgress (single human) → set postMatch
- [x] Last active player standing → auto-postMatch

### Step 6: Test W3C mode wrapping
- [x] State wrapping preserves all original state handlers
- [x] onPlayerLeft checks human count, terminates if <2
- [x] onEnterState checks human count, terminates if <2
- [x] onPlayerForfeit checks human count, terminates if <2
- [x] Non-termination case: original handler runs normally
- [x] Best-of-3 logic: winner after 2 wins triggers CustomVictoryBJ
- [x] No winner after 1 win: continues to next round

### Step 7: Test EqualizedPromode round system
- [x] Round 1 end → stores winner, sets round to 2, auto-restarts
- [x] Round 2 end → determines overall winner
- [x] Same player wins both rounds → win recorded
- [x] Different players win each round → no win recorded
- [x] Manual restart blocked during Round 1→2 transition
- [x] Manual restart allowed after Round 2
- [x] Round data reset after Round 2 for next pair

### Step 8: Test restart/reset cycle
- [x] ResetState runs cleanup steps in order
- [x] After ResetState, mode emits EVENT_SET_GAME_MODE (restart)
- [x] Restarted mode creates fresh state sequence
- [x] stateData preserved across restarts (matchCount increments)
- [x] Multiple restart cycles work correctly (3+ consecutive games)

## Validation

- ✅ All 535 tests pass (`npm test`) — 18 files
- ✅ Lint clean — 0 errors, 11 warnings (all pre-existing)
- ✅ No production code changes — pure logic extraction only
- ✅ 132 new tests in `tests/game-mode-logic.test.ts`
