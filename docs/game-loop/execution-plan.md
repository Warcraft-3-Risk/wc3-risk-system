# Game Loop Bug Fixes — Execution Plan

## Bugs

- [x] **Bug 1 — Promode 1v1**: `-ff` works, but `-ng` doesn't always restart the game
- [x] **Bug 2 — Promode 1v1**: `-ng` doesn't work at all when someone wins by city condition
- [x] **Bug 3 — Promode 2v2 (teams)**: City condition win message displays but the game doesn't end

Root causes:
- The disconnect between `GAME_VICTORY_STATE` being set to `DECIDED` and `matchState` being set to `postMatch`
- `onPlayerRestart()` in `GameLoopState` being a no-op for multi-player games

---

## Analysis

### Bug 1 & 2: `-ng` doesn't restart (or is inconsistent)

- [x] Confirm `GameLoopState.onPlayerRestart()` only fires for single-player (`humanPlayersCount === 1`)

**File:** `src/app/game/game-mode/base-game-mode/game-loop-state.ts` (lines 341–346)

```typescript
onPlayerRestart(player: ActivePlayer) {
    const humanPlayersCount = PlayerManager.getInstance().getHumanPlayersCount();
    if (humanPlayersCount === 1) {
        GlobalGameData.matchState = 'postMatch';
    }
}
```

In a 1v1 with 2 humans, this is a no-op — typing `-ng` during the game loop does nothing.

- [x] Confirm `GameOverState.onPlayerRestart()` is the only working handler, but requires precise timing

**File:** `src/app/game/game-mode/base-game-mode/game-over-state.ts` (lines 61–66)

```typescript
override onPlayerRestart(player: ActivePlayer) {
    if (SettingsContext.getInstance().isFFA()) {
        LocalMessage(..., "You can not restart in FFA mode!");
    } else {
        this.nextState(this.stateData);
    }
}
```

The "sometimes works" behavior is a timing race — player must type `-ng` during the brief `GameOverState` window.

### Bug 3: City condition win doesn't end the game in 2v2

- [x] Confirm `onTick()` sets `GAME_VICTORY_STATE = 'DECIDED'` but does NOT set `matchState = 'postMatch'`

**File:** `src/app/game/game-mode/base-game-mode/game-loop-state.ts` (lines 222–224, 197–200)

Timer loop flow:
1. `onTick()` calls `VictoryManager.updateAndGetGameState()` → sets `GAME_VICTORY_STATE = 'DECIDED'`
2. `isMatchOver()` checks `matchState == 'postMatch'` — still `'inProgress'` at this point
3. `matchState` is only set to `'postMatch'` inside `onEndTurn()`, which runs when `tickCounter <= 0`

Gap: victory is detected mid-tick, message is shown, but `matchState` isn't updated until the turn ends.

- [x] Confirm `updateAndGetGameState()` does NOT set `GlobalGameData.leader` for city victories

**File:** `src/app/managers/victory-manager.ts` (lines 100–108)

```typescript
if (playerWinCandidates.length == 1) {
    VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
    // GlobalGameData.leader is never set here!
}
```

This means `addWinToLeader()` in `GameOverState` may use a stale/incorrect leader.

---

## Implementation

### Fix 1: Set `matchState` immediately when victory is decided

- [x] Edit `onTick()` in `src/app/game/game-mode/base-game-mode/game-loop-state.ts`
- [x] After `updateAndGetGameState()`, check if `DECIDED` and set `matchState = 'postMatch'`

```typescript
onTick(tick: number): void {
    VictoryManager.getInstance().updateAndGetGameState();

    if (VictoryManager.GAME_VICTORY_STATE == 'DECIDED') {
        GlobalGameData.matchState = 'postMatch';
    }

    ScoreboardManager.getInstance().updatePartial();
}
```

Fixes **Bug 3** — game ends on the same tick the city victory is detected.

### Fix 2: Set `GlobalGameData.leader` on city victory

- [x] Edit `updateAndGetGameState()` in `src/app/managers/victory-manager.ts`
- [x] When a single city victor is found, set them as leader

```typescript
} else if (playerWinCandidates.length == 1) {
    GlobalGameData.leader = playerWinCandidates[0];
    VictoryManager.GAME_VICTORY_STATE = 'DECIDED';
}
```

Ensures `addWinToLeader()` uses the correct winner for promode best-of series tracking.

### Fix 3: Make `-ng` work reliably regardless of state

- [x] Edit `onPlayerRestart()` in `src/app/game/game-mode/base-game-mode/game-loop-state.ts`
- [x] Remove the `humanPlayersCount === 1` guard

```typescript
onPlayerRestart(player: ActivePlayer) {
    GlobalGameData.matchState = 'postMatch';
}
```

Fixes **Bug 1** and **Bug 2** — `-ng` works during the game loop, not just during `GameOverState`.

> **Consideration:** Should `-ng` require consent from both players (like a vote)? Currently no voting mechanism exists — a single player can force a restart. This is existing behavior in `GameOverState`; this fix just extends it to work during the game loop too. If a vote is desired, that would be a separate feature.

---

## Files to Change

- [x] `src/app/game/game-mode/base-game-mode/game-loop-state.ts` — Update `onTick()` to set `matchState` when `DECIDED`; update `onPlayerRestart()` to remove single-player guard
- [x] `src/app/managers/victory-manager.ts` — Set `GlobalGameData.leader` in `updateAndGetGameState()` for city victories

---

## Testing

### Scenario 1: Promode 1v1 — `-ng` during game
- [ ] Start promode 1v1
- [ ] During the game (before anyone wins), type `-ng`
- [ ] **Expected:** Game ends and restarts a new round

### Scenario 2: Promode 1v1 — `-ng` after city win
- [ ] Start promode 1v1
- [ ] Let a player reach the city count to win
- [ ] After the round ends, type `-ng`
- [ ] **Expected:** Game restarts a new round

### Scenario 3: Promode 1v1 — `-ff` then `-ng`
- [ ] Start promode 1v1
- [ ] One player types `-ff`
- [ ] Then type `-ng`
- [ ] **Expected:** Game restarts a new round (regression test)

### Scenario 4: Promode 2v2 — city condition win
- [ ] Start promode 2v2 (teams)
- [ ] One team reaches the city count to win
- [ ] **Expected:** Game ends, shows game over screen with correct winner
- [ ] Type `-ng`
- [ ] **Expected:** Game restarts a new round

### Scenario 5: Promode 2v2 — elimination win (regression)
- [ ] Start promode 2v2 (teams)
- [ ] Eliminate all members of one team
- [ ] **Expected:** Game ends (same as before)

### Scenario 6: Win tracker correctness
- [ ] Play a promode best-of series
- [ ] Win rounds via city condition
- [ ] **Expected:** Win tracker shows correct score, series ends at the right time
