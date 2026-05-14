# Replay Minimap Fog-of-War Behavior

## Motivation

Replay viewers can switch POV. Minimap visibility and coloring must follow the observed POV, not the recording player.

## Current Behavior

Minimap icon logic uses an effective local player in replay:

- effectiveLocal = isReplay() ? getReplayObservedPlayer() : GetLocalPlayer()
- visibility and color decisions use effectiveLocal

This keeps minimap icon visibility aligned with the observed player's fog state.

## Constraints and Safety Rules

- Do not rely on GetLocalPlayer alone for replay POV-sensitive UI.
- Replay-only behavior must avoid new replay-only handle creation paths.
- Keep icon updates on existing update loops; avoid replay-specific timers.

## Source of Truth in Code

- src/app/managers/minimap-icon-manager.ts
- src/app/utils/game-status.ts
- docs/shared-slots/replay-pov-detection.md
