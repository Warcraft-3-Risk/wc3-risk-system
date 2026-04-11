# Copilot Instructions for WC3 Risk System

These instructions guide AI code generation for Warcraft III development in this repository.

## Project Context
- This project compiles TypeScript to Lua (TSTL) and runs in Warcraft III.
- Prioritize compatibility with Warcraft III runtime behavior over browser/node assumptions.
- Follow existing architecture: state-machine game modes, singleton managers, pure-logic extraction for tests.

## Core WC3 Best Practices
- Prefer deterministic logic for all gameplay-critical systems.
- Do not introduce nondeterministic behavior in shared simulation paths.
- Avoid hidden side effects in turn or state transitions.
- Keep execution lightweight in periodic loops (timers, minimap updates, scoreboards).
- Reuse frames/effects/resources where possible; avoid per-tick allocations.

## Multiplayer Safety and Sync
- Keep synced game state changes consistent for all players.
- Do not gate shared-state writes behind local-only checks.
- Treat player-local UI and visual effects as local-only concerns; gameplay state is global.
- When randomness is needed for gameplay, use existing deterministic/randomization conventions already used by the codebase.

## Handle, Timer, and Resource Lifecycle
- Always clean up WC3 handles and temporary resources after use.
- Destroy timers, groups, forces, locations, effects, and frame objects when no longer needed.
- Exception: for replay-sensitive UI handles (especially multiboards), prefer hide/reuse over destroy when destruction is known to break replay stability.
- Prefer existing utility wrappers/managers for lifecycle-safe creation and disposal.
- Avoid creating resources repeatedly inside hot paths when pooling/reuse patterns exist.

## Code Style and Architecture
- Follow existing naming, folder layout, and class patterns in `src/app`.
- Extend existing managers/services before introducing new global singletons.
- Keep state transitions explicit and easy to trace.
- Favor small, composable methods over large monolithic functions.
- Add concise comments only for non-obvious WC3 constraints or tricky ordering logic.

## Testability and Logic Extraction
- Extract pure game logic from WC3 API calls whenever feasible.
- Keep WC3 engine interactions thin and isolate them from calculation-heavy logic.
- Add or update Vitest tests in `tests/` for new pure-logic behavior.
- Preserve `getInstance()` / `resetInstance()` test isolation conventions for singleton-like services.

## Performance Guidelines
- Avoid per-player nested scans in high-frequency paths unless necessary.
- Cache repeated lookups and computed values within a tick/update.
- Prefer incremental updates over full recomputation for UI/minimap/scoreboard systems.
- Avoid excessive debug printing in hot paths; use existing debug categories and toggles.

## Build and Tooling Expectations
- Keep generated code and build scripts compatible with existing npm workflows.
- Ensure changes continue to pass lint/tests/type checks when applicable.
- Do not introduce dependencies without clear value to map runtime, build pipeline, or testability.

## Change Safety
- Preserve backward-compatible gameplay behavior unless the task explicitly asks for balance or mechanic changes.
- When changing order-sensitive systems (turn processing, elimination, victory, income), call out assumptions and maintain ordering guarantees.
- If a refactor changes behavior, clearly separate functional changes from structural cleanup.

## Documentation Hygiene (Knowledge-Only Docs)
- Keep `docs/` focused on durable knowledge/intention/motivation that describes current behavior.
- Prefer docs that explain: why a system exists, how it currently works, key constraints, and source-of-truth code paths.
- Do not add or keep temporary execution plans, spikes, or one-off testing checklists unless explicitly requested.
- When behavior changes in critical systems (replay, shared slots, scoreboard, game loop timing), update the related durable docs in the same change.
- Follow the style in `docs/README.md` and keep sections consistent: Motivation, Current Behavior, Constraints and Safety Rules, Source of Truth in Code.

## Known Pitfalls to Preserve
- Do not implement wait utilities with a shared static timer; concurrent waits must use one timer per call.
- In replay-sensitive UI systems, prefer hide/reuse over destroy for multiboards.
- For replay POV-sensitive UI logic, do not rely only on `GetLocalPlayer()`; use existing replay POV detection utilities.

## Preferred Copilot Output Pattern
When implementing features or fixes:
1. Start from existing abstractions and conventions.
2. Keep simulation logic deterministic and side-effect aware.
3. Add or update tests for pure logic.
4. Minimize handle churn and clean up resources.
5. Explain any WC3-specific tradeoffs briefly in code comments or PR summary.
