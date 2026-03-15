# Observer Camera Position Toggle — Implementation Plan

## Goal

Allow observers to toggle the player camera position overlay on/off via a button in the top-left corner. The default state is **off** (hidden), since the floating name tags can be visually intrusive.

---

## Background: The Observer Interaction Problem

WC3 observers **cannot click** standard `BUTTON` or `GLUETEXTBUTTON` frames — `FRAMEEVENT_CONTROL_CLICK` never fires for them. However, observers **can** hover frames. The project already has a documented workaround in `src/app/utils/observer-helper.ts`:

```typescript
export function CreateObserverButton(button: framehandle, isObserver: boolean, action: () => void) {
	if (GetLocalPlayer() === GetLocalPlayer()) {
		const t = CreateTimer();
		TimerStart(t, 1, true, () => {
			if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
				if (isObserver) {
					action();
				}
			}
		});
	}
}
```

**How it works:**

1. A `BUTTON` created with `ScoreScreenTabButtonTemplate` has an internal highlight child at index 5.
2. When any player (including observers) hovers the button, that highlight child becomes visible.
3. A 1-second polling timer checks if child 5 is visible. If so, and the local player is an observer, it fires the action.
4. The timer must be created for **all players** (not inside a `GetLocalPlayer()` check) to prevent desync — only the action callback is gated by `isObserver`.

This pattern is already used in: `ranked-statistics-view.ts`, `unranked-statistics-view.ts`, and `rating-stats-ui.ts`.

---

## Existing Button Pattern (Guard Preference Buttons)

The top-left buttons are created via `src/app/factory/guard-button-factory.ts`:

- **Frame type:** `BUTTON` with `ScoreScreenTabButtonTemplate`
- **Icon:** `BACKDROP` child, texture swapped on toggle
- **Tooltip:** `EscMenuControlBackdropTemplate` with a `TEXT` child
- **Position:** Anchored to `FRAMEPOINT_TOPLEFT` of `ORIGIN_FRAME_GAME_UI` with an `xOffset`
- **Size:** `0.02 × 0.02`
- **Visibility:** Hidden for all, then shown only for the owning player via `GetLocalPlayer()` check

The 4 existing buttons use xOffsets: `0.0`, `0.023`, `0.046`, `0.069`.

---

## Implementation Steps

### Step 1: Add a Toggle Button for Observers

Create the button in `PlayerCameraPositionManager` (or a dedicated helper called from it). The button should:

1. **Use the same pattern** as guard buttons — `BUTTON` + `ScoreScreenTabButtonTemplate` + `BACKDROP` icon child.
2. **Position:** Top-left area, at an xOffset that doesn't collide with existing player buttons. Since observers don't see guard buttons, xOffset `0.0` is safe. Alternatively, use a distinct position like `FRAMEPOINT_TOPLEFT` with yOffset below the existing row (e.g., `y = -0.05`) to be safe.
3. **Visibility:** Only visible to observers:
   ```typescript
   BlzFrameSetVisible(button, false);
   if (IsPlayerObserver(GetLocalPlayer())) {
   	BlzFrameSetVisible(button, true);
   }
   ```
4. **Tooltip:** Show "Toggle Player Cameras" text on hover.
5. **Icon textures:** Use an eye/camera icon. Swap between an "on" and "off" texture on toggle.

### Step 2: Wire Observer Hover-Click via `CreateObserverButton`

Since observers can't click, use the existing `CreateObserverButton` helper:

```typescript
import { CreateObserverButton } from '../utils/observer-helper';

CreateObserverButton(button, IsPlayerObserver(GetLocalPlayer()), () => {
	this.toggleCameraOverlay();
});
```

This polls every 1 second. When the observer hovers the button, the action fires.

**Important:** The `CreateObserverButton` call must happen outside any `GetLocalPlayer()` guard (the timer must be created on all machines to prevent desync). Only the inner `isObserver` gate controls execution.

### Step 3: Add Toggle State + Toggle Method

Add state tracking in `PlayerCameraPositionManager`:

```typescript
private cameraOverlayVisible: boolean = false; // default OFF
```

Toggle method:

```typescript
private toggleCameraOverlay(): void {
    this.cameraOverlayVisible = !this.cameraOverlayVisible;

    // Update icon texture
    BlzFrameSetTexture(
        this.toggleButtonIcon,
        this.cameraOverlayVisible ? TEXTURE_ON : TEXTURE_OFF,
        0, true
    );

    // If hiding, immediately hide all player frames
    if (!this.cameraOverlayVisible) {
        this.frames.forEach((frame) => {
            BlzFrameSetVisible(frame.box, false);
            BlzFrameSetVisible(frame.text, false);
        });
    }
}
```

### Step 4: Gate `renderFrames()` on Toggle State

In the existing `renderFrames()` method, add the toggle check:

```typescript
private renderFrames() {
    if (!EDITOR_DEVELOPER_MODE && !IsPlayerObserver(GetLocalPlayer())) return;
    if (!this.cameraOverlayVisible && !EDITOR_DEVELOPER_MODE) return;

    // ... existing World2Screen positioning logic
}
```

When `EDITOR_DEVELOPER_MODE` is on, the overlay always renders (for dev testing). For observers, it only renders when toggled on.

### Step 5: Gate Initial Frame Visibility in `onSync()`

In the `onSync()` method where frames are first shown, also check the toggle:

```typescript
if ((EDITOR_DEVELOPER_MODE || IsPlayerObserver(GetLocalPlayer())) && this.cameraOverlayVisible) {
	BlzFrameSetVisible(frame.box, true);
	BlzFrameSetVisible(frame.text, true);
}
```

---

## Summary of Changes

| File                                | Change                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `player-camera-position-manager.ts` | Add `cameraOverlayVisible` state (default `false`), create toggle button in constructor, wire `CreateObserverButton`, gate `renderFrames()` and `onSync()` on toggle state |
| `observer-helper.ts`                | No changes — reuse existing `CreateObserverButton`                                                                                                                         |
| `guard-button-factory.ts`           | No changes (or optionally refactor to share button creation, but not required)                                                                                             |
| `game-settings.ts`                  | No changes needed (existing `SHOW_PLAYER_CAMERA_POSITIONS` still acts as master kill-switch)                                                                               |

---

## Considerations

- **Desync safety:** The button frame and timer must be created on all machines. Only visibility and action execution are gated by `GetLocalPlayer()` / `isObserver` checks.
- **Hover = click duration:** Since the polling timer runs every 1 second, hovering for more than 1 second will toggle again. This is the same behavior as the existing scorescreen buttons — the observer must move their cursor off the button promptly. This is a known limitation of the observer hover trick. Consider adjusting the polling interval, or adding a cooldown to prevent rapid re-toggling.
- **Icon assets:** Two textures (on/off) are needed. These can be existing WC3 icons or custom `.blp` files added to the map's imported assets. If no suitable icon exists, a simple `ReplaceableTextures\CommandButtons\` icon (e.g., a scouting/vision icon) can be used as a placeholder.
- **No network traffic:** The toggle is purely local (client-side visibility). The sync timers continue running regardless of toggle state — this means the data stays fresh and toggling on shows correct positions immediately.
