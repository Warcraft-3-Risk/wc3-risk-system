# Replay POV Detection

## Motivation

In WC3 replays, GetLocalPlayer resolves to the recording player, not the currently observed POV. Systems that depend on viewer POV need a reliable detection method.

## Current Behavior

The project uses leaderboard probing to detect observed POV:

1. Keep a dedicated replay leaderboard handle.
2. Iterate player slots with PlayerSetLeaderboard.
3. Detect active POV via IsLeaderboardDisplayed.
4. Reset leaderboard display state after probe.

This behavior is exposed as getReplayObservedPlayer() in game status utilities.

## Constraints and Safety Rules

- Always reset leaderboard display state during each probe pass.
- Keep probing in existing update flows; avoid extra replay-only timers.
- Treat detection as local UI logic only; do not mutate shared gameplay state.
- Continue using isReplay() to gate POV-specific behavior.

## Known Engine Characteristics

- GetLocalPlayer does not track replay POV switching.
- A small subset of natives reflects observed POV behavior.
- Leaderboard probing is the implemented practical technique for this codebase.

## Source of Truth in Code

- src/app/utils/game-status.ts
- src/app/scoreboard/scoreboard-manager.ts
- src/app/managers/minimap-icon-manager.ts
