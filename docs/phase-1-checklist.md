# Phase 1 TDD Checklist: Exposing Seams

This checklist captures the vertical slicing plan to decouple singletons by injecting dependencies. By exposing "seams", we can mock or isolate systems without relying on global state.

## Tracer Bullet: `VictoryManager`

`VictoryManager` is tightly coupled. Currently, it resolves its dependencies internally by calling `.getInstance()` on `OvertimeManager`, `TeamManager`, `PlayerManager`, and `SettingsContext`, making it a shallow module.

### Interface Changes

- **Current**: `VictoryManager.getInstance().updateAndGetGameState()`
- **Proposed**: Introduce a dependency injection model. `new VictoryManager(playerManager, teamManager, overtimeManager, settings)`. We will initialize it explicitly and pass it down where needed, or at least pass dependencies explicitly upon initialization (`VictoryManager.init(...)`).

### Existing Regression Tests (Verified)

Before touching `VictoryManager`, we have verified the following black-box integrations tests already exist and exercise its behavior:

- [x] `tests/victory-logic.test.ts`: Covers the pure math (`calculateCityCountWin`, `determineVictoryState`, `findVictors`).
- [x] `tests/game-simulation/victory-conditions.test.ts`: End-to-end integration test asserting real state manipulation within `VictoryManager.updateAndGetGameState()`.

**Goal**: These tests must pass unmodified (or only with setup adaptation for the new DI interface) after refactoring.

### Refactoring Steps

- [x] **Step 1**: Modify `VictoryManager` constructor to accept its singleton dependencies.
- [x] **Step 2**: Adjust the tests in `victory-conditions.test.ts` (and fix the mock in `scoreboard-data-model.test.ts`) to account for interface changes.
- [x] **Step 3**: Adjust production callers (e.g., `GameLoopState` and `ScoreboardManager`) to use the new `.getInstance().getCityCountWin()` or injected instance.
- [x] **Step 4**: Verify all tests are **GREEN**.

---

## Increment 2: `OvertimeManager`

### Interface Changes

- **Current**: Relies internally on `GlobalGameData.turnCount` statically via `OvertimeManager`.
- **Proposed**: Completely deleted `OvertimeManager`. Moved logic to exported pure functions inside `overtime-logic.ts`. Handed `overtimeSetting` storage and mapping directly to `SettingsContext`.

### Required Regression Tests

- [x] Ensure `overtime-logic` has a unit test that verifies turn threshold logic and modifier incrementation. _(Wrote `tests/overtime-logic.test.ts` matching existing behavior)._
- [x] Fixed all mocks across `capitals.test.ts`, `promode-auto-loss.test.ts`, etc. to reflect lack of need for class instantiation or mocks thanks to pure logic extraction.
- [x] Confirmed regression tests all GREEN.

---

## Increment 3: `ScoreboardManager`

### Interface Changes

- **Current**: Relies internally on `GlobalGameData`, `VictoryManager`, `Participants`.
- **Proposed**: Transform it from an active fetcher (`ScoreboardManager.getInstance().refresh()`) to a passive receiver of data (`scoreboard.render(state)`).

### Required Regression Tests

- [x] `tests/scoreboard-sort-logic.test.ts`: Pure sorting is covered.
- [x] `tests/scoreboard-data-model.test.ts`: Data integration is covered.
- [ ] Needs a verification test for the display sync behavior before we split it adapter and logic.
