import { HexColors } from '../utils/hex-colors';
import { SettingsContext } from './settings-context';
import { DiplomacyStringsColorFormatted } from './strategies/diplomacy-strategy';
import { FogOptionsColorFormatted } from './strategies/fog-strategy';
import { GameTypeOptionsColorFormatted } from './strategies/game-type-strategy';
import { OvertimeStringsColorFormatted } from './strategies/overtime-strategy';
import { PromodeOptionsColorFormatted } from './strategies/promode-strategy';

export class SettingsView {
	private backdrop: framehandle;
	private timer: framehandle;

	public constructor() {
		this.backdrop = BlzCreateFrame('SettingsView', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetValue(BlzGetFrameByName('GameTypePopup', 0), 0);
		BlzFrameSetValue(BlzGetFrameByName('FogPopup', 0), 0);
		BlzFrameSetValue(BlzGetFrameByName('DiplomacyPopup', 0), 0);
		BlzFrameSetValue(BlzGetFrameByName('OvertimePopup', 0), 0);
		this.buildStartButton();
		this.buildTimer();
		this.gameTypePopup();
		this.fogPopup();
		this.diplomacyPopup();
		this.overtimePopup();
		this.promodeBox();
		this.hostSetup();
		this.playerSetup();
	}

	public update(time: number) {
		BlzFrameSetText(this.timer, time.toString());
	}

	public hide() {
		BlzFrameSetEnable(this.backdrop, false);
		BlzFrameSetVisible(this.backdrop, false);
	}

	public show() {
		BlzFrameSetEnable(this.backdrop, true);
		BlzFrameSetVisible(this.backdrop, true);
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
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsContext.getInstance().getSettings().GameType = frameValue;
				this.colorizeGameTypeText(frameValue);
			})
		);

		this.colorizeGameTypeText(BlzFrameGetValue(BlzGetFrameByName('GameTypePopup', 0)));
	}

	private fogPopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('FogPopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsContext.getInstance().getSettings().Fog = frameValue;
				this.colorizeFogText(frameValue);
			})
		);

		this.colorizeFogText(BlzFrameGetValue(BlzGetFrameByName('FogPopup', 0)));
	}

	private colorizeGameTypeText(value: number) {
		BlzFrameSetText(BlzGetFrameByName('GameTypeOption', 0), `${GameTypeOptionsColorFormatted[value]}`);
		BlzFrameSetText(BlzFrameGetChild(BlzGetFrameByName('GameTypePopup', 0), 2), `${GameTypeOptionsColorFormatted[value]}`);
	}

	private colorizeFogText(value: number) {
		BlzFrameSetText(BlzGetFrameByName('FogOption', 0), `${FogOptionsColorFormatted[value]}`);
		BlzFrameSetText(BlzFrameGetChild(BlzGetFrameByName('FogPopup', 0), 2), `${FogOptionsColorFormatted[value]}`);
	}

	private diplomacyPopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('DiplomacyPopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsContext.getInstance().getSettings().Diplomacy.option = frameValue;
				this.colorizeDiplomacyText(frameValue);
			})
		);

		this.colorizeDiplomacyText(BlzFrameGetValue(BlzGetFrameByName('DiplomacyPopup', 0)));
	}

	private colorizeDiplomacyText(value: number) {
		BlzFrameSetText(BlzGetFrameByName('DiplomacyOption', 0), `${DiplomacyStringsColorFormatted[value]}`);
		BlzFrameSetText(BlzFrameGetChild(BlzGetFrameByName('DiplomacyPopup', 0), 2), `${DiplomacyStringsColorFormatted[value]}`);
	}

	private overtimePopup() {
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, BlzGetFrameByName('OvertimePopup', 0), FRAMEEVENT_POPUPMENU_ITEM_CHANGED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const frameValue: number = R2I(BlzGetTriggerFrameValue());

				SettingsContext.getInstance().getSettings().Overtime.option = frameValue;
				this.colorizeOvertimeText(frameValue);
			})
		);

		this.colorizeOvertimeText(BlzFrameGetValue(BlzGetFrameByName('OvertimePopup', 0)));
	}

	private colorizeOvertimeText(value: number) {
		BlzFrameSetText(BlzGetFrameByName('OvertimeOption', 0), `${OvertimeStringsColorFormatted[value]}`);
		BlzFrameSetText(BlzFrameGetChild(BlzGetFrameByName('OvertimePopup', 0), 2), `${OvertimeStringsColorFormatted[value]}`);
	}

	private promodeBox() {
		const frame: framehandle = BlzGetFrameByName('PromodeCheckbox', 0);
		const t: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(t, frame, FRAMEEVENT_CHECKBOX_CHECKED);
		BlzTriggerRegisterFrameEvent(t, frame, FRAMEEVENT_CHECKBOX_UNCHECKED);
		TriggerAddCondition(
			t,
			Condition(() => {
				const gameTypeFrame: framehandle = BlzGetFrameByName('GameTypePopup', 0);
				const fogFrame: framehandle = BlzGetFrameByName('FogPopup', 0);
				const diploFrame: framehandle = BlzGetFrameByName('DiplomacyPopup', 0);
				const overtimeFrame: framehandle = BlzGetFrameByName('OvertimePopup', 0);

				if (BlzGetTriggerFrameEvent() == FRAMEEVENT_CHECKBOX_CHECKED) {
					SettingsContext.getInstance().getSettings().Promode = 1;
					SettingsContext.getInstance().getSettings().GameType = 0;
					SettingsContext.getInstance().getSettings().Fog = 1;
					SettingsContext.getInstance().getSettings().Diplomacy.option = 1;
					SettingsContext.getInstance().getSettings().Overtime.option = 3;

					BlzFrameSetValue(gameTypeFrame, 0);
					BlzFrameSetEnable(gameTypeFrame, false);
					BlzFrameSetValue(fogFrame, 1);
					BlzFrameSetEnable(fogFrame, false);
					BlzFrameSetValue(diploFrame, 1);
					BlzFrameSetEnable(diploFrame, false);
					BlzFrameSetValue(overtimeFrame, 3);
					BlzFrameSetEnable(overtimeFrame, false);
				} else {
					SettingsContext.getInstance().getSettings().Promode = 0;
					SettingsContext.getInstance().getSettings().GameType = 0;
					SettingsContext.getInstance().getSettings().Fog = 0;
					SettingsContext.getInstance().getSettings().Diplomacy.option = 0;
					SettingsContext.getInstance().getSettings().Overtime.option = 0;
					BlzFrameSetValue(gameTypeFrame, 0);
					BlzFrameSetEnable(gameTypeFrame, true);
					BlzFrameSetValue(fogFrame, 0);
					BlzFrameSetEnable(fogFrame, true);
					BlzFrameSetValue(diploFrame, 0);
					BlzFrameSetEnable(diploFrame, true);
					BlzFrameSetValue(overtimeFrame, 0);
					BlzFrameSetEnable(overtimeFrame, true);
				}

				this.colorizeGameTypeText(BlzFrameGetValue(gameTypeFrame));
				this.colorizeFogText(BlzFrameGetValue(fogFrame));
				this.colorizeDiplomacyText(BlzFrameGetValue(diploFrame));
				this.colorizeOvertimeText(BlzFrameGetValue(overtimeFrame));
				BlzFrameSetText(
					BlzGetFrameByName('PromodeOption', 0),
					`${PromodeOptionsColorFormatted[SettingsContext.getInstance().getSettings().Promode]}`
				);
			})
		);

		BlzFrameSetText(
			BlzGetFrameByName('PromodeOption', 0),
			`${PromodeOptionsColorFormatted[SettingsContext.getInstance().getSettings().Promode]}`
		);
	}

	private hostSetup() {
		BlzFrameSetEnable(BlzGetFrameByName('GameTypePopup', 0), true);

		if (GetLocalPlayer() == Player(0)) {
			BlzFrameSetVisible(BlzGetFrameByName('PopupMenuOptions', 0), false);
		}
	}

	private playerSetup() {
		if (GetLocalPlayer() != Player(0)) {
			BlzFrameSetVisible(BlzGetFrameByName('PopupMenus', 0), false);
			BlzFrameSetVisible(BlzGetFrameByName('StartButton', 0), false);
		}
	}
}
