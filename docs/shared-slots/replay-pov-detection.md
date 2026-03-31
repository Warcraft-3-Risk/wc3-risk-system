# Replay POV Player Detection

## Problem

In Warcraft III replays, `GetLocalPlayer()` always returns the **recording player** (the player who saved the replay), not the player whose perspective the viewer is currently observing. This means any code gated behind `GetLocalPlayer()` comparisons — such as showing your own units in white on the minimap — cannot adapt to the viewer switching between player POVs during replay playback.

---

## Discovery

Research by !!Lua Supremacist and sotzaii_shuen (March 28–29, 2026) revealed that while `GetLocalPlayer()` itself does not change, a small number of WC3 natives internally resolve against the **currently observed replay player** rather than the recording player.

### Natives That Respect Replay POV

Only **three** natives are known to behave differently based on the selected replay POV:

| Native | Behavior in Replay |
|--------|--------------------|
| `DisplayTextToPlayer` | Only displays text if the target player matches the currently observed POV |
| `DisplayTimedTextToPlayer` | Same as above |
| `PlayerSetLeaderboard` | When a leaderboard is assigned to a player via this native, `IsLeaderboardDisplayed` returns `true` only if that player is the currently observed POV |

All other natives — including `GetLocalPlayer()`, `GetPlayerId(GetLocalPlayer())`, and `BJDebugMsg` — continue to resolve against the recording player regardless of which POV is selected.

### Evidence: DisplayTextToPlayer

A periodic trigger was tested that loops through all players and conditionally prints messages using different approaches:

```jass
// Cases 1-4: Use BJDebugMsg inside GetLocalPlayer() == Player(i) guard
//   → Always prints for recording player only (all 4 cases = same player)

// Cases 5-8: Use DisplayTextToPlayer inside GetLocalPlayer() == Player(i) guard
//   → ALSO always prints for recording player only (the guard is what limits it)

// Cases 9-10: Use DisplayTextToPlayer(GetLocalPlayer(), ...) unconditionally
//   → Prints are VISIBLE only when viewing the recording player's POV
//   → When switching to another player's POV, Cases 9-10 stop appearing
```

Key insight: `DisplayTextToPlayer` filters output based on the replay POV player, but `GetLocalPlayer()` still returns the recorder. So calling `DisplayTextToPlayer(GetLocalPlayer(), ...)` shows text only when viewing the recorder's POV — the native itself respects the POV, not the player handle argument.

---

## Solution: Leaderboard Polling

The `PlayerSetLeaderboard` / `IsLeaderboardDisplayed` pair can be exploited to **detect which player the replay viewer is currently observing**.

### Mechanism

1. Create a dummy leaderboard at initialization
2. To detect the selected POV player:
   - Hide the leaderboard (`LeaderboardDisplay(lb, false)`)
   - Loop through all player indices
   - For each player, call `PlayerSetLeaderboard(Player(i), lb)`
   - Check `IsLeaderboardDisplayed(lb)` — returns `true` only for the currently observed POV player
   - Reset the leaderboard display to `false` after detection

### Reference Implementation (vJASS — sotzaii_shuen)

```jass
library somelib initializer init
globals
    private leaderboard lb
endglobals

public function GetLocalPlayer2 takes nothing returns player
    local integer i = 0
    local player p
    call LeaderboardDisplay(lb, false)
    loop
        set p = Player(i)
        call PlayerSetLeaderboard(p, lb)
        exitwhen IsLeaderboardDisplayed(lb)
        set i = i + 1
        if i == bj_MAX_PLAYER_SLOTS then
            // Fallback: no match found, return standard GetLocalPlayer
            set p = GetLocalPlayer()
            exitwhen true
        endif
    endloop
    call LeaderboardDisplay(lb, false)
    return p
endfunction

private function init takes nothing returns nothing
    set lb = CreateLeaderboard()
endfunction
endlibrary
```

### TypeScript Equivalent (for this codebase)

```typescript
// Detect which player the replay viewer is currently observing.
// Falls back to GetLocalPlayer() if no match is found or if not in replay.
function getReplayObservedPlayer(): player {
    LeaderboardDisplay(replayLeaderboard, false);
    for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
        const p = Player(i);
        PlayerSetLeaderboard(p, replayLeaderboard);
        if (IsLeaderboardDisplayed(replayLeaderboard)) {
            LeaderboardDisplay(replayLeaderboard, false);
            return p;
        }
    }
    LeaderboardDisplay(replayLeaderboard, false);
    return GetLocalPlayer();
}
```

---

## Caveats

1. **Leaderboard must be periodically reset.** If the leaderboard visibility is not reset (`LeaderboardDisplay(lb, false)`) before each detection cycle, it gets stuck reporting the initial player.

2. **Conflicts with actual leaderboard usage.** The detection temporarily reassigns the leaderboard via `PlayerSetLeaderboard`. If the map uses leaderboards for gameplay purposes, the displayed leaderboard state must be saved and restored around detection calls. `PlayerGetLeaderboard` can retrieve the current assignment for restoration.

3. **Cannot detect replay mode itself.** This technique only detects *which* player is selected — it cannot determine whether the game is running as a replay. If the viewer never switches POV, `GetLocalPlayer2()` returns the same player as `GetLocalPlayer()`. The existing `isReplay()` detection (TriggerHappy method: `SelectUnit` + `ReloadGameCachesFromDisk`) is still needed to know you're in a replay.

4. **Performance.** The detection loops through up to `bj_MAX_PLAYER_SLOTS` (28) iterations with native calls each time. At a polling rate of 0.1s this is negligible, but should not be called every frame (0.01s).

5. **Desync safety.** All operations here are local-only display operations — no game state is modified. The leaderboard is created once and only used for polling. This should be desync-safe in replays since replay playback does not sync.

---

## Applicability to This Codebase

### MinimapIconManager

The minimap color logic shows the local player's own cities/units in white. In replay mode, this should show white for the *observed* player's units, not the recorder's. By calling `getReplayObservedPlayer()` instead of `GetLocalPlayer()` in `updateIconColor()` and `updateUnitIconColor()`, the minimap will correctly highlight the observed player's assets.

### TooltipManager

The tooltip suppresses display for units owned by the local player. In replay mode, it should suppress for the observed player's units instead, using the same `getReplayObservedPlayer()` substitution.

### Guard on isReplay()

The leaderboard polling should only run when `isReplay()` returns `true`. In live games, `GetLocalPlayer()` is correct and the polling overhead is unnecessary.

---

## Credits

- **!!Lua Supremacist** — Initial investigation of `DisplayTextToPlayer` behavior in replays, test map creation, verification of leaderboard approach
- **sotzaii_shuen** — Proposed the `PlayerSetLeaderboard` / `IsLeaderboardDisplayed` technique, authored the polished vJASS implementation, identified the complete list of 3 POV-respecting natives by examining WC3 internals
- **TriggerHappy** — Noted that replay frame visibility (`ReplayPanel`) could be used for replay detection (separate from POV detection)
