import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { PlayerManager } from '../player/player-manager';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_PLAYER_LEFT } from '../utils/events/event-constants';
import { NameManager } from './names/name-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { CAMERA_POSITION_MODE, CameraPositionMode } from '../player/options';
import { initMinimapCoords, positionFrameOnMinimap } from '../utils/minimap-coords';
import { getTeamColorTexture } from '../utils/player-colors';
import { canUseAllyCameras } from '../utils/ally-cameras';

export type CamPositionData = {
	x: number;
	y: number;
};

// How far the displayed marker moves toward the real camera position each render tick.
// Tuned against RENDER_INTERVAL - raising the interval wants a higher speed to feel the same.
const LERP_SPEED: number = 0.2;
const RENDER_INTERVAL: number = 0.05;
const SYNC_INTERVAL: number = 0.5;

// Snap instead of lerping once we are this close (squared distance, world units).
const SNAP_DISTANCE_SQUARED: number = 1.0;

// Skip the sync packet unless the camera actually moved this far, so an idle player sends nothing.
const MIN_SYNC_DELTA: number = 32.0;

const MINIMAP_ICON_WIDTH: number = 0.009;
const MINIMAP_ICON_HEIGHT: number = 0.006;
const MINIMAP_ICON_ALPHA: number = 200;
const MINIMAP_ICON_LEVEL: number = 20;

const LABEL_TEXT_SIZE: number = 0.022;
const LABEL_Z_OFFSET: number = 16.0;

export default class PlayerCameraPositionManager {
	private static instance: PlayerCameraPositionManager;

	private camPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private displayPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();

	/** In-game floating label. Text tags take world coordinates, so the engine handles projection. */
	private labels: Map<player, texttag> = new Map<player, texttag>();
	private minimapIcons: Map<player, framehandle> = new Map<player, framehandle>();

	// Caches so we only ever hit a native when the value actually changes.
	private labelTexts: Map<player, string> = new Map<player, string>();
	private labelVisible: Map<player, boolean> = new Map<player, boolean>();
	private iconVisible: Map<player, boolean> = new Map<player, boolean>();
	private iconTextures: Map<player, string> = new Map<player, string>();

	private lastSyncedX: number = 0;
	private lastSyncedY: number = 0;
	private hasSynced: boolean = false;

	// Whether the local player may watch their allies' cameras this match. Re-evaluated at the start
	// of every match (see refreshAllyCameraEligibility), so it never leaks from one match into the next.
	private localCanUseAllyCameras: boolean = false;

	private syncTrigger: trigger;

	public static getInstance(): PlayerCameraPositionManager {
		if (this.instance === undefined) {
			this.instance = new PlayerCameraPositionManager();
		}
		return this.instance;
	}

	private constructor() {
		if (!SHOW_PLAYER_CAMERA_POSITIONS) return;

		initMinimapCoords();

		this.syncTrigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			BlzTriggerRegisterPlayerSyncEvent(this.syncTrigger, Player(i), 'cam', false);
		}

		TriggerAddAction(this.syncTrigger, () => this.onSync());

		EventEmitter.getInstance().on(EVENT_ON_PLAYER_LEFT, (leaver) => {
			this.removePlayer(leaver.getPlayer());
		});

		TimerStart(CreateTimer(), SYNC_INTERVAL, true, () => this.syncLocalPlayerPosition());
		TimerStart(CreateTimer(), RENDER_INTERVAL, true, () => this.render());
	}

	/**
	 * Broadcasts the local player's camera position, but only when somebody could actually be
	 * watching and only when the camera has moved. In a plain FFA game with no observers this
	 * sends nothing at all.
	 */
	private syncLocalPlayerPosition(): void {
		const local: player = GetLocalPlayer();

		if (GetPlayerController(local) !== MAP_CONTROL_USER) return;
		if (!this.anyoneCouldBeWatching()) return;

		const activePlayer = PlayerManager.getInstance().players.get(local);
		if (activePlayer && !activePlayer.status.isActive()) return;

		const x: number = GetCameraTargetPositionX();
		const y: number = GetCameraTargetPositionY();

		if (this.hasSynced) {
			const movedX: number = x - this.lastSyncedX;
			const movedY: number = y - this.lastSyncedY;

			if (movedX > -MIN_SYNC_DELTA && movedX < MIN_SYNC_DELTA && movedY > -MIN_SYNC_DELTA && movedY < MIN_SYNC_DELTA) {
				return;
			}
		}

		this.lastSyncedX = x;
		this.lastSyncedY = y;
		this.hasSynced = true;

		BlzSendSyncData('cam', `${x}:${y}`);
	}

	/**
	 * Re-evaluates whether the local player is in a team game with allies. Must be called once the
	 * match's teams and alliances are set up (SetupState), and it runs again on every restart.
	 */
	public refreshAllyCameraEligibility(): void {
		this.localCanUseAllyCameras = canUseAllyCameras(GetLocalPlayer());
	}

	/**
	 * Observers can watch everyone, and in team games allies can watch each other. Alliances are
	 * symmetric, so if the local player has an ally, that ally could be watching the local camera.
	 * In a plain FFA game with no observers this sends nothing at all.
	 */
	private anyoneCouldBeWatching(): boolean {
		if (EDITOR_DEVELOPER_MODE) return true;
		if (this.localCanUseAllyCameras) return true;

		return PlayerManager.getInstance().observers.size > 0;
	}

	private onSync(): void {
		const p: player = GetTriggerPlayer();
		const parts: string[] = BlzGetTriggerSyncData().split(':');

		if (parts.length < 2) return;

		const x: number = S2R(parts[0]);
		const y: number = S2R(parts[1]);

		const existing = this.camPositionData.get(p);

		if (existing) {
			existing.x = x;
			existing.y = y;
			return;
		}

		this.camPositionData.set(p, { x, y });
		this.displayPositionData.set(p, { x, y });

		// Sync events fire on every client, so this is the place to create the marker handles. Creating
		// them lazily in render() would only do so on the observer's client - the handle ids drift apart
		// and the game desyncs the moment an observer switches the overlay on.
		this.createLabel(p);
		this.createMinimapIcon(p);
	}

	private render(): void {
		const local: player = GetLocalPlayer();
		const mode: CameraPositionMode = this.getModeForPlayer(local);

		const isLiveMatch: boolean = GlobalGameData.matchState === 'preMatch' || GlobalGameData.matchState === 'inProgress';

		if (mode === CAMERA_POSITION_MODE.DISABLED || !isLiveMatch || !this.isEligibleViewer(local)) {
			this.hideAll();
			return;
		}

		const showInWorld: boolean = mode === CAMERA_POSITION_MODE.WORLD_AND_MINIMAP;

		this.displayPositionData.forEach((display, p) => {
			if (!this.canSee(local, p)) {
				this.setLabelVisible(p, false);
				this.setIconVisible(p, false);
				return;
			}

			this.lerpToward(display, this.camPositionData.get(p));

			// In-game label
			const label: texttag = this.labels.get(p);

			if (showInWorld && label) {
				this.refreshLabelText(p, label);
				SetTextTagPos(label, display.x, display.y, LABEL_Z_OFFSET);
				this.setLabelVisible(p, true);
			} else {
				this.setLabelVisible(p, false);
			}

			// Minimap icon
			const icon: framehandle = this.minimapIcons.get(p);
			if (!icon) return;

			this.refreshIconTexture(p, icon);
			positionFrameOnMinimap(icon, display.x, display.y);
			this.setIconVisible(p, true);
		});
	}

	private lerpToward(display: CamPositionData, target: CamPositionData): void {
		if (!target) return;

		const dx: number = target.x - display.x;
		const dy: number = target.y - display.y;

		if (dx * dx + dy * dy < SNAP_DISTANCE_SQUARED) {
			display.x = target.x;
			display.y = target.y;
			return;
		}

		display.x += dx * LERP_SPEED;
		display.y += dy * LERP_SPEED;
	}

	private getModeForPlayer(p: player): CameraPositionMode {
		// Deliberately not using playersAndObservers - that getter builds and copies a new Map
		// on every access, and this runs on every render tick.
		const playerManager = PlayerManager.getInstance();
		let activePlayer = playerManager.players.get(p);

		if (!activePlayer) activePlayer = playerManager.observers.get(p);
		if (!activePlayer) return CAMERA_POSITION_MODE.DISABLED;

		return activePlayer.options.cameraPositionMode;
	}

	/** Observers always, players only in team games where they have allies. Only called for the local player. */
	private isEligibleViewer(p: player): boolean {
		return EDITOR_DEVELOPER_MODE || IsPlayerObserver(p) || this.localCanUseAllyCameras;
	}

	private canSee(viewer: player, target: player): boolean {
		// Developer mode shows your own camera too, so the overlay can be tested in singleplayer.
		if (EDITOR_DEVELOPER_MODE) return true;
		if (viewer === target) return false;

		// Eliminated players stop syncing, so their marker would just sit frozen at the last position
		const targetPlayer = PlayerManager.getInstance().players.get(target);
		if (targetPlayer && !targetPlayer.status.isActive()) return false;

		if (IsPlayerObserver(viewer)) return true;

		// Players only ever see their allies, never enemies or observers
		return targetPlayer !== undefined && IsPlayerAlly(viewer, target);
	}

	/** Must only be called from synced code, so every client creates the same text tag. */
	private createLabel(p: player): void {
		if (this.labels.has(p)) return;

		const label: texttag = CreateTextTag();
		SetTextTagPermanent(label, true);
		SetTextTagVisibility(label, false);
		this.labels.set(p, label);
		this.labelVisible.set(p, false);
	}

	private refreshLabelText(p: player, label: texttag): void {
		const name: string = `${NameManager.getInstance().getColorCode(p)}${NameManager.getInstance().getDisplayName(p)}|r`;

		if (this.labelTexts.get(p) === name) return;

		SetTextTagText(label, name, LABEL_TEXT_SIZE);
		this.labelTexts.set(p, name);
	}

	/** Must only be called from synced code, so every client creates the same frame. */
	private createMinimapIcon(p: player): void {
		if (this.minimapIcons.has(p)) return;

		// Offset the context so it cannot collide with the per-player preference buttons.
		const context: number = GetPlayerId(p) + 1;

		const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'MinimapPlayerCameraIcon', BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0), '', context);
		BlzFrameSetSize(icon, MINIMAP_ICON_WIDTH, MINIMAP_ICON_HEIGHT);
		BlzFrameSetLevel(icon, MINIMAP_ICON_LEVEL);
		BlzFrameSetAlpha(icon, MINIMAP_ICON_ALPHA);
		BlzFrameSetVisible(icon, false);

		this.minimapIcons.set(p, icon);
		this.iconVisible.set(p, false);
	}

	private refreshIconTexture(p: player, icon: framehandle): void {
		const texture: string = getTeamColorTexture(GetPlayerColor(p));

		if (this.iconTextures.get(p) === texture) return;

		BlzFrameSetTexture(icon, texture, 0, true);
		this.iconTextures.set(p, texture);
	}

	private setLabelVisible(p: player, visible: boolean): void {
		if (this.labelVisible.get(p) === visible) return;

		const label: texttag = this.labels.get(p);
		if (!label) return;

		SetTextTagVisibility(label, visible);
		this.labelVisible.set(p, visible);
	}

	private setIconVisible(p: player, visible: boolean): void {
		if (this.iconVisible.get(p) === visible) return;

		const icon: framehandle = this.minimapIcons.get(p);
		if (!icon) return;

		BlzFrameSetVisible(icon, visible);
		this.iconVisible.set(p, visible);
	}

	private hideAll(): void {
		this.labelVisible.forEach((visible, p) => {
			if (visible) this.setLabelVisible(p, false);
		});

		this.iconVisible.forEach((visible, p) => {
			if (visible) this.setIconVisible(p, false);
		});
	}

	private removePlayer(p: player): void {
		this.setLabelVisible(p, false);
		this.setIconVisible(p, false);

		const label: texttag = this.labels.get(p);
		if (label) {
			DestroyTextTag(label);
			this.labels.delete(p);
		}

		this.minimapIcons.delete(p);
		this.labelTexts.delete(p);
		this.labelVisible.delete(p);
		this.iconVisible.delete(p);
		this.iconTextures.delete(p);
		this.camPositionData.delete(p);
		this.displayPositionData.delete(p);
	}
}
