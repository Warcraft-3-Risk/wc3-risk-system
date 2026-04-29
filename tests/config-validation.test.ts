import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig, logger } from '../scripts/utils';

// Suppress winston logger output during validation error tests
let logSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	logSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
});
afterEach(() => {
	logSpy.mockRestore();
});

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
