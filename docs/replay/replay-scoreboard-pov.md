# Replay Scoreboard POV Behavior

## Motivation

During replay, scoreboard presentation should reflect the currently observed player perspective, including board type and row highlighting.

## Current Behavior

Scoreboard manager performs lightweight POV checks and swaps visibility:

- checkReplayPovBoardSwap() runs in updateFull/updatePartial/updateReplayPov
- observed POV is resolved through getReplayObservedPlayer()
- observer POV shows observer board
- player POV shows standard board

Row highlighting follows observed player context across standard, team, and session scoreboards.

## Constraints and Safety Rules

- No replay-only timers for POV switching.
- Do not create/destroy extra handles in replay-specific branches.
- Use visibility toggles on existing boards.
- Keep POV checks integrated with existing update cadence.

## Handle Parity Rule

Replay paths must preserve handle parity with recorded game behavior. UI visibility operations on existing handles are safe; replay-only handle lifecycle divergence is not.

## Source of Truth in Code

- src/app/scoreboard/scoreboard-manager.ts
- src/app/scoreboard/player-renderer.ts
- src/app/scoreboard/team-renderer.ts
- src/app/scoreboard/session-renderer.ts
- src/app/utils/game-status.ts
