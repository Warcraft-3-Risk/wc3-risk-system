// export class TeamSelectionView {
// 	private backdrop: framehandle;

// 	public constructor() {
// 		this.backdrop = BlzCreateFrame('QuestButtonBaseTemplate', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
// 		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, 0);
// 		BlzFrameSetSize(this.backdrop, 0.17, 0.2);

// 		const editbox = BlzCreateFrame('EscMenuEditBoxTemplate', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
// 		BlzFrameSetPoint(editbox, FRAMEPOINT_TOP, this.backdrop, FRAMEPOINT_TOP, 0, -0.01);
// 		BlzFrameSetSize(editbox, 0.12, 0.027);
// 		BlzFrameSetText(editbox, 'Some Random Name');

// 		const button = BlzCreateFrameByType(
// 			'GLUETEXTBUTTON',
// 			'TeamSlotButton',
// 			BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
// 			'ScriptDialogButton',
// 			0
// 		);
// 		BlzFrameSetText(button, 'Join Team');
// 		BlzFrameSetPoint(button, FRAMEPOINT_BOTTOM, this.backdrop, FRAMEPOINT_BOTTOM, 0, 0.01);
// 		BlzFrameSetSize(button, 0.08, 0.025);

// 		const teamLabel = BlzCreateFrameByType('TEXT', 'TeamLabel', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), '', 0);
// 		BlzFrameSetPoint(teamLabel, FRAMEPOINT_TOP, editbox, FRAMEPOINT_BOTTOM, 0, 0);
// 		BlzFrameSetText(teamLabel, `Some Random Name 0/6`);
// 		BlzFrameSetScale(teamLabel, 1.2);

// 		const slot = BlzCreateFrameByType('TEXT', 'TeamSlot', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), '', 0);
// 		BlzFrameSetPoint(slot, FRAMEPOINT_TOP, teamLabel, FRAMEPOINT_BOTTOM, 0, -0.01);
// 		BlzFrameSetText(slot, `ForLolz#6969`);
// 		BlzFrameSetScale(slot, 1.1);
// 	}
// }
