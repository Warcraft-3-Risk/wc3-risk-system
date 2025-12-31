import { LocalMessage } from 'src/app/utils/messages';
import { Bonus } from './bonus';
import { HexColors } from 'src/app/utils/hex-colors';

export class FightBonus implements Bonus {
	private static readonly BASE: number = 10;
	private static readonly CAP: number = 30;
	private static readonly INTERVAL: number = 150;
	private static readonly UI_MAX_VALUE: number = 100;

	private goldEarned: number;
	private delta: number;
	private totalBonusVal: number;
	private ui: framehandle;
	private player: player;
	private enabled: boolean;

	constructor(player: player) {
		this.goldEarned = 0;
		this.player = player;
		this.enabled = true;
		this.ui = BlzCreateSimpleFrame('FightBonusBar', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), GetPlayerId(player));
		this.reset();
		BlzFrameSetVisible(this.ui, false);
	}

	public get earned(): number {
		return this.goldEarned;
	}

	public showForPlayer(player: player) {
		if (!this.enabled) return;

		if (player == GetLocalPlayer()) {
			BlzFrameSetVisible(this.ui, true);
		}
	}

	public hideUI() {
		if (!this.enabled) return;
		BlzFrameSetVisible(this.ui, false);
	}

	public reset(): void {
		if (!this.enabled) return;

		this.delta = 0;
		this.totalBonusVal = 0;
		BlzFrameSetValue(this.ui, 0);
		this.setText();
	}

	public add(val: number): number {
		if (!this.enabled) return 0;

		let bonusAmount: number = 0;

		this.delta += val;
		this.totalBonusVal += val;

		if (this.delta >= FightBonus.INTERVAL) {
			bonusAmount = this.processBonus();
		}

		BlzFrameSetValue(this.ui, (this.delta * FightBonus.UI_MAX_VALUE) / FightBonus.INTERVAL);
		this.setText();

		return bonusAmount;
	}

	public repositon() {
		if (!this.enabled) return;

		BlzFrameSetSize(this.ui, 0.278, 0.015);
		BlzFrameSetAbsPoint(this.ui, FRAMEPOINT_TOPRIGHT, ((0.6 * BlzGetLocalClientWidth()) / BlzGetLocalClientHeight() + 0.793) / 2, 0.573);
	}

	public disable() {
		this.enabled = false;
	}

	private processBonus(): number {
		if (!this.enabled) return 0;

		this.delta -= FightBonus.INTERVAL;

		let bonusAmount: number = Math.floor(this.totalBonusVal / FightBonus.INTERVAL);

		bonusAmount += FightBonus.BASE;
		bonusAmount = Math.min(bonusAmount, FightBonus.CAP);
		this.goldEarned += bonusAmount;

		LocalMessage(
			this.player,
			`Received ${HexColors.TANGERINE}${bonusAmount}|r gold from ${HexColors.RED}Fight Bonus|r!`,
			'Sound\\Interface\\Rescue.flac'
		);

		return bonusAmount;
	}

	private setText() {
		if (!this.enabled) return;

		// Calculate projected bonus when bar fills (project what totalBonusVal will be when bar completes)
		let projectedTotalValue: number = this.totalBonusVal + (FightBonus.INTERVAL - this.delta);
		let projectedBonus: number = Math.floor(projectedTotalValue / FightBonus.INTERVAL) + FightBonus.BASE;
		projectedBonus = Math.min(projectedBonus, FightBonus.CAP);

		BlzFrameSetText(
			BlzGetFrameByName('FightBonusBarText', GetPlayerId(this.player)),
			`Fight Bonus: ${this.delta} / ${FightBonus.INTERVAL} (+${projectedBonus} gold)`
		);
	}
}
