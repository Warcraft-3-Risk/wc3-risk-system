import { HexColors } from '../utils/hex-colors';
import { GameTypeOptions } from './handlers/game-type-handler';
import { Diplomacy, Fog, GameType, Overtime } from './settings';
import { SettingsController } from './settings-controller';
import { DiplomacyOptions } from './strategies/diplomacy';
import { FogOptions } from './strategies/fog';
import { OvertimeOptions } from './strategies/overtime';

export class SettingsView {
	private backdrop: framehandle;
	private timerFrame: framehandle;
	private settingsController: SettingsController;

	public constructor(timerDuration: number) {
		this.settingsController = SettingsController.getInstance();
		this.backdrop = BlzCreateFrame('SettingsView', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetValue(BlzGetFrameByName('GameTypePopup', 0), GameType.Standard);
		BlzFrameSetValue(BlzGetFrameByName('FogPopup', 0), Fog.Off);
		BlzFrameSetValue(BlzGetFrameByName('DiplomacyPopup', 0), Diplomacy.FFA);
		BlzFrameSetValue(BlzGetFrameByName('OvertimePopup', 0), Overtime.Turn30);
		this.buildStartButton();
		this.buildTimer();
		this.gameTypePopup();
		this.fogPopup();
		this.diplomacyPopup();
		this.diplomacyQuantitySlider();
		this.overtimePopup();
		this.hostSetup();
		this.playerSetup();
		this.update(timerDuration);
	}

	public update(time: number) {
		BlzFrameSetText(this.timerFrame, time.toString());
	}

	public hide() {
		BlzFrameSetEnable(this.backdrop, false);
		BlzFrameSetVisible(this.backdrop, false);
	}

	public isVisible(): boolean {
		return BlzFrameIsVisible(this.backdrop);
	}

	private buildTimer() {
		const timerLabel = BlzCreateFrameByType('TEXT', 'SettingsHostTimerLabel', this.backdrop, '', 0);
		BlzFrameSetText(timerLabel, `${HexColors.TANGERINE}Auto Start in: `);
		BlzFrameSetScale(timerLabel, 1.2);
		BlzFrameSetPoint(timerLabel, FRAMEPOINT_BOTTOM, this.backdrop, FRAMEPOINT_BOTTOM, -0.008, 0.01);

		this.timerFrame = BlzCreateFrameByType('TEXT', 'SettingsHostTimer', this.backdrop, '', 0);
		BlzFrameSetScale(this.timerFrame, 1.2);
		BlzFrameSetPoint(this.timerFrame, FRAMEPOINT_LEFT, timerLabel, FRAMEPOINT_RIGHT, 0.0, 0.0);
		BlzFrameSetText(this.timerFrame, ``);
	}

	private buildStartButton() {
		const frame: framehandle = BlzCreateFrameByType('GLUETEXTBUTTON', 'StartButton', this.backdrop, 'ScriptDialogButton', 0);

		BlzFrameSetText(frame, 'Start');
		BlzFrameSetSize(frame, 0.13, 0.03);
		BlzFrameSetPoint(frame, FRAMEPOINT_BOTTOM, this.backdrop, FRAMEPOINT_BOTTOM, 0, 0.03);

		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, frame, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			t,
			Condition(() => {
				this.hide();
			})
		);
	}

	private gameTypePopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('GameTypePopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const fogFrame: framehandle = BlzGetFrameByName('FogPopup', 0);
				const overtimeFrame: framehandle = BlzGetFrameByName('OvertimePopup', 0);
				const diploFrame: framehandle = BlzGetFrameByName('DiplomacyPopup', 0);
				const teamSizeFrame: framehandle = BlzGetFrameByName('DiplomacySlider', 0);
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				this.settingsController.setGameType(frameValue);

				switch (frameValue) {
					case 1: //Promode
						this.settingsController.setFog(Fog.On);
						this.settingsController.setOvertime(Overtime.Off);
						this.settingsController.setDiplomacy(Diplomacy.DraftTeams);
						this.settingsController.setTeamSize(2);

						BlzFrameSetValue(fogFrame, this.settingsController.getFog());
						BlzFrameSetValue(overtimeFrame, this.settingsController.getOvertime());
						BlzFrameSetValue(diploFrame, this.settingsController.getDiplomacy());
						BlzFrameSetValue(teamSizeFrame, 2);
						BlzFrameSetEnable(fogFrame, false);
						BlzFrameSetEnable(diploFrame, false);
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), true);
						break;

					case 2: //Capitals
						this.settingsController.setFog(Fog.Night);
						this.settingsController.setDiplomacy(Diplomacy.FFA);
						this.settingsController.setOvertime(Overtime.Off);
						this.settingsController.setTeamSize(2);

						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, this.settingsController.getFog());
						BlzFrameSetValue(overtimeFrame, this.settingsController.getOvertime());
						BlzFrameSetValue(diploFrame, this.settingsController.getDiplomacy());
						BlzFrameSetValue(teamSizeFrame, this.settingsController.getTeamSize());
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), true);
						break;

					case 3: //Tournament
						this.settingsController.setFog(Fog.On);
						this.settingsController.setDiplomacy(Diplomacy.FFA);
						this.settingsController.setTeamSize(2);

						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, this.settingsController.getFog());
						BlzFrameSetValue(overtimeFrame, this.settingsController.getOvertime());
						BlzFrameSetValue(diploFrame, this.settingsController.getDiplomacy());
						BlzFrameSetValue(teamSizeFrame, this.settingsController.getTeamSize());
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
						break;

					default: //Standard
						this.settingsController.setFog(Fog.Off);
						this.settingsController.setOvertime(Overtime.Turn30);
						this.settingsController.setDiplomacy(Diplomacy.FFA);
						this.settingsController.setTeamSize(2);

						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, this.settingsController.getFog());
						BlzFrameSetValue(overtimeFrame, this.settingsController.getOvertime());
						BlzFrameSetValue(diploFrame, this.settingsController.getDiplomacy());
						BlzFrameSetValue(teamSizeFrame, this.settingsController.getTeamSize());
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
						break;
				}

				this.colorizeText(`GameTypePopup`, GameTypeOptions);
				this.colorizeText(`DiplomacyPopup`, DiplomacyOptions);
				this.colorizeText(`FogPopup`, FogOptions);
				this.colorizeText(`OvertimePopup`, OvertimeOptions);
			})
		);

		this.colorizeText(`GameTypePopup`, GameTypeOptions);
	}

	private fogPopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('FogPopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				this.settingsController.setFog(frameValue);
				this.colorizeText(`FogPopup`, FogOptions);
			})
		);

		this.colorizeText(`FogPopup`, FogOptions);
	}

	private overtimePopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('OvertimePopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				this.settingsController.setOvertime(frameValue);
				this.colorizeText('OvertimePopup', OvertimeOptions);
			})
		);

		this.colorizeText('OvertimePopup', OvertimeOptions);
	}

	private diplomacyPopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('DiplomacyPopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				this.settingsController.setDiplomacy(frameValue);
				this.colorizeText(`DiplomacyPopup`, DiplomacyOptions);

				if (frameValue > 0) {
					BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), true);
					BlzFrameSetText(
						BlzGetFrameByName('DiplomacySubOptionLabel', 0),
						`${R2I(BlzFrameGetValue(BlzGetFrameByName('DiplomacySlider', 0)))}`
					);
				} else {
					BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
					BlzFrameSetText(BlzGetFrameByName('DiplomacySubOptionLabel', 0), `FFA`);
				}
			})
		);

		this.colorizeText(`DiplomacyPopup`, DiplomacyOptions);
	}

	private diplomacyQuantitySlider() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('DiplomacySlider', 0), FRAMEEVENT_SLIDER_VALUE_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				this.settingsController.setTeamSize(frameValue);

				if (BlzFrameIsVisible(BlzGetFrameByName('DiplomacySlider', 0))) {
					BlzFrameSetText(BlzGetFrameByName('DiplomacySubOptionLabel', 0), `${frameValue}`);
				} else {
					BlzFrameSetText(BlzGetFrameByName('DiplomacySubOptionLabel', 0), `FFA`);
				}
			})
		);

		BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
		BlzFrameSetText(BlzGetFrameByName('DiplomacySubOptionLabel', 0), `FFA`);
	}

	private colorizeText(frameName: string, optionsType: Record<number, string>) {
		const frame = BlzGetFrameByName(frameName, 0);
		const value = BlzFrameGetValue(frame);

		BlzFrameSetText(frame, `${optionsType[value]}`);
		BlzFrameSetText(BlzFrameGetChild(frame, 2), `${optionsType[value]}`);
	}

	private hostSetup() {
		if (GetLocalPlayer() == Player(0)) {
			BlzFrameSetVisible(BlzGetFrameByName('PopupMenuOptions', 0), false);
		}
	}

	private playerSetup() {
		if (GetLocalPlayer() != Player(0)) {
			BlzFrameSetVisible(BlzGetFrameByName('PopupMenus', 0), false);
			BlzFrameSetVisible(BlzGetFrameByName('StartButton', 0), false);
			BlzFrameSetVisible(BlzGetFrameByName('DiplomacySubOptionLabel', 0), false);
		}
	}
}
