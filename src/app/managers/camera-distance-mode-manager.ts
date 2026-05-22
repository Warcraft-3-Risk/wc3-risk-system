import { File } from 'w3ts';
import CameraManager from './camera-manager';
import {
	CameraDistanceDirection,
	CameraDistanceMode,
	DefaultCameraDistanceDirection,
	DefaultCameraDistanceMode,
	getCameraDistanceForMode,
	getNextCameraDistanceStep,
	normalizeCameraDistanceDirection,
	normalizeCameraDistanceMode,
} from '../ui/camera-distance-mode';

export class CameraDistanceModeManager {
	private static instance: CameraDistanceModeManager;

	private readonly modeFile = 'risk/camDistanceMode.pld';
	private readonly directionFile = 'risk/camDistanceModeDir.pld';

	private mode: CameraDistanceMode = DefaultCameraDistanceMode;
	private direction: CameraDistanceDirection = DefaultCameraDistanceDirection;

	public static getInstance(): CameraDistanceModeManager {
		if (!this.instance) {
			this.instance = new CameraDistanceModeManager();
		}
		return this.instance;
	}

	private constructor() {
		this.loadLocalState();
		this.applyModeDistance();
	}

	public getMode(): CameraDistanceMode {
		return this.mode;
	}

	public cycleMode(): CameraDistanceMode {
		const next = getNextCameraDistanceStep(this.mode, this.direction);
		this.mode = next.mode;
		this.direction = next.direction;
		this.persistLocalState();
		this.applyModeDistance();
		return this.mode;
	}

	private loadLocalState(): void {
		const localPlayer = GetLocalPlayer();
		if (GetPlayerController(localPlayer) !== MAP_CONTROL_USER) {
			return;
		}

		this.mode = normalizeCameraDistanceMode(File.read(this.modeFile));
		this.direction = normalizeCameraDistanceDirection(File.read(this.directionFile));
	}

	private persistLocalState(): void {
		const localPlayer = GetLocalPlayer();
		if (GetPlayerController(localPlayer) !== MAP_CONTROL_USER) {
			return;
		}

		File.write(this.modeFile, this.mode);
		File.write(this.directionFile, `${this.direction}`);
	}

	private applyModeDistance(): void {
		const localPlayer = GetLocalPlayer();
		const distance = getCameraDistanceForMode(this.mode);
		CameraManager.getInstance().setDistance(localPlayer, distance, true);
	}
}
