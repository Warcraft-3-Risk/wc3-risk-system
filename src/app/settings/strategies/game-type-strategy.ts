import { GameType } from '../settings';
import { SettingsController } from '../settings-controller';
import { SettingsStrategy } from './settings-strategies.interface';

export class GameTypeStrategy implements SettingsStrategy {
	private readonly handlers: Map<GameType, () => void> = new Map([
		[GameType.Standard, this.handleStandard],
		[GameType.Promode, this.handlePromode],
		[GameType.Capitals, this.handleCapitals],
		[GameType.Tournament, this.handleTournament],
	]);

	constructor() {}

	public apply(settingsController: SettingsController): void {
		const handler = this.handlers.get(settingsController.getGameType());

		if (handler) {
			handler();
		}
	}

	private handleStandard(): void {}

	private handlePromode(): void {}

	private handleCapitals(): void {}

	private handleTournament(): void {}
}
