import { SetCommands } from './set-commands';

export class ChatManager {
	private static instance: ChatManager;
	private chatActions: Map<string, Function> = new Map<string, Function>();

	/**
	 * Gets the singleton instance of the ChatManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new ChatManager();
		}
		return this.instance;
	}

	/**
	 * Private constructor to initialize the ChatManager.
	 */
	private constructor() {
		const t: trigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			TriggerRegisterPlayerChatEvent(t, Player(i), '-', false);
		}

		TriggerAddCondition(
			t,
			Condition(() => {
				const cmd: string = GetEventPlayerChatString().split(' ')[0].toLowerCase().trim();

				this.chatActions.get(cmd)();

				return true;
			})
		);

		SetCommands();
	}

	/**
	 * Adds commands linked to a function to the ChatManager.
	 * @param cmds - Acceptable commands that will trigger the given action.
	 * @param action - The action that will be executed when the command is sent.
	 */
	public addCmd(cmds: string[], action: Function) {
		cmds.forEach((cmd) => {
			if (!this.chatActions.has(cmd)) {
				this.chatActions.set(cmd.toLowerCase(), action);
			}
		});
	}

	/**
	 * Removes commands linked to a function from the ChatManager.
	 * @param cmds - The commands to be removed.
	 */
	public removeCmd(cmds: string[]) {
		cmds.forEach((cmd) => {
			this.chatActions.delete(cmd.toLowerCase());
		});
	}
}
