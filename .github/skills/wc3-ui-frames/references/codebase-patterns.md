# Codebase Patterns for UI Frames

Patterns extracted from the existing WC3 Risk System codebase. Follow these when creating new UI.

## File Organization

| Purpose | Location |
|---------|----------|
| FDF definitions | `maps/<map>.w3x/Assets/Frames/frames.fdf` (3 copies: asia, europe, world) |
| TOC files | `maps/<map>.w3x/Assets/Frames/frames.toc` |
| UI classes | `src/app/ui/` |
| Managers with UI | `src/app/managers/` |
| Factory functions | `src/app/factory/` |
| Statistics views | `src/app/statistics/` |

**Important**: FDF changes must be applied to all 3 map variants.

## Pattern: FDF-Based Panel with Close Button

From `RatingStatsFrame` / `rating-stats-ui.ts`:

**FDF:**
```
Frame "BACKDROP" "MyPanel" INHERITS "QuestButtonBaseTemplate" {
    Width 0.25,
    Height 0.30,
    SetPoint CENTER, "ConsoleUI", CENTER, 0.0, 0.05,

    Frame "TEXT" "MyPanelTitle" {
        SetPoint TOP, "MyPanel", TOP, 0, -0.02,
        DecorateFileNames,
        FrameFont "MasterFont", 0.014, "",
        FontColor 0.99 0.827 0.0705 1.0,
        LayerStyle "IGNORETRACKEVENTS",
        FontJustificationH JUSTIFYCENTER,
        FontJustificationV JUSTIFYTOP,
        Width 0.23,
        Height 0.02,
        Text "Panel Title",
    }

    Frame "GLUETEXTBUTTON" "MyPanelCloseButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
        SetPoint TOPRIGHT, "MyPanel", TOPRIGHT, -0.005, -0.005,
        Width 0.025,
        Height 0.025,
        UseActiveContext,
        ButtonText "MyPanelCloseText",

        Frame "TEXT" "MyPanelCloseText" INHERITS "EscMenuButtonTextTemplate" {
            Text "X",
        }
    }
}
```

**TypeScript:**
```typescript
class MyPanel {
    private backdrop: framehandle;
    private titleText: framehandle;
    private closeButton: framehandle;

    constructor() {
        this.backdrop = BlzCreateFrame('MyPanel', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
        this.titleText = BlzGetFrameByName('MyPanelTitle', 0);
        this.closeButton = BlzGetFrameByName('MyPanelCloseButton', 0);

        // Register close button
        const closeTrig = CreateTrigger();
        BlzTriggerRegisterFrameEvent(closeTrig, this.closeButton, FRAMEEVENT_CONTROL_CLICK);
        TriggerAddAction(closeTrig, () => {
            if (GetTriggerPlayer() === this.ownerPlayer) {
                this.hide();
            }
        });

        // Observer support
        CreateObserverButton(this.closeButton, IsPlayerObserver(GetLocalPlayer()), () => {
            this.hide();
        });

        this.hide();
    }

    public show(): void {
        if (GetLocalPlayer() === this.ownerPlayer) {
            BlzFrameSetVisible(this.backdrop, true);
        }
    }

    public hide(): void {
        if (GetLocalPlayer() === this.ownerPlayer) {
            BlzFrameSetVisible(this.backdrop, false);
        }
    }
}
```

## Pattern: Button Without FDF (Code-Only)

From `guard-button-factory.ts`:

```typescript
function createIconButton(parent: framehandle, ctx: number, xOffset: number, iconPath: string): framehandle {
    const button = BlzCreateFrameByType('BUTTON', 'MyButton', parent, 'ScoreScreenTabButtonTemplate', ctx);
    const icon = BlzCreateFrameByType('BACKDROP', 'MyButtonIcon', button, '', ctx);

    BlzFrameSetAllPoints(icon, button);
    BlzFrameSetPoint(button, FRAMEPOINT_TOPLEFT, parent, FRAMEPOINT_TOPLEFT, xOffset, -0.025);
    BlzFrameSetSize(button, 0.02, 0.02);
    BlzFrameSetTexture(icon, iconPath, 0, true);

    return button;
}
```

## Pattern: Button with Tooltip

From `guard-button-factory.ts`:

```typescript
// Create tooltip backdrop
const tooltipFrame = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, ctx);
const tooltipText = BlzCreateFrameByType('TEXT', 'MyTooltip', tooltipFrame, '', ctx);

BlzFrameSetSize(tooltipText, 0.15, 0);
BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.012, -0.01);
BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.012, 0.01);
BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, button, FRAMEPOINT_BOTTOMLEFT, 0, -0.01);
BlzFrameSetEnable(tooltipText, false);
BlzFrameSetText(tooltipText, 'Tooltip content');

// Attach tooltip to button
BlzFrameSetTooltip(button, tooltipFrame);
```

## Pattern: Text Label (Code-Only)

From `console.ts`:

```typescript
const mapInfo = BlzCreateFrameByType('TEXT', 'mapInfo', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 'EscMenuLabelTextTemplate', 0);
BlzFrameSetPoint(mapInfo, FRAMEPOINT_LEFT, BlzGetFrameByName('ResourceBarSupplyText', 0), FRAMEPOINT_RIGHT, 0.035, 0.0);
BlzFrameSetTextAlignment(mapInfo, TEXT_JUSTIFY_CENTER, TEXT_JUSTIFY_RIGHT);
BlzFrameSetLevel(mapInfo, 2);
BlzFrameSetText(mapInfo, `v${MAP_VERSION}`);
```

## Pattern: Toggle Button (GLUETEXTBUTTON)

From `player-camera-position-manager.ts`:

```typescript
const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
const ctx = 500;

const toggleButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'MyToggle', gameUI, 'ScriptDialogButton', ctx);
BlzFrameSetPoint(toggleButton, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.092, -0.025);
BlzFrameSetSize(toggleButton, 0.1, 0.03);
BlzFrameSetText(toggleButton, 'Toggle: Off');

// Observer-only visibility
if (!EDITOR_DEVELOPER_MODE && !IsPlayerObserver(GetLocalPlayer())) {
    BlzFrameSetVisible(toggleButton, false);
    BlzFrameSetEnable(toggleButton, false);
}

CreateObserverButton(toggleButton, IsPlayerObserver(GetLocalPlayer()), () => {
    isActive = !isActive;
    BlzFrameSetText(toggleButton, isActive ? 'Toggle: On' : 'Toggle: Off');
    BlzFrameSetEnable(toggleButton, false);
    BlzFrameSetEnable(toggleButton, true);
});
```

## Pattern: Frame Pooling for Performance

From `minimap-icon-manager.ts` — for high-frequency frame updates, pool and reuse frames:

```typescript
// Pre-create a pool of frames
const pool: framehandle[] = [];
for (let i = 0; i < initialSize; i++) {
    const frame = BlzCreateFrameByType('BACKDROP', 'PooledIcon', parent, '', i);
    BlzFrameSetVisible(frame, false);
    pool.push(frame);
}

// Acquire from pool instead of creating new
function acquire(): framehandle {
    if (freeIndex < pool.length) {
        const frame = pool[freeIndex++];
        BlzFrameSetVisible(frame, true);
        return frame;
    }
    // Expand pool if needed
    const frame = BlzCreateFrameByType('BACKDROP', 'PooledIcon', parent, '', pool.length);
    pool.push(frame);
    freeIndex++;
    return frame;
}

// Return to pool
function release(frame: framehandle): void {
    BlzFrameSetVisible(frame, false);
}
```

**Performance tips:**
- Cache `BlzFrameGetWidth`/`BlzFrameGetHeight` results — don't call per-tick
- Cache textures: only call `BlzFrameSetTexture` when the texture actually changes
- Use `SIMPLESTATUSBAR` for bars that don't need events (lower overhead than STATUSBAR)

## Pattern: World-Position Anchored Frame (Tooltip over Unit)

From `tooltip-manager.ts`:

```typescript
const [sx, sy, onScreen] = World2Screen(unitX, unitY, unitZ + offset);
if (onScreen) {
    BlzFrameSetAbsPoint(tooltipText, FRAMEPOINT_BOTTOM, sx, sy + 0.015);
}
```

Uses the project's custom `World2Screen` native to convert 3D world coordinates to screen space.

## Pattern: Hiding/Modifying Default UI

From `console.ts`:

```typescript
// Hide a default frame
const resourceFrame = BlzGetFrameByName('ResourceBarFrame', 0);
BlzFrameSetVisible(BlzFrameGetChild(resourceFrame, 1), false);

// Make frame invisible by shrinking
BlzFrameSetSize(lumberFrame, 0.0000001, 0.0000001);

// Override default text
BlzFrameSetText(BlzGetFrameByName('AllianceTitle', 0), 'discord.gg/wc3risk');

// Disable buttons
BlzFrameSetEnable(BlzGetFrameByName('SaveGameButton', 0), false);
```

## Pattern: Statistics Board with Columns

From `ranked-statistics-view.ts` / `unranked-statistics-view.ts`:

```typescript
// Create board from FDF template (use createContext to differentiate instances)
const backdrop = BlzCreateFrame('StatisticsBoard', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, contextId);
BlzFrameSetAbsPoint(backdrop, FRAMEPOINT_CENTER, 0.4, 0.26);
BlzFrameSetSize(backdrop, 1, 0.64);

// Create column headers dynamically
const header = BlzCreateFrame('ColumnHeaderText', backdrop, 0, 0);
BlzFrameSetPoint(header, FRAMEPOINT_TOPLEFT, backdrop, FRAMEPOINT_TOPLEFT, xPos, -0.06);
BlzFrameSetText(header, 'Column Name');
BlzFrameSetSize(header, columnWidth, 0.02);

// Create data rows
const dataFrame = BlzCreateFrame('ColumnDataText', header, 0, 0);
BlzFrameSetPoint(dataFrame, FRAMEPOINT_TOPLEFT, header, FRAMEPOINT_TOPLEFT, 0, yGap);
BlzFrameSetText(dataFrame, 'Row Data');
```

## Pattern: Pagination Buttons

From `unranked-statistics-view.ts`:

```typescript
function CreateFooterButton(parent: framehandle, name: string, text: string, xOffset: number, onClick: () => void): framehandle {
    const button = BlzCreateFrameByType('GLUETEXTBUTTON', name, parent, 'ScriptDialogButton', 0);
    BlzFrameSetSize(button, 0.13, 0.03);
    BlzFrameSetPoint(button, FRAMEPOINT_CENTER, parent, FRAMEPOINT_CENTER, xOffset, 0);
    BlzFrameSetText(button, text);

    const trig = CreateTrigger();
    BlzTriggerRegisterFrameEvent(trig, button, FRAMEEVENT_CONTROL_CLICK);
    TriggerAddAction(trig, () => {
        if (GetLocalPlayer() === GetTriggerPlayer()) {
            onClick();
        }
    });

    return button;
}
```

## Color Codes for Frame Text

From `src/app/utils/hex-colors.ts` — use WC3 color codes in `BlzFrameSetText`:

```typescript
BlzFrameSetText(frame, `${HexColors.TANGERINE}Label:|r Value`);
BlzFrameSetText(frame, `${HexColors.RED}Error message|r`);
BlzFrameSetText(frame, `|cffRRGGBBColored text|r`);  // Raw format
```

Format: `|cffRRGGBB` to start color, `|r` to reset.
