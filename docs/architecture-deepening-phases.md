# Codebase Architecture Deepening & TDD Phases

This document outlines a phased approach to compartmentalizing the wc3-risk-system codebase, addressing the "spaghetti" singleton architecture. Our goal is to transform shallow modules (where the interface is nearly as complex as the implementation) into deep modules offering high leverage and locality.

## Glossary

- **Module**: Anything with an interface and an implementation.
- **Interface**: Everything a caller must know to use the module.
- **Implementation**: The code inside.
- **Depth**: Leverage at the interface: a lot of behaviour behind a small interface.
- **Seam**: Where an interface lives; a place behaviour can be altered without editing in place.
- **Leverage**: What callers get from depth.
- **Locality**: What maintainers get from depth (change and knowledge concentrated in one place).

---

## Phase 1: Expose the Seams & Auditing Singletons

**Problem**: The codebase heavily relies on singletons accessed from all corners, making dependencies invisible and causing shallow modules lacking locality constraint.

**Solution**: Map out where singletons are called. Instead of components reaching out globally to fetch singletons (`Manager.getInstance()`), inject dependencies through constructors or setup functions to create verifiable **seams**.

### Required Test Coverage (Pre-Phase 1)

- Identify the most commonly accessed singletons (e.g., Scoreboard, Income, Spawner).
- Ensure existing integration tests (`tests/state-machine.test.ts`, `tests/game-mode-logic.test.ts`) pass and verify the state lifecycle. You must write "black-box" characterization tests for the singletons acting as pass-throughs before injecting dependencies.

## Phase 2: Extracting Pure Implementations

**Problem**: Singletons often mix pure simulation/domain logic with Warcraft 3 side-effects (e.g., handles, timers, minimap UI loops), making them hard to test and resulting in sprawling implementations.

**Solution**: Carve out the pure logic into deep, pure TypeScript modules. The singletons will just become thin **adapters** that bridge the WC3 API to these pure, deep modules. This satisfies the **deletion test**: if the WC3 adapter is deleted, the core complexity (rules, math, sorting) remains fully intact and testable elsewhere.

### Required Test Coverage (Pre-Phase 2)

- Pure logic counterparts of these side-effects must be tested in isolation (TDD loop: Red-Green-Refactor). We already have tests like `tests/income-logic.test.ts` and `tests/scoreboard-sort-logic.test.ts`.
- Before splitting a singleton, ensure 100% path coverage on its complex logic calculations by testing the raw data models independent of WC3 handles.

## Phase 3: Deepening the Interfaces

**Problem**: Multiple singletons form a shallow API surface where the caller has to orchestrate the lifecycle between them (e.g., calling Spawner, then Income, then Updating UI).

**Solution**: Consolidate these shallow modules into deeper, higher-level conceptual modules. For example, instead of having a `MinimapManager`, `ScoreboardManager`, and `IncomeManager` individually pinged on a tick, create a deeper `TurnResolution` module. Callers get high **leverage** by calling a simple `resolveTurn()` interface, improving **locality** because the order of operations is hidden behind the seam.

### Required Test Coverage (Pre-Phase 3)

- Write an integration test for the new "Deep" interface using mock adapters.
- Assert that calling the deep interface correctly propagates down to the extracted pure logic modules without needing the WC3 runtime.
