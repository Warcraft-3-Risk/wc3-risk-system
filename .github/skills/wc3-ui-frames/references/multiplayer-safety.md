# Multiplayer Safety for UI Frames

WC3 is a lockstep multiplayer engine. All players must execute the same game-state-affecting code. UI frames introduce local-only operations that can cause desyncs if misused.

## The Core Rule

**Frame creation and event registration = sync (run for all players).**
**Frame visual changes = can be local (safe inside GetLocalPlayer blocks).**
**Frame state reads = async (never use for game decisions).**

## Safe Operations (Can Be Local)

These only affect the local player's display and are safe inside `if (GetLocalPlayer() === somePlayer)`:

```typescript
BlzFrameSetVisible(frame, visible)
BlzFrameSetText(frame, text)
BlzFrameSetTexture(frame, path, flag, blend)
BlzFrameSetAlpha(frame, alpha)
BlzFrameSetSize(frame, w, h)          // Visual-only
BlzFrameSetPoint(frame, ...)           // Visual-only repositioning
BlzFrameSetAbsPoint(frame, ...)        // Visual-only repositioning
BlzFrameSetValue(frame, value)         // Visual-only (slider/bar display)
BlzFrameSetEnable(frame, enabled)      // Visual-only
BlzFrameSetLevel(frame, level)         // Visual-only
BlzFrameSetFont(frame, ...)            // Visual-only
BlzFrameSetScale(frame, scale)         // Visual-only
```

Example — show frame for one player only:
```typescript
if (GetLocalPlayer() === targetPlayer) {
    BlzFrameSetVisible(myFrame, true);
}
```

## Must Be Synced (Run for ALL Players)

These affect game state or internal frame tree and **must NOT be inside GetLocalPlayer blocks**:

```typescript
BlzCreateFrame(...)                    // Creates handle — must be synced
BlzCreateFrameByType(...)              // Creates handle — must be synced
BlzTriggerRegisterFrameEvent(...)      // Registers trigger — must be synced
CreateTrigger()                        // Creates handle — must be synced
TriggerAddAction(...)                  // Modifies trigger — must be synced
```

## Async / Local-Only Reads (NEVER Use for Game Decisions)

These return values that differ between players:

```typescript
BlzFrameIsVisible(frame)               // Returns local visibility
BlzFrameGetText(frame)                 // Returns local text
BlzFrameGetValue(frame)                // Returns local value
BlzGetMouseFocusUnit()                 // Returns local mouse target
GetCameraTargetPositionX/Y()           // Returns local camera
```

**Anti-pattern — WILL DESYNC:**
```typescript
// WRONG: Using async read to make game decision
if (BlzFrameIsVisible(myFrame)) {
    // This runs for different players at different times → desync
    SetUnitLifePercent(someUnit, 50);
}
```

## Frame Events Are Sync-Safe

Frame events (FRAMEEVENT_CONTROL_CLICK, etc.) are automatically synced by the WC3 engine. The trigger actions run for all players, but `GetTriggerPlayer()` tells you which player actually clicked.

**Pattern — filter in trigger action:**
```typescript
const trig = CreateTrigger();
BlzTriggerRegisterFrameEvent(trig, button, FRAMEEVENT_CONTROL_CLICK);
TriggerAddAction(trig, () => {
    // This runs for ALL players, but we can filter:
    if (GetTriggerPlayer() === ownerPlayer) {
        // Safe: visual-only changes for the clicking player
        if (GetLocalPlayer() === GetTriggerPlayer()) {
            BlzFrameSetVisible(somePanel, true);
        }
    }
});
```

## Pre-Initialization Pattern

Creating frames during a button click handler can cause issues because the frame creation is triggered by a per-player event timing. The project uses a pre-initialization pattern:

```typescript
// In rating-stats-ui.ts:
public preInitialize(): void {
    if (GetLocalPlayer() === this.player.getPlayer()) {
        if (!this.isInitialized) {
            this.initializeFrames();  // Create all frames upfront
        }
    }
}
```

Call `preInitialize()` during countdown/setup phase (when all players are in sync), not during runtime button clicks.

## Observer Interaction

Observers cannot click buttons normally. The project uses a hover-based workaround:

```typescript
// From src/app/utils/observer-helper.ts
export function CreateObserverButton(button: framehandle, isObserver: boolean, action: () => void) {
    const t = CreateTimer();
    TimerStart(t, 1, true, () => {
        // Check if child[5] (highlight) is visible = mouse hovering
        if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
            if (isObserver) {
                action();
            }
        }
    });
}
```

This is safe because:
- Observer actions are visual-only (no game state changes)
- The timer runs for all players but `isObserver` gates execution
- Observers are not part of the lockstep simulation

## Keyboard Focus Reset

After a button click, the button may retain keyboard focus, blocking hotkeys (ESC, F4, etc.). Always reset:

```typescript
TriggerAddAction(trig, () => {
    if (GetTriggerPlayer() === ownerPlayer) {
        doAction();
        // Reset focus
        BlzFrameSetEnable(button, false);
        BlzFrameSetEnable(button, true);
    }
});
```

## Common Desync Causes

1. **Creating frames inside GetLocalPlayer()** — Handle IDs diverge between players
2. **Using BlzFrameGetText/Value for game decisions** — Values differ per player
3. **Registering events inside GetLocalPlayer()** — Trigger list diverges
4. **Creating frames in click handlers without pre-init** — Timing-dependent handle creation
5. **Forgetting that string operations with GetLocalPlayer can desync** — e.g., building strings with local text values and passing to synced functions
