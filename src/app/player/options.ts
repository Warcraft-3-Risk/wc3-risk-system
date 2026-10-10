/** Who can see where other players are looking. */
export const CAMERA_POSITION_MODE = {
	DISABLED: 0,
	MINIMAP_ONLY: 1,
	WORLD_AND_MINIMAP: 2,
} as const;

export type CameraPositionMode = (typeof CAMERA_POSITION_MODE)[keyof typeof CAMERA_POSITION_MODE];

export const CAMERA_POSITION_MODE_LABELS: Record<CameraPositionMode, string> = {
	[CAMERA_POSITION_MODE.DISABLED]: 'Disabled',
	[CAMERA_POSITION_MODE.MINIMAP_ONLY]: 'Minimap only',
	[CAMERA_POSITION_MODE.WORLD_AND_MINIMAP]: 'In-game and minimap',
};

/** Cycles Disabled -> Minimap only -> In-game and minimap -> Disabled. */
export function nextCameraPositionMode(mode: CameraPositionMode): CameraPositionMode {
	if (mode === CAMERA_POSITION_MODE.DISABLED) return CAMERA_POSITION_MODE.MINIMAP_ONLY;
	if (mode === CAMERA_POSITION_MODE.MINIMAP_ONLY) return CAMERA_POSITION_MODE.WORLD_AND_MINIMAP;

	return CAMERA_POSITION_MODE.DISABLED;
}

export type Options = {
	health: boolean;
	value: boolean;
	ping: boolean;
	board: number;
	labels: boolean;
	cameraPositionMode: CameraPositionMode;
	// Note: showRating preference is now stored in the rating file itself
	// via RatingManager.getShowRatingPreference() / setShowRatingPreference()
};
