# Frame API Reference

Complete reference for WC3 frame natives used in this TSTL codebase. All functions are globals available at runtime.

## Frame Creation

### BlzCreateFrame
```typescript
BlzCreateFrame(name: string, owner: framehandle, priority: number, createContext: number): framehandle
```
Creates a frame from an FDF-defined blueprint. The `name` must match a root-level `Frame` definition in a loaded FDF. The FDF must be loaded via a TOC file. Returns a null handle (id 0) if the blueprint is not found.

### BlzCreateFrameByType
```typescript
BlzCreateFrameByType(typeName: string, name: string, owner: framehandle, inherits: string, createContext: number): framehandle
```
Creates a frame by type without requiring a custom FDF. Common type names:
- `"BACKDROP"` — Image/texture display
- `"TEXT"` — Text label
- `"BUTTON"` — Clickable button (no built-in visuals)
- `"GLUETEXTBUTTON"` — Button with text label (use with `"ScriptDialogButton"` template)
- `"FRAME"` — Invisible container (for grouping)
- `"SLIDER"` — Draggable slider
- `"EDITBOX"` — Text input field
- `"SPRITE"` — Model display
- `"STATUSBAR"` — Progress bar (supports model-based display)
- `"CHECKBOX"` — Toggle checkbox
- `"POPUPMENU"` — Dropdown menu
- `"TEXTAREA"` — Scrollable text area
- `"HIGHLIGHT"` — Highlight overlay
- `"LISTBOX"` — Scrollable list
- `"DIALOG"` — Dialog container (Yes/No)
- `"SIMPLEFRAME"` — Simple (non-interactive) container
- `"SIMPLESTATUSBAR"` — Simple progress bar

Common `inherits` templates:
- `""` — No template (blank)
- `"ScriptDialogButton"` — Standard dialog button
- `"ScoreScreenTabButtonTemplate"` — Tab-style button
- `"EscMenuLabelTextTemplate"` — Standard text style
- `"EscMenuControlBackdropTemplate"` — Bordered backdrop

### BlzCreateSimpleFrame
```typescript
BlzCreateSimpleFrame(name: string, owner: framehandle, createContext: number): framehandle
```
Creates a SimpleFrame from FDF blueprint. SimpleFrames cannot have Frame-family children and vice versa.

## Frame Lookup

### BlzGetFrameByName
```typescript
BlzGetFrameByName(name: string, createContext: number): framehandle
```
Finds a frame by its name and createContext. Returns null handle if not found. Works for both custom and built-in frames.

### BlzGetOriginFrame
```typescript
BlzGetOriginFrame(frameType: originframetype, index: number): framehandle
```
Gets a built-in origin frame. Common types:
- `ORIGIN_FRAME_GAME_UI` — Root game UI (index 0). **Use as parent for custom frames.**
- `ORIGIN_FRAME_MINIMAP` — Minimap frame
- `ORIGIN_FRAME_COMMAND_BUTTON` — Command card buttons (index 0-11)
- `ORIGIN_FRAME_HERO_BUTTON` — Hero portrait buttons (index 0-6)
- `ORIGIN_FRAME_ITEM_BUTTON` — Item slot buttons (index 0-5)
- `ORIGIN_FRAME_UBERTOOLTIP` — Default tooltip frame
- `ORIGIN_FRAME_WORLD_FRAME` — The 3D world viewport
- `ORIGIN_FRAME_HERO_BAR` — Hero bar
- `ORIGIN_FRAME_HERO_HP_BAR` — Hero HP bar
- `ORIGIN_FRAME_HERO_MANA_BAR` — Hero mana bar
- `ORIGIN_FRAME_PORTRAIT` — Unit portrait
- `ORIGIN_FRAME_CHAT_MSG` — Chat message display
- `ORIGIN_FRAME_UNIT_MSG` — Unit message display

### BlzFrameGetChild
```typescript
BlzFrameGetChild(frame: framehandle, index: number): framehandle
```
Gets a child frame by index. Use with `BlzFrameGetChildrenCount` for traversal.

### BlzFrameGetChildrenCount
```typescript
BlzFrameGetChildrenCount(frame: framehandle): number
```

## Positioning

### BlzFrameSetPoint
```typescript
BlzFrameSetPoint(frame: framehandle, point: framepointtype, relative: framehandle, relativePoint: framepointtype, x: number, y: number): void
```
Positions a frame relative to another frame. The `x` and `y` are offsets from the relative point.

**Frame point types:**
- `FRAMEPOINT_TOPLEFT`, `FRAMEPOINT_TOP`, `FRAMEPOINT_TOPRIGHT`
- `FRAMEPOINT_LEFT`, `FRAMEPOINT_CENTER`, `FRAMEPOINT_RIGHT`
- `FRAMEPOINT_BOTTOMLEFT`, `FRAMEPOINT_BOTTOM`, `FRAMEPOINT_BOTTOMRIGHT`

### BlzFrameSetAbsPoint
```typescript
BlzFrameSetAbsPoint(frame: framehandle, point: framepointtype, x: number, y: number): void
```
Sets an absolute screen position. x range: 0.0–0.8, y range: 0.0–0.6 (4:3 base).

### BlzFrameSetAllPoints
```typescript
BlzFrameSetAllPoints(frame: framehandle, relative: framehandle): void
```
Makes frame fill the entire area of relative frame (all 4 corners anchored).

### BlzFrameClearAllPoints
```typescript
BlzFrameClearAllPoints(frame: framehandle): void
```
Removes all position anchors. Call before re-positioning a frame that was previously positioned.

### BlzFrameSetSize
```typescript
BlzFrameSetSize(frame: framehandle, width: number, height: number): void
```
Sets frame dimensions. Units are in the 0.8×0.6 coordinate space.

### BlzFrameGetWidth / BlzFrameGetHeight
```typescript
BlzFrameGetWidth(frame: framehandle): number
BlzFrameGetHeight(frame: framehandle): number
```

## Visual Properties

### BlzFrameSetTexture
```typescript
BlzFrameSetTexture(frame: framehandle, texFile: string, flag: number, blend: boolean): void
```
Sets backdrop texture. `flag` is usually 0. `blend` enables alpha blending. Only works on BACKDROP frames.

### BlzFrameSetText
```typescript
BlzFrameSetText(frame: framehandle, text: string): void
```
Sets text content. Supports color codes: `|cffRRGGBBtext|r`. Works on TEXT, GLUETEXTBUTTON, EDITBOX, TEXTAREA, SIMPLESTATUSBAR.

### BlzFrameSetTextAlignment
```typescript
BlzFrameSetTextAlignment(frame: framehandle, vert: textaligntype, horz: textaligntype): void
```
- Horizontal: `TEXT_JUSTIFY_LEFT`, `TEXT_JUSTIFY_CENTER`, `TEXT_JUSTIFY_RIGHT`
- Vertical: `TEXT_JUSTIFY_TOP`, `TEXT_JUSTIFY_MIDDLE`, `TEXT_JUSTIFY_BOTTOM`

### BlzFrameSetVisible
```typescript
BlzFrameSetVisible(frame: framehandle, visible: boolean): void
```
Shows/hides a frame. Hidden frames also hide all children. **Safe to call inside GetLocalPlayer() blocks.**

### BlzFrameSetEnable
```typescript
BlzFrameSetEnable(frame: framehandle, enabled: boolean): void
```
Enables/disables frame interaction. Disabled buttons appear grayed. Toggling off then on resets keyboard focus (use after click events).

### BlzFrameSetAlpha
```typescript
BlzFrameSetAlpha(frame: framehandle, alpha: number): void
```
Sets transparency. 0 = invisible, 255 = fully opaque.

### BlzFrameSetLevel
```typescript
BlzFrameSetLevel(frame: framehandle, level: number): void
```
Sets rendering order. Higher levels render on top. Only affects frames with the same parent.

### BlzFrameSetScale
```typescript
BlzFrameSetScale(frame: framehandle, scale: number): void
```
Scales the frame. 1.0 = normal size.

### BlzFrameSetTextSizeLimit
```typescript
BlzFrameSetTextSizeLimit(frame: framehandle, size: number): void
```

### BlzFrameSetFont
```typescript
BlzFrameSetFont(frame: framehandle, fileName: string, height: number, flags: number): void
```

## Frame Events

### BlzTriggerRegisterFrameEvent
```typescript
BlzTriggerRegisterFrameEvent(trigger: trigger, frame: framehandle, eventId: frameeventtype): void
```
Registers a frame event. **Must run for all players** (sync-safe).

**Event types:**
- `FRAMEEVENT_CONTROL_CLICK` — Button clicked
- `FRAMEEVENT_MOUSE_ENTER` — Mouse enters frame area
- `FRAMEEVENT_MOUSE_LEAVE` — Mouse leaves frame area
- `FRAMEEVENT_MOUSE_UP` — Mouse button released
- `FRAMEEVENT_MOUSE_DOWN` — Mouse button pressed
- `FRAMEEVENT_MOUSE_WHEEL` — Mouse wheel scrolled
- `FRAMEEVENT_CHECKBOX_CHECKED` — Checkbox toggled on
- `FRAMEEVENT_CHECKBOX_UNCHECKED` — Checkbox toggled off
- `FRAMEEVENT_EDITBOX_TEXT_CHANGED` — EditBox text modified
- `FRAMEEVENT_POPUPMENU_ITEM_CHANGED` — Popup menu selection changed
- `FRAMEEVENT_MOUSE_DOUBLECLICK` — Double-clicked
- `FRAMEEVENT_SPRITE_ANIM_UPDATE` — Sprite animation update
- `FRAMEEVENT_SLIDER_VALUE_CHANGED` — Slider value changed
- `FRAMEEVENT_DIALOG_CANCEL` — Dialog cancelled
- `FRAMEEVENT_DIALOG_ACCEPT` — Dialog accepted
- `FRAMEEVENT_EDITBOX_ENTER` — Enter pressed in editbox

### Event Getters (in trigger actions)
```typescript
BlzGetTriggerFrame(): framehandle        // The frame that triggered the event
BlzGetTriggerFrameEvent(): frameeventtype // The event type
BlzGetTriggerFrameValue(): number         // Value (slider position, popup index)
BlzGetTriggerFrameText(): string          // Text (editbox content)
GetTriggerPlayer(): player                // Player who triggered the event
```

## Keyboard Events

### BlzTriggerRegisterPlayerKeyEvent
```typescript
BlzTriggerRegisterPlayerKeyEvent(trigger: trigger, whichPlayer: player, key: oskeytype, metaKey: number, keyDown: boolean): void
```
Registers a keyboard shortcut. Common keys: `OSKEY_F5`, `OSKEY_F6`, `OSKEY_F7`, `OSKEY_ESCAPE`.

## Tooltip

### BlzFrameSetTooltip
```typescript
BlzFrameSetTooltip(frame: framehandle, tooltip: framehandle): void
```
Attaches a tooltip frame that appears on hover. The tooltip frame is automatically shown/hidden.

## Status Bar / Value

### BlzFrameSetValue
```typescript
BlzFrameSetValue(frame: framehandle, value: number): void
```
Sets value for SLIDER or STATUSBAR frames.

### BlzFrameSetMinMaxValue
```typescript
BlzFrameSetMinMaxValue(frame: framehandle, minVal: number, maxVal: number): void
```

### BlzFrameGetValue
```typescript
BlzFrameGetValue(frame: framehandle): number
```
**Async — do not use for gameplay decisions.**

## Sprite / Model

### BlzFrameSetModel
```typescript
BlzFrameSetModel(frame: framehandle, modelFile: string, cameraIndex: number): void
```
Sets model for SPRITE frames. `cameraIndex` 0 is default.

### BlzFrameSetSpriteAnimate
```typescript
BlzFrameSetSpriteAnimate(frame: framehandle, primaryProp: number, flags: number): void
```
Animation indices: 0=birth, 1=death, 2=stand, 3=morph, 4=alternate.

## Visibility & State Queries (ASYNC — local only)

```typescript
BlzFrameIsVisible(frame: framehandle): boolean  // Local-only result
BlzFrameGetText(frame: framehandle): string      // Local-only result
BlzFrameGetValue(frame: framehandle): number     // Local-only result
```
**WARNING**: These return player-local values. Never use results to make shared-state decisions.

## Utility

### BlzGetMouseFocusUnit
```typescript
BlzGetMouseFocusUnit(): unit
```
Returns the unit currently under the mouse cursor. Async/local.

### BlzHideOriginFrames
```typescript
BlzHideOriginFrames(enable: boolean): void
```
Hides all default UI origin frames when `true`.

### World2Screen (custom native in this project)
```typescript
World2Screen(x: number, y: number, z: number): LuaMultiReturn<[number, number, boolean]>
```
Converts world coordinates to screen coordinates. Returns `[screenX, screenY, isOnScreen]`.
