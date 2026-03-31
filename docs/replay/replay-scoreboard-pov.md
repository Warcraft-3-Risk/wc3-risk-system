# Replay Scoreboard POV Switching

## Overview

When viewing a replay, the scoreboard now updates to reflect the perspective of the currently observed player. Switching between player perspectives shows the appropriate board type and highlights the correct "you" row.

## Behavior

- **Player POV**: Shows the standard board (FFA) or team board, with the observed player's row highlighted in tangerine.
- **Observer POV**: Shows the observer board (includes Gold column, combat highlighting, income deltas).
- **Row highlighting**: Tangerine = observed player, green = their allies (team mode), white = others.

## Technical Details

### Handle Parity Constraint

WC3 replays replay recorded actions against a global handle counter. If the Lua environment creates handles (timers, frames, units, etc.) that didn't exist during the live recording, all subsequent handle IDs shift and unit orders target wrong objects — causing a desync.

**Rules for replay-safe code:**
1. Never create handles conditionally based on `isReplay()` (or gate with early return before `Create*` calls).
2. Never start timers that only run during replays — timer expiry events diverge from the recorded game state.
3. `MultiboardDisplay` (board visibility) is safe — it operates on existing handles.
4. `MultiboardGetItem` / `MultiboardSetItemValue` create temporary handles — only call these from the existing game-loop-driven update cycle, never from replay-only timers.

### POV Detection

Uses the leaderboard exploit (`PlayerSetLeaderboard` / `IsLeaderboardDisplayed`) — one of only 3 WC3 natives that respect the replay viewer's selected POV instead of the recording player. See `getReplayObservedPlayer()` in `src/app/utils/game-status.ts`.

### Implementation

- **ScoreboardManager**: `checkReplayPovBoardSwap()` runs inside the existing `updateFull()` / `updatePartial()` calls. When the observed player changes, it swaps visibility between the standard and observer boards.
- **StandardBoard / TeamBoard / SessionBoard**: `GetLocalPlayer()` calls for row coloring are replaced with `isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()` so the highlighted row follows the observed POV.
- **No new timers or handles**: All POV checks piggyback on the existing game loop to avoid desync.

## Files Changed

- `src/app/scoreboard/scoreboard-manager.ts` — POV board swap logic
- `src/app/scoreboard/standard-board.ts` — Replay-aware row highlighting
- `src/app/scoreboard/team-board.ts` — Replay-aware row/ally highlighting
- `src/app/scoreboard/session-board.ts` — Replay-aware row highlighting
