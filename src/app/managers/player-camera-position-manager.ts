import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { PlayerManager } from '../player/player-manager';
import { debugPrint } from '../utils/debug-print';
import { NameManager } from './names/name-manager';

export type CamPositionData = {
	x: number;
	y: number;
};

const LERP_SPEED = 0.35;

export default class PlayerCameraPositionManager {
	private static instance: PlayerCameraPositionManager;
	private camPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private displayPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private frames: Map<player, { box: framehandle; text: framehandle }> = new Map();
	private syncTrigger: trigger;

	public static getInstance() {
		if (this.instance == null) {
			this.instance = new PlayerCameraPositionManager();
		}
		return this.instance;
	}

	private constructor() {
		this.syncTrigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);
			BlzTriggerRegisterPlayerSyncEvent(this.syncTrigger, player, 'cam', false);
		}

		TriggerAddAction(this.syncTrigger, () => this.onSync());

		if (!SHOW_PLAYER_CAMERA_POSITIONS) return;

		// Network sync timer — keeps the 1s interval to avoid desync
		const syncTimer = CreateTimer();
		TimerStart(syncTimer, 1.0, true, () => this.syncLocalPlayerPosition());

		// Local lerp timer — smoothly interpolates world positions toward synced targets (observer-only)
		const lerpTimer = CreateTimer();
		TimerStart(lerpTimer, 0.1, true, () => this.lerpPositions());

		// Render timer — repositions frames on screen every frame so they track the observer's camera
		const renderTimer = CreateTimer();
		TimerStart(renderTimer, 0.02, true, () => this.renderFrames());
	}

	private createPlayerFrame(p: player): { box: framehandle; text: framehandle } {
		const ctx = GetPlayerId(p) + 1; // offset to avoid context 0 used by TooltipManager
		const box = BlzCreateFrame('TasToolTipBox', BlzGetFrameByName('ConsoleUIBackdrop', 0), 0, ctx);
		const text = BlzCreateFrame('TasTooltipText', box, 0, ctx);

		BlzFrameSetPoint(box, FRAMEPOINT_BOTTOMLEFT, text, FRAMEPOINT_BOTTOMLEFT, -0.01, -0.01);
		BlzFrameSetPoint(box, FRAMEPOINT_TOPRIGHT, text, FRAMEPOINT_TOPRIGHT, 0.01, 0.01);
		BlzFrameSetAlpha(box, 255);
		BlzFrameSetAlpha(text, 255);
		BlzFrameSetEnable(text, false);
		BlzFrameSetVisible(box, false);
		BlzFrameSetVisible(text, false);

		return { box, text };
	}

	private syncLocalPlayerPosition() {
		const p = GetLocalPlayer();
		// Only sync if dragging/playing, spectators might not need to sync unless they want to be watched too
		if (GetPlayerController(p) == MAP_CONTROL_USER) {
			const x = GetCameraTargetPositionX();
			const y = GetCameraTargetPositionY();

			// Potential optimization: check if moved significantly before sending
			BlzSendSyncData('cam', `${x}:${y}`);
		}

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);
			if (!PlayerManager.getInstance().isActive(player)) {
				this.removePlayerFrame(player);
			} else {
				const frame = this.frames.get(player);
				if (frame) {
					const name = NameManager.getInstance().getDisplayName(player);
					this.setFrameText(frame, name);
				}
			}
		}
	}

	private onSync() {
		const p = GetTriggerPlayer();
		const data = BlzGetTriggerSyncData();
		const parts = data.split(':');
		const x = S2R(parts[0]);
		const y = S2R(parts[1]);

		if (!this.camPositionData.has(p)) {
			this.camPositionData.set(p, { x, y });
			this.displayPositionData.set(p, { x, y });

			const frame = this.createPlayerFrame(p);
			this.frames.set(p, frame);

			if (SHOW_PLAYER_CAMERA_POSITIONS || IsPlayerObserver(GetLocalPlayer())) {
				const name = NameManager.getInstance().getDisplayName(p);
				this.setFrameText(frame, name);

				const [sx, sy, onScreen] = World2Screen(x, y, 0);
				if (onScreen) {
					BlzFrameSetAbsPoint(frame.text, FRAMEPOINT_BOTTOM, sx, sy + 0.025);
				}
				BlzFrameSetVisible(frame.box, true);
				BlzFrameSetVisible(frame.text, true);
			}
		} else {
			const pos = this.camPositionData.get(p);
			pos.x = x;
			pos.y = y;
		}

		debugPrint(`Received camera position sync from player ${GetPlayerName(p)}: (${x}, ${y})`);
	}

	/**
	 * Lerps each player's display position toward their latest synced camera position.
	 * Runs every 0.1s. World-space only — no screen positioning here.
	 */
	private lerpPositions() {
		this.displayPositionData.forEach((display, p) => {
			const target = this.camPositionData.get(p);
			if (!target) return;

			const dx = target.x - display.x;
			const dy = target.y - display.y;

			// Snap if close enough, otherwise lerp
			if (dx * dx + dy * dy < 1.0) {
				display.x = target.x;
				display.y = target.y;
			} else {
				display.x += dx * LERP_SPEED;
				display.y += dy * LERP_SPEED;
			}
		});
	}

	/**
	 * Converts world positions to screen coordinates and repositions frames.
	 * Runs every 0.02s so frames track the observer's camera smoothly.
	 */
	private renderFrames() {
		if (!SHOW_PLAYER_CAMERA_POSITIONS && !IsPlayerObserver(GetLocalPlayer())) return;

		this.displayPositionData.forEach((display, p) => {
			const frame = this.frames.get(p);
			if (!frame) return;

			const [sx, sy, onScreen] = World2Screen(display.x, display.y, 0);
			if (onScreen) {
				BlzFrameSetAbsPoint(frame.text, FRAMEPOINT_BOTTOM, sx, sy + 0.025);
				BlzFrameSetVisible(frame.box, true);
				BlzFrameSetVisible(frame.text, true);
			} else {
				BlzFrameSetVisible(frame.box, false);
				BlzFrameSetVisible(frame.text, false);
			}
		});
	}

	private setFrameText(frame: { box: framehandle; text: framehandle }, name: string): void {
		const visLen = this.visibleLength(name);
		BlzFrameSetSize(frame.text, Math.max(0.02, visLen * 0.005 + 0.01), 0.0058);
		BlzFrameSetText(frame.text, name);
	}

	// Returns the number of visible characters, stripping |cFFRRGGBB (10 chars) and |r (2 chars)
	private visibleLength(text: string): number {
		let overhead = 0;
		let i = 0;
		while (i < text.length) {
			if (text.charAt(i) === '|' && i + 1 < text.length) {
				const next = text.charAt(i + 1);
				if (next === 'c' || next === 'C') {
					overhead += 10;
					i += 10;
				} else if (next === 'r') {
					overhead += 2;
					i += 2;
				} else {
					i++;
				}
			} else {
				i++;
			}
		}
		return text.length - overhead;
	}

	private removePlayerFrame(p: player) {
		const frame = this.frames.get(p);
		if (frame) {
			BlzDestroyFrame(frame.box);
			this.frames.delete(p);
		}

		this.camPositionData.delete(p);
		this.displayPositionData.delete(p);
	}
}
