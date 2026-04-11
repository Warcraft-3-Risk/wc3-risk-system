# Documentation Guide

This folder is intentionally limited to durable documents that explain current behavior, design intent, and the motivation behind non-obvious constraints.

## Documentation Standard

Every doc in this folder should answer these sections:

- Motivation
- Current Behavior
- Constraints and Safety Rules
- Source of Truth in Code

If a document does not describe the current system, it should be updated or removed.

## Kept Documents

- docs/game-loop/wait-timer-concurrency-note.md
- docs/replay/replay-destroy-multiboard-crash.md
- docs/replay/replay-minimap-fow-fix.md
- docs/replay/replay-scoreboard-pov.md
- docs/shared-slots/replay-pov-detection.md
- docs/shared-slots/shared-slots-current-behavior.md

## Excluded Document Types

- temporary execution plans
- spikes and one-time investigations that no longer reflect current code
- historical testing checklists for completed work

## Maintenance Rules

- Prefer describing stable behavior over implementation history.
- Keep references tied to concrete code paths.
- Call out replay and sync constraints explicitly where relevant.
- Update docs in the same PR as behavior changes for critical systems.
