import { PLAYER_COLOR_CODES_MAP } from 'src/app/utils/player-colors';

export function AnnounceOnLocation(
	message: string,
	x: number,
	y: number,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	xOffset: number = 0,
	yOffset: number = 0
): void {
	const text = CreateTextTag();
	SetTextTagText(text, message, 0.019);
	SetTextTagPos(text, x - 140 + xOffset, y + 20 + yOffset, 16.0);
	SetTextTagVisibility(text, true);
	SetTextTagFadepoint(text, fadepoint);
	SetTextTagPermanent(text, false);
	SetTextTagLifespan(text, lifespan);
}

export function AnnounceOnLocationObserverOnly(
	message: string,
	x: number,
	y: number,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	tintByPlayer: player = undefined,
	xOffset: number = 0,
	yOffset: number = 0
): void {
	if (IsPlayerObserver(GetLocalPlayer())) {
		if (tintByPlayer) {
			message = `${PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(tintByPlayer))}${message}`;
		}
		AnnounceOnLocation(message, x, y, fadepoint, lifespan, xOffset, yOffset);
	}
}

export function AnnounceOnUnitObserverOnly(
	message: string,
	unit: unit,
	fadepoint: number = 2,
	lifespan: number = 3.0,
	displayMessageWithUnitColor: boolean = true,
	xOffset: number = 0,
	yOffset: number = 0
): void {
	if (IsPlayerObserver(GetLocalPlayer())) {
		AnnounceOnLocation(
			displayMessageWithUnitColor ? `${getColorOfUnit(unit)}${message}` : message,
			GetUnitX(unit) - 140 + xOffset,
			GetUnitY(unit) + 20 + yOffset,
			fadepoint,
			lifespan
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
	yOffset: number = 0
): void {
	if (IsPlayerObserver(GetLocalPlayer())) {
		AnnounceOnLocation(
			tintByPlayer ? `${getColorOfPlayer(tintByPlayer)}${message}` : message,
			GetUnitX(unit) - 140 + xOffset,
			GetUnitY(unit) + 20 + yOffset,
			fadepoint,
			lifespan
		);
	}
}

export function getColorOfPlayer(player: player): string {
	return PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(player)) || '';
}

export function getColorOfUnit(unit: unit): string {
	return PLAYER_COLOR_CODES_MAP.get(GetPlayerColor(GetOwningPlayer(unit))) || '';
}
