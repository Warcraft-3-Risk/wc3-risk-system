import { describe, expect, it } from 'vitest';
import {
	ELIMINATED_PLAYER_DISCORD_QR_OPTIONS,
	shouldAutoShowDiscordQrForEliminatedPlayer,
	shouldShowObserverDiscordQrToggle,
} from '../src/app/triggers/visuals/observer-discord-qr-code-logic';

describe('Observer Discord QR code behavior', () => {
	it('shows the observer QR toggle only for observers or developer mode', () => {
		expect(shouldShowObserverDiscordQrToggle({ isObserver: true, isDeveloperMode: false })).toBe(true);
		expect(shouldShowObserverDiscordQrToggle({ isObserver: false, isDeveloperMode: true })).toBe(true);
		expect(shouldShowObserverDiscordQrToggle({ isObserver: false, isDeveloperMode: false })).toBe(false);
	});

	it('auto-shows the QR code only for the locally eliminated player in non-promode games', () => {
		expect(
			shouldAutoShowDiscordQrForEliminatedPlayer({
				isLocalPlayer: true,
				isPromode: false,
				isEqualizedPromode: false,
				isChaosPromode: false,
			})
		).toBe(true);

		expect(
			shouldAutoShowDiscordQrForEliminatedPlayer({
				isLocalPlayer: false,
				isPromode: false,
				isEqualizedPromode: false,
				isChaosPromode: false,
			})
		).toBe(false);

		expect(
			shouldAutoShowDiscordQrForEliminatedPlayer({
				isLocalPlayer: true,
				isPromode: true,
				isEqualizedPromode: false,
				isChaosPromode: false,
			})
		).toBe(false);

		expect(
			shouldAutoShowDiscordQrForEliminatedPlayer({
				isLocalPlayer: true,
				isPromode: false,
				isEqualizedPromode: true,
				isChaosPromode: false,
			})
		).toBe(false);

		expect(
			shouldAutoShowDiscordQrForEliminatedPlayer({
				isLocalPlayer: true,
				isPromode: false,
				isEqualizedPromode: false,
				isChaosPromode: true,
			})
		).toBe(false);
	});

	it('positions the eliminated-player QR code in the bottom-right inventory area', () => {
		expect(ELIMINATED_PLAYER_DISCORD_QR_OPTIONS).toEqual({
			centerX: 0.72,
			centerY: 0.09,
			moduleSize: 0.0038,
		});
	});
});
