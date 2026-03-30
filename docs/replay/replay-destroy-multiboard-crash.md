# Replay Crash: DestroyMultiboard

## Problem

Watching a replay of an FFA game crashes with an `ACCESS_VIOLATION` (null pointer dereference at offset `0x8`) when the game-over state is reached. The crash occurs the moment `DestroyMultiboard` is called inside `ScoreboardManager.destroyBoards()`.

Promode (1v1) replays were not affected because the `checkAndHandleVictoryAsync` shortcut in `W3CMode` fires `CustomVictoryBJ` before the game-over state is entered, so `destroyBoards()` is never reached.

## Root Cause

`DestroyMultiboard` is a WC3 native that is unsafe to call during replay playback. The replay engine does not expect handle destruction that wasn't part of the original recorded game actions, and accessing the freed handle triggers a null pointer crash in the engine.

This is consistent with the handle parity constraint documented in [replay-scoreboard-pov.md](replay-scoreboard-pov.md) — creating or destroying handles during replay diverges from the recorded handle state.

## Fix

`ScoreboardManager.destroyBoards()` now checks `isReplay()` and hides the boards instead of destroying them:

```ts
public destroyBoards() {
    if (isReplay()) {
        this.iterateBoards((board) => board.setVisibility(false));
    } else {
        this.iterateBoards((board) => board.destroy());
    }
    this.scoreboards = { standard: undefined, obs: undefined };
}
```

Hiding via `MultiboardDisplay` is replay-safe (operates on existing handles without destroying them).

## Files Changed

- `src/app/scoreboard/scoreboard-manager.ts` — Replay-safe `destroyBoards()`
