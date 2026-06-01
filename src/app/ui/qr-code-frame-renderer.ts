import { generateQrCode, QrErrorCorrectionLevel, QrCode } from '../qr/qr-code';
import { WC3_RISK_DISCORD_QR_CODE, WC3_RISK_DISCORD_URL } from '../qr/wc3-risk-discord-qr';

export { WC3_RISK_DISCORD_URL };

export interface QrCodeFrameRendererOptions {
	parent?: framehandle;
	createContext?: number;
	errorCorrectionLevel?: QrErrorCorrectionLevel;
	moduleSize?: number;
	quietZoneModules?: number;
	centerX?: number;
	centerY?: number;
	level?: number;
	darkTexture?: string;
	lightTexture?: string;
}

const DEFAULT_MODULE_SIZE = 0.0038;
const DEFAULT_QUIET_ZONE_MODULES = 4;
const DEFAULT_CENTER_X = 0.4;
const DEFAULT_CENTER_Y = 0.33;
const DEFAULT_FRAME_LEVEL = 30;
const DEFAULT_DARK_TEXTURE = 'ReplaceableTextures\\TeamColor\\TeamColor24.blp';
const DEFAULT_LIGHT_TEXTURE = 'ReplaceableTextures\\TeamColor\\TeamColor99.blp';

export interface QrCodeDarkRun {
	x: number;
	y: number;
	length: number;
}

export class QrCodeFrameRenderer {
	private readonly qrCode: QrCode;
	private readonly options: QrCodeFrameRendererOptions;
	private background: framehandle | undefined;
	private readonly darkRunFrames: framehandle[] = [];
	private visible = false;

	public constructor(textOrQrCode: string | QrCode, options: QrCodeFrameRendererOptions = {}) {
		this.options = options;
		this.qrCode =
			typeof textOrQrCode === 'string'
				? generateQrCode(textOrQrCode, { errorCorrectionLevel: options.errorCorrectionLevel ?? 'M' })
				: textOrQrCode;
	}

	public static createDiscordInvite(options: QrCodeFrameRendererOptions = {}): QrCodeFrameRenderer {
		return new QrCodeFrameRenderer(WC3_RISK_DISCORD_QR_CODE, options);
	}

	public show(): void {
		this.ensureCreated();
		this.setVisible(true);
	}

	public hide(): void {
		this.setVisible(false);
	}

	public toggle(): boolean {
		if (this.visible) {
			this.hide();
		} else {
			this.show();
		}

		return this.visible;
	}

	public isVisible(): boolean {
		return this.visible;
	}

	public getQrCode(): QrCode {
		return this.qrCode;
	}

	public getFrameCount(): number {
		return this.darkRunFrames.length + (this.background ? 1 : 0);
	}

	private ensureCreated(): void {
		if (this.background) {
			return;
		}

		const parent = this.options.parent ?? BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const createContext = this.options.createContext ?? 0;
		const moduleSize = this.options.moduleSize ?? DEFAULT_MODULE_SIZE;
		const quietZoneModules = this.options.quietZoneModules ?? DEFAULT_QUIET_ZONE_MODULES;
		const level = this.options.level ?? DEFAULT_FRAME_LEVEL;
		const totalModules = this.qrCode.size + quietZoneModules * 2;
		const totalSize = totalModules * moduleSize;
		const centerX = this.options.centerX ?? DEFAULT_CENTER_X;
		const centerY = this.options.centerY ?? DEFAULT_CENTER_Y;
		const leftX = centerX - totalSize / 2;
		const topY = centerY + totalSize / 2;

		this.background = BlzCreateFrameByType('BACKDROP', 'RiskQrCodeBackground', parent, '', createContext);
		BlzFrameSetSize(this.background, totalSize, totalSize);
		BlzFrameSetAbsPoint(this.background, FRAMEPOINT_CENTER, centerX, centerY);
		BlzFrameSetTexture(this.background, this.options.lightTexture ?? DEFAULT_LIGHT_TEXTURE, 0, true);
		BlzFrameSetLevel(this.background, level);
		BlzFrameSetEnable(this.background, false);

		const runs = getQrCodeDarkRuns(this.qrCode.modules);
		for (const run of runs) {
			const runFrame = BlzCreateFrameByType('BACKDROP', 'RiskQrCodeRun', parent, '', createContext);
			BlzFrameSetSize(runFrame, run.length * moduleSize, moduleSize);
			BlzFrameSetAbsPoint(
				runFrame,
				FRAMEPOINT_TOPLEFT,
				leftX + (quietZoneModules + run.x) * moduleSize,
				topY - (quietZoneModules + run.y) * moduleSize
			);
			BlzFrameSetTexture(runFrame, this.options.darkTexture ?? DEFAULT_DARK_TEXTURE, 0, true);
			BlzFrameSetLevel(runFrame, level + 1);
			BlzFrameSetEnable(runFrame, false);
			this.darkRunFrames.push(runFrame);
		}

		this.setVisible(false);
	}

	private setVisible(visible: boolean): void {
		this.visible = visible;

		if (!this.background) {
			return;
		}

		BlzFrameSetVisible(this.background, visible);
		for (const frame of this.darkRunFrames) {
			BlzFrameSetVisible(frame, visible);
		}
	}
}

export function getQrCodeDarkRuns(modules: boolean[][]): QrCodeDarkRun[] {
	const runs: QrCodeDarkRun[] = [];

	for (let y = 0; y < modules.length; y++) {
		const row = modules[y];
		let x = 0;
		while (x < row.length) {
			while (x < row.length && !row[x]) {
				x++;
			}

			const startX = x;
			while (x < row.length && row[x]) {
				x++;
			}

			if (x > startX) {
				runs.push({ x: startX, y, length: x - startX });
			}
		}
	}

	return runs;
}
