/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuardButton } from 'src/app/factory/guard-button-factory';
import type { ActivePlayer } from 'src/app/player/types/active-player';

type TriggerRecord = {
	conditions: Array<() => void>;
	frameEvents: Array<{ frame: unknown; event: unknown }>;
	keyEvents: unknown[];
};

describe('createGuardButton', () => {
	let triggers: TriggerRecord[];
	let playerHandle: { id: number };
	let frameSetEnable: ReturnType<typeof vi.fn>;
	let frameSetLevel: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		triggers = [];
		playerHandle = { id: 0 };
		frameSetEnable = vi.fn();
		frameSetLevel = vi.fn();

		(globalThis as any).FRAMEEVENT_CONTROL_CLICK = 'control-click';
		(globalThis as any).FRAMEPOINT_BOTTOMLEFT = 'bottom-left';
		(globalThis as any).FRAMEPOINT_TOPLEFT = 'top-left';
		(globalThis as any).FRAMEPOINT_TOPRIGHT = 'top-right';
		(globalThis as any).ORIGIN_FRAME_GAME_UI = 'game-ui';
		(globalThis as any).OSKEY_F2 = 'f2';
		(globalThis as any).TEXT_JUSTIFY_LEFT = 'left';
		(globalThis as any).TEXT_JUSTIFY_TOP = 'top';

		(globalThis as any).BlzCreateFrame = vi.fn((name: string, _parent: unknown, _priority: number, createContext: number) => ({
			createContext,
			name,
		}));
		(globalThis as any).BlzCreateFrameByType = vi.fn(
			(type: string, name: string, _parent: unknown, _template: string, createContext: number) => ({ createContext, name, type })
		);
		(globalThis as any).BlzFrameSetAllPoints = vi.fn();
		(globalThis as any).BlzFrameSetEnable = frameSetEnable;
		(globalThis as any).BlzFrameSetLevel = frameSetLevel;
		(globalThis as any).BlzFrameSetPoint = vi.fn();
		(globalThis as any).BlzFrameSetSize = vi.fn();
		(globalThis as any).BlzFrameSetText = vi.fn();
		(globalThis as any).BlzFrameSetTextAlignment = vi.fn();
		(globalThis as any).BlzFrameSetTexture = vi.fn();
		(globalThis as any).BlzFrameSetTooltip = vi.fn();
		(globalThis as any).BlzFrameSetVisible = vi.fn();
		(globalThis as any).BlzGetOriginFrame = vi.fn(() => ({}));
		(globalThis as any).BlzTriggerRegisterFrameEvent = vi.fn((trigger: TriggerRecord, frame: unknown, event: unknown) => {
			trigger.frameEvents.push({ frame, event });
		});
		(globalThis as any).BlzTriggerRegisterPlayerKeyEvent = vi.fn((trigger: TriggerRecord, ...args: unknown[]) => {
			trigger.keyEvents.push(args);
		});
		(globalThis as any).Condition = vi.fn((fn: () => void) => fn);
		(globalThis as any).CreateTrigger = vi.fn(() => {
			const trigger: TriggerRecord = { conditions: [], frameEvents: [], keyEvents: [] };
			triggers.push(trigger);
			return trigger;
		});
		(globalThis as any).GetLocalPlayer = vi.fn(() => playerHandle);
		(globalThis as any).GetPlayerId = vi.fn((player: { id: number }) => player.id);
		(globalThis as any).TriggerAddCondition = vi.fn((trigger: TriggerRecord, condition: () => void) => {
			trigger.conditions.push(condition);
		});
	});

	it('registers mouse clicks on the dedicated button trigger', () => {
		const action = vi.fn();
		const activePlayer = {
			getPlayer: () => playerHandle,
		} as ActivePlayer;

		const button = createGuardButton({
			player: activePlayer,
			createContext: 600,
			key: (globalThis as any).OSKEY_F2,
			textures: {
				primary: 'primary.blp',
				secondary: 'secondary.blp',
			},
			xOffset: 0.138,
			initialTooltipText: 'Range Indicators',
			action,
		});

		expect(triggers).toHaveLength(2);
		expect(triggers[0].keyEvents).toHaveLength(1);
		expect(triggers[0].frameEvents).toHaveLength(0);
		expect(triggers[1].frameEvents).toEqual([{ frame: button, event: 'control-click' }]);
		expect(frameSetLevel).toHaveBeenCalledWith(button, 10);
		expect(frameSetLevel).toHaveBeenCalledWith(expect.objectContaining({ name: 'GuardButtonBackdrop' }), 11);

		triggers[1].conditions[0]();

		expect(action).toHaveBeenCalledTimes(1);
		expect(action).toHaveBeenCalledWith(600, { primary: 'primary.blp', secondary: 'secondary.blp' }, button);
		expect(frameSetEnable.mock.calls.filter(([frame]) => frame === button)).toEqual([
			[button, false],
			[button, true],
		]);
	});
});
