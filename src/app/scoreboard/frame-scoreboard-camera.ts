export interface FrameScoreboardCameraPosition {
	x: number;
	y: number;
}

export type FrameScoreboardCameraPositionProvider = (player: player) => FrameScoreboardCameraPosition | undefined;

let cameraPositionProvider: FrameScoreboardCameraPositionProvider | undefined;

export function setFrameScoreboardCameraPositionProvider(provider: FrameScoreboardCameraPositionProvider): void {
	cameraPositionProvider = provider;
}

export function getFrameScoreboardCameraPosition(player: player): FrameScoreboardCameraPosition | undefined {
	return cameraPositionProvider?.(player);
}
