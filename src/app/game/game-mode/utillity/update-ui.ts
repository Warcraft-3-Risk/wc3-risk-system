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
	// Get frame reference outside of local player block to prevent desync
	const customGoldText = BlzGetFrameByName('CustomGoldText', 0);

	if (!IsPlayerObserver(GetLocalPlayer())) {
		if (GetHandleId(customGoldText) !== 0) {
			BlzFrameSetText(customGoldText, '');
		}
	}
	setTickUI('', '');
}

export function updateGold(player: player, goldAmount: number): void {
	// Get frame reference outside of local player block to prevent desync
	const customGoldText = BlzGetFrameByName('CustomGoldText', 0);

	if (player == GetLocalPlayer()) {
		if (GetHandleId(customGoldText) !== 0) {
			BlzFrameSetText(customGoldText, `${goldAmount}`);
		}
	}
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
