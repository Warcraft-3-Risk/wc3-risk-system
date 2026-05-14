import { describe, it, expect } from 'vitest';
import { ColorStringUtil } from '../src/app/utils/color-string-util';

describe('ColorStringUtil', () => {
	describe('stripColorTags', () => {
		it('should strip valid |c tags and |r tags', () => {
			const result = ColorStringUtil.stripColorTags('|cffff0000Hello|r');
			expect(result).toBe('Hello');
		});

		it('should strip uppercase |C tags and |R tags', () => {
			const result = ColorStringUtil.stripColorTags('|CFFFF0000World|R');
			expect(result).toBe('World');
		});

		it('should strip multiple tags', () => {
			const result = ColorStringUtil.stripColorTags('|cff000000First|r |CFF111111Second|R');
			expect(result).toBe('First Second');
		});

		it('should strip exactly 10 characters when a malformed tag exists but the string is long enough', () => {
			const result = ColorStringUtil.stripColorTags('|cff0000Hello');
			expect(result).toBe('llo');
		});

		it('should correctly strip if the tag is exactly 10 characters at the end', () => {
			const result = ColorStringUtil.stripColorTags('Test|cff000000');
			expect(result).toBe('Test');
		});
	});

	describe('visibleLength', () => {
		it('should calculate the visible length disregarding 10-char colors and 2-char resets', () => {
			const result = ColorStringUtil.visibleLength('|cffff0000Hello|r');
			expect(result).toBe(5); // 'Hello'.length == 5
		});

		it('should calculate the visible length disregarding multiple tags', () => {
			const result = ColorStringUtil.visibleLength('|cff000000a|r|cff000000b|r');
			expect(result).toBe(2); // 'ab'.length == 2
		});

		it('should handle uppercase tags correctly', () => {
			const result = ColorStringUtil.visibleLength('|Cffff0000Hello|R');
			expect(result).toBe(5); // 'Hello'.length == 5
		});

		it('should count correctly if tags are malformed and not standard length (this test reflects current simplified implementation behavior)', () => {
			// Note: visibleLength blindly subtracts 10 for any |c and 2 for any |r, ignoring if it has 10 chars.
			// This verifies the current runtime assumption.
			const result = ColorStringUtil.visibleLength('a|cb');
			expect(result).toBe(-6); // 'a|cb'.length == 4; overhead += 10; actual visibleLength = 4 - 10 = -6
		});
	});
});
