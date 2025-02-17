import { GameState } from '../game/game-state';
import { EventTimer } from '../timer/EventTimer';
import { HexColors } from '../utils/hex-colors';
import { GameTypeOptions } from './handlers/game-type-handler';
import { SettingsController } from './settings-controller';
import { DiplomacyOptions } from './strategies/diplomacy';
import { FogOptions } from './strategies/fog';

export class SettingsView {
	private backdrop: framehandle;
	private timer: framehandle;
	private duration: number;
	private gameState: GameState;

	public constructor(duration: number, gameState: GameState) {
		this.gameState = gameState;
		this.duration = duration;
		this.backdrop = BlzCreateFrame('SettingsView', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetValue(BlzGetFrameByName('GameTypePopup', 0), 0);
		BlzFrameSetValue(BlzGetFrameByName('FogPopup', 0), 0);
		BlzFrameSetValue(BlzGetFrameByName('DiplomacyPopup', 0), 0);
		this.buildStartButton();
		this.buildTimer();
		this.gameTypePopup();
		this.fogPopup();
		this.diplomacyPopup();
		this.diplomacyQuantitySlider();
		this.hostSetup();
		this.playerSetup();
	}

	public update() {
		const event = EventTimer.getInstance().getEvent('uiTimer');

		BlzFrameSetText(this.timer, I2S(event.remainingTime));
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

		this.timer = BlzCreateFrameByType('TEXT', 'SettingsHostTimer', this.backdrop, '', 0);
		BlzFrameSetScale(this.timer, 1.2);
		BlzFrameSetPoint(this.timer, FRAMEPOINT_LEFT, timerLabel, FRAMEPOINT_RIGHT, 0.0, 0.0);
		BlzFrameSetText(this.timer, `${this.duration}`);
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
				EventTimer.getInstance().stopEvent('uiTimer');
				this.gameState.end();
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
				const diploFrame: framehandle = BlzGetFrameByName('DiplomacyPopup', 0);
				const teamSizeFrame: framehandle = BlzGetFrameByName('DiplomacySlider', 0);
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsController.getInstance().setGameType(frameValue);

				switch (frameValue) {
					case 1: //Tournament
						SettingsController.getInstance().setFog(1);
						SettingsController.getInstance().setDiplomacy(0);
						SettingsController.getInstance().setTeamSize(0);

						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, 1);
						BlzFrameSetValue(diploFrame, 0);
						BlzFrameSetValue(teamSizeFrame, 0);
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
						break;

					case 2: //Promode
						SettingsController.getInstance().setFog(1);
						SettingsController.getInstance().setDiplomacy(1);
						SettingsController.getInstance().setTeamSize(2);

						BlzFrameSetValue(fogFrame, 1);
						BlzFrameSetValue(diploFrame, 1);
						BlzFrameSetValue(teamSizeFrame, 2);
						BlzFrameSetEnable(fogFrame, false);
						BlzFrameSetEnable(diploFrame, false);
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), true);
						break;

					case 3: //Capitals
						SettingsController.getInstance().setFog(2);
						SettingsController.getInstance().setDiplomacy(1);
						SettingsController.getInstance().setTeamSize(2);

						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, 2);
						BlzFrameSetValue(diploFrame, 1);
						BlzFrameSetValue(teamSizeFrame, 2);
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), true);
						break;

					default: //Standard
						SettingsController.getInstance().setFog(0);
						SettingsController.getInstance().setDiplomacy(0);
						SettingsController.getInstance().setTeamSize(0);
						BlzFrameSetEnable(fogFrame, true);
						BlzFrameSetEnable(diploFrame, true);
						BlzFrameSetValue(fogFrame, 0);
						BlzFrameSetValue(diploFrame, 0);
						BlzFrameSetValue(teamSizeFrame, 0);
						BlzFrameSetVisible(BlzGetFrameByName('DiplomacySlider', 0), false);
						break;
				}

				this.colorizeText(`GameTypePopup`, GameTypeOptions);
				this.colorizeText(`DiplomacyPopup`, DiplomacyOptions);
				this.colorizeText(`FogPopup`, FogOptions);
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

				SettingsController.getInstance().setFog(frameValue);
				this.colorizeText(`FogPopup`, FogOptions);
			})
		);

		this.colorizeText(`FogPopup`, FogOptions);
	}

	private diplomacyPopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('DiplomacyPopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsController.getInstance().setDiplomacy(frameValue);
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

				SettingsController.getInstance().setTeamSize(frameValue);

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
