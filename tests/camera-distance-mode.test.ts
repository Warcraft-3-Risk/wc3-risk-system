import { describe, expect, it } from 'vitest';
import {
	DefaultCameraDistanceDirection,
	DefaultCameraDistanceMode,
	getCameraDistanceForMode,
	getCameraDistanceModeText,
	getNextCameraDistanceStep,
	normalizeCameraDistanceDirection,
	normalizeCameraDistanceMode,
} from '../src/app/ui/camera-distance-mode';

describe('camera distance mode', () => {
	it('defaults to medium mode with upward direction', () => {
		expect(DefaultCameraDistanceMode).toBe('medium');
		expect(DefaultCameraDistanceDirection).toBe(1);
		expect(normalizeCameraDistanceMode(undefined)).toBe('medium');
		expect(normalizeCameraDistanceDirection(undefined)).toBe(1);
	});

	it('normalizes persisted values', () => {
		expect(normalizeCameraDistanceMode('close')).toBe('close');
		expect(normalizeCameraDistanceMode('medium')).toBe('medium');
		expect(normalizeCameraDistanceMode('far')).toBe('far');
		expect(normalizeCameraDistanceMode('legacy')).toBe('medium');
		expect(normalizeCameraDistanceDirection('-1')).toBe(-1);
		expect(normalizeCameraDistanceDirection('1')).toBe(1);
	});

	it('maps mode labels and camera distances', () => {
		expect(getCameraDistanceModeText('close')).toBe('Close');
		expect(getCameraDistanceModeText('medium')).toBe('Medium');
		expect(getCameraDistanceModeText('far')).toBe('Far');
		expect(getCameraDistanceForMode('close')).toBe(3000);
		expect(getCameraDistanceForMode('medium')).toBe(4000);
		expect(getCameraDistanceForMode('far')).toBe(5000);
	});

	it('cycles in ping-pong order to avoid far-to-close jumps', () => {
		let mode: 'close' | 'medium' | 'far' = 'close';
		let direction: -1 | 1 = 1;
		const sequence: string[] = [mode];

		for (let i = 0; i < 6; i++) {
			const next = getNextCameraDistanceStep(mode, direction);
			mode = next.mode;
			direction = next.direction;
			sequence.push(mode);
		}

		expect(sequence).toEqual(['close', 'medium', 'far', 'medium', 'close', 'medium', 'far']);
	});
});
