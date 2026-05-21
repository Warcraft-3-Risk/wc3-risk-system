# Observer UI Safety

## Motivation

Warcraft III observer UI is unusually sensitive to frame structure. A range
indicator toggle desynced even after its action callback was made a no-op. The
same feature stopped desyncing when its observer button was reshaped to match
the working player camera observer toggle.

This means observer desync risk is not limited to the callback body. The frame
tree attached to a hover-polled observer control can be enough to make the game
unstable.

## Current Behavior

Observers cannot reliably click normal button frames. The project uses
`CreateObserverButton` in `src/app/utils/observer-helper.ts`, which polls child
frame `5` of a `ScriptDialogButton` once per second and treats hover as click
for observer clients.

The known-good top-left observer toggle shape is:

1. Create one `BACKDROP` icon directly under `ORIGIN_FRAME_GAME_UI`.
2. Create one transparent `GLUETEXTBUTTON` using `ScriptDialogButton` directly
   under `ORIGIN_FRAME_GAME_UI`.
3. Position the icon and button at the same coordinates.
4. Hide both frames for everyone, then show them only for observers or developer
   mode.
5. Register `CreateObserverButton` outside any local-player-only branch.
6. In the callback, update local UI state, swap the icon texture, apply the
   feature effect, then disable and re-enable the button to release focus.

`PlayerCameraPositionManager.createToggleButton()` is the reference
implementation. `ObserverRangeIndicator.createToggleButton()` intentionally
matches that shape.

## Constraints and Safety Rules

- Do not add tooltip frames to hover-polled observer buttons.
- Do not add extra decorative children to hover-polled observer buttons.
- Do not make a new observer button pattern unless the camera-shaped pattern
  cannot support the feature.
- Do not register observer hover polling inside a `GetLocalPlayer()` branch.
  Every client should create the timer; the callback decides whether it acts.
- Treat observer-only world mutations as risky. Prefer UI frame mutations for
  observer-only visuals. This incident was fixed by matching frame structure,
  but it should not be read as proof that all local special-effect mutations
  are desync-safe.
- If a new observer control desyncs, first remove tooltips and extra frame
  children, then compare its frame creation order with the camera toggle.

## Source of Truth in Code

- Safe hover helper: `src/app/utils/observer-helper.ts`
- Reference observer toggle: `src/app/managers/player-camera-position-manager.ts`
- Range indicator toggle using the same shape:
  `src/app/triggers/visuals/observer-range-indicator.ts`

