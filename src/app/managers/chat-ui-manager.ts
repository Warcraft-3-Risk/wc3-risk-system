export class ChatUIManager {
	private static instance: ChatUIManager;

	private chatInput: framehandle = undefined;
	private chatInputBox: framehandle = undefined;

	private constructor() {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

		this.chatInput = this.findChatInput(gameUI);
		if (this.chatInput) {
			this.chatInputBox = BlzCreateFrame('TasToolTipBox', this.chatInput, 0, 0);
			BlzFrameSetLevel(this.chatInputBox, -2);
			BlzFrameSetAllPoints(this.chatInputBox, this.chatInput);
		}
	}

	static getInstance(): ChatUIManager {
		if (this.instance === undefined) {
			this.instance = new ChatUIManager();
		}
		return this.instance;
	}

	// Finds the Chat Input frame by structural fingerprint:
	// Somewhere in the last half of children of gameUI
	//
	//   frame      → 2 children
	//     [1]      → 4 children
	//       [1][0] → 5 children
	private findChatInput(gameUI: framehandle): framehandle {
		const count = BlzFrameGetChildrenCount(gameUI);
		for (let i = count / 2; i < count; i++) {
			const frame = BlzFrameGetChild(gameUI, i);
			if (BlzFrameGetChildrenCount(frame) !== 2) continue;

			const child1 = BlzFrameGetChild(frame, 1);
			if (BlzFrameGetChildrenCount(child1) !== 4) continue;

			const child1_0 = BlzFrameGetChild(child1, 0);
			if (BlzFrameGetChildrenCount(child1_0) !== 5) continue;

			return frame;
		}
		return undefined;
	}
}
