import { File } from 'w3ts';

/**
 * Type that defines the camera settings.
 */
type CamData = {
	distance: number;
	rotation: number;
	angle: number;
};

/**
 * Enum for default and boundary camera settings.
 */
export enum CamSettings {
	MIN_DISTANCE = 1000.0,
	MAX_DISTANCE = 8500.0,
	DEFAULT_DISTANCE = 4000.0,

	MIN_ROTATION = 0.0,
	MAX_ROTATION = 180.0,
	DEFAULT_ROTATION = 90.0,

	MIN_ANGLE = 270.0,
	MAX_ANGLE = 350.0,
	DEFAULT_ANGLE = 290.0,
}

/**
 * Manages camera settings for each player.
 */
export default class CameraManager {
	private static instance: CameraManager;
	private pathFolderName: string = 'risk';
	private fileName: string = 'camera_v2.pld';
	private camData: Map<player, CamData> = new Map<player, CamData>();

	/**
	 * Gets the singleton instance of the CameraManager.
	 * @returns The singleton instance.
	 */
	public static getInstance() {
		if (this.instance == null) {
			this.instance = new CameraManager();
		}
		return this.instance;
	}

	/**
	 * Private constructor to initialize the CameraManager.
	 */
	private constructor() {
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player: player = Player(i);

			let sDist: number;
			let sRot: number;
			let sAngle: number;

			if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_EMPTY && GetPlayerController(player) == MAP_CONTROL_USER) {
				let contents: string;

				if (player == GetLocalPlayer()) {
					contents = File.read(this.getFilePath());
				}

				if (contents) {
					sDist = S2R(contents.split(' ')[0]);
					sRot = S2R(contents.split(' ')[1]);
					sAngle = S2R(contents.split(' ')[2]);
				} else {
					if (player == GetLocalPlayer()) {
						File.write(this.getFilePath(), `${CamSettings.DEFAULT_DISTANCE} ${CamSettings.DEFAULT_ROTATION} ${CamSettings.DEFAULT_ANGLE}`);
					}
				}

				this.camData.set(player, {
					distance: !sDist ? CamSettings.DEFAULT_DISTANCE : sDist,
					rotation: !sRot ? CamSettings.DEFAULT_ROTATION : sRot,
					angle: !sAngle ? CamSettings.DEFAULT_ANGLE : sAngle,
				});
			}
		}

		this.camReset();
	}

	/**
	 * Updates camera settings based on player input.
	 * @param player - The player whose camera settings to update.
	 */
	public update(player: player) {
		let distance: string = GetEventPlayerChatString().split(' ')[1];
		let rotation: string = GetEventPlayerChatString().split(' ')[2];
		let angle: string = GetEventPlayerChatString().split(' ')[3];

		distance = this.isNumber(distance) ? distance : `${CamSettings.DEFAULT_DISTANCE}`;
		rotation = this.isNumber(rotation) ? rotation : `${CamSettings.DEFAULT_ROTATION}`;
		angle = this.isNumber(angle) ? angle : `${CamSettings.DEFAULT_ANGLE}`;

		const data = this.camData.get(player);

		if (data) {
			this.checkCamData(data, [distance, rotation, angle]);

			if (player == GetLocalPlayer()) {
				File.write(this.getFilePath(), `${data.distance} ${data.rotation} ${data.angle}`);
			}
		}
	}

	/**
	 * Resets camera settings at a regular interval.
	 */
	private camReset() {
		const camTimer: timer = CreateTimer();

		TimerStart(camTimer, 1, true, () => {
			for (let i = 0; i < bj_MAX_PLAYERS; i++) {
				if (this.camData.has(Player(i))) this.setCameraFields(Player(i), this.camData.get(Player(i)));
			}
		});
	}

	/**
	 * Checks and updates camera settings.
	 * @param data - The current camera settings.
	 * @param vals - The new camera settings.
	 */
	private checkCamData(data: CamData, vals: string[]) {
		if (vals[0]) this.checkDistance(data, S2R(vals[0]));
		if (vals[1]) this.checkRotation(data, S2R(vals[1]));
		if (vals[2]) this.checkAngle(data, S2R(vals[2]));
	}

	/**
	 * Validates and updates camera distance.
	 * @param data - The current camera settings.
	 * @param val - The new distance value.
	 * @returns The updated distance.
	 */
	private checkDistance(data: CamData, val: number) {
		if (val > CamSettings.MAX_DISTANCE) val = CamSettings.MAX_DISTANCE;
		if (val < CamSettings.MIN_DISTANCE) val = CamSettings.MIN_DISTANCE;

		return (data.distance = val);
	}

	/**
	 * Validates and updates camera angle.
	 * @param data - The current camera settings.
	 * @param val - The new angle value.
	 * @returns The updated angle.
	 */
	private checkAngle(data: CamData, val: number) {
		if (val > CamSettings.MAX_ANGLE) val = CamSettings.MAX_ANGLE;
		if (val < CamSettings.MIN_ANGLE) val = CamSettings.MIN_ANGLE;

		return (data.angle = val);
	}

	/**
	 * Validates and updates camera rotation.
	 * @param data - The current camera settings.
	 * @param val - The new rotation value.
	 * @returns The updated rotation.
	 */
	private checkRotation(data: CamData, val: number) {
		if (val > CamSettings.MAX_ROTATION) val = CamSettings.MAX_ROTATION;
		if (val < CamSettings.MIN_ROTATION) val = CamSettings.MIN_ROTATION;

		return (data.rotation = val);
	}

	/**
	 * Sets the camera fields based on provided settings.
	 * @param p - The player for whom to set the camera fields.
	 * @param data - The camera settings to apply.
	 */
	private setCameraFields(p: player, data: CamData) {
		SetCameraFieldForPlayer(p, CAMERA_FIELD_TARGET_DISTANCE, data.distance, 0.0);
		SetCameraFieldForPlayer(p, CAMERA_FIELD_ANGLE_OF_ATTACK, data.angle, 0.0);
		SetCameraFieldForPlayer(p, CAMERA_FIELD_ROTATION, data.rotation, 0.0);
		SetCameraFieldForPlayer(p, CAMERA_FIELD_FARZ, 10000, 0.0);
	}

	/**
	 * Checks if a string can be converted to a number.
	 * @param str - The string to check.
	 * @returns True if the string can be converted to a number, otherwise false.
	 */
	private isNumber(str: string): boolean {
		if (typeof str !== 'string') return false;
		if (str.trim() === '') return false;

		return !Number.isNaN(Number(str));
	}

	/**
	 * Gets the file path for storing camera settings.
	 * @returns The file path.
	 */
	private getFilePath(): string {
		return `${this.pathFolderName}/${this.fileName}`;
	}
}
