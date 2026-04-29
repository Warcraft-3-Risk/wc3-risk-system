# FDF Reference

FDF (Frame Definition Files) define UI frame blueprints that are instantiated at runtime with `BlzCreateFrame()`. This project's FDF files are at `maps/<map>.w3x/Assets/Frames/frames.fdf`.

## TOC Files

TOC (Table of Contents) files list FDF files to load. Located at `maps/<map>.w3x/Assets/Frames/frames.toc`.

```
ui\framedef\ui\escmenutemplates.fdf
ui\framedef\glue\standardtemplates.fdf
ui\framedef\glue\battlenettemplates.fdf
Assets\Frames\frames.fdf
```

**CRITICAL**: The TOC file must end with an **empty line** after the last entry, otherwise the last FDF is silently ignored.

Built-in FDF paths load Blizzard's standard templates (EscMenu, BattleNet, ScriptDialog, Quest). Custom FDFs are listed after.

## FDF Syntax

### Basic Structure
```
Frame "TYPE" "UniqueName" {
    Width 0.15,
    Height 0.10,
    SetPoint CENTER, "ConsoleUI", CENTER, 0.0, 0.0,

    // Child frames
    Frame "TEXT" "ChildText" {
        SetPoint TOPLEFT, "UniqueName", TOPLEFT, 0.01, -0.01,
        Text "Hello",
    }
}
```

### Inheritance
```
// Inherit layout only (no children)
Frame "BACKDROP" "MyFrame" INHERITS "QuestButtonBaseTemplate" {
}

// Inherit layout AND children
Frame "GLUETEXTBUTTON" "MyButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
}
```

### IncludeFile
```
IncludeFile "UI\FrameDef\UI\EscMenuTemplates.fdf",
```
Loads built-in template definitions. Must appear at top of FDF.

## Frame Types in FDF

### BACKDROP
Image/texture display. The most basic visual frame.

```
Frame "BACKDROP" "MyBackdrop" {
    Width 0.2,
    Height 0.15,
    SetPoint CENTER, "ConsoleUI", CENTER, 0.0, 0.05,
    BackdropBackground  "UI\Widgets\EscMenu\Human\quest-normal-background.blp",
    BackdropBackgroundInsets 0.005 0.005 0.005 0.005,
    BackdropCornerFlags "UL|UR|BL|BR|T|L|B|R",
    BackdropCornerSize  0.0125,
    BackdropEdgeFile  "UI\Widgets\EscMenu\Human\human-options-menu-border.blp",
}
```

Properties:
- `BackdropBackground` — Main texture file path
- `BackdropEdgeFile` — Border texture
- `BackdropCornerSize` — Corner tile size
- `BackdropCornerFlags` — Which corners/edges to draw: `"UL|UR|BL|BR|T|L|B|R"`
- `BackdropBackgroundInsets` — Inset from edges (top right bottom left)
- `BackdropBlendAll` — Enable alpha blending
- `BackdropTileBackground` — Tile the texture

### TEXT
Text display label.

```
Frame "TEXT" "MyText" {
    SetPoint TOPLEFT, "ParentName", TOPLEFT, 0.01, -0.01,
    Width 0.15,
    Height 0.02,
    DecorateFileNames,
    FrameFont "MasterFont", 0.012, "",
    FontColor 1.0 0.8 0.0 1.0,
    LayerStyle "IGNORETRACKEVENTS",
    FontJustificationH JUSTIFYLEFT,
    FontJustificationV JUSTIFYMIDDLE,
    Text "Default Text",
}
```

Properties:
- `FrameFont "FontName", size, "flags"` — Font and size
- `FontColor R G B A` — RGBA values 0.0–1.0
- `FontJustificationH` — `JUSTIFYLEFT`, `JUSTIFYCENTER`, `JUSTIFYRIGHT`
- `FontJustificationV` — `JUSTIFYTOP`, `JUSTIFYMIDDLE`, `JUSTIFYBOTTOM`
- `LayerStyle "IGNORETRACKEVENTS"` — Makes text not block mouse clicks
- `DecorateFileNames` — Enables color code parsing in text
- `FontShadowColor R G B A` — Text shadow color
- `FontShadowOffset X Y` — Shadow offset
- `FontFlags` — `"FIXEDSIZE"`, `"IGNORENEWLINES"`
- `Text "content"` — Default text value

### GLUETEXTBUTTON
Button with built-in text. The standard clickable button type.

```
Frame "GLUETEXTBUTTON" "MyButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
    SetPoint CENTER, "ParentName", CENTER, 0, 0,
    Width 0.10,
    Height 0.03,
    UseActiveContext,
    ButtonText "MyButtonText",

    Frame "TEXT" "MyButtonText" INHERITS "EscMenuButtonTextTemplate" {
        Text "Click Me",
    }
}
```

Properties:
- `ButtonText "ChildTextName"` — Links to the text child
- `UseActiveContext` — Required for proper button behavior
- `ControlStyle "AUTOTRACK|HIGHLIGHTONMOUSEOVER"` — Auto-tracking and hover highlight
- `ButtonPushedTextOffset X Y` — Text offset when pressed
- `ControlBackdrop`, `ControlPushedBackdrop`, `ControlDisabledBackdrop` — Visual states
- `ControlMouseOverHighlight` — Hover highlight frame

### BUTTON
Raw button without built-in text. Used for icon buttons.

```
Frame "BUTTON" "MyIconButton" {
    Width 0.02,
    Height 0.02,
    ControlStyle "AUTOTRACK|HIGHLIGHTONMOUSEOVER",

    ControlBackdrop "MyIconButtonBackdrop",
    Frame "BACKDROP" "MyIconButtonBackdrop" {
        BackdropBackground "path\\to\\icon.blp",
    }

    ControlMouseOverHighlight "MyIconHighlight",
    Frame "HIGHLIGHT" "MyIconHighlight" {
        HighlightType "FILETEXTURE",
        HighlightAlphaFile "UI\Widgets\EscMenu\Human\human-options-button-highlight.blp",
        HighlightAlphaMode "ADD",
    }
}
```

### EDITBOX
Text input field.

```
Frame "EDITBOX" "MyEditBox" {
    Width 0.095,
    Height 0.019,
    EditMaxChars 16,
    EditBorderSize 0.004,
    EditCursorColor 1.0 1.0 1.0,

    EditTextFrame "MyEditBoxText",
    Frame "TEXT" "MyEditBoxText" INHERITS "TextTemplate" {
    }

    ControlBackdrop "MyEditBackdrop",
    Frame "BACKDROP" "MyEditBackdrop" {
        BackdropBackground "UI\Widgets\EscMenu\Human\human-options-menu-background",
        BackdropEdgeFile "UI\Widgets\BattleNet\bnet-inputbox-border.blp",
    }
}
```

### POPUPMENU
Dropdown selection menu.

```
Frame "POPUPMENU" "MyPopup" {
    Width 0.13,
    Height 0.03,
    PopupButtonInset 0.01,

    ControlBackdrop "MyPopupBackdrop",
    Frame "BACKDROP" "MyPopupBackdrop" INHERITS "EscMenuButtonBackdropTemplate" {
    }

    PopupTitleFrame "MyPopupTitle",
    Frame "GLUETEXTBUTTON" "MyPopupTitle" INHERITS WITHCHILDREN "EscMenuPopupMenuTitleTemplate" {
    }

    PopupArrowFrame "MyPopupArrow",
    Frame "BUTTON" "MyPopupArrow" INHERITS WITHCHILDREN "EscMenuPopupMenuArrowTemplate" {
    }

    PopupMenuFrame "MyPopupMenu",
    Frame "MENU" "MyPopupMenu" INHERITS WITHCHILDREN "EscMenuPopupMenuMenuTemplate" {
        MenuItem "Option 1", -2,
        MenuItem "Option 2", -2,
        MenuItem "Option 3", -2,
    }
}
```

### FRAME
Invisible container for grouping child frames.

```
Frame "FRAME" "MyContainer" {
    Width 0.2,
    Height 0.1,
    SetPoint TOP, "ParentName", TOP, 0, -0.05,

    Frame "TEXT" "Child1" { ... }
    Frame "TEXT" "Child2" { ... }
}
```

### HIGHLIGHT
Overlay for hover/selection effects.

```
Frame "HIGHLIGHT" "MyHighlight" {
    HighlightType "FILETEXTURE",
    HighlightAlphaFile "UI\Widgets\EscMenu\Human\human-options-button-highlight.blp",
    HighlightAlphaMode "ADD",
}
```

### SLIDER
Draggable value slider.

```
Frame "SLIDER" "MySlider" {
    Width 0.15,
    Height 0.012,
    SliderMinValue 0,
    SliderMaxValue 100,
    SliderInitialValue 50,
    SliderStepSize 1,

    SliderThumbButtonFrame "MySliderThumb",
    Frame "BUTTON" "MySliderThumb" {
        Width 0.012,
        Height 0.012,
    }
}
```

### STATUSBAR
Progress bar that can display a model with animation.

```
Frame "STATUSBAR" "MyBar" {
    Width 0.15,
    Height 0.02,
    BarTexture "path\\to\\bar.blp",
}
```

### SIMPLESTATUSBAR
Simple (non-frame-family) progress bar.

```
Frame "SIMPLESTATUSBAR" "MySimpleBar" {
    Width 0.08,
    Height 0.020,
    BarTexture "Replaceabletextures\Teamcolor\Teamcolor00.blp",

    Layer "BACKGROUND" {
        Texture "MyBarBg" {
            File "Replaceabletextures\Teamcolor\Teamcolor27.blp",
        }
    }
}
```

### TEXTAREA
Scrollable multi-line text.

### CHECKBOX
Toggle checkbox.

### SPRITE
3D model display. Supports animation via `BlzFrameSetSpriteAnimate`. Auto-loops animation.

## Positioning in FDF

```
SetPoint FRAMEPOINT, "RelativeFrameName", RELATIVEPOINT, xOffset, yOffset,
```

**Frame points:** `TOPLEFT`, `TOP`, `TOPRIGHT`, `LEFT`, `CENTER`, `RIGHT`, `BOTTOMLEFT`, `BOTTOM`, `BOTTOMRIGHT`

```
SetAllPoints,   // Fill parent area
```

## Common Built-in Templates

These are available from the standard IncludeFile FDFs:

| Template | Type | Description |
|----------|------|-------------|
| `QuestButtonBaseTemplate` | BACKDROP | Standard bordered panel background |
| `EscMenuButtonTemplate` | GLUETEXTBUTTON | Standard menu button with all states |
| `EscMenuButtonTextTemplate` | TEXT | Standard button text style |
| `EscMenuLabelTextTemplate` | TEXT | Standard label text style |
| `EscMenuButtonBackdropTemplate` | BACKDROP | Button normal state backdrop |
| `EscMenuButtonDisabledBackdropTemplate` | BACKDROP | Button disabled state |
| `EscMenuPopupMenuTitleTemplate` | GLUETEXTBUTTON | Popup menu title |
| `EscMenuPopupMenuArrowTemplate` | BUTTON | Popup menu dropdown arrow |
| `EscMenuPopupMenuMenuTemplate` | MENU | Popup menu items list |
| `EscMenuControlBackdropTemplate` | BACKDROP | Control area backdrop |
| `ScriptDialogButton` | (runtime) | Simple dialog button for BlzCreateFrameByType |
| `ScoreScreenTabButtonTemplate` | (runtime) | Tab-style button for BlzCreateFrameByType |

## Common Fonts

| Font | Usage |
|------|-------|
| `"MasterFont"` | Default WC3 game font |
| `"Fonts\BLQ55Web.ttf"` | Custom font used in this project |

## Common Textures

| Path | Description |
|------|-------------|
| `UI\Widgets\EscMenu\Human\quest-normal-background.blp` | Standard panel background |
| `UI\Widgets\EscMenu\Human\human-options-menu-border.blp` | Standard panel border |
| `UI\Widgets\EscMenu\Human\human-options-menu-background.blp` | Menu background |
| `UI\Widgets\EscMenu\Human\human-options-button-highlight.blp` | Button hover highlight |
| `UI\Widgets\BattleNet\bnet-inputbox-border.blp` | Input/thin border |
| `UI\Widgets\Glues\GlueScreen-Pulldown-Arrow.blp` | Dropdown arrow |
| `Replaceabletextures\Teamcolor\TeamcolorXX.blp` | Team colors (00=red, 27=dark) |

## Project-Specific Templates Defined in frames.fdf

| Template | Type | Description |
|----------|------|-------------|
| `BackdropTemplate` | BACKDROP | Standard bordered panel used in this project |
| `TextTemplate` | TEXT | Standard text style (BLQ55Web, 0.008) |
| `PopupMenuTemplate` | POPUPMENU | Standard dropdown template |
| `ColorButtonTemplate` | BACKDROP | Color picker button |
| `StatisticsBoard` | BACKDROP | Full-width statistics display panel |
| `ColumnHeaderText` | TEXT | Column header for statistics |
| `ColumnDataText` | TEXT | Column data row for statistics |
| `HoverTooltipBar` | SIMPLESTATUSBAR | Hover tooltip progress bar |
| `SettingsView` | BACKDROP | Game settings panel |
| `TeamOptionsBackdrop` | BACKDROP | Team options dialog |
| `RatingStatsFrame` | BACKDROP | Player rating stats panel |
| `Top10LeaderboardFrame` | BACKDROP | Leaderboard panel |
| `FightBonusBar` | SIMPLESTATUSBAR | Fight bonus progress bar |
