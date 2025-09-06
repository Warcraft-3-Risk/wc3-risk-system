import { PLAYER_COLOR_CODES_MAP } from 'src/app/utils/player-colors';
import { PlayerManager } from '../../player/player-manager';

export function AnnounceOnLocation(
	message: string,
	x: number,
	y: number,
	fadepoint: number,
	lifespan: number,
	textSize: number = 0.019
): void {
	const text = CreateTextTag();
	SetTextTagText(text, message, textSize);
	SetTextTagPos(text, x, y, 16.0);
	SetTextTagVisibility(text, true);
	SetTextTagFadepoint(text, fadepoint);
	SetTextTagPermanent(text, false);
	SetTextTagLifespan(text, lifespan);
	SetTextTagVelocity(text, 0.008, -0.01);
}

export function AnnounceOnLocationObserverOnly(
	message: string,
	x: number,
	y: number,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	tintByPlayer: player = undefined,
	xOffset: number = 0,
	yOffset: number = 0,
	textSize: number = 0.019
): void {
	if (IsPlayerObserver(GetLocalPlayer())) {
		if (tintByPlayer) {
			message = `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(tintByPlayer))}${message}`;
		}
		AnnounceOnLocation(message, x - 140 + xOffset, y + 20 + yOffset, fadepoint, lifespan, textSize);
	}
}

export function AnnounceOnUnitObserverOnly(
	message: string,
	unit: unit,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	displayMessageWithUnitColor: boolean = true,
	xOffset: number = 0,
	yOffset: number = 0,
	textSize: number = 0.019
): void {
	if (IsPlayerObserver(GetLocalPlayer())) {
		AnnounceOnLocation(
			displayMessageWithUnitColor ? `${getColorOfUnit(unit)}${message}` : message,
			GetUnitX(unit) - 140 + xOffset,
			GetUnitY(unit) + 20 + yOffset,
			fadepoint,
			lifespan,
			textSize
		);
	}
}

export function AnnounceOnUnitObserverOnlyTintedByPlayer(
	message: string,
	unit: unit,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	tintByPlayer: player = undefined,
	xOffset: number = 0,
	yOffset: number = 0,
	textSize: number = 0.019
): void {
	if (PlayerManager.getInstance().isObserver(GetLocalPlayer())) {
		AnnounceOnLocation(
			tintByPlayer ? `${getColorOfPlayer(tintByPlayer)}${message}` : message,
			GetUnitX(unit) - 140 + xOffset,
			GetUnitY(unit) + 20 + yOffset,
			fadepoint,
			lifespan,
			textSize
		);
	}
}

export function getColorOfPlayer(player: player): string {
	return PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(player)) || '';
}

export function getColorOfUnit(unit: unit): string {
	return PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(GetOwningPlayer(unit))) || '';
}
