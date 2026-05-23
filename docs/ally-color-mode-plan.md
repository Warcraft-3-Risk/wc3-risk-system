# Custom Ally Color Mode Implementation Plan

## Motivation & Constraints

The native `AllyColorFilterState` mode 2 has engine limitations (specifically, shared slots forcefully turn teal without a way to override). However, by permanently disabling the native functionality (locking the engine state to Mode 0) and implementing our own custom 3-state cycle on a hijacked button, we _can_ fully implement all three modes manually:

- **Mode 0 (Off):** Normal minimap blips, normal unit colors.
- **Mode 1 (Minimap Only):** Custom minimap blips (Blue/Teal/Red), normal unit colors.
- **Mode 2 (Minimap & World):** Custom minimap blips (Blue/Teal/Red), locally applied unit colors (Blue/Teal/Red).

## Execution Plan (TDD Approach)

### Phase 1: Core State Logic (Red/Green/Refactor)

1. **Write Tests (`tests/ally-color-mode-logic.test.ts`):**
   - **Test 1:** A new `AllyColorState` manager initializes in Mode 0 by default if no saved config exists.
   - **Test 2:** A new `AllyColorState` manager properly initializes to a persisted value (Mode 1 or 2) if present in saved configurations.
   - **Test 3:** Toggling the state moves it from Mode 0 to Mode 1 and saves the new setting to configurations.
   - **Test 4:** Toggling the state from Mode 1 moves it to Mode 2 and saves to configurations.
   - **Test 5:** Toggling the state from Mode 2 cycles back to Mode 0 and saves to configurations.
   - **Test 6:** Calling `getMinimapColor(unitOwner, localPlayer)` returns Blue/Teal/Red in Modes 1 and 2, but actual player color in Mode 0.
   - **Test 7:** Calling `getUnitModelColor(unitOwner, localPlayer)` returns Blue/Teal/Red in Mode 2, but actual player color in Modes 0 and 1.
2. **Implement Logic (`src/app/managers/alliances/ally-color-state.ts`):**
   - Implement the state machine and color resolution logic to make the tests pass.
   - Integrate with the project's configuration/save system to load initial state and persist changes during `toggle()`.
   - Keep this pure and isolated from WC3 UI API calls so the logic remains easily testable in Node.

### Phase 2: UI Frame Hijacking & Custom Overlay

3. **Hide/Disable Native Button:**
   - In the UI initialization phase, locate the native Ally Color button (`"MiniMapAllyButton"`).
   - Clear its anchors and move it completely off-screen or disable it to guarantee the native engine hotkeys/clicks cannot change the engine-level state from 0.
4. **Create Custom Button:**
   - Create a new `GLUEBUTTON` frame parented to the minimap container.
   - Anchor it exactly where the original button was using absolute coordinates (referencing Reforged HUD positioning).
   - Apply the standard texture states (normal/pushed/disabled) to match the original battleaxes icon (e.g., `UI\Widgets\Console\Human\CommandButton\human-minimap-ally-up.blp`).
5. **Bind Frame Events:**
   - Register a `FRAMEEVENT_CONTROL_CLICK` on the new custom button.
   - In the callback, conditionally call `AllyColorState.toggle(GetTriggerPlayer())` purely for the local player's cycle.

### Phase 3: Integration with Minimap & Unit Colors

6. **Hook Minimap Update Loop (Hotkeys Fallback):**
   - The native `AllyColorFilterState` hotkeys (like `Alt+A`) will still work for players and change the native state.
   - We check `GetAllyColorFilterState() > 0` within the existing minimap update periodic loop.
   - When detected, we call `AllyColorState.toggle()` to progress our custom state and instantly call `SetAllyColorFilterState(0)` locally, to suppress the native mode while keeping the hotkey functionality active.
   - Update the color assignment to query `AllyColorState.getMinimapColor(...)` and `AllyColorState.getUnitModelColor(...)`.
   - Force an immediate refresh of colors when toggled.
7. **Hook Unit Color Updates:**
   - Implement a local trigger/loop to enforce unit colors based on `AllyColorState.getUnitModelColor(...)`.
   - Apply local `SetUnitColor(...)` to all units on the map instantly when a player clicks the toggle to enter or leave Mode 2.
   - Ensure any newly spawned, trained, or revived units also run through this local filter to receive the correct team color if Mode 2 is active.

### Phase 4: Documentation

8. **Update Docs:**
   - Add a section to `docs/game-simulation-analysis.md` documenting the custom UI replacement and the localized `SetUnitColor` fallback replacing the native engine Mode 2.
