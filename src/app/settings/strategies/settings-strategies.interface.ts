import { SettingsController } from '../settings-controller';

export interface SettingsStrategy {
	apply(settingsController: SettingsController): void;
}
