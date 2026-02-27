import { PlayerManager } from "../player/player-manager";
import { debugPrint } from "../utils/debug-print";
import { NameManager } from "./names/name-manager";

export type CamPositionData = {
	x: number;
	y: number;
};

const LERP_SPEED = 0.35;

export default class PlayerCameraPositionManager {
	private static instance: PlayerCameraPositionManager;
	private camPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private displayPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private texttags: Map<player, texttag> = new Map<player, texttag>();
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

		// Network sync timer — keeps the 1s interval to avoid desync
		const syncTimer = CreateTimer();
		TimerStart(syncTimer, 1.0, true, () => this.syncLocalPlayerPosition());

		// Local lerp timer — smoothly moves texttags toward the synced target position (observer-only)
		const lerpTimer = CreateTimer();
		TimerStart(lerpTimer, 0.1, true, () => this.lerpTextTags());
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
				this.removePlayerTextTag(player);
			} else {
				const tag = this.texttags.get(player);
				if (tag) {
					SetTextTagText(tag, NameManager.getInstance().getDisplayName(player), 0.028);
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
			this.texttags.set(p, CreateTextTag());

			if (IsPlayerObserver(GetLocalPlayer())) {
				const tag = this.texttags.get(p);
				SetTextTagText(tag, NameManager.getInstance().getDisplayName(p), 0.028);
				SetTextTagPos(tag, x, y, 16.0);
				SetTextTagColor(tag, 255, 255, 255, 128);
				SetTextTagVisibility(tag, true);
				SetTextTagPermanent(tag, true);
			}
		} else {
			const pos = this.camPositionData.get(p);
			pos.x = x;
			pos.y = y;
		}

		debugPrint(`Received camera position sync from player ${GetPlayerName(p)}: (${x}, ${y})`);
	}

	/**
	 * Locally lerps each player's texttag toward their latest synced camera position.
	 * Runs every 0.1s and is only visible for observers.
	 */
	private lerpTextTags() {
		if (!IsPlayerObserver(GetLocalPlayer())) return;

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

			const tag = this.texttags.get(p);
			if (tag) {
				SetTextTagText(tag, NameManager.getInstance().getDisplayName(p), 0.028);
				SetTextTagPos(tag, display.x, display.y, 16.0);
				SetTextTagVisibility(tag, true);
			}
		});
	}

	private removePlayerTextTag(p: player) {
		const tag = this.texttags.get(p);
		if (tag) {
			DestroyTextTag(tag);
			this.texttags.delete(p);
		}

		this.camPositionData.delete(p);
		this.displayPositionData.delete(p);
	}
}
