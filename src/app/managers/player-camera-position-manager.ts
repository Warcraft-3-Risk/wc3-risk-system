import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { PlayerManager } from '../player/player-manager';
import { debugPrint } from '../utils/debug-print';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_PLAYER_LEFT, EVENT_ON_PRE_MATCH } from '../utils/events/event-constants';
import { NameManager } from './names/name-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { MinimapIconManager } from './minimap-icon-manager';
import { SettingsContext } from '../settings/settings-context';
import { ObserverCameraPositionOverlay } from '../triggers/visuals/observer-camera-position-overlay';
import { AllyColorState } from './alliances/ally-color-state';
import { AllyColorFilterManager } from './ally-color-filter-manager';
import { ColorStringUtil } from '../utils/color-string-util';

export type CamPositionData = {
	x: number;
	y: number;
};

const LERP_SPEED = 0.08;

export default class PlayerCameraPositionManager {
	private static instance: PlayerCameraPositionManager;
	private camPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private displayPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private frames: Map<player, { box: framehandle; text: framehandle; minimapIcon: framehandle }> = new Map();
	private minimapIconTextures: Map<player, string> = new Map();
	private frameTexts: Map<player, string> = new Map();
	private syncTrigger: trigger;
	private observerCameraPositionOverlay: ObserverCameraPositionOverlay;

	public static getInstance() {
		if (this.instance === undefined) {
			this.instance = new PlayerCameraPositionManager();
		}
		return this.instance;
	}

	private constructor() {
		if (!SHOW_PLAYER_CAMERA_POSITIONS) return;

		this.syncTrigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);
			BlzTriggerRegisterPlayerSyncEvent(this.syncTrigger, player, 'cam', false);
		}

		TriggerAddAction(this.syncTrigger, () => this.onSync());

		this.observerCameraPositionOverlay = ObserverCameraPositionOverlay.getInstance();
		this.observerCameraPositionOverlay.onVisibilityChanged((isVisible) => {
			if (!isVisible) {
				this.hidePlayerFrames();
			}
		});

		EventEmitter.getInstance().on(EVENT_ON_PLAYER_LEFT, (player) => {
			this.removePlayerFrame(player.getPlayer());
		});

		EventEmitter.getInstance().on(EVENT_ON_PRE_MATCH, () => {
			this.observerCameraPositionOverlay.updateEligibility();
		});

		// Network sync timer — syncs position every 0.5s
		const syncTimer = CreateTimer();
		TimerStart(syncTimer, 0.5, true, () => this.syncLocalPlayerPosition());

		// Local lerp timer — smoothly interpolates world positions toward synced targets (observer-only)
		const lerpTimer = CreateTimer();
		TimerStart(lerpTimer, 0.02, true, () => this.lerpPositions());

		// Render timer — repositions frames on screen every frame so they track the observer's camera
		const renderTimer = CreateTimer();
		TimerStart(renderTimer, 0.02, true, () => this.renderFrames());
	}

	private isEligiblePlayer(p: player): boolean {
		if (EDITOR_DEVELOPER_MODE || IsPlayerObserver(p)) return true;

		const settings = SettingsContext.getInstance();
		if ((settings.isPromode() || settings.isChaosPromode() || settings.isEqualizedPromode()) && settings.isLobbyTeams()) {
			if (PlayerManager.getInstance().players.size > 2) {
				return PlayerManager.getInstance().players.has(p);
			}
		}

		return false;
	}

	private canSeePlayerCam(viewer: player, target: player): boolean {
		if (viewer === target) return false;
		if (EDITOR_DEVELOPER_MODE || IsPlayerObserver(viewer)) return true;
		if (IsPlayerAlly(viewer, target)) return true;
		return false;
	}

	private isOverlayVisibleForPlayer(p: player): boolean {
		if (IsPlayerObserver(p) || EDITOR_DEVELOPER_MODE) {
			return this.observerCameraPositionOverlay.isOverlayVisible();
		}

		const localActivePlayer = PlayerManager.getInstance().players.get(p);
		if (localActivePlayer) {
			return localActivePlayer.options.cameraPan;
		}

		return false;
	}

	private createPlayerFrame(p: player): { box: framehandle; text: framehandle; minimapIcon: framehandle } {
		const ctx = GetPlayerId(p) + 1; // offset to avoid context 0 used by TooltipManager
		const box = BlzCreateFrame('TasToolTipBox', BlzGetFrameByName('ConsoleUIBackdrop', 0), 0, ctx);
		const text = BlzCreateFrame('TasTooltipText', box, 0, ctx);

		// Create the semi-transparent minimap icon frame
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0);
		const minimapIcon = BlzCreateFrameByType('BACKDROP', 'MinimapPlayerCameraIcon', gameUI, '', ctx);
		BlzFrameSetSize(minimapIcon, 0.009, 0.006); // Slightly larger, 3x2 aspect ratio to mimic a screen
		BlzFrameSetLevel(minimapIcon, 20); // Render above everything else on minimap
		this.updateMinimapIconColor(p, minimapIcon);
		BlzFrameSetAlpha(minimapIcon, 200); // More transparent
		BlzFrameSetVisible(minimapIcon, false);

		BlzFrameSetPoint(box, FRAMEPOINT_BOTTOMLEFT, text, FRAMEPOINT_BOTTOMLEFT, -0.01, -0.01);
		BlzFrameSetPoint(box, FRAMEPOINT_TOPRIGHT, text, FRAMEPOINT_TOPRIGHT, 0.01, 0.01);
		BlzFrameSetAlpha(box, 255);
		BlzFrameSetAlpha(text, 255);
		BlzFrameSetEnable(text, false);
		BlzFrameSetVisible(box, false);
		BlzFrameSetVisible(text, false);

		return { box, text, minimapIcon };
	}

	private syncLocalPlayerPosition() {
		const p = GetLocalPlayer();
		// Only sync if dragging/playing, spectators might not need to sync unless they want to be watched too
		if (GetPlayerController(p) === MAP_CONTROL_USER) {
			const activePlayer = PlayerManager.getInstance().players.get(p);
			if (!activePlayer || activePlayer.status.isActive()) {
				const x = GetCameraTargetPositionX();
				const y = GetCameraTargetPositionY();

				// Potential optimization: check if moved significantly before sending
				BlzSendSyncData('cam', `${x}:${y}`);
			}
		}

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player = Player(i);
			const activePlayer = PlayerManager.getInstance().players.get(player);
			if (!activePlayer || !activePlayer.status.isActive()) {
				this.removePlayerFrame(player);
			} else {
				const frame = this.frames.get(player);
				if (frame) {
					this.updateCameraFrameText(player, frame);
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

			const localPlayer = GetLocalPlayer();
			if (this.isOverlayVisibleForPlayer(localPlayer) && this.isEligiblePlayer(localPlayer) && this.canSeePlayerCam(localPlayer, p)) {
				this.updateCameraFrameText(p, frame);

				const [sx, sy, onScreen] = World2Screen(x, y, 0);
				if (onScreen && sy >= 0.12) {
					BlzFrameSetAbsPoint(frame.text, FRAMEPOINT_BOTTOM, sx, sy + 0.025);
					BlzFrameSetVisible(frame.box, true);
					BlzFrameSetVisible(frame.text, true);
				} else {
					BlzFrameSetVisible(frame.box, false);
					BlzFrameSetVisible(frame.text, false);
				}
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
		const localPlayer = GetLocalPlayer();

		if (!this.isEligiblePlayer(localPlayer) || !this.isOverlayVisibleForPlayer(localPlayer) || GlobalGameData.matchState !== 'inProgress') {
			this.hidePlayerFrames();
			return;
		}

		this.displayPositionData.forEach((display, p) => {
			const frame = this.frames.get(p);
			if (!frame) return;

			if (!this.canSeePlayerCam(localPlayer, p)) {
				BlzFrameSetVisible(frame.box, false);
				BlzFrameSetVisible(frame.text, false);
				BlzFrameSetVisible(frame.minimapIcon, false);
				return;
			}

			this.updateCameraFrameText(p, frame);

			const [sx, sy, onScreen] = World2Screen(display.x, display.y, 0);
			if (onScreen && sy >= 0.14) {
				BlzFrameSetAbsPoint(frame.text, FRAMEPOINT_BOTTOM, sx, sy + 0.025);
				BlzFrameSetVisible(frame.box, true);
				BlzFrameSetVisible(frame.text, true);
			} else {
				BlzFrameSetVisible(frame.box, false);
				BlzFrameSetVisible(frame.text, false);
			}

			this.updateMinimapIconColor(p, frame.minimapIcon);

			// Update minimap position
			MinimapIconManager.getInstance().updateIconPosition(frame.minimapIcon, display.x, display.y);
			BlzFrameSetVisible(frame.minimapIcon, true);
		});
	}

	private updateMinimapIconColor(p: player, minimapIcon: framehandle): void {
		const texture = this.getMinimapIconTexture(p);
		if (this.minimapIconTextures.get(p) === texture) {
			return;
		}

		BlzFrameSetTexture(minimapIcon, texture, 0, true);
		this.minimapIconTextures.set(p, texture);
	}

	private getMinimapIconTexture(p: player): string {
		const localPlayer = GetLocalPlayer();
		const allyColorState = AllyColorState.getInstance();
		const activeLocalPlayer = PlayerManager.getInstance().players.get(localPlayer);
		const isColorBlind = activeLocalPlayer?.options?.colorblind ?? false;
		const color = allyColorState.getMode() > 0 ? allyColorState.getMinimapColor(p, localPlayer, isColorBlind) : NameManager.getInstance().getOriginalColor(p);

		return this.getTeamColorTexture(color);
	}

	private getTeamColorTexture(color: playercolor): string {
		const colorIndex = GetHandleId(color);
		if (colorIndex < 0 || colorIndex > 23) {
			return 'ReplaceableTextures\\TeamColor\\TeamColor90.blp';
		}

		const str = colorIndex < 10 ? '0' + colorIndex : `${colorIndex}`;
		return 'ReplaceableTextures\\TeamColor\\TeamColor' + str + '.blp';
	}

	private updateCameraFrameText(p: player, frame: { box: framehandle; text: framehandle }): void {
		const name = this.getCameraFrameDisplayName(p);
		if (this.frameTexts.get(p) === name) {
			return;
		}

		this.setFrameText(frame, name);
		this.frameTexts.set(p, name);
	}

	private getCameraFrameDisplayName(p: player): string {
		const name = NameManager.getInstance().getDisplayName(p);
		const allyFilterHex = AllyColorFilterManager.getInstance().getPlayerColorHex(p);
		if (!allyFilterHex) {
			return name;
		}

		return `${allyFilterHex}${ColorStringUtil.stripColorTags(name)}|r`;
	}

	private setFrameText(frame: { box: framehandle; text: framehandle }, name: string): void {
		const visLen = this.visibleLength(name);
		BlzFrameSetSize(frame.text, Math.max(0.02, visLen * 0.005 + 0.01), 0.0058);
		BlzFrameSetText(frame.text, name);
	}

	private hidePlayerFrames(): void {
		this.frames.forEach((frame) => {
			BlzFrameSetVisible(frame.box, false);
			BlzFrameSetVisible(frame.text, false);
			BlzFrameSetVisible(frame.minimapIcon, false);
		});
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
			BlzFrameSetVisible(frame.box, false);
			BlzFrameSetVisible(frame.text, false);
			BlzFrameSetVisible(frame.minimapIcon, false);
			this.frames.delete(p);
			this.minimapIconTextures.delete(p);
			this.frameTexts.delete(p);
		}

		this.camPositionData.delete(p);
		this.displayPositionData.delete(p);
	}
}
