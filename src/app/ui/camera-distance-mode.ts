export const CameraDistanceModes = ['close', 'medium', 'far'] as const;
export type CameraDistanceMode = (typeof CameraDistanceModes)[number];
export type CameraDistanceDirection = -1 | 1;

export const DefaultCameraDistanceMode: CameraDistanceMode = 'medium';
export const DefaultCameraDistanceDirection: CameraDistanceDirection = 1;

const modeIndex: Record<CameraDistanceMode, number> = {
	close: 0,
	medium: 1,
	far: 2,
};

export function normalizeCameraDistanceMode(value?: string): CameraDistanceMode {
	if (value === 'close' || value === 'medium' || value === 'far') {
		return value;
	}

	return DefaultCameraDistanceMode;
}

export function normalizeCameraDistanceDirection(value?: string): CameraDistanceDirection {
	return value === '-1' ? -1 : 1;
}

export function getCameraDistanceModeText(mode: CameraDistanceMode): string {
	switch (mode) {
		case 'close':
			return 'Close';
		case 'medium':
			return 'Medium';
		case 'far':
			return 'Far';
	}
}

export function getCameraDistanceForMode(mode: CameraDistanceMode): number {
	switch (mode) {
		case 'close':
			return 3000;
		case 'medium':
			return 4000;
		case 'far':
			return 5000;
	}
}

export function getNextCameraDistanceStep(
	mode: CameraDistanceMode,
	direction: CameraDistanceDirection
): { mode: CameraDistanceMode; direction: CameraDistanceDirection } {
	let nextDirection = direction;
	const index = modeIndex[mode];

	if (index === 0 && nextDirection === -1) {
		nextDirection = 1;
	} else if (index === CameraDistanceModes.length - 1 && nextDirection === 1) {
		nextDirection = -1;
	}

	const nextIndex = index + nextDirection;
	return {
		mode: CameraDistanceModes[nextIndex],
		direction: nextDirection,
	};
}
