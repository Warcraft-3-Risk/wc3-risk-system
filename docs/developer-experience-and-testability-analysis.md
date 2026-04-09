# Developer Experience & Testability Analysis

## Table of Contents
- [Executive Summary](#executive-summary)
- [Current State Assessment](#current-state-assessment)
- [Developer Experience Improvements](#developer-experience-improvements)
- [Testability & Reliability Improvements](#testability--reliability-improvements)
- [Execution Plan](#execution-plan)

---

## Executive Summary

This analysis examines the `wc3-risk-system` repository across two dimensions: **developer/publishing experience** and **testability/reliability**. The project is a TypeScript-to-Lua Warcraft III custom game built using `typescript-to-lua` (TSTL). Its unique compilation target (Lua running inside the WC3 engine) introduces constraints that differ from typical Node.js or web projects, making some of these improvements especially valuable.

Key findings:
- The project has **no automated test framework** beyond a single hand-rolled unit test file for the rating calculator
- The CI pipeline is **release-only** — there is no build verification on PRs or pushes
- The codebase relies heavily on **singletons** and **WC3 engine globals**, making components extremely difficult to test in isolation
- The build/test scripts work but have **no validation or linting step** integrated
- The publishing workflow is solid but could benefit from **dry-run validation** and **versioning automation**

---

## Current State Assessment

### Build System
| Aspect | Current State | Notes |
|--------|---------------|-------|
| Language | TypeScript → Lua (via TSTL 1.15.1) | Compiles to Lua 5.3 bundle |
| Build tool | Custom `scripts/build.ts` | Works well, handles multi-terrain builds |
| Test command | `npm run test <terrain>` | **Launches the game** — not automated tests |
| Unit tests | `scripts/test-rating-calculator.ts` | Hand-rolled test framework, duplicated logic |
| Linting | Prettier only (format-on-save) | No ESLint, no TSTL-specific lint rules |
| CI/CD | GitHub Actions on `release` only | No PR checks, no push checks |
| Type checking | `strict: true` but `strictNullChecks: false` | Misses a class of null/undefined bugs |

### Architecture
| Aspect | Current State | Notes |
|--------|---------------|-------|
| Dependency injection | None — singletons everywhere | `getInstance()` pattern in 15+ classes |
| Event system | Custom `EventEmitter` singleton | String-based events, no type safety on payloads |
| State machine | `BaseMode` / `BaseState` pattern | Good abstraction, but tightly coupled to WC3 APIs |
| Configuration | JSON files with env var substitution | Clean approach for multi-terrain support |
| Game settings | Exported constants in `game-settings.ts` | Simple and effective |

---

## Developer Experience Improvements

### 1. Add CI Checks on Pull Requests and Pushes

**Problem:** The GitHub Actions workflow only runs on `release` events. A contributor can open a PR with broken TypeScript that won't be caught until release time.

**Recommendation:** Add a `ci.yml` workflow that runs on `push` and `pull_request` events:
- TypeScript type checking (`tsc --noEmit`)
- TSTL compilation check (`tstl -p tsconfig.json` — validates the Lua output compiles)
- Prettier format check (`npx prettier --check .`)
- Unit tests (`npm run test:unit`)

This gives immediate feedback on PRs without requiring a WC3 client.

### 2. Add ESLint for Static Analysis

**Problem:** Prettier handles formatting but catches no logic errors. TypeScript's compiler catches type errors, but common pitfalls (unused variables, unhandled promises, unreachable code) go undetected.

**Recommendation:** Add ESLint with the `@typescript-eslint` plugin. Configure rules appropriate for the TSTL target:
- `no-unused-vars` (or the TS equivalent)
- `no-floating-promises` (critical — the event emitter has async handlers)
- `eqeqeq` (there are `==` comparisons where `===` is safer)
- `no-explicit-any` (gradual adoption)

### 3. Enable `strictNullChecks`

**Problem:** `strictNullChecks` is set to `false` in `tsconfig.json`. This means `null` and `undefined` can be assigned to any type without errors, hiding entire categories of bugs.

**Recommendation:** Enable `strictNullChecks: true` incrementally:
- Start by adding `// @ts-expect-error` or explicit null checks where the compiler complains
- Prioritize core gameplay files (`game-loop-state.ts`, `victory-manager.ts`, `rating-manager.ts`)
- This directly improves reliability by catching null dereferences at compile time

### 4. Improve the `npm run test` / `npm run build` Scripts

**Problem:**
- `npm run test` launches the WC3 game — there's no way to "test" in CI. The naming is misleading.
- `npm run build` modifies `tsconfig.json` in-place (the `updateTSConfig` function), which creates dirty working tree state.
- The `dev.ts` script references a `config.json` that doesn't exist (it was replaced by per-terrain configs).

**Recommendation:**
- Rename `npm run test` to `npm run launch` or `npm run play` to reflect what it actually does
- Add a true `npm run test` that runs the unit test suite
- Have `updateTSConfig` write to a temporary file or restore `tsconfig.json` after build
- Remove or fix the stale `dev.ts` script

### 5. Streamline the `.env` Setup

**Problem:** New contributors must manually create a `.env` file by reading the README and substituting paths. There's no validation that the `.env` is correctly configured.

**Recommendation:**
- Add a `.env.example` file to the repository with placeholder values
- Add a startup validation in `scripts/utils.ts` that checks required env vars and gives helpful error messages
- Document the minimum required variables vs. optional ones

### 6. Add a Pre-commit Hook for Formatting

**Problem:** Formatting is only enforced by VS Code's format-on-save setting. Contributors using other editors can submit unformatted code.

**Recommendation:** Add `husky` + `lint-staged` for pre-commit formatting:
- Run Prettier on staged `.ts` files
- Optionally run ESLint with `--fix`
- This ensures consistent formatting regardless of editor

### 7. Improve the Publishing Workflow

**Problem:**
- The CI workflow includes both Linux and Windows version suffix steps, but the job runs on `windows-latest` only. The Linux step is dead code.
- The version format (`X.YZ` instead of semver) is a deliberate choice but is not enforced or validated.
- There's no changelog generation.

**Recommendation:**
- Remove the dead Linux suffix step from the workflow
- Add tag format validation (e.g., ensure tag matches `X.YZ` pattern)
- Consider adding a `CHANGELOG.md` or auto-generating release notes from PR titles
- Add a "dry-run" build step in CI on PRs so contributors can verify their changes will build

### 8. Update Outdated Dependencies

**Problem:** Several dependencies are significantly outdated:
- `ts-node: 8.10.2` (current: 10.x)
- `@types/node: 12.19.1` (current: 20.x)
- `typescript: 5.0.4` (current: 5.5+)
- `actions/checkout@v3` and `actions/setup-node@v3` (current: v4)

**Recommendation:** Update dependencies incrementally, testing each upgrade:
- Start with GitHub Actions (v3 → v4 is low risk)
- Update `@types/node` to match the required Node.js version (18+)
- Update `ts-node` (may need config adjustments)
- Update TypeScript (test TSTL compatibility)

---

## Testability & Reliability Improvements

### 1. Establish a Real Unit Testing Framework

**Problem:** The only tests (`test-rating-calculator.ts`) use a hand-rolled test framework and **duplicate the entire rating calculator implementation** rather than importing it. The comment says "Keep this in sync with `src/app/rating/rating-calculator.ts`" — a manual process that will inevitably drift.

**Recommendation:** Adopt a proper testing framework:
- Use **Vitest** or **Jest** with `ts-jest` for running TypeScript tests
- Import the actual source files instead of duplicating logic
- This requires separating pure logic from WC3 API calls (see next item)

### 2. Separate Pure Logic from WC3 API Dependencies

**Problem:** The biggest barrier to testing is that most modules directly call WC3 engine functions (`Player()`, `CreateTimer()`, `GetPlayerName()`, `BlzFrameSetVisible()`, etc.) and access singletons. These functions don't exist outside the WC3 runtime.

**Recommendation:** Apply a layered architecture pattern to isolate testable logic:

**Layer 1 — Pure Logic (fully testable, no WC3 deps):**
- Rating calculator ✓ (already mostly pure)
- Distribution algorithms (city assignment logic)
- Victory condition checks (threshold calculations)
- Income calculations
- Scoreboard data model
- Doubly-linked list and other data structures
- Statistics model / ranking logic
- Team formation logic
- Overtime calculations

**Layer 2 — Adapters (thin wrappers around WC3 APIs):**
- Player adapter (wraps `Player()`, `GetPlayerName()`, etc.)
- Timer adapter (wraps `CreateTimer()`, `TimerStart()`)
- UI adapter (wraps `BlzFrameSetVisible()`, etc.)
- File I/O adapter (wraps `File.read()`, `File.write()`)

**Layer 3 — Integration (uses adapters, orchestrates logic):**
- `GameLoopState` (uses Timer adapter + pure turn logic)
- `PlayerManager` (uses Player adapter + pure player tracking)
- `EventCoordinator` (dispatches events to state machine)

By extracting pure logic into standalone functions/classes that take parameters instead of calling singletons, you can test the core game mechanics without mocking the WC3 engine.

### 3. Replace Singletons with Dependency Injection (Incremental)

**Problem:** Nearly every manager class uses the singleton pattern (`getInstance()`). This makes it impossible to:
- Test components in isolation (they pull in the entire singleton graph)
- Reset state between tests
- Substitute mock implementations

**Key singletons that block testability:**
- `PlayerManager.getInstance()`
- `VictoryManager.getInstance()`
- `EventEmitter.getInstance()`
- `ScoreboardManager.getInstance()`
- `RatingManager.getInstance()`
- `SharedSlotManager.getInstance()`
- `SettingsContext.getInstance()`
- `StatisticsController.getInstance()`

**Recommendation:** Adopt a lightweight DI approach:
- Keep the singleton accessors for production code (backwards compatible)
- Add constructor injection for test scenarios
- Example: `VictoryManager` could accept a `PlayerProvider` interface instead of calling `PlayerManager.getInstance()` directly
- Start with the most-testable components (rating, victory, income) and expand outward

### 4. Add Type Safety to the Event System

**Problem:** The `EventEmitter` uses `string` event names and `any[]` args. There's no compile-time guarantee that event emitters and listeners agree on payload types. A mistyped event name fails silently.

**Recommendation:** Create a typed event map:
```typescript
interface GameEvents {
  [EVENT_ON_PLAYER_DEAD]: [player: ActivePlayer, forfeit?: boolean];
  [EVENT_ON_CITY_CAPTURE]: [city: City, preOwner: ActivePlayer, owner: ActivePlayer];
  // ... etc
}
```
Then make `EventEmitter.on()` and `EventEmitter.emit()` generic over this map. This catches payload mismatches at compile time.

### 5. Add Integration-Level Validation Tests

**Problem:** Even with unit tests, game mode transitions and state machine flows can break silently. The state machine (`BaseMode` → `BaseState` chain) is a critical reliability concern.

**Recommendation:** Create "simulation" tests that exercise the state machine without WC3:
- Mock the timer to be synchronous
- Feed simulated events through the `EventEmitter`
- Verify state transitions occur in the correct order
- Verify victory conditions trigger at the right thresholds
- Verify rating calculations produce expected results for known game scenarios

### 6. Add Error Boundary / Crash Resilience Logging

**Problem:** The game loop has a `try/catch` that writes errors to a file, which is good. But other critical paths (event handlers, state transitions) don't have similar protection.

**Recommendation:**
- Wrap all event handlers in the `EventEmitter.emit()` method with try/catch
- Log errors with context (which event, which handler, what arguments)
- Consider a global error handler that captures unhandled errors and writes them to the debug log
- This significantly improves reliability for players by preventing a single error from crashing the entire game

### 7. Validate Configuration at Build Time

**Problem:** Terrain configs (`risk_europe.json`, etc.) are loaded at runtime. A typo in a config key (e.g., `mapFoldr` instead of `mapFolder`) would only be caught when the build or game fails.

**Recommendation:**
- Add a JSON schema for terrain config files
- Validate configs against the schema in the build script
- Or define the config shape as a TypeScript type and use a type-safe config loader
- This catches configuration errors before they reach the WC3 engine

---

## Execution Plan

The improvements are organized into phases, ordered by impact and feasibility. Each phase is self-contained and can be shipped independently.

### Phase 1: Quick Wins (1-2 days)
High impact, low effort changes that immediately improve the developer experience.

- [x] **Add CI workflow for PRs** — Create `.github/workflows/ci.yml` with TypeScript type-check, TSTL compile, and unit tests
- [x] **Add `.env.example`** — Copy the README templates into a committed example file
- [x] **Fix script naming** — Rename `npm run test` to `npm run launch`, add a true `npm run test` for unit tests
- [x] **Clean up dead code** — Remove the Linux suffix step from the release workflow, fix/remove stale `dev.ts`
- [x] **Update GitHub Actions** — Bump `actions/checkout` and `actions/setup-node` from v3 to v4

### Phase 2: Testing Foundation (3-5 days)
Establish a real testing framework and begin extracting testable logic.

- [x] **Install Vitest (or Jest)** — Set up a proper test runner with TypeScript support
- [x] **Migrate rating calculator tests** — Convert `test-rating-calculator.ts` to import the real source instead of duplicating logic
- [x] **Extract pure logic from VictoryManager** — Move threshold/win-condition calculations to pure functions
- [x] **Extract pure logic from distribution services** — Make city distribution algorithms testable without WC3 APIs
- [x] **Add tests for income calculations** — Test edge cases for income math
- [x] **Add tests for doubly-linked list** — It's a custom data structure that should have its own test suite

### Phase 3: Code Quality (2-3 days)
Improve static analysis and catch bugs earlier.

- [x] **Add ESLint** — Install and configure `@typescript-eslint` with recommended rules
- [x] **Enable `strictNullChecks`** — Start with new files, gradually fix existing ones
- [x] **Add Prettier pre-commit hook** — Install `husky` + `lint-staged`
- [x] **Add typed event system** — Create a typed event map and update `EventEmitter`
- [x] **Add config validation** — Validate terrain JSON configs at build time

### Phase 4: Architecture Improvements (5-7 days)
Larger refactoring to improve long-term testability and reliability.

- [x] **Introduce adapter interfaces** — Create interfaces for WC3 API calls (Player, Timer, UI, File I/O)
- [x] **Refactor `PlayerManager`** — Accept player data through constructor/interfaces instead of calling WC3 globals directly
- [x] **Add state machine tests** — Create simulation tests for game mode transitions
- [x] **Add error boundaries to EventEmitter** — Wrap handlers in try/catch with logging
- [x] **Refactor singletons for testability** — Add `reset()` methods or constructor injection patterns for test scenarios

### Phase 5: Publishing & Maintenance (1-2 days)
Polish the release process and developer onboarding.

- [x] **Add release notes automation** — Generate changelogs from PR titles/labels
- [x] **Add tag format validation** — Enforce version format in CI
- [x] **Update outdated dependencies** — Incrementally update `ts-node`, `@types/node`, `typescript`
- [x] **Improve README** — Add architecture overview, testing instructions, and contribution guidelines
- [x] **Add `tsconfig.json` restoration** — Prevent `updateTSConfig` from dirtying the working tree

---

## Priority Matrix

| Improvement | Impact | Effort | Risk | Priority |
|-------------|--------|--------|------|----------|
| CI on PRs | 🟢 High | 🟢 Low | 🟢 Low | **P0** |
| Fix script naming | 🟢 High | 🟢 Low | 🟢 Low | **P0** |
| Install test framework | 🟢 High | 🟡 Medium | 🟢 Low | **P0** |
| Migrate rating tests | 🟢 High | 🟢 Low | 🟢 Low | **P0** |
| Add ESLint | 🟡 Medium | 🟡 Medium | 🟢 Low | **P1** |
| Enable strictNullChecks | 🟢 High | 🟡 Medium | 🟡 Medium | **P1** |
| Extract pure logic | 🟢 High | 🟡 Medium | 🟡 Medium | **P1** |
| Typed event system | 🟡 Medium | 🟡 Medium | 🟢 Low | **P2** |
| Adapter interfaces | 🟡 Medium | 🔴 High | 🟡 Medium | **P2** |
| Error boundaries | 🟢 High | 🟢 Low | 🟢 Low | **P1** |
| Dependency updates | 🟡 Medium | 🟢 Low | 🟡 Medium | **P2** |
| Config validation | 🟡 Medium | 🟢 Low | 🟢 Low | **P1** |
| Pre-commit hooks | 🟡 Medium | 🟢 Low | 🟢 Low | **P2** |
| Release automation | 🟢 Low | 🟢 Low | 🟢 Low | **P3** |

---

## Summary

The `wc3-risk-system` project has a solid foundation with clean architecture patterns (state machine, event system, builder pattern). The biggest opportunities for improvement are:

1. **Testing gap**: Moving from zero automated tests to a proper test suite will catch regressions early and enable confident refactoring.
2. **CI gap**: Adding build verification on PRs prevents broken code from being merged.
3. **Testability architecture**: Separating pure game logic from WC3 API calls is the highest-value long-term investment, enabling testing of core mechanics without the game engine.

The execution plan is designed to deliver value incrementally — Phase 1 can be completed in a day or two and immediately improves the development workflow.
