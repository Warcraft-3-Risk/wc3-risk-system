---
name: wc3-ui-frames
description: "Create and modify Warcraft III UI frames in this TSTL codebase. Use when: building custom UI elements, creating buttons/backdrops/text/sliders/tooltips, writing FDF frame definitions, positioning frames with SetPoint/SetAbsPoint, handling frame events (FRAMEEVENT_CONTROL_CLICK), creating observer-compatible buttons, managing frame lifecycle, pooling frames for performance, hiding/modifying default game UI, creating TOC files, or debugging frame visibility/positioning issues."
argument-hint: "Describe the UI element you want to create or modify"
---

# WC3 UI Frame Development

## When to Use

- Creating new UI elements (buttons, panels, text displays, progress bars, tooltips)
- Modifying or repositioning existing game UI
- Writing FDF frame definitions for complex UI layouts
- Handling frame click/hover/value-change events
- Making UI work correctly in multiplayer (desync safety)
- Optimizing frame performance (pooling, caching)
- Debugging frame visibility or positioning issues

## Key Concepts

### Coordinate System
- Screen space is **0.8 wide × 0.6 tall** in the 4:3 base coordinate system
- Origin `(0,0)` is bottom-left; `(0.8, 0.6)` is top-right
- The 3rd decimal place matters: `0.001` is meaningful
- Widescreen extends horizontally but the 4:3 area is always `0.0–0.8` x-axis

### Frame Families (Cannot Mix)
1. **Frame family** — Created with `BlzCreateFrame`/`BlzCreateFrameByType`. Interactive, supports events. Parent must be another Frame-family frame.
2. **SimpleFrame family** — Lightweight, non-interactive (except SimpleButton/SimpleCheckbox). Parent must be another SimpleFrame. Rendered below Frame-family.
3. **String/Texture** — Pseudo-SimpleFrames. Cannot have children.

### Frame Creation Methods
1. **`BlzCreateFrame(templateName, parent, priority, createContext)`** — Creates from an FDF-defined blueprint. The template must be a root frame in the FDF (no parent in FDF). Requires the FDF to be loaded via TOC.
2. **`BlzCreateFrameByType(type, name, parent, inherits, createContext)`** — Creates a frame by type without a custom FDF. The `inherits` param can reference a built-in template (e.g., `"ScoreScreenTabButtonTemplate"`, `"ScriptDialogButton"`, `"EscMenuLabelTextTemplate"`).

### createContext Parameter
- Used to differentiate frames with the same name
- `BlzGetFrameByName(name, createContext)` retrieves a specific instance
- Use unique context values when creating multiple instances of the same template

## Procedure: Create UI Element Without FDF

### 1. Choose Frame Type and Parent

```typescript
const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
```

### 2. Create the Frame

**BACKDROP (image/panel):**
```typescript
const backdrop = BlzCreateFrameByType('BACKDROP', 'MyBackdrop', gameUI, '', 0);
BlzFrameSetSize(backdrop, 0.15, 0.10);
BlzFrameSetAbsPoint(backdrop, FRAMEPOINT_CENTER, 0.4, 0.3);
BlzFrameSetTexture(backdrop, 'UI\\Widgets\\EscMenu\\Human\\quest-normal-background.blp', 0, true);
```

**TEXT:**
```typescript
const text = BlzCreateFrameByType('TEXT', 'MyText', gameUI, 'EscMenuLabelTextTemplate', 0);
BlzFrameSetSize(text, 0.15, 0.02);
BlzFrameSetPoint(text, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.01, -0.01);
BlzFrameSetText(text, 'Hello World');
```

**BUTTON (clickable):**
```typescript
const button = BlzCreateFrameByType('GLUETEXTBUTTON', 'MyButton', gameUI, 'ScriptDialogButton', 0);
BlzFrameSetSize(button, 0.1, 0.03);
BlzFrameSetAbsPoint(button, FRAMEPOINT_CENTER, 0.4, 0.3);
BlzFrameSetText(button, 'Click Me');
```

### 3. Register Events (if interactive)

```typescript
const trig = CreateTrigger();
BlzTriggerRegisterFrameEvent(trig, button, FRAMEEVENT_CONTROL_CLICK);
TriggerAddAction(trig, () => {
    // Reset keyboard focus after click (prevents stuck focus)
    BlzFrameSetEnable(button, false);
    BlzFrameSetEnable(button, true);
});
```

### 4. Add Observer Support (if needed)

```typescript
import { CreateObserverButton } from 'src/app/utils/observer-helper';
CreateObserverButton(button, IsPlayerObserver(GetLocalPlayer()), () => {
    // Observer hover-click action
});
```

## Procedure: Create UI Element With FDF

### 1. Define Frame in FDF

Add to `maps/<map>.w3x/Assets/Frames/frames.fdf`. See [FDF Reference](./references/fdf-reference.md).

### 2. Ensure TOC Loads the FDF

The TOC file (`maps/<map>.w3x/Assets/Frames/frames.toc`) must list the FDF path. The TOC **must end with an empty line** or the last FDF entry is ignored.

### 3. Create from FDF in TypeScript

```typescript
const frame = BlzCreateFrame('MyFrameName', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
const childText = BlzGetFrameByName('MyChildTextName', 0);
BlzFrameSetText(childText, 'Updated text');
```

## Procedure: Position Frames

See [Frame API Reference](./references/frame-api-reference.md) for all positioning natives.

**Absolute positioning:**
```typescript
BlzFrameSetAbsPoint(frame, FRAMEPOINT_CENTER, 0.4, 0.3);
```

**Relative positioning (anchored to another frame):**
```typescript
BlzFrameSetPoint(child, FRAMEPOINT_TOPLEFT, parent, FRAMEPOINT_TOPLEFT, 0.01, -0.01);
```

**Fill parent:**
```typescript
BlzFrameSetAllPoints(child, parent);
```

**Clear previous anchors before repositioning:**
```typescript
BlzFrameClearAllPoints(frame);
BlzFrameSetAbsPoint(frame, FRAMEPOINT_CENTER, newX, newY);
```

## Observer Interaction via Hover Detection

### The Problem

Observers in Warcraft III **cannot click UI buttons**. The `FRAMEEVENT_CONTROL_CLICK` event never fires for observer players. This means any interactive UI (leaderboards, pagination, toggles) is unusable by observers unless a workaround is applied.

### The Mechanism: Backdrop Child Hover Polling

A `GLUETEXTBUTTON` created with the `ScriptDialogButton` template has internal child frames. **Child index 5** is the button's highlight/hover backdrop — it becomes visible when the mouse cursor hovers over the button. By polling this child's visibility on a timer, we can detect observer hover and treat it as a "click".

```
Button (GLUETEXTBUTTON, ScriptDialogButton)
  └── child[0..4] — internal decoration frames
  └── child[5]    — highlight backdrop (visible = mouse is hovering)
```

### Using the `CreateObserverButton` Helper

The project provides `CreateObserverButton` in `src/app/utils/observer-helper.ts`:

```typescript
import { CreateObserverButton } from 'src/app/utils/observer-helper';

// After registering the normal click event for players:
const clickTrigger = CreateTrigger();
BlzTriggerRegisterFrameEvent(clickTrigger, button, FRAMEEVENT_CONTROL_CLICK);
TriggerAddAction(clickTrigger, () => {
    if (GetTriggerPlayer() === player) {
        doAction();
    }
});

// Add observer hover-click support:
CreateObserverButton(button, IsPlayerObserver(GetLocalPlayer()), () => {
    doAction();

    // Reset focus so hotkeys (ESC, F4, etc.) keep working
    BlzFrameSetEnable(button, false);
    BlzFrameSetEnable(button, true);
});
```

### How It Works Internally

```typescript
export function CreateObserverButton(button: framehandle, isObserver: boolean, action: () => void) {
    if (GetLocalPlayer() === GetLocalPlayer()) {  // always-true; ensures all players create the timer (sync-safe)
        const t = CreateTimer();
        TimerStart(t, 1, true, () => {
            // child[5] is the highlight backdrop — visible when mouse hovers
            if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
                if (isObserver) {
                    action();  // fires only for the local observer player
                }
            }
        });
    }
}
```

Key details:
- The timer runs for **all players** (sync-safe creation), but the `isObserver` guard means only observers execute the action
- `BlzFrameIsVisible` is a **local-only read** — it returns different values per player, so no desync
- The 1-second poll interval means observer clicks have up to 1 second of latency
- The `GetLocalPlayer() === GetLocalPlayer()` guard is an always-true idiom that keeps the code pattern consistent

### Inline Pattern (Without Helper)

Some older code uses the same technique inline, typically in footer button factories:

```typescript
// Inline observer hotfix (from statistics views)
if (GetLocalPlayer() === GetLocalPlayer()) {
    const t = CreateTimer();
    TimerStart(t, 1, true, () => {
        if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
            onClick(IsPlayerObserver(GetLocalPlayer()));
        }
    });
}
```

This pattern passes `IsPlayerObserver(GetLocalPlayer())` as the callback argument — the callback uses it to distinguish between a real player hover (ignored) and an observer hover (acted on).

### Requirements and Constraints

1. **Button template must be `ScriptDialogButton`** — The child[5] highlight backdrop is specific to this template. Other button types may have different child structures.
2. **Always pair with normal click handling** — The helper supplements `FRAMEEVENT_CONTROL_CLICK`, it doesn't replace it. Regular players still use normal clicks.
3. **Reset focus after action** — Call `BlzFrameSetEnable(button, false); BlzFrameSetEnable(button, true);` to release keyboard focus so hotkeys (ESC, F4, etc.) continue working.
4. **1-second poll latency** — Observer interactions have up to 1 second of delay. This is acceptable for UI toggles but not suitable for time-critical gameplay inputs.
5. **Timer lifecycle** — Each call creates a permanent repeating timer. For buttons that persist all game, this is fine. For temporary UI, consider cleaning up the timer.
6. **The button must be visible** — If the button is hidden (`BlzFrameSetVisible(button, false)`), the hover detection won't trigger since the button can't be hovered.

### Codebase Examples

| File | Usage |
|------|-------|
| `src/app/managers/player-camera-position-manager.ts` | Camera overlay toggle button for observers |
| `src/app/ui/rating-stats-ui.ts` | Leaderboard close, prev, next, and my-place buttons |
| `src/app/statistics/ranked-statistics-view.ts` | Footer pagination buttons (inline pattern) |
| `src/app/statistics/unranked-statistics-view.ts` | Footer pagination buttons (inline pattern) |

### Preferred Pattern for New Code

Use the `CreateObserverButton` helper rather than the inline pattern. Always include the focus reset:

```typescript
// 1. Create button
const button = BlzCreateFrameByType('GLUETEXTBUTTON', 'MyButton', gameUI, 'ScriptDialogButton', ctx);

// 2. Register normal click for players
const trig = CreateTrigger();
BlzTriggerRegisterFrameEvent(trig, button, FRAMEEVENT_CONTROL_CLICK);
TriggerAddAction(trig, () => {
    if (GetTriggerPlayer() === targetPlayer) {
        myAction();
        BlzFrameSetEnable(button, false);
        BlzFrameSetEnable(button, true);
    }
});

// 3. Add observer hover-click
CreateObserverButton(button, IsPlayerObserver(GetLocalPlayer()), () => {
    myAction();
    BlzFrameSetEnable(button, false);
    BlzFrameSetEnable(button, true);
});
```

## Multiplayer Safety Rules

**CRITICAL — violating these causes desync:**

1. **Frame creation** — Must run for all players. Never gate `BlzCreateFrame`/`BlzCreateFrameByType` behind `GetLocalPlayer()` checks.
2. **Frame events** — `BlzTriggerRegisterFrameEvent` must run for all players. The trigger actions are sync-safe (WC3 engine handles per-player filtering).
3. **Local-only operations** — `BlzFrameSetVisible`, `BlzFrameSetText`, `BlzFrameSetTexture` CAN be gated behind `GetLocalPlayer()` — these are visual-only.
4. **Async-unsafe reads** — `BlzFrameGetText`, `BlzFrameGetValue`, `BlzFrameIsVisible` return local values. Never use their results to make gameplay decisions.
5. **Pre-initialize frames** — Create frames during setup/countdown phase, not during button click handlers, to avoid sync issues. See `rating-stats-ui.ts` `preInitialize()` pattern.

See [Multiplayer Safety Reference](./references/multiplayer-safety.md) for details.

## Project Conventions

- FDF files live in `maps/<map>.w3x/Assets/Frames/frames.fdf` (one per map variant)
- TOC files: `maps/<map>.w3x/Assets/Frames/frames.toc`
- TypeScript UI code lives in `src/app/ui/`, managers in `src/app/managers/`, factories in `src/app/factory/`
- Use `CreateObserverButton()` from `src/app/utils/observer-helper.ts` for buttons observers need
- After button click, reset focus: `BlzFrameSetEnable(btn, false); BlzFrameSetEnable(btn, true);`
- For player-local visibility: `if (GetLocalPlayer() === player) { BlzFrameSetVisible(frame, true); }`
- Use unique `createContext` values to avoid frame name collisions
- **Changes to FDF must be applied to all 3 map variants** (asia, europe, world)

## References

- [Frame API Reference](./references/frame-api-reference.md) — All BlzFrame* natives with signatures and notes
- [FDF Reference](./references/fdf-reference.md) — FDF syntax, frame types, inheritance, common templates
- [Multiplayer Safety](./references/multiplayer-safety.md) — Desync prevention rules for frame code
- [Codebase Patterns](./references/codebase-patterns.md) — Patterns extracted from this project's existing frame code
