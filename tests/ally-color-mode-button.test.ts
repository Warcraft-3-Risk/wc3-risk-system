/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/app/utils/game-status', () => ({
	isReplay: vi.fn(() => false),
}));

import { AllyColorState } from '../src/app/managers/alliances/ally-color-state';
import {
	AllyColorModeButton,
	ALLY_COLOR_MODE_BUTTON_BACKGROUND_TEXTURE,
	ALLY_COLOR_MODE_BUTTON_TEXTURES,
	getAllyColorModeButtonTexture,
} from '../src/app/ui/ally-color-mode-button';

type TriggerRecord = {
	conditions: Array<() => void>;
};

describe('AllyColorModeButton', () => {
	let trigger: TriggerRecord;
	let backgroundFrame: { name: string; type: string };
	let iconFrame: { name: string; type: string };
	let buttonFrame: { name: string; type: string };
	let gameUIFrame: { name: string };
	let localPlayer: { id: number };
	let minimapFrame: { name: string };
	let remotePlayer: { id: number };
	let triggerPlayer: { id: number };
	let consoleFrame: { name: string; width: number };
	let menuFrames: Map<string, { name: string; visible: boolean }>;

	beforeEach(() => {
		trigger = { conditions: [] };
		backgroundFrame = { name: 'AllyColorModeBackground', type: 'BACKDROP' };
		iconFrame = { name: 'AllyColorModeIcon', type: 'BACKDROP' };
		buttonFrame = { name: 'AllyColorModeButton', type: 'GLUETEXTBUTTON' };
		gameUIFrame = { name: 'game-ui' };
		localPlayer = { id: 0 };
		minimapFrame = { name: 'minimap' };
		remotePlayer = { id: 1 };
		triggerPlayer = localPlayer;
		consoleFrame = { name: 'console-ui', width: 0.8 };
		menuFrames = new Map();

		(AllyColorState as any).instance = undefined;
		(AllyColorModeButton as any).instance = undefined;

		(globalThis as any).FRAMEEVENT_CONTROL_CLICK = 'control-click';
		(globalThis as any).FRAMEPOINT_BOTTOMRIGHT = 'bottom-right';
		(globalThis as any).FRAMEPOINT_CENTER = 'center';
		(globalThis as any).FRAMEPOINT_TOPLEFT = 'top-left';
		(globalThis as any).ORIGIN_FRAME_GAME_UI = 'game-ui';
		(globalThis as any).ORIGIN_FRAME_MINIMAP = 'minimap';

		(globalThis as any).BlzCreateFrameByType = vi.fn((type: string, name: string) => {
			if (name === 'AllyColorModeBackground') return backgroundFrame;
			if (name === 'AllyColorModeIcon') return iconFrame;
			if (name === 'AllyColorModeButton') return buttonFrame;
			return { name, type };
		});
		(globalThis as any).BlzFrameClearAllPoints = vi.fn();
		(globalThis as any).BlzFrameSetAlpha = vi.fn();
		(globalThis as any).BlzFrameSetAbsPoint = vi.fn();
		(globalThis as any).BlzFrameSetAllPoints = vi.fn();
		(globalThis as any).BlzFrameSetEnable = vi.fn();
		(globalThis as any).BlzFrameSetLevel = vi.fn();
		(globalThis as any).BlzFrameSetPoint = vi.fn();
		(globalThis as any).BlzFrameSetSize = vi.fn();
		(globalThis as any).BlzFrameSetText = vi.fn();
		(globalThis as any).BlzFrameSetTexture = vi.fn();
		(globalThis as any).BlzFrameSetVisible = vi.fn();
		(globalThis as any).BlzFrameGetWidth = vi.fn((frame: { width: number }) => frame.width);
		(globalThis as any).BlzFrameIsVisible = vi.fn((frame: { visible?: boolean }) => frame.visible === true);
		(globalThis as any).BlzGetFrameByName = vi.fn((name: string) => {
			if (name === 'ConsoleUIBackdrop') return consoleFrame;
			return menuFrames.get(name);
		});
		(globalThis as any).BlzGetOriginFrame = vi.fn((originFrame: string, index: number) => {
			if (originFrame === 'game-ui') return gameUIFrame;
			if (originFrame === 'minimap' && index === 0) return minimapFrame;
			return undefined;
		});
		(globalThis as any).BlzTriggerRegisterFrameEvent = vi.fn();
		(globalThis as any).Condition = vi.fn((condition: () => void) => condition);
		(globalThis as any).CreateTimer = vi.fn(() => ({}));
		(globalThis as any).CreateTrigger = vi.fn(() => trigger);
		(globalThis as any).GetLocalPlayer = vi.fn(() => localPlayer);
		(globalThis as any).GetTriggerPlayer = vi.fn(() => triggerPlayer);
		(globalThis as any).IsPlayerObserver = vi.fn(() => false);
		(globalThis as any).SetAllyColorFilterState = vi.fn();
		(globalThis as any).TriggerAddCondition = vi.fn((record: TriggerRecord, condition: () => void) => {
			record.conditions.push(condition);
		});
		(globalThis as any).print = vi.fn();
	});

	it('maps custom ally color modes to the default Warcraft textures', () => {
		expect(getAllyColorModeButtonTexture(0)).toBe('UI\\Widgets\\Console\\Human\\human-minimap-ally-off.blp');
		expect(getAllyColorModeButtonTexture(1)).toBe('UI\\Widgets\\Console\\Human\\human-minimap-ally-inactive.blp');
		expect(getAllyColorModeButtonTexture(2)).toBe('UI\\Widgets\\Console\\Human\\human-minimap-ally-active.blp');
		expect(getAllyColorModeButtonTexture(99)).toBe(ALLY_COLOR_MODE_BUTTON_TEXTURES[0]);
	});

	it('initializes with the texture for custom mode 0', () => {
		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetTexture).toHaveBeenCalledWith(iconFrame, ALLY_COLOR_MODE_BUTTON_TEXTURES[0], 0, true);
	});

	it('adds a black backdrop layer behind the custom icon', () => {
		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetTexture).toHaveBeenCalledWith(backgroundFrame, ALLY_COLOR_MODE_BUTTON_BACKGROUND_TEXTURE, 0, true);
		expect(globalThis.BlzFrameSetLevel).toHaveBeenCalledWith(backgroundFrame, 10);
		expect(globalThis.BlzFrameSetLevel).toHaveBeenCalledWith(iconFrame, 11);
		expect(globalThis.BlzFrameSetLevel).toHaveBeenCalledWith(buttonFrame, 12);
	});

	it('creates independent minimap-layer frames instead of anchoring to the native button', () => {
		AllyColorModeButton.getInstance();

		expect(globalThis.BlzGetOriginFrame).toHaveBeenCalledWith('minimap', 0);
		expect(globalThis.BlzCreateFrameByType).toHaveBeenCalledWith('BACKDROP', 'AllyColorModeBackground', minimapFrame, '', 0);
		expect(globalThis.BlzCreateFrameByType).toHaveBeenCalledWith('BACKDROP', 'AllyColorModeIcon', minimapFrame, '', 0);
		expect(globalThis.BlzCreateFrameByType).toHaveBeenCalledWith(
			'GLUETEXTBUTTON',
			'AllyColorModeButton',
			minimapFrame,
			'ScriptDialogButton',
			0
		);
		expect(globalThis.BlzFrameSetPoint).not.toHaveBeenCalled();
		expect(globalThis.BlzFrameSetAllPoints).not.toHaveBeenCalled();
	});

	it('positions the custom layers from console-width scaling', () => {
		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(iconFrame, 'center', 0.166, 0.09);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(backgroundFrame, 'center', 0.166, 0.09);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(buttonFrame, 'center', 0.166, 0.09);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(iconFrame, 0.0202293, 0.0202293);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(backgroundFrame, 0.018691873199999997, 0.016992611999999997);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(buttonFrame, 0.0202293, 0.0202293);
	});

	it('toggles custom ally color state when clicked and updates the texture immediately', () => {
		AllyColorModeButton.getInstance();

		trigger.conditions[0]();

		expect(globalThis.SetAllyColorFilterState).toHaveBeenCalledWith(0);
		expect(AllyColorState.getInstance().getMode()).toBe(1);
		expect(globalThis.BlzFrameSetTexture).toHaveBeenLastCalledWith(iconFrame, ALLY_COLOR_MODE_BUTTON_TEXTURES[1], 0, true);
		expect(globalThis.print).not.toHaveBeenCalled();
	});

	it('ignores click events from other players so the choice stays local', () => {
		AllyColorModeButton.getInstance();
		triggerPlayer = remotePlayer;

		vi.clearAllMocks();
		trigger.conditions[0]();

		expect(globalThis.SetAllyColorFilterState).not.toHaveBeenCalled();
		expect(AllyColorState.getInstance().getMode()).toBe(0);
		expect(globalThis.BlzFrameSetEnable).not.toHaveBeenCalled();
		expect(globalThis.BlzFrameSetTexture).not.toHaveBeenCalled();
	});

	it('does not create its own sync timer', () => {
		AllyColorModeButton.getInstance();

		expect(globalThis.CreateTimer).not.toHaveBeenCalled();
	});

	it('reflects state changes made outside the button when refreshed by the manager timer', () => {
		AllyColorModeButton.getInstance();

		AllyColorState.getInstance().toggle();
		AllyColorState.getInstance().toggle();
		AllyColorModeButton.refreshExisting();

		expect(globalThis.BlzFrameSetTexture).toHaveBeenLastCalledWith(iconFrame, ALLY_COLOR_MODE_BUTTON_TEXTURES[2], 0, true);
	});

	it('keeps custom layers independent of Esc menu visibility', () => {
		const escMenu = { name: 'EscMenuBackdrop', visible: false };
		menuFrames.set('EscMenuBackdrop', escMenu);

		AllyColorModeButton.getInstance();

		escMenu.visible = true;
		AllyColorModeButton.refreshExisting();

		expect(globalThis.BlzFrameIsVisible).not.toHaveBeenCalled();
		expect(globalThis.BlzFrameSetVisible).not.toHaveBeenCalled();
	});

	it('scales the absolute layout with the bottom console width', () => {
		consoleFrame.width = 0.4;

		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(iconFrame, 'center', 0.28300000000000003, 0.045);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(backgroundFrame, 'center', 0.28300000000000003, 0.045);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(iconFrame, 0.021613410000000003, 0.021613410000000003);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(backgroundFrame, 0.019970790840000006, 0.018155264400000003);
	});

	it('repositions the custom layers when the bottom console width changes after creation', () => {
		AllyColorModeButton.getInstance();

		consoleFrame.width = 0.4;
		vi.clearAllMocks();
		AllyColorModeButton.refreshExisting();

		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(iconFrame, 'center', 0.28300000000000003, 0.045);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(backgroundFrame, 'center', 0.28300000000000003, 0.045);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(buttonFrame, 'center', 0.28300000000000003, 0.045);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(iconFrame, 0.021613410000000003, 0.021613410000000003);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(backgroundFrame, 0.019970790840000006, 0.018155264400000003);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(buttonFrame, 0.021613410000000003, 0.021613410000000003);
	});

	it('keeps the button legible at very low bottom console scale', () => {
		consoleFrame.width = 0.24;

		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(iconFrame, 'center', 0.32980000000000004, 0.027);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(backgroundFrame, 'center', 0.32980000000000004, 0.027);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(iconFrame, 0.022167054, 0.022167054);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(backgroundFrame, 0.020482357896, 0.01862032536);
	});

	it('boosts button and background size when the bottom console width is zero', () => {
		consoleFrame.width = 0;

		AllyColorModeButton.getInstance();

		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(iconFrame, 'center', 0.166, 0.09);
		expect(globalThis.BlzFrameSetAbsPoint).toHaveBeenCalledWith(backgroundFrame, 'center', 0.166, 0.09);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(iconFrame, 0.02299752, 0.02299752);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(backgroundFrame, 0.021249708480000004, 0.0193179168);
		expect(globalThis.BlzFrameSetSize).toHaveBeenCalledWith(buttonFrame, 0.02299752, 0.02299752);
	});
});
