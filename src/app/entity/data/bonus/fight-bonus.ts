import { LocalMessage } from 'src/app/utils/messages';
import { Bonus } from './bonus';
import { HexColors } from 'src/app/utils/hex-colors';

export class FightBonus implements Bonus {
	private static readonly BASE: number = 10;
	private static readonly CAP: number = 60;
	private static readonly INTERVAL: number = 200;

	private total: number;
	private delta: number;
	private totalBonusVal: number;
	private ui: framehandle;
	private player: player;
	private enabled: boolean;

	constructor(player: player) {
		this.total = 0;
		this.player = player;
		this.enabled = true;
		this.ui = BlzCreateSimpleFrame('MyBarEx', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), GetPlayerId(player));
		BlzFrameSetAbsPoint(this.ui, FRAMEPOINT_TOPRIGHT, ((0.6 * BlzGetLocalClientWidth()) / BlzGetLocalClientHeight() + 0.793) / 2, 0.573);
		this.reset();
		BlzFrameSetVisible(this.ui, false);
	}

	public reset(): void {
		if (!this.enabled) return;

		this.delta = 0;
		this.totalBonusVal = 0;
		BlzFrameSetValue(this.ui, this.delta);
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

		BlzFrameSetValue(this.ui, this.delta / 2);
		this.setText();

		return bonusAmount;
	}

	public getTotal(): number {
		return this.total;
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

	public disable() {
		this.enabled = false;
	}

	private processBonus(): number {
		if (!this.enabled) return 0;

		this.delta -= FightBonus.INTERVAL;

		let bonusAmount: number = Math.floor(this.totalBonusVal / FightBonus.INTERVAL);

		bonusAmount += FightBonus.BASE;
		bonusAmount = Math.min(bonusAmount, FightBonus.CAP);
		this.total += bonusAmount;

		LocalMessage(
			this.player,
			`Received ${HexColors.TANGERINE}${bonusAmount}|r gold from ${HexColors.RED}Fight Bonus|r!`,
			'Sound\\Interface\\Rescue.flac'
		);

		return bonusAmount;
	}

	private setText() {
		if (!this.enabled) return;

		BlzFrameSetText(BlzGetFrameByName('MyBarExText', GetPlayerId(this.player)), `Fight Bonus: ${this.delta} / ${FightBonus.INTERVAL}`);
	}
}
