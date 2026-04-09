import { describe, it, expect } from 'vitest';
import { validateConfig } from '../scripts/utils';

// validateConfig throws on invalid configs and returns void on valid ones.
// We suppress the winston logger output in tests by checking behavior only.

describe('validateConfig', () => {
	const validConfig = {
		mapFolder: 'risk_europe.w3x',
		mapType: 'europe',
		mapName: 'Risk Europe',
		mapVersion: '1.0',
		mapNameStringId: 7531,
		minifyScript: false,
		launchArgs: ['-launch', '-windowmode', 'windowed'],
	};

	it('should accept a fully valid config without throwing', () => {
		expect(() => validateConfig(validConfig, 'test.json')).not.toThrow();
	});

	it('should throw when a required field is missing', () => {
		const config = { ...validConfig };
		delete (config as Record<string, unknown>).mapFolder;
		expect(() => validateConfig(config, 'test.json')).toThrow('Config validation failed');
	});

	it('should throw when a field has the wrong type', () => {
		const config = { ...validConfig, minifyScript: 'yes' };
		expect(() => validateConfig(config as Record<string, unknown>, 'test.json')).toThrow('Config validation failed');
	});

	it('should throw when launchArgs is not an array', () => {
		const config = { ...validConfig, launchArgs: 'not-an-array' };
		expect(() => validateConfig(config as Record<string, unknown>, 'test.json')).toThrow('Config validation failed');
	});

	it('should throw when multiple fields are missing', () => {
		const config = { mapFolder: 'test.w3x' };
		expect(() => validateConfig(config, 'test.json')).toThrow('Config validation failed');
	});

	it('should accept config with extra fields', () => {
		const config = { ...validConfig, extraField: 'bonus' };
		expect(() => validateConfig(config, 'test.json')).not.toThrow();
	});

	it('should throw when mapNameStringId is a string instead of number', () => {
		const config = { ...validConfig, mapNameStringId: '7531' };
		expect(() => validateConfig(config as Record<string, unknown>, 'test.json')).toThrow('Config validation failed');
	});
});
