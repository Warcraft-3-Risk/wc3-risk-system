export class TeamOptionsView {
	public static instance: TeamOptionsView;
	private static colors = {
		Red: '|cffff0303',
		Blue: '|cff0042ff',
		Teal: '|cff1be7ba',
		Purple: '|cff550081',
		Yellow: '|cfffefc00',
		Orange: '|cfffe890d',
		Green: '|cff21bf00',
		Pink: '|cffe45caf',
		Gray: '|cff939596',
		'Light Blue': '|cff77bbff',
		'Dark Green': '|cff106247',
		Brown: '|cff4f2b05',
		Maroon: '|cff9c0000',
		Navy: '|cff0000c3',
		Turquoise: '|cff00ebff',
		Violet: '|cffbd00ff',
		Wheat: '|cffecce87',
		Peach: '|cfff7a58b',
		Mint: '|cffccff99',
		Lavender: '|cffdbb8eb',
	};

	private constructor() {}

	public static getInstance(): TeamOptionsView {
		if (!this.instance) {
			this.instance = new TeamOptionsView();
		}

		return this.instance;
	}

	private build(createContext: number) {
		const backdrop = BlzCreateFrame('TeamOptionsBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, createContext);
		BlzFrameSetPoint(backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, 0);

		for (let i = 0; i < 24; i++) {}

		const frame = BlzCreateFrame('ColorButtonTemplate', backdrop, 0, createContext);
		BlzFrameSetPoint(frame, FRAMEPOINT_CENTER, backdrop, FRAMEPOINT_CENTER, 0, 0);
		const texture = BlzGetFrameByName('ColorButtonTexture', 0);
		BlzFrameSetTexture(texture, 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);
		const model = BlzCreateFrameByType('SPRITE', 'SpriteName', frame, '', createContext);
		BlzFrameSetAllPoints(model, texture);
		BlzFrameSetModel(model, 'UI\\Feedback\\Autocast\\UI-ModalButtonOn.mdl', 0);
		BlzFrameSetScale(model, 0.46);
	}
}
