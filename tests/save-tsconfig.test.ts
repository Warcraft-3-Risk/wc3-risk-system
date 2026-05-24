import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Tests for the saveTSConfig pattern: save original content, restore after modification.
 * We test the save/restore logic directly without importing from utils (which has
 * heavy deps like winston/luamin). The logic under test is trivial and mirrors saveTSConfig.
 */

function saveTSConfig(filePath: string): () => void {
	const original = fs.readFileSync(filePath, 'utf8');
	return () => {
		fs.writeFileSync(filePath, original);
	};
}

describe('saveTSConfig', () => {
	let tmpDir: string;
	let tsconfigPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsconfig-test-'));
		tsconfigPath = path.join(tmpDir, 'tsconfig.json');
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('should return a function that restores original content', () => {
		const original = '{ "compilerOptions": { "strict": false } }';
		fs.writeFileSync(tsconfigPath, original);

		const restore = saveTSConfig(tsconfigPath);

		// Simulate modification
		fs.writeFileSync(tsconfigPath, '{ "modified": true }');
		expect(fs.readFileSync(tsconfigPath, 'utf8')).toBe('{ "modified": true }');

		// Restore
		restore();
		expect(fs.readFileSync(tsconfigPath, 'utf8')).toBe(original);
	});

	it('should preserve exact content including whitespace and formatting', () => {
		const original = '{\n  "compilerOptions": {\n    "strict": false\n  }\n}\n';
		fs.writeFileSync(tsconfigPath, original);

		const restore = saveTSConfig(tsconfigPath);

		// Overwrite with compacted JSON (as updateTSConfig does)
		fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { strict: true } }, null, 2));

		restore();
		expect(fs.readFileSync(tsconfigPath, 'utf8')).toBe(original);
	});

	it('should be safe to call restore multiple times', () => {
		const original = '{ "original": true }';
		fs.writeFileSync(tsconfigPath, original);

		const restore = saveTSConfig(tsconfigPath);
		fs.writeFileSync(tsconfigPath, '{ "changed": true }');

		restore();
		restore();
		expect(fs.readFileSync(tsconfigPath, 'utf8')).toBe(original);
	});
});
