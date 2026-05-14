# Replay Safety: Multiboard Lifecycle

## Motivation

Replay stability depends on handle behavior matching what replay playback expects. Multiboard destruction is a known crash risk and must follow a replay-safe lifecycle.

## Current Behavior

Scoreboard teardown avoids destroying multiboard handles:

- ScoreboardManager.destroyBoards() delegates to renderer.destroy()
- ScoreboardRenderer.destroy() contract is to hide board handles, not destroy them

This preserves replay stability while still removing UI visibility.

## Constraints and Safety Rules

- Do not call DestroyMultiboard for active scoreboard boards.
- Prefer hide/reuse patterns for replay-sensitive UI handles.
- Keep scoreboard creation/update paths deterministic.
- Treat replay safety as a higher priority than reclaiming trivial UI handles.

## Operational Tradeoff

Hidden boards may retain a small handle footprint, but this is accepted to avoid replay crashes and handle parity issues.

## Source of Truth in Code

- src/app/scoreboard/scoreboard-manager.ts
- src/app/scoreboard/scoreboard-renderer.ts
- src/app/game/game-mode/base-game-mode/setup-state.ts
