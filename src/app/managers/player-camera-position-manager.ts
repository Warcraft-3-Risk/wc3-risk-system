import { debugPrint } from "../utils/debug-print";
import { NameManager } from "./names/name-manager";

export type CamPositionData = {
	x: number;
	y: number;
};

export default class PlayerCameraPositionManager {
	private static instance: PlayerCameraPositionManager;
	private camPositionData: Map<player, CamPositionData> = new Map<player, CamPositionData>();
	private effect: Map<player, texttag> = new Map<player, texttag>();
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

		const timer = CreateTimer();
		TimerStart(timer, 1.0, true, () => this.syncLocalPlayerPosition());
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
	}

	private onSync() {
		const p = GetTriggerPlayer();
		const data = BlzGetTriggerSyncData();
		const parts = data.split(':');
		const x = S2R(parts[0]);
		const y = S2R(parts[1]);

		if (!this.camPositionData.has(p)) {
			this.camPositionData.set(p, { x, y });
			this.effect.set(p, CreateTextTag());
		} else {
			const pos = this.camPositionData.get(p);
			pos.x = x;
			pos.y = y;
			
			if (IsPlayerObserver(GetLocalPlayer())) {
				SetTextTagText(this.effect.get(p), NameManager.getInstance().getDisplayName(p), 0.028);
				SetTextTagPos(this.effect.get(p), x, y, 16.0);
				SetTextTagVisibility(this.effect.get(p), true);
				SetTextTagPermanent(this.effect.get(p), true);
			}
		}

		debugPrint(`Received camera position sync from player ${GetPlayerName(p)}: (${x}, ${y})`);
	}
}
