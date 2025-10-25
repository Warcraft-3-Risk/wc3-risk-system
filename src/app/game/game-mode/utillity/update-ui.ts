import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { SettingsContext } from 'src/app/settings/settings-context';
import { HexColors } from 'src/app/utils/hex-colors';
import { PlayGlobalSound } from 'src/app/utils/utils';

/**
 * Update the UI elements related to the timer.
 */
export function updateTickUI(): void {
	let tick: string = `${GlobalGameData.tickCounter}`;

	if (GlobalGameData.tickCounter <= 3) {
		tick = `${HexColors.RED}${GlobalGameData.tickCounter}|r`;
		PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
	}

	const nightPhaseBasedOnTurn = SettingsContext.getInstance().isNightFogOn() ? getDayNightName(GlobalGameData.turnCount) : undefined;
	setTickUI(tick, GlobalGameData.turnCount.toString() + (nightPhaseBasedOnTurn ? ` ${nightPhaseBasedOnTurn}` : ''));
}

export function setTickUI(tickCounter: string, turnCount: string): void {
	BlzFrameSetText(BlzGetFrameByName('ResourceBarUpkeepText', 0), `${tickCounter}`);

	BlzFrameSetText(BlzGetFrameByName('ResourceBarSupplyText', 0), `${turnCount}`);
}

export function clearTickUI(): void {
	BlzFrameSetText(BlzGetFrameByName('ResourceBarGoldText', 0), '');
	setTickUI('', '');
}

export function setGold(goldAmount: number, goldCap: number): void {
	BlzFrameSetText(BlzGetFrameByName('ResourceBarGoldText', 0), `${goldAmount}/${goldCap}`);
}

function getDayNightName(turn: number): string {
	// 0 = dusk
	// 1 = night
	// 2 = dawn
	// 3 = day
	const list = ['Dusk', 'Night', 'Dawn', 'Day'];
	const phase = (turn - 1) % 4;
	return list[phase];
}
