import { beforeEach, describe, expect, it, vi } from 'vitest';
import './fixtures/wc3-shim';

import { ChatManager } from '../src/app/managers/chat-manager';
import { EVENT_ON_PLAYER_CHAT } from '../src/app/utils/events/event-constants';
import { EventEmitter } from '../src/app/utils/events/event-emitter';

describe('ChatManager', () => {
	let chatCondition: () => boolean;

	beforeEach(() => {
		EventEmitter.resetInstance();
		(ChatManager as unknown as { _instance?: ChatManager })._instance = undefined;

		global.CreateTrigger = vi.fn().mockReturnValue({});
		global.TriggerRegisterPlayerChatEvent = vi.fn();
		global.Condition = vi.fn((condition: () => boolean) => condition);
		global.TriggerAddCondition = vi.fn((_trigger: trigger, condition: () => boolean) => {
			chatCondition = condition;
		});
		global.GetTriggerPlayer = vi.fn().mockReturnValue(Player(0));
		global.GetEventPlayerChatString = vi.fn().mockReturnValue('-unknown extra');

		vi.clearAllMocks();
	});

	it('emits player chat lifecycle events for unknown commands without throwing', () => {
		const handler = vi.fn();
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_CHAT, handler);
		ChatManager.getInstance();

		expect(() => chatCondition()).not.toThrow();
		expect(handler).toHaveBeenCalledWith(Player(0), '-unknown extra');
	});

	it('emits player chat lifecycle events before running registered commands', () => {
		const calls: string[] = [];
		EventEmitter.getInstance().on(EVENT_ON_PLAYER_CHAT, () => calls.push('lifecycle'));

		const chatManager = ChatManager.getInstance();
		chatManager.addCmd(['-known'], () => calls.push('command'));
		global.GetEventPlayerChatString = vi.fn().mockReturnValue('-known extra');

		chatCondition();

		expect(calls).toEqual(['lifecycle', 'command']);
	});
});
