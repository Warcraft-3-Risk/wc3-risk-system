# Wait Timer Concurrency

## Motivation

The game can run multiple async flows at the same time during setup and state transitions. Wait utilities must be concurrency-safe so one flow cannot stall another.

## Current Behavior

Wait is implemented in src/app/utils/wait.ts with one timer created per wait call:

1. CreateTimer per invocation
2. TimerStart for requested duration
3. In callback: PauseTimer, DestroyTimer, resolve Promise

This design allows overlapping waits to complete independently.

## Constraints and Safety Rules

- Do not reuse a shared static timer for all waits.
- Do not pause or restart another flow's timer.
- Always destroy per-call timers to avoid handle leaks.
- Safe pattern in callback: PauseTimer -> DestroyTimer -> resolve.

## Failure Mode This Prevents

A shared-timer design causes cross-cancellation:

- wait A starts
- wait B starts and restarts the same timer
- wait A Promise never resolves
- state machine can appear stuck during initialization

## Source of Truth in Code

- src/app/utils/wait.ts
- src/app/game/game-mode/promode-game-mode/set-promode-temp-vision-state.ts
- src/app/game/services/tree-service.ts
- src/app/game/game-mode/base-game-mode/setup-state.ts

## Regression Checks

- If a mode hangs on initialization, inspect unresolved waits first.
- If adding new async state logic, verify waits can overlap safely.
- Avoid introducing shared mutable timer state in utility layers.
