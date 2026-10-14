# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WC3 Risk System is a TypeScript-based custom game for Warcraft 3 that implements a Risk-style strategy game. The project uses TypeScript-to-Lua compilation (via `typescript-to-lua` and `war3-transformer`) to generate Lua scripts that run within the WC3 engine.

**Key Technologies:**
- TypeScript 5.0.4 compiled to Lua 5.3
- W3TS (Warcraft 3 TypeScript) library for WC3 API bindings
- war3-transformer for injecting compiled Lua into map files
- Custom build pipeline with terrain-specific configurations

## Build and Test Commands

### Development
The project supports multiple terrains (asia, europe) which can be built/tested separately:

```bash
# Test commands (compile + launch WC3)
npm run test asia          # Test Asia terrain
npm run test europe        # Test Europe terrain

# Build commands (create .w3x file)
npm run build              # Build all terrains
npm run build asia         # Build Asia terrain
npm run build europe       # Build Europe terrain
npm run build europe -minify  # Build with minified Lua

npm run dev                # Watch mode (monitors map files for changes)
```

### Build Troubleshooting
Saving the map in World Editor 3.0 rewrites `war3map.w3i` as map-info **version 39**, while the
`mdx-m3-viewer-th` parser only understands up to version 33. This used to fail the build with a
`ByteStream: premature end` error and had to be fixed by restoring the file by hand - which also
discarded whatever had just been changed in Map Properties.

`scripts/build.ts` now handles this itself (`allowNewerMapInfoVersions`): the only thing the
parser is needed for is deciding whether to prepend the legacy pre-1.31 map header, so for a w3i
it cannot read the build reads the game version straight out of the file's fixed-position header
instead. The w3i itself is shipped untouched, so editor changes survive. The build logs a line
when this path is taken.

If a build ever does need the previous manual workaround, it was:
```bash
git restore --source main -- maps\risk_europe.w3x\war3map.w3i
```

### Multi-Terrain System
The project supports multiple map terrains in a single codebase:
- **risk_europe.w3x** - Master map for object editor modifications
- **risk_asia.w3x** - Asia-focused terrain variant

Each terrain has its own:
- Map folder in `maps/risk_{terrain}.w3x/` with terrain-specific data (doodads, units, regions)
- Config file `maps/risk_{terrain}.json` with terrain-specific settings
- Coordinate data in `src/configs/terrains/{terrain}.ts` for countries and cities

**Object Editor Sync:**
All object editor modifications (units, abilities, buffs, destructables) are maintained ONLY in `risk_europe.w3x`. During build/test, these files are automatically synced from `maps/risk_europe.w3x/` to the `dist/{terrain}/` folder:
- `war3map.w3u` / `war3mapSkin.w3u` - Units
- `war3map.w3a` / `war3mapSkin.w3a` - Abilities
- `war3map.w3b` / `war3mapSkin.w3b` - Destructables
- `war3map.w3h` / `war3mapSkin.w3h` - Buffs/Effects

**Important:** The sync only modifies files in the `dist/` folder during build. Your source files in `maps/` remain untouched. This means each terrain can maintain its own object editor files in git, but they will be replaced with risk_europe's data during the build process.

**To modify units/abilities/buffs:** Edit only in `risk_europe.w3x` using World Editor. Changes will sync automatically to the `dist/` folder of all terrains during build/test.

### Environment Setup
Create a `.env` file in the repository root with:
- `GAME_EXECUTABLE`: Path to Warcraft III executable (e.g., `C:\Program Files\Warcraft III\_retail_\x86_64\Warcraft III.exe`)
- `OUTPUT_FOLDER`: Path to WC3 maps folder (e.g., `C:\Users\YourName\Documents\Warcraft III\Maps`)
- `TAG_NAME`: Version tag (e.g., "dev", "v1.0.0")
- `W3C_MODE_ENABLED`: Boolean to enable W3Champions mode (e.g., "true" or "false")

**Note:** Environment variables are substituted into terrain config files during build using `${VAR_NAME}` syntax.

## Code Architecture

### Core Domain Model

**Country → City → Components Hierarchy:**
- **Country**: Top-level entity representing a geographic region (e.g., "Germany", "Poland")
  - Contains multiple Cities and a Spawner
  - Defined in `src/configs/city-country-setup.ts` using the `SetCountries()` function
  - Built using the Builder pattern (ConcreteCountryBuilder)

- **City**: Game locations that players capture and control
  - Abstract base class with specialized implementations (StandardCity, PortCity)
  - Contains: Barracks (unit production), Guard (defense unit), Circle of Power (control point)
  - Implements `Ownable` and `Resetable` interfaces

- **Spawner**: Produces units for a country's owner at regular intervals

### State Machine Architecture

The game uses a **State Pattern** for game modes and phases:

**BaseMode → States → Events**
- Each game mode (StandardMode, CapitalsMode, PromodeMode, W3CMode) defines a sequence of states
- States extend `BaseState<T>` and handle game events (player deaths, city captures, etc.)
- State transitions are coordinated by `EventCoordinator` which routes events to the current state
- Common states: SetupState, CountdownState, GameLoopState, GameOverState, ResetState

**Event System:**
- Central `EventEmitter` (singleton) handles inter-system communication
- Events defined in `event-constants.ts` (e.g., EVENT_ON_CITY_CAPTURE, EVENT_ON_PLAYER_DEAD)
- EventCoordinator subscribes to events and delegates to the current mode's state

### Player Management

**ActivePlayer Hierarchy:**
- Abstract `ActivePlayer` class represents players with tracking, status, and options
- Concrete implementations handle player-specific behavior (combat, death, etc.)
- `TrackedData` stores per-player statistics (~40-50 stats per game)
- `Status` manages player state (ALIVE, DEAD, NOMAD, etc.)
- Each player has a `ratingStatsUI` for displaying their rating information

### Rating System Architecture

The game includes a comprehensive ELO-based rating system for ranked matches with per-player file storage:

**Core Components:**
- `RatingManager` (Singleton): Orchestrates rating system - loading, calculation, persistence, crash recovery
- `RatingCalculator`: Pure calculation functions for ELO-based rating changes
- `RatingFileHandler`: File I/O with checksum validation, optional XOR+Base64 encryption

**Rating Calculation Formula:**
The rating change is calculated using **two multiplied components**:

1. **Base Placement Points** - Dynamically calculated based on percentile position
   - Works consistently for all lobby sizes (16-23 players)
   - Top ~40% of players gain points, bottom ~60% lose points
   - Uses a curved distribution: more reward at top positions, more penalty at bottom
   - Ensures ~36 net inflation per game regardless of lobby size
   - Constants: `MAX_WIN_POINTS = 48`, `MAX_LOSS_POINTS = 40`, `BREAKEVEN_PERCENTILE = 0.40`

2. **Opponent Strength Modifier** (0.68x to 1.32x) - Traditional ELO logic
   - Compares your rating vs average opponent rating
   - For **gains** (positive placements): higher rated = less gain, lower rated = more gain
   - For **losses** (negative placements): higher rated = more loss, lower rated = less loss
   - Formula: `scaledDiff = clamp(ratingDiff / 400, -1, 1) × RANKED_OPPONENT_STRENGTH_FACTOR`
   - Examples (with default 0.32 factor):
     - 1800 vs 1000 avg: Wins give 0.68x, losses give 1.32x
     - 1500 vs 1500 avg: 1.0x for both (even match)
     - 1000 vs 1800 avg: Wins give 1.32x, losses give 0.68x

**Final Formula:**
```
totalChange = floor(basePlacementPoints × opponentStrengthModifier)
newRating = max(RANKED_STARTING_RATING, oldRating + totalChange)
```

**Note:** Players can never fall below their starting rating (1000). This protects casual players from feeling discouraged by rating losses while still allowing skilled players to climb.

**Progression Estimate:** ~80 games to reach Gold 5 (2500) for a player consistently placing top 3 in 60% of games.

**File Structure (Per-Player Files):**
- **Format**: `risk/{prefix}{seasonId}_{hash}.txt` (e.g., `risk/p1_abc12345def67890.txt`)
  - `prefix`: 'd' for developer mode, 'p' for production
  - `hash`: 16-character hex hash derived from player btag (djb2 + sdbm algorithms)
  - **Note**: Must use `.txt` extension - WC3 only supports `.txt` and `.pld` file extensions
- **Content**: Custom key:value text format (NOT JSON) - more compact and efficient
- **Security**: Checksums for tamper detection, XOR+Base64 encryption (enabled in production, disabled in developer mode)
- **Fields**: btag, rating, gamesPlayed, lastUpdated, wins, losses, totalKillValue, totalDeathValue

**Crash Recovery System:**
- Preliminary ratings saved at end of each turn in `pendingGame` field
- Each pending game has unique `gameId` (timestamp_matchcount)
- On next load, pending games automatically finalized
- Prevents rating loss from server crashes mid-game

**Ranked Game Eligibility:**
A game is considered ranked if:
- Number of human players >= `RANKED_MIN_PLAYERS` (default: 16)
- OR developer mode is enabled (for singleplayer testing)

Players are excluded from rating calculation if:
- They left before game started (`turnDied < 0`)
- They never owned any cities (`maxCities = 0`)

**Rank Icons & Tiers:**
Players are assigned rank icons based on rating (see `getRankIcon()` in rating-calculator.ts).
15 tiers organized into Bronze/Silver/Gold:

- **Gold Tier** (2000+) - Elite players, 125 points per rank:
  - Gold 5: 2500+
  - Gold 4: 2375-2499
  - Gold 3: 2250-2374
  - Gold 2: 2125-2249
  - Gold 1: 2000-2124

- **Silver Tier** (1500-1999) - Intermediate players, 100 points per rank:
  - Silver 5: 1900-1999
  - Silver 4: 1800-1899
  - Silver 3: 1700-1799
  - Silver 2: 1600-1699
  - Silver 1: 1500-1599

- **Bronze Tier** (<1500) - Starting players, 100 points per rank:
  - Bronze 5: 1400-1499
  - Bronze 4: 1300-1399
  - Bronze 3: 1200-1299
  - Bronze 2: 1100-1199
  - Bronze 1: <1100 (starting tier)

**Configuration (game-settings.ts):**
- `RANKED_SEASON_ID`: Current season number (default: 0)
- `RANKED_MIN_PLAYERS`: Minimum players for ranked game (default: 16)
- `RANKED_STARTING_RATING`: Starting rating for new players AND rating floor (default: 1000) - players can never fall below this
- `RANKED_OPPONENT_STRENGTH_FACTOR`: Scale factor for opponent strength modifier (default: 0.32, gives 0.68x-1.32x range)
- `RATING_SYSTEM_ENABLED`: Master toggle for the entire rating system (default: true)
  - When disabled: no F4 button, no ranked/unranked messages, no rating data storage, unranked leaderboard only
  - When enabled: full rating system functionality based on other settings
- `RATING_FILE_ENCRYPTION_ENABLED`: Toggle rating file encryption (default: true)
  - When enabled: Rating files are encrypted with XOR+Base64 (production use)
  - When disabled: Rating files are stored as plain text (useful for debugging)

**Integration Points:**
- Statistics screen shows rating changes in the "Rating" column after game ends
- RatingStatsUI frame shows persistent rating info: current rating, games played, W/L ratio
- Ratings calculated in `StatisticsController.writeStatisticsData()` after game ends
- MMD integration for W3Champions ladder tracking

**Kill/Death Value Tracking:**
- **K/D Values** (`totalKillValue`, `totalDeathValue`): Tracked across all games for statistics
  - Accumulated in player rating files after each game
  - Displayed in RatingStatsUI with live updates during games (saved total + current game)
  - Shown as ratio format (e.g., "150 K / 100 D (1.50)")
  - Not used in rating calculations, purely for player statistics

### Configuration-First Design

Game behavior is driven by config files in `src/configs/`:
- `game-settings.ts`: Core game parameters (turn duration, starting income, victory conditions)
- `city-country-setup.ts`: Map layout - all countries and city positions
- `tracked-units.ts`, `unit-id.ts`, `ability-id.ts`: Game object references

**No code changes needed for most customization** - adjust configs instead.

### Builder Pattern Usage

Builders are used extensively for constructing game entities:
- `ConcreteCountryBuilder`: Creates countries with cities and spawners
- `ConcreteCityBuilder`: Creates cities with appropriate components
- `ConcreteSpawnerBuilder`: Creates spawners at specified locations

This pattern allows configuration data to drive entity creation without complex constructors.

### Key Managers

Singleton managers handle cross-cutting concerns:
- `NameManager`: Player name handling (prevents "name bug")
- `ChatManager`: Chat commands and spam prevention
- `FogManager`: Fog of war control
- `CameraManager`: Camera manipulation
- `TimedEventManager`: Scheduled game events

### Map Data Flow

1. **Startup** (main.ts):
   - SetCountries() populates configuration
   - Builders construct Country/City/Spawner entities
   - Triggers registered for game events
   - ModeSelection determines game mode

2. **Game Loop**:
   - EventCoordinator routes events to current state
   - States handle player actions, city captures, unit deaths
   - Managers update UI, fog, camera, etc.

3. **Build Process**:
   - MAP_TYPE constant injected into map-info.ts from terrain config
   - Map files copied from maps/{terrain}/ to dist/{terrain}/ (compileMap)
   - Object editor files synced from maps/risk_europe.w3x/ to dist/{terrain}/ (scripts/utils.ts:syncObjectEditorFiles)
   - TypeScript compiled to Lua via tstl
   - War3Transformer injects Lua into map archive
   - Scripts/build.ts creates .w3x file with updated strings/metadata
   - Config values (from .env) are substituted in terrain config files

### File Organization

```
src/
├── app/              # Core game logic
│   ├── city/         # City entities and components
│   │   ├── city.ts, land-city.ts, port-city.ts  # City implementations
│   │   ├── concrete-city-builder.ts             # Builder for cities
│   │   └── components/                           # City components (barracks, guard)
│   ├── country/      # Country entities
│   │   ├── country-builder.ts                    # Builder for countries
│   │   └── countries.ts, country-data.ts         # Country definitions
│   ├── game/         # Game modes, states, services
│   │   ├── game-mode/                            # State machines for game modes
│   │   │   ├── mode/                             # Mode implementations (standard, capitals, promode, w3c)
│   │   │   ├── base-game-mode/                   # Common states (setup, countdown, game-loop, game-over)
│   │   │   └── {mode}-game-mode/                 # Mode-specific states
│   │   ├── services/                             # Game services (distribution, player-setup, etc.)
│   │   └── state/                                # Global game state
│   ├── managers/     # Singleton managers
│   │   ├── names/name-manager.ts                 # Player name handling (prevents name bug)
│   │   ├── chat-manager.ts                       # Chat commands and spam prevention
│   │   └── fog-manager.ts, camera-manager.ts     # Visual management
│   ├── player/       # Player entities and data tracking
│   │   ├── types/active-player.ts                # ActivePlayer abstract class
│   │   ├── player-manager.ts                     # PlayerManager singleton
│   │   ├── data/tracked-data.ts                  # Statistics tracking (~40-50 stats)
│   │   ├── status/status.ts                      # Status state machine
│   │   └── bonus/                                # Bonus and bounty systems
│   ├── rating/       # Rating system (NEW)
│   │   ├── rating-manager.ts                     # Main rating manager (singleton)
│   │   ├── rating-calculator.ts                  # Pure calculation functions
│   │   ├── rating-file-handler.ts                # File I/O with checksums
│   │   └── types.ts                              # Rating data structures
│   ├── statistics/   # End-game statistics
│   │   ├── statistics-controller.ts              # MVC controller
│   │   ├── statistics-model.ts, statistics-view.ts
│   │   └── statistics-column-config.ts           # Column definitions (includes rating)
│   ├── triggers/     # WC3 event handlers
│   │   ├── unit_death/                           # Death event handling
│   │   └── *.ts event files                      # Various game events
│   ├── ui/           # UI components
│   │   ├── rating-stats-ui.ts                    # Rating display frame (NEW)
│   │   ├── player-preference-buttons.ts          # User preferences
│   │   └── console.ts                            # Other UI
│   └── utils/        # Shared utilities
│       ├── events/event-emitter.ts               # Event system
│       ├── map-info.ts                           # Generated map metadata
│       └── export-statistics/                    # Statistics export
├── configs/          # Game configuration (modify these, not code)
│   ├── game-settings.ts                          # Core game parameters (turns, income, rating settings)
│   ├── city-country-setup.ts                     # Map layout - all countries and cities
│   ├── tracked-units.ts, unit-id.ts, ability-id.ts  # Game object references
│   └── terrains/     # Terrain-specific coordinate data
│       ├── asia.ts
│       └── europe.ts
└── main.ts           # Entry point - initializes managers, builds entities, starts game

maps/
├── risk_asia.json        # Asia terrain config (mapFolder, mapType, version, etc.)
├── risk_asia.w3x/        # Asia map files (terrain, regions, doodads, units)
├── risk_europe.json      # Europe terrain config
└── risk_europe.w3x/      # Europe map files (MASTER for object editor)

scripts/              # Build and test scripts (TypeScript)
├── build.ts          # Production build script (creates .w3x archives)
├── test.ts           # Development test script (compiles + launches WC3)
├── dev.ts            # Watch mode for map file changes
└── utils.ts          # Shared utilities (syncObjectEditorFiles, compileMap, etc.)

dist/                 # Build output (generated, not in git)
└── risk_{terrain}.w3x/  # Compiled map files ready for WC3
```

## Working with Game Modes

**Available Game Modes:**
- `StandardMode`: Classic Risk gameplay with random city distribution
- `CapitalsMode`: Players select capitals and compete for control
- `PromodeMode`: Competitive mode with specific settings
- `EqualizedPromodeMode`: Balanced competitive mode
- `W3CMode`: W3Champions ladder mode with draw voting and auto-termination

**To add a new game mode:**
1. Create mode class extending `BaseMode<YourStateData>` in `src/app/game/game-mode/mode/`
2. Define state sequence in `setupStates()` method (returns array of states)
3. Implement `setupData()` to initialize mode-specific state data
4. Register mode selection in `EventCoordinator.applyGameMode()`
5. Create custom states by extending `BaseState<YourStateData>` in `src/app/game/game-mode/{mode}-game-mode/`

**State Lifecycle:**
- States are processed sequentially from the array returned by `setupStates()`
- `onEnterState()` is called when entering a state
- Call `this.nextState(stateData)` to transition to next state
- State data is passed between states via `stateData` parameter

## W3C Integration

W3Champions mode is controlled by `W3C_MODE_ENABLED` (injected from config during build). When enabled:
- Uses W3CMode with specific settings (Promode=1, Fog=1, etc.)
- Implements draw voting and auto-termination features
- MMD statistics integration for ladder tracking

## In-Game Commands

The game supports various chat commands for player interaction:

**Game Commands:**
- `-restart`: Restart the game (team modes only, not FFA)
- `-forfeit`: Forfeit the game
- `-gold`: Show gold statistics
- `-help`: Display available commands
- `-cam`: Camera control commands
- `-mute <player>`: Mute a player (temporary)

**W3C Mode Commands:**
- `-gg`: Vote for draw in W3Champions mode
- `-draw`: Initiate draw vote

**Debug Commands (developer mode):**
- Various country creator commands for map editing

## Important Notes

### TypeScript-to-Lua Limitations
- The project compiles TypeScript to Lua 5.3 - be mindful of TypeScript-to-Lua (tstl) limitations
- Not all TypeScript features are supported (some ES6+ features may not compile)
- Array methods are limited - prefer for loops over `.map()`, `.filter()`, etc. in performance-critical code
- Classes compile to Lua tables with metatables
- Be careful with `null` vs `undefined` - Lua only has `nil`

### Object Editor and Map Files
- Unit/ability/buff IDs reference WC3 object editor data (imported via `@objectdata/*`)
- Object editor modifications MUST be done in `risk_europe.w3x` only
- Map changes via World Editor may corrupt war3map.w3i (see troubleshooting above)
- Loading screen files (Fullscreen.dds, LoadingScreen.mdx) must be in `Assets/Loading Screen/`

### Architecture Patterns
- Most game logic is event-driven through the EventEmitter system
- Singleton pattern used extensively for managers (use `getInstance()`)
- Builder pattern for constructing complex entities (Countries, Cities, Spawners)
- State pattern for game modes and player status
- State data is stored in `GlobalGameData.stateData` and typed per-mode

### Performance Considerations
- Debug prints can be disabled via `SHOW_DEBUG_PRINTS` in game-settings.ts
- Minification reduces Lua file size significantly (use `-minify` flag)
- Avoid creating triggers in loops - reuse triggers with conditions where possible

### Configuration-First Approach
- Most gameplay changes should be made in `src/configs/game-settings.ts`
- Map layout defined in `src/configs/city-country-setup.ts`
- Terrain-specific coordinates in `src/configs/terrains/{terrain}.ts`
- **Avoid hardcoding values** - use constants from config files

### File I/O and Persistence
- WC3 file I/O uses `w3ts.File` API (synchronous, path relative to WC3 Documents folder)
- Rating files stored in `risk/` subdirectory for organization
- Always validate data when reading files (use checksums for critical data)
- Developer mode uses separate file paths to avoid polluting production data

### Build Process Details
- `map-info.ts` is auto-generated on each build - **DO NOT EDIT MANUALLY**
- tsconfig.json is temporarily modified during build (plugins.mapDir updated)
- Environment variables are substituted during build using `${VAR_NAME}` syntax
- Object editor sync happens AFTER map files are copied to dist/

## Common Development Workflows

### Adding a New Feature
1. **Configuration**: Check if feature can be configured in `game-settings.ts` first
2. **Planning**: Identify which systems need changes (managers, states, events, etc.)
3. **Implementation**:
   - Create new files in appropriate directories
   - Use existing patterns (Singleton for managers, Builder for entities, etc.)
   - Emit events for cross-system communication
4. **Integration**: Hook into existing event system or state machine
5. **Testing**: Use `npm run test europe` for quick iteration

### Modifying Game Balance
1. Edit values in `src/configs/game-settings.ts`
2. For unit-specific changes, modify object editor in `risk_europe.w3x`
3. For map-specific changes, edit terrain config in `src/configs/terrains/{terrain}.ts`
4. Test with `npm run test {terrain}`

### Adding a New Terrain
1. Create map files in `maps/risk_{terrain}.w3x/`
2. Create terrain config `maps/risk_{terrain}.json`
3. Create coordinate data in `src/configs/terrains/{terrain}.ts`
4. Add npm scripts in `package.json` for convenience
5. Object editor files will sync from `risk_europe.w3x` automatically

### Debugging
1. Enable debug prints: Set `SHOW_DEBUG_PRINTS = true` in `game-settings.ts`
2. Enable debug logs to file: Set `SAVE_DEBUG_LOGS_TO_FILE = true`
3. Use `debugPrint()` function for conditional debug output
4. Check `project.log` for build errors and warnings
5. Enable country creator for map editing: Set `EDITOR_DEVELOPER_MODE = true` (singleplayer only)
6. Disable rating file encryption for debugging: Set `RATING_FILE_ENCRYPTION_ENABLED = false`

### Working with UI
1. UI frames defined in `maps/risk_{terrain}.w3x/Assets/Frames/frames.fdf`
2. Create UI components in `src/app/ui/`
3. Use `BlzCreateFrame()` to create frames from FDF definitions
4. Frame handle management is critical - avoid leaks by reusing frames
5. Local player checks: Always use `if (GetLocalPlayer() == player)` for player-specific UI

### Best Practices
- **Read before writing**: Always read existing code files before modifying them
- **Follow patterns**: Use existing architectural patterns (don't introduce new ones without reason)
- **Event-driven**: Prefer events over direct coupling between systems
- **Type safety**: Leverage TypeScript's type system (avoid `any` when possible)
- **Comments**: Document complex logic, especially in calculation functions
- **Testing**: Test with multiple terrains if changes affect map layout
- **Git workflow**: Commit logical units of work with descriptive messages
