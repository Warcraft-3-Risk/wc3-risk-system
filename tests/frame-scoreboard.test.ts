import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameScoreboard } from 'src/app/scoreboard/frame-scoreboard';
import { PlayerRow, ScoreboardDataModel } from 'src/app/scoreboard/scoreboard-data-model';
import { HexColors } from 'src/app/utils/hex-colors';

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: () => 'Player',
		}),
	},
}));

interface FakeFrame {
	name: string;
	text: string;
	visible: boolean;
	children: FakeFrame[];
	x: number;
	y: number;
	width: number;
	height: number;
	horizontalAlignment: unknown;
}

const framesByName = new Map<string, FakeFrame>();

function createFrame(name: string): FakeFrame {
	const frame = {
		name,
		text: '',
		visible: true,
		children: [],
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		horizontalAlignment: undefined,
	};
	framesByName.set(name, frame);
	return frame;
}

function installFrameRuntime(): void {
	framesByName.clear();

	(globalThis as any).ORIGIN_FRAME_GAME_UI = 'game-ui';
	(globalThis as any).FRAMEPOINT_TOPRIGHT = 'top-right';
	(globalThis as any).FRAMEPOINT_TOPLEFT = 'top-left';
	(globalThis as any).FRAMEPOINT_TOP = 'top';
	(globalThis as any).TEXT_JUSTIFY_LEFT = 'left';
	(globalThis as any).TEXT_JUSTIFY_RIGHT = 'right';
	(globalThis as any).TEXT_JUSTIFY_MIDDLE = 'middle';
	(globalThis as any).TEXT_JUSTIFY_CENTER = 'center';

	(globalThis as any).BlzGetOriginFrame = vi.fn(() => createFrame('GameUI'));
	(globalThis as any).BlzCreateFrame = vi.fn((name: string) => createFrame(name));
	(globalThis as any).BlzCreateFrameByType = vi.fn((_type: string, name: string) => createFrame(name));
	(globalThis as any).BlzFrameSetSize = vi.fn((frame: FakeFrame, width: number, height: number) => {
		frame.width = width;
		frame.height = height;
	});
	(globalThis as any).BlzFrameSetAbsPoint = vi.fn((frame: FakeFrame, _point: unknown, x: number, y: number) => {
		frame.x = x;
		frame.y = y;
	});
	(globalThis as any).BlzFrameSetPoint = vi.fn(
		(frame: FakeFrame, _point: unknown, _relative: unknown, _relativePoint: unknown, x: number, y: number) => {
			frame.x = x;
			frame.y = y;
		}
	);
	(globalThis as any).BlzFrameSetAlpha = vi.fn();
	(globalThis as any).BlzFrameSetAllPoints = vi.fn();
	(globalThis as any).BlzFrameSetTextAlignment = vi.fn((frame: FakeFrame, _vertical: unknown, horizontal: unknown) => {
		frame.horizontalAlignment = horizontal;
	});
	(globalThis as any).BlzFrameSetScale = vi.fn();
	(globalThis as any).BlzFrameSetText = vi.fn((frame: FakeFrame, text: string) => {
		frame.text = text;
	});
	(globalThis as any).BlzFrameSetVisible = vi.fn((frame: FakeFrame, visible: boolean) => {
		frame.visible = visible;
	});
	(globalThis as any).BlzFrameGetChild = vi.fn((frame: FakeFrame, index: number) => {
		return frame.children[index] ?? createFrame(`${frame.name}:child:${index}`);
	});
	(globalThis as any).BlzFrameIsVisible = vi.fn((frame: FakeFrame) => frame.visible);
	(globalThis as any).CreateTimer = vi.fn(() => ({}));
	(globalThis as any).TimerStart = vi.fn();
	(globalThis as any).PanCameraToTimed = vi.fn();
	(globalThis as any).BlzGetLocalClientWidth = vi.fn(() => 1920);
	(globalThis as any).BlzGetLocalClientHeight = vi.fn(() => 1080);
}

function makeActiveRow(): PlayerRow {
	return {
		playerId: 0,
		randomSeed: 0,
		player: {
			trackedData: {
				income: {
					delta: 0,
				},
			},
		},
		handle: { id: 0 },
		income: 50,
		incomeDelta: 7,
		gold: 125,
		cities: 8,
		kills: 3,
		deaths: 1,
		status: 'Alive',
		statusDuration: 0,
		isEliminated: false,
		isNomad: false,
		isSTFU: false,
		isAlive: true,
		turnDied: -1,
		lastCombat: 0,
		isInCombat: false,
		teamNumber: 1,
		ratingChange: undefined,
		displayName: `${HexColors.WHITE}Player 1|r`,
		acctName: 'Player 1',
		btag: 'Player 1#0000',
		originalColorCode: HexColors.WHITE,
		cityCountHighlighted: false,
	} as unknown as PlayerRow;
}

describe('FrameScoreboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		installFrameRuntime();
	});

	it('renders income and delta from scoreboard rows', () => {
		const scoreboard = new FrameScoreboard(1);
		const data = { players: [makeActiveRow()] } as ScoreboardDataModel;

		scoreboard.renderFull(data);

		expect(framesByName.get('FSCell0_1')?.text).toBe(`${HexColors.WHITE}43`);
		expect(framesByName.get('FSCell0_2')?.text).toBe(`${HexColors.WHITE}(${HexColors.GREEN}7|r${HexColors.WHITE})`);
	});

	it('aligns numeric headers with the same right edge as their values', () => {
		new FrameScoreboard(1);

		for (const column of [1, 3, 4, 5, 6]) {
			const header = framesByName.get(`FSHeader${column}`);
			const cell = framesByName.get(`FSCell0_${column}`);

			expect(header?.horizontalAlignment).toBe((globalThis as any).TEXT_JUSTIFY_RIGHT);
			expect(cell?.horizontalAlignment).toBe((globalThis as any).TEXT_JUSTIFY_RIGHT);
			expect(header?.x).toBe(cell?.x);
			expect(header?.width).toBe(cell?.width);
		}
	});

	it('anchors the scoreboard against the widescreen right edge', () => {
		new FrameScoreboard(1);

		expect(framesByName.get('BackdropTemplate')?.x).toBeCloseTo(0.9298, 4);
		expect(framesByName.get('BackdropTemplate')?.y).toBeCloseTo(0.56, 4);
	});
});
