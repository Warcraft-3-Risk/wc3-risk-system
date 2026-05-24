import { describe, expect, it } from 'vitest';
import { getChatInputSearchStartIndex } from '../src/app/managers/chat-ui-manager';

describe('getChatInputSearchStartIndex', () => {
	it('returns an integer when the Game UI child count is odd', () => {
		expect(getChatInputSearchStartIndex(25)).toBe(12);
	});

	it('keeps the previous halfway start for even child counts', () => {
		expect(getChatInputSearchStartIndex(24)).toBe(12);
	});
});
