import { Fog } from '../settings';
import { SettingsController } from '../settings-controller';
import { SettingsStrategy } from './settings-strategies.interface';

export class FogStrategy implements SettingsStrategy {
	private readonly handlers: Map<Fog, () => void>;

	constructor() {
		this.handlers = new Map([
			[Fog.Off, this.handleOff],
			[Fog.On, this.handleOn],
			[Fog.Night, this.handleNight],
		]);
	}

	public apply(settingsController: SettingsController): void {
		const handler = this.handlers.get(settingsController.getFog());

		if (handler) {
			handler();
		}
	}

	private handleOff(): void {
		FogEnable(false);
	}

	private handleOn(): void {
		FogEnable(true);
	}

	private handleNight(): void {
		// TODO
	}
}
