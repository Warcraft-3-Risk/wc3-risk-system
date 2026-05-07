/**
 * Extended WC3 global shim for integration tests.
 *
 * Builds on top of the base wc3-shim to add all globals needed for importing
 * and testing actual production game-mode classes (GameLoopState, ProModeGameLoopState,
 * CapitalsGameLoopState, VictoryManager, etc.)
 *
 * This file must be imported BEFORE any production modules in integration tests.
 */

// First, import the base shim which sets up core unit/player/FourCC globals
import '../../fixtures/wc3-shim';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Timer API ──────────────────────────────────────────────────────
let timerIdCounter = 0;
const timers = new Map<number, { callback?: () => void; periodic: boolean; timeout: number }>();

(globalThis as any).CreateTimer = () => {
	const id = ++timerIdCounter;
	timers.set(id, { periodic: false, timeout: 0 });
	return id;
};
(globalThis as any).TimerStart = (t: number, timeout: number, periodic: boolean, callback: () => void) => {
	timers.set(t, { callback, periodic, timeout });
};
(globalThis as any).PauseTimer = (_t: number) => {};
(globalThis as any).DestroyTimer = (t: number) => {
	timers.delete(t);
};
(globalThis as any).TimerGetTimeout = (t: number) => timers.get(t)?.timeout ?? 0;
(globalThis as any).TimerGetRemaining = (_t: number) => 0;

// ─── Day/Night & Fog API ────────────────────────────────────────────
let currentTimeOfDay = 12.0;
let timeOfDayScale = 1.0;
let fogEnabled = false;

(globalThis as any).SetTimeOfDay = (time: number) => {
	currentTimeOfDay = time;
};
(globalThis as any).GetTimeOfDay = () => currentTimeOfDay;
(globalThis as any).SetTimeOfDayScale = (scale: number) => {
	timeOfDayScale = scale;
};
(globalThis as any).GetTimeOfDayScale = () => timeOfDayScale;
(globalThis as any).FogEnable = (enable: boolean) => {
	fogEnabled = enable;
};
(globalThis as any).IsFogEnabled = () => fogEnabled;
(globalThis as any).FogMaskEnable = (_enable: boolean) => {};
(globalThis as any).IsFoggedToPlayer = (_x: number, _y: number, _p: any) => false;
(globalThis as any).GetWorldBounds = () => 'world_bounds_rect';
(globalThis as any).SetFogStateRect = (_p: any, _state: any, _rect: any, _shared: boolean) => {};
(globalThis as any).SetFogStateRadius = (_p: any, _state: any, _x: number, _y: number, _r: number, _shared: boolean) => {};
(globalThis as any).CreateFogModifierRect = (_p: any, _state: any, _rect: any, _shared: boolean, _afterUnits: boolean) => 0;
(globalThis as any).FogModifierStart = (_mod: any) => {};
(globalThis as any).FogModifierStop = (_mod: any) => {};
(globalThis as any).DestroyFogModifier = (_mod: any) => {};
(globalThis as any).FOG_OF_WAR_MASKED = 'masked';
(globalThis as any).FOG_OF_WAR_FOGGED = 'fogged';
(globalThis as any).FOG_OF_WAR_VISIBLE = 'visible';

// Export getters for test assertions
export function getTimeOfDay(): number {
	return currentTimeOfDay;
}
export function isFogEnabled(): boolean {
	return fogEnabled;
}
export function resetTimeState(): void {
	currentTimeOfDay = 12.0;
	timeOfDayScale = 1.0;
	fogEnabled = false;
}

// ─── Alliance API ───────────────────────────────────────────────────
(globalThis as any).ALLIANCE_PASSIVE = 'passive';
(globalThis as any).ALLIANCE_HELP_REQUEST = 'help_request';
(globalThis as any).ALLIANCE_HELP_RESPONSE = 'help_response';
(globalThis as any).ALLIANCE_SHARED_XP = 'shared_xp';
(globalThis as any).ALLIANCE_SHARED_SPELLS = 'shared_spells';
(globalThis as any).ALLIANCE_SHARED_VISION = 'shared_vision';
(globalThis as any).ALLIANCE_SHARED_CONTROL = 'shared_control';
(globalThis as any).ALLIANCE_SHARED_ADVANCED_CONTROL = 'shared_advanced_control';
(globalThis as any).SetPlayerAlliance = (_p1: any, _p2: any, _flag: any, _value: boolean) => {};
(globalThis as any).IsPlayerAlly = (_p1: any, _p2: any) => false;
(globalThis as any).IsPlayerEnemy = (_p1: any, _p2: any) => true;
(globalThis as any).GetPlayerTeam = (_p: any) => 0;
(globalThis as any).IsPlayerSlotState = (p: any, state: string) => p?.slotState === state;

// ─── Frame API (stubs) ─────────────────────────────────────────────
const frameStore = new Map<string, any>();

(globalThis as any).BlzGetFrameByName = (name: string, _index: number) => {
	if (!frameStore.has(name)) frameStore.set(name, { text: '', visible: true, enabled: true });
	return frameStore.get(name);
};
(globalThis as any).BlzFrameSetText = (frame: any, text: string) => {
	if (frame) frame.text = text;
};
(globalThis as any).BlzFrameGetText = (frame: any) => frame?.text ?? '';
(globalThis as any).BlzFrameSetVisible = (_frame: any, _visible: boolean) => {};
(globalThis as any).BlzFrameSetEnable = (_frame: any, _enabled: boolean) => {};
(globalThis as any).BlzEnableSelections = (_enable: boolean, _enableUI: boolean) => {};
(globalThis as any).BlzCreateFrame = (_name: string, _parent: any, _priority: number, _createContext: number) => ({});
(globalThis as any).BlzCreateSimpleFrame = (_name: string, _parent: any, _createContext: number) => ({});
(globalThis as any).BlzGetOriginFrame = (_frameType: any, _index: number) => ({});
(globalThis as any).BlzFrameSetAbsPoint = (_frame: any, _point: any, _x: number, _y: number) => {};
(globalThis as any).BlzFrameSetSize = (_frame: any, _width: number, _height: number) => {};
(globalThis as any).BlzFrameSetTexture = (_frame: any, _texFile: string, _flag: number, _blend: boolean) => {};
(globalThis as any).BlzFrameSetLevel = (_frame: any, _level: number) => {};
(globalThis as any).EnableMinimapFilterButtons = (_enable: boolean, _enableCreep: boolean) => {};

// ─── Sound API ──────────────────────────────────────────────────────
(globalThis as any).CreateSound = (
	_path: string,
	_loop: boolean,
	_is3D: boolean,
	_stopWhenOutOfRange: boolean,
	_fadeInRate: number,
	_fadeOutRate: number,
	_eaxSetting: string
) => 0;
(globalThis as any).StartSound = (_s: any) => {};
(globalThis as any).SetSoundVolume = (_s: any, _vol: number) => {};
(globalThis as any).KillSoundWhenDone = (_s: any) => {};
(globalThis as any).StopSound = (_s: any, _kill: boolean, _fade: boolean) => {};
(globalThis as any).PlaySoundBJ = (_s: any) => {};

// ─── Unit API (extended) ────────────────────────────────────────────
(globalThis as any).KillUnit = (_u: any) => {};
(globalThis as any).RemoveUnit = (_u: any) => {};
(globalThis as any).IssueImmediateOrderById = (_u: any, _orderId: number) => true;
(globalThis as any).GetUnitPointValue = (_u: any) => 0;
(globalThis as any).CreateUnit = (_p: any, _unitId: number, _x: number, _y: number, _facing: number) => ({});
(globalThis as any).GetHandleId = (handle: any) => (typeof handle === 'number' ? handle : 0);
(globalThis as any).UnitAddAbility = (_u: any, _abilId: number) => true;
(globalThis as any).BlzSetUnitBooleanField = (_u: any, _field: any, _value: boolean) => true;
(globalThis as any).UNIT_BF_HIDE_MINIMAP_DISPLAY = 'hide_minimap';
(globalThis as any).GetFilterUnit = () => null;

// ─── Region / Rect API ─────────────────────────────────────────────
(globalThis as any).GetPlayableMapRect = () => ({});
(globalThis as any).Rect = (_minX: number, _minY: number, _maxX: number, _maxY: number) => ({});
(globalThis as any).RemoveRect = (_r: any) => {};
(globalThis as any).CreateRegion = () => ({});
(globalThis as any).RegionAddRect = (_r: any, _rect: any) => {};
(globalThis as any).TriggerRegisterEnterRegion = (_t: any, _r: any, _filter: any) => {};

// ─── Trigger API ────────────────────────────────────────────────────
(globalThis as any).CreateTrigger = () => ({});
(globalThis as any).TriggerAddAction = (_t: any, _fn: () => void) => {};
(globalThis as any).TriggerAddCondition = (_t: any, _c: any) => {};
(globalThis as any).TriggerRegisterPlayerEvent = (_t: any, _p: any, _event: any) => {};
(globalThis as any).TriggerRegisterDeathEvent = (_t: any, _d: any) => {};
(globalThis as any).GetTriggerDestructable = () => null;
(globalThis as any).Filter = (fn: () => boolean) => fn;
(globalThis as any).Condition = (fn: () => boolean) => fn;

// ─── Destructable API ───────────────────────────────────────────────
(globalThis as any).GetDestructableLife = (_d: any) => 100;
(globalThis as any).SetDestructableLife = (_d: any, _life: number) => {};
(globalThis as any).DestructableRestoreLife = (_d: any, _life: number, _birth: boolean) => {};
(globalThis as any).SetDestructableInvulnerable = (_d: any, _invulnerable: boolean) => {};

// ─── Fog Modifier API ──────────────────────────────────────────────
(globalThis as any).CreateFogModifierRect = (_p: any, _state: any, _rect: any, _shared: boolean, _afterUnits: boolean) => ({});
(globalThis as any).FogModifierStart = (_f: any) => {};
(globalThis as any).FogModifierStop = (_f: any) => {};
(globalThis as any).DestroyFogModifier = (_f: any) => {};
(globalThis as any).FOG_OF_WAR_VISIBLE = 'visible';

// ─── Group API ──────────────────────────────────────────────────────
(globalThis as any).CreateGroup = () => ({});
(globalThis as any).GroupEnumUnitsOfPlayer = (_g: any, _p: any, _filter: any) => {};
(globalThis as any).ForGroup = (_g: any, _callback: () => void) => {};
(globalThis as any).DestroyGroup = (_g: any) => {};
(globalThis as any).GroupAddUnit = (_g: any, _u: any) => {};
(globalThis as any).GroupRemoveUnit = (_g: any, _u: any) => {};
(globalThis as any).FirstOfGroup = (_g: any) => null;
(globalThis as any).GetEnumUnit = () => null;
(globalThis as any).EnumDestructablesInRect = (_r: any, _filter: any, _callback: () => void) => {};

// ─── Player Extended API ────────────────────────────────────────────
(globalThis as any).PLAYER_STATE_OBSERVER = 'observer_state';
(globalThis as any).GetLocalPlayer = () => Player(0);
(globalThis as any).bj_MAX_PLAYER_SLOTS = 28;
(globalThis as any).PLAYER_NEUTRAL_AGGRESSIVE = 24;
(globalThis as any).SetPlayerName = (_p: any, _name: string) => {};
(globalThis as any).GetPlayerColor = (p: any) => p?.id ?? 0;
(globalThis as any).SetPlayerColor = (_p: any, _color: any) => {};
(globalThis as any).ConvertPlayerColor = (id: number) => id;
(globalThis as any).GetPlayerRace = (_p: any) => 'human';
(globalThis as any).CustomDefeatBJ = (_p: any, _msg: string) => {};
(globalThis as any).ClearTextMessages = () => {};

// ─── String/Math Conversion API ─────────────────────────────────────
(globalThis as any).S2I = (s: string) => parseInt(s, 10) || 0;
(globalThis as any).I2S = (n: number) => String(n);
(globalThis as any).R2S = (n: number) => String(n);
(globalThis as any).R2SW = (n: number, _width: number, _precision: number) => String(n);
(globalThis as any).StringLength = (s: string) => s.length;
(globalThis as any).SubString = (s: string, start: number, end: number) => s.substring(start, end);

// ─── Multiboard API (stubs) ─────────────────────────────────────────
(globalThis as any).CreateMultiboard = () => ({});
(globalThis as any).MultiboardSetRowCount = (_mb: any, _count: number) => {};
(globalThis as any).MultiboardSetColumnCount = (_mb: any, _count: number) => {};
(globalThis as any).MultiboardDisplay = (_mb: any, _show: boolean) => {};
(globalThis as any).MultiboardMinimize = (_mb: any, _minimize: boolean) => {};
(globalThis as any).MultiboardGetItem = (_mb: any, _row: number, _col: number) => ({});
(globalThis as any).MultiboardSetItemValue = (_item: any, _value: string) => {};
(globalThis as any).MultiboardSetItemWidth = (_item: any, _width: number) => {};
(globalThis as any).MultiboardSetItemStyle = (_item: any, _showValue: boolean, _showIcon: boolean) => {};
(globalThis as any).MultiboardReleaseItem = (_item: any) => {};
(globalThis as any).DestroyMultiboard = (_mb: any) => {};
(globalThis as any).MultiboardSetTitleText = (_mb: any, _title: string) => {};

// ─── OS compatibility ───────────────────────────────────────────────
if (typeof (globalThis as any).os === 'undefined') {
	(globalThis as any).os = {
		date: (_fmt: string, _time: number) => '2026-01-01-00-00-00',
		time: () => 0,
		clock: () => 0,
	};
}

// ─── Player Color Constants ─────────────────────────────────────────
const playerColorNames = [
	'RED',
	'BLUE',
	'CYAN',
	'PURPLE',
	'YELLOW',
	'ORANGE',
	'GREEN',
	'PINK',
	'LIGHT_GRAY',
	'LIGHT_BLUE',
	'AQUA',
	'BROWN',
	'MAROON',
	'NAVY',
	'TURQUOISE',
	'VIOLET',
	'WHEAT',
	'PEACH',
	'MINT',
	'LAVENDER',
	'COAL',
	'SNOW',
	'EMERALD',
	'PEANUT',
];
playerColorNames.forEach((name, i) => {
	(globalThis as any)[`PLAYER_COLOR_${name}`] = i;
});

// ─── Leaderboard / Quest ────────────────────────────────────────────
(globalThis as any).CreateLeaderboard = () => ({});
(globalThis as any).LeaderboardSetLabel = (_lb: any, _label: string) => {};
(globalThis as any).CreateQuest = () => ({});
(globalThis as any).QuestSetTitle = (_q: any, _title: string) => {};
(globalThis as any).QuestSetDescription = (_q: any, _desc: string) => {};
(globalThis as any).QuestSetIconPath = (_q: any, _path: string) => {};
(globalThis as any).QuestSetRequired = (_q: any, _required: boolean) => {};
(globalThis as any).QuestSetDiscovered = (_q: any, _discovered: boolean) => {};
(globalThis as any).QuestSetCompleted = (_q: any, _completed: boolean) => {};
(globalThis as any).QuestSetEnabled = (_q: any, _enabled: boolean) => {};
(globalThis as any).FlashQuestDialogButton = () => {};
(globalThis as any).ForceQuestDialogUpdate = () => {};

// ─── Unit Type Constants ────────────────────────────────────────────
(globalThis as any).UNIT_TYPE_UNDEAD = 'undead';
(globalThis as any).UNIT_TYPE_SAPPER = 'sapper';
(globalThis as any).UNIT_TYPE_GIANT = 'giant';
(globalThis as any).UNIT_TYPE_TOWNHALL = 'townhall';
(globalThis as any).UNIT_TYPE_ANCIENT = 'ancient';
(globalThis as any).UNIT_TYPE_TAUREN = 'tauren';

// ─── Unit Extended API ──────────────────────────────────────────────
(globalThis as any).GetUnitCurrentOrder = (_u: any) => 0;
