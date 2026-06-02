import { describe, expect, it } from 'vitest';
import { generateQrCode, renderQrCodeAsText, QrCode, createQrCodeFromRows } from '../src/app/qr/qr-code';
import { WC3_RISK_DISCORD_QR_ROWS, WC3_RISK_DISCORD_URL } from '../src/app/qr/wc3-risk-discord-qr';
import { getQrCodeDarkRuns } from '../src/app/ui/qr-code-frame-renderer';

describe('QR code generator', () => {
	it('encodes the WC3 Risk Discord invite as a version 2 medium-error QR matrix', () => {
		const qrCode = generateQrCode(WC3_RISK_DISCORD_URL);

		expect(qrCode.version).toBe(2);
		expect(qrCode.size).toBe(25);
		expect(qrCode.errorCorrectionLevel).toBe('M');
		expect(qrCode.mask).toBeGreaterThanOrEqual(0);
		expect(qrCode.mask).toBeLessThanOrEqual(7);
		expect(qrCode.modules).toHaveLength(qrCode.size);
		expect(qrCode.modules.every((row) => row.length === qrCode.size)).toBe(true);
		expect(qrCode.darkModuleCount).toBeGreaterThan(250);
		expect(qrCode.darkModuleCount).toBeLessThan(500);
	});

	it('keeps the checked-in Discord QR rows in sync with the encoder', () => {
		const qrCode = generateQrCode(WC3_RISK_DISCORD_URL);
		const rows = qrCode.modules.map((row) => row.map((module) => (module ? '#' : '.')).join(''));

		expect(rows).toEqual(WC3_RISK_DISCORD_QR_ROWS);
	});

	it('builds a QR code from checked-in rows', () => {
		const qrCode = createQrCodeFromRows(WC3_RISK_DISCORD_URL, WC3_RISK_DISCORD_QR_ROWS, 2, 'M', 2);

		expect(qrCode.size).toBe(25);
		expect(qrCode.darkModuleCount).toBe(342);
	});

	it('groups dark modules into fewer horizontal run frames for WC3 rendering', () => {
		const qrCode = generateQrCode(WC3_RISK_DISCORD_URL);
		const runs = getQrCodeDarkRuns(qrCode.modules);

		expect(runs).toHaveLength(169);
		expect(runs[0]).toEqual({ x: 0, y: 0, length: 7 });
		expect(runs.length).toBeLessThan(qrCode.darkModuleCount);
	});

	it('draws required finder and alignment patterns', () => {
		const qrCode = generateQrCode(WC3_RISK_DISCORD_URL);

		expectFinderPattern(qrCode, 3, 3);
		expectFinderPattern(qrCode, qrCode.size - 4, 3);
		expectFinderPattern(qrCode, 3, qrCode.size - 4);
		expectAlignmentPattern(qrCode, qrCode.size - 7, qrCode.size - 7);
	});

	it('renders a stable text representation for debugging', () => {
		const qrCode = generateQrCode('wc3 risk');
		const rendered = renderQrCodeAsText(qrCode, '1', '0');

		expect(rendered.split('\n')).toHaveLength(qrCode.size);
		expect(rendered).toContain('1111111');
	});

	it('rejects text that cannot fit supported small QR versions', () => {
		expect(() => generateQrCode('x'.repeat(100))).toThrow(/too long/);
	});

	it('rejects multi-byte characters because the game renderer is byte-mode only', () => {
		expect(() => generateQrCode('wc3 risk snowman ☃')).toThrow(/single-byte/);
	});
});

function expectFinderPattern(qrCode: QrCode, centerX: number, centerY: number): void {
	for (let dy = -3; dy <= 3; dy++) {
		for (let dx = -3; dx <= 3; dx++) {
			const distance = Math.max(Math.abs(dx), Math.abs(dy));
			const expected = distance !== 2;
			expect(qrCode.modules[centerY + dy][centerX + dx]).toBe(expected);
		}
	}
}

function expectAlignmentPattern(qrCode: QrCode, centerX: number, centerY: number): void {
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const distance = Math.max(Math.abs(dx), Math.abs(dy));
			const expected = distance !== 1;
			expect(qrCode.modules[centerY + dy][centerX + dx]).toBe(expected);
		}
	}
}
