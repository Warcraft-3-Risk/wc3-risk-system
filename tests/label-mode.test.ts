import { describe, expect, it } from 'vitest';
import { DefaultLabelMode, getLabelModeText, getNextLabelMode, normalizeLabelMode, type LabelMode } from '../src/app/player/options';

describe('label mode options', () => {
	it('defaults to plain city names with country labels', () => {
		expect(DefaultLabelMode).toBe('cityName');
	});

	it('cycles through the F8 label modes in order', () => {
		const visited: LabelMode[] = [];
		let mode: LabelMode = DefaultLabelMode;

		for (let i = 0; i < 5; i++) {
			visited.push(mode);
			mode = getNextLabelMode(mode);
		}

		expect(visited).toEqual(['cityName', 'cityQuality', 'all', 'country', 'none']);
		expect(mode).toBe(DefaultLabelMode);
	});

	it('keeps saved preferences backward compatible', () => {
		expect(normalizeLabelMode('cityName')).toBe('cityName');
		expect(normalizeLabelMode('cityQuality')).toBe('cityQuality');
		expect(normalizeLabelMode('all')).toBe('all');
		expect(normalizeLabelMode('country')).toBe('country');
		expect(normalizeLabelMode('none')).toBe('none');
		expect(normalizeLabelMode('false')).toBe('none');
		expect(normalizeLabelMode('true')).toBe(DefaultLabelMode);
		expect(normalizeLabelMode(undefined)).toBe(DefaultLabelMode);
	});

	it('describes each mode for the F8 tooltip', () => {
		expect(getLabelModeText('cityName')).toBe('Country and City Names');
		expect(getLabelModeText('cityQuality')).toBe('Country and City Quality');
		expect(getLabelModeText('all')).toBe('Country and City Position/Quality');
		expect(getLabelModeText('country')).toBe('Country Only');
		expect(getLabelModeText('none')).toBe('Hidden');
	});
});
