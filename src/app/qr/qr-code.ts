export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface GenerateQrCodeOptions {
	errorCorrectionLevel?: QrErrorCorrectionLevel;
	minVersion?: number;
	maxVersion?: number;
}

export interface QrCode {
	text: string;
	version: number;
	size: number;
	errorCorrectionLevel: QrErrorCorrectionLevel;
	mask: number;
	modules: boolean[][];
	darkModuleCount: number;
}

interface QrBlockInfo {
	dataCodewords: number;
	eccCodewordsPerBlock: number;
	blockCount: number;
}

interface QrVersionInfo {
	version: number;
	blocks: Record<QrErrorCorrectionLevel, QrBlockInfo>;
}

const QR_VERSION_TABLE: QrVersionInfo[] = [
	{
		version: 1,
		blocks: {
			L: { dataCodewords: 19, eccCodewordsPerBlock: 7, blockCount: 1 },
			M: { dataCodewords: 16, eccCodewordsPerBlock: 10, blockCount: 1 },
			Q: { dataCodewords: 13, eccCodewordsPerBlock: 13, blockCount: 1 },
			H: { dataCodewords: 9, eccCodewordsPerBlock: 17, blockCount: 1 },
		},
	},
	{
		version: 2,
		blocks: {
			L: { dataCodewords: 34, eccCodewordsPerBlock: 10, blockCount: 1 },
			M: { dataCodewords: 28, eccCodewordsPerBlock: 16, blockCount: 1 },
			Q: { dataCodewords: 22, eccCodewordsPerBlock: 22, blockCount: 1 },
			H: { dataCodewords: 16, eccCodewordsPerBlock: 28, blockCount: 1 },
		},
	},
	{
		version: 3,
		blocks: {
			L: { dataCodewords: 55, eccCodewordsPerBlock: 15, blockCount: 1 },
			M: { dataCodewords: 44, eccCodewordsPerBlock: 26, blockCount: 1 },
			Q: { dataCodewords: 34, eccCodewordsPerBlock: 18, blockCount: 2 },
			H: { dataCodewords: 26, eccCodewordsPerBlock: 22, blockCount: 2 },
		},
	},
	{
		version: 4,
		blocks: {
			L: { dataCodewords: 80, eccCodewordsPerBlock: 20, blockCount: 1 },
			M: { dataCodewords: 64, eccCodewordsPerBlock: 18, blockCount: 2 },
			Q: { dataCodewords: 48, eccCodewordsPerBlock: 26, blockCount: 2 },
			H: { dataCodewords: 36, eccCodewordsPerBlock: 16, blockCount: 4 },
		},
	},
];

const FORMAT_BITS_BY_ERROR_CORRECTION_LEVEL: Record<QrErrorCorrectionLevel, number> = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2,
};

const BYTE_MODE_INDICATOR = 0x4;
const PAD_CODEWORDS = [0xec, 0x11];
const MAX_SUPPORTED_VERSION = 4;

class BitBuffer {
	private readonly bits: boolean[] = [];

	public append(value: number, length: number): void {
		if (length < 0 || length > 31 || value >>> length !== 0) {
			throw new Error('Invalid QR bit segment.');
		}

		for (let i = length - 1; i >= 0; i--) {
			this.bits.push(((value >>> i) & 1) !== 0);
		}
	}

	public getLength(): number {
		return this.bits.length;
	}

	public toCodewords(): number[] {
		const codewords: number[] = [];
		for (let i = 0; i < this.bits.length; i += 8) {
			let codeword = 0;
			for (let j = 0; j < 8; j++) {
				codeword <<= 1;
				if (this.bits[i + j]) {
					codeword |= 1;
				}
			}
			codewords.push(codeword);
		}
		return codewords;
	}
}

export function generateQrCode(text: string, options: GenerateQrCodeOptions = {}): QrCode {
	const errorCorrectionLevel = options.errorCorrectionLevel ?? 'M';
	const minVersion = options.minVersion ?? 1;
	const maxVersion = options.maxVersion ?? MAX_SUPPORTED_VERSION;
	const bytes = encodeTextAsBytes(text);
	const versionInfo = chooseVersion(bytes.length, errorCorrectionLevel, minVersion, maxVersion);
	const blockInfo = versionInfo.blocks[errorCorrectionLevel];
	const dataCodewords = createDataCodewords(bytes, versionInfo.version, blockInfo.dataCodewords);
	const finalCodewords = addErrorCorrectionAndInterleave(dataCodewords, blockInfo);
	const matrix = createBestMatrix(versionInfo.version, errorCorrectionLevel, finalCodewords);

	return {
		text,
		version: versionInfo.version,
		size: matrix.modules.length,
		errorCorrectionLevel,
		mask: matrix.mask,
		modules: matrix.modules,
		darkModuleCount: countDarkModules(matrix.modules),
	};
}

export function renderQrCodeAsText(qrCode: QrCode, dark: string = '##', light: string = '  '): string {
	const rows: string[] = [];
	for (let y = 0; y < qrCode.size; y++) {
		let row = '';
		for (let x = 0; x < qrCode.size; x++) {
			row += qrCode.modules[y][x] ? dark : light;
		}
		rows.push(row);
	}
	return rows.join('\n');
}

export function createQrCodeFromRows(
	text: string,
	rows: string[],
	version: number,
	errorCorrectionLevel: QrErrorCorrectionLevel,
	mask: number
): QrCode {
	if (rows.length === 0) {
		throw new Error('QR rows cannot be empty.');
	}

	const size = rows.length;
	const expectedSize = getQrSize(version);
	if (size !== expectedSize) {
		throw new Error(`QR version ${version} expects ${expectedSize} rows, got ${size}.`);
	}

	const modules: boolean[][] = [];
	for (let y = 0; y < rows.length; y++) {
		const row = rows[y];
		if (row.length !== size) {
			throw new Error(`QR row ${y} has width ${row.length}, expected ${size}.`);
		}

		const moduleRow: boolean[] = [];
		for (let x = 0; x < row.length; x++) {
			const value = row.charAt(x);
			if (value === '#') {
				moduleRow.push(true);
			} else if (value === '.') {
				moduleRow.push(false);
			} else {
				throw new Error('QR rows may only contain # and . characters.');
			}
		}
		modules.push(moduleRow);
	}

	return {
		text,
		version,
		size,
		errorCorrectionLevel,
		mask,
		modules,
		darkModuleCount: countDarkModules(modules),
	};
}

function encodeTextAsBytes(text: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code > 0xff) {
			throw new Error('QR byte mode supports only single-byte text. Use ASCII URLs or pre-encoded byte text.');
		}
		bytes.push(code);
	}
	return bytes;
}

function chooseVersion(
	byteLength: number,
	errorCorrectionLevel: QrErrorCorrectionLevel,
	minVersion: number,
	maxVersion: number
): QrVersionInfo {
	if (minVersion < 1 || maxVersion > MAX_SUPPORTED_VERSION || minVersion > maxVersion) {
		throw new Error(`QR versions ${minVersion}-${maxVersion} are not supported. Supported range is 1-${MAX_SUPPORTED_VERSION}.`);
	}

	for (const versionInfo of QR_VERSION_TABLE) {
		if (versionInfo.version < minVersion || versionInfo.version > maxVersion) {
			continue;
		}

		const blockInfo = versionInfo.blocks[errorCorrectionLevel];
		const capacityBits = blockInfo.dataCodewords * 8;
		const requiredBits = getByteModeBitLength(byteLength, versionInfo.version);
		if (requiredBits <= capacityBits) {
			return versionInfo;
		}
	}

	throw new Error(`Text is too long for QR versions ${minVersion}-${maxVersion} at ${errorCorrectionLevel} error correction.`);
}

function getByteModeBitLength(byteLength: number, version: number): number {
	const characterCountBits = version <= 9 ? 8 : 16;
	return 4 + characterCountBits + byteLength * 8;
}

function createDataCodewords(bytes: number[], version: number, dataCodewordCount: number): number[] {
	const buffer = new BitBuffer();
	buffer.append(BYTE_MODE_INDICATOR, 4);
	buffer.append(bytes.length, version <= 9 ? 8 : 16);

	for (const byte of bytes) {
		buffer.append(byte, 8);
	}

	const capacityBits = dataCodewordCount * 8;
	const remainingBits = capacityBits - buffer.getLength();
	buffer.append(0, Math.min(4, remainingBits));

	while (buffer.getLength() % 8 !== 0) {
		buffer.append(0, 1);
	}

	const dataCodewords = buffer.toCodewords();
	let padIndex = 0;
	while (dataCodewords.length < dataCodewordCount) {
		dataCodewords.push(PAD_CODEWORDS[padIndex]);
		padIndex = 1 - padIndex;
	}

	return dataCodewords;
}

function addErrorCorrectionAndInterleave(dataCodewords: number[], blockInfo: QrBlockInfo): number[] {
	const blockCount = blockInfo.blockCount;
	const shortBlockLength = Math.floor(blockInfo.dataCodewords / blockCount);
	const dataBlocks: number[][] = [];
	const eccBlocks: number[][] = [];

	for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
		const start = blockIndex * shortBlockLength;
		const block = dataCodewords.slice(start, start + shortBlockLength);
		dataBlocks.push(block);
		eccBlocks.push(createErrorCorrectionCodewords(block, blockInfo.eccCodewordsPerBlock));
	}

	const result: number[] = [];
	for (let i = 0; i < shortBlockLength; i++) {
		for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
			result.push(dataBlocks[blockIndex][i]);
		}
	}

	for (let i = 0; i < blockInfo.eccCodewordsPerBlock; i++) {
		for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
			result.push(eccBlocks[blockIndex][i]);
		}
	}

	return result;
}

const GF_EXP: number[] = [];
const GF_LOG: number[] = [];

function initializeGaloisFieldTables(): void {
	if (GF_EXP.length > 0) {
		return;
	}

	let value = 1;
	for (let i = 0; i < 255; i++) {
		GF_EXP[i] = value;
		GF_LOG[value] = i;
		value <<= 1;
		if ((value & 0x100) !== 0) {
			value ^= 0x11d;
		}
	}

	for (let i = 255; i < 512; i++) {
		GF_EXP[i] = GF_EXP[i - 255];
	}
}

function gfMultiply(left: number, right: number): number {
	if (left === 0 || right === 0) {
		return 0;
	}

	initializeGaloisFieldTables();
	return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function createErrorCorrectionCodewords(dataCodewords: number[], degree: number): number[] {
	const generator = createGeneratorPolynomial(degree);
	const result = createNumberArray(degree, 0);

	for (const dataCodeword of dataCodewords) {
		const factor = dataCodeword ^ result[0];
		for (let i = 0; i < degree - 1; i++) {
			result[i] = result[i + 1];
		}
		result[degree - 1] = 0;

		for (let i = 0; i < degree; i++) {
			result[i] ^= gfMultiply(generator[i], factor);
		}
	}

	return result;
}

function createGeneratorPolynomial(degree: number): number[] {
	const result = createNumberArray(degree, 0);
	result[degree - 1] = 1;

	let root = 1;
	for (let i = 0; i < degree; i++) {
		for (let j = 0; j < degree; j++) {
			result[j] = gfMultiply(result[j], root);
			if (j + 1 < degree) {
				result[j] ^= result[j + 1];
			}
		}
		root = gfMultiply(root, 0x02);
	}

	return result;
}

function createBestMatrix(
	version: number,
	errorCorrectionLevel: QrErrorCorrectionLevel,
	codewords: number[]
): { modules: boolean[][]; mask: number } {
	const size = getQrSize(version);
	const baseModules = createBooleanMatrix(size, false);
	const isFunction = createBooleanMatrix(size, false);
	drawFunctionPatterns(baseModules, isFunction, version);

	let bestModules = baseModules;
	let bestMask = 0;
	let bestPenalty = Number.MAX_SAFE_INTEGER;

	for (let mask = 0; mask < 8; mask++) {
		const modules = cloneBooleanMatrix(baseModules);
		drawCodewords(modules, isFunction, codewords, mask);
		drawFormatBits(modules, errorCorrectionLevel, mask);
		const penalty = calculatePenalty(modules);

		if (penalty < bestPenalty) {
			bestPenalty = penalty;
			bestMask = mask;
			bestModules = modules;
		}
	}

	return { modules: bestModules, mask: bestMask };
}

function getQrSize(version: number): number {
	return version * 4 + 17;
}

function drawFunctionPatterns(modules: boolean[][], isFunction: boolean[][], version: number): void {
	const size = modules.length;

	drawFinderPattern(modules, isFunction, 3, 3);
	drawFinderPattern(modules, isFunction, size - 4, 3);
	drawFinderPattern(modules, isFunction, 3, size - 4);

	for (let i = 8; i < size - 8; i++) {
		const dark = i % 2 === 0;
		setFunctionModule(modules, isFunction, 6, i, dark);
		setFunctionModule(modules, isFunction, i, 6, dark);
	}

	const alignmentPositions = getAlignmentPatternPositions(version);
	for (const x of alignmentPositions) {
		for (const y of alignmentPositions) {
			if ((x === 6 && y === 6) || (x === 6 && y === size - 7) || (x === size - 7 && y === 6)) {
				continue;
			}
			drawAlignmentPattern(modules, isFunction, x, y);
		}
	}

	reserveFormatModules(isFunction);
	setFunctionModule(modules, isFunction, 8, size - 8, true);
}

function drawFinderPattern(modules: boolean[][], isFunction: boolean[][], centerX: number, centerY: number): void {
	for (let dy = -4; dy <= 4; dy++) {
		for (let dx = -4; dx <= 4; dx++) {
			const x = centerX + dx;
			const y = centerY + dy;
			const distance = Math.max(Math.abs(dx), Math.abs(dy));
			const dark = distance !== 2 && distance !== 4;
			setFunctionModule(modules, isFunction, x, y, dark);
		}
	}
}

function drawAlignmentPattern(modules: boolean[][], isFunction: boolean[][], centerX: number, centerY: number): void {
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const distance = Math.max(Math.abs(dx), Math.abs(dy));
			setFunctionModule(modules, isFunction, centerX + dx, centerY + dy, distance !== 1);
		}
	}
}

function getAlignmentPatternPositions(version: number): number[] {
	if (version === 1) {
		return [];
	}

	return [6, getQrSize(version) - 7];
}

function reserveFormatModules(isFunction: boolean[][]): void {
	const size = isFunction.length;

	for (let i = 0; i <= 5; i++) {
		reserveFunctionModule(isFunction, 8, i);
	}
	reserveFunctionModule(isFunction, 8, 7);
	reserveFunctionModule(isFunction, 8, 8);
	reserveFunctionModule(isFunction, 7, 8);
	for (let i = 9; i < 15; i++) {
		reserveFunctionModule(isFunction, 14 - i, 8);
	}

	for (let i = 0; i < 8; i++) {
		reserveFunctionModule(isFunction, size - 1 - i, 8);
	}
	for (let i = 8; i < 15; i++) {
		reserveFunctionModule(isFunction, 8, size - 15 + i);
	}
	reserveFunctionModule(isFunction, 8, size - 8);
}

function drawFormatBits(modules: boolean[][], errorCorrectionLevel: QrErrorCorrectionLevel, mask: number): void {
	const size = modules.length;
	const data = (FORMAT_BITS_BY_ERROR_CORRECTION_LEVEL[errorCorrectionLevel] << 3) | mask;
	let remainder = data;
	for (let i = 0; i < 10; i++) {
		remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
	}
	const bits = ((data << 10) | remainder) ^ 0x5412;

	for (let i = 0; i <= 5; i++) {
		modules[i][8] = getBit(bits, i);
	}
	modules[7][8] = getBit(bits, 6);
	modules[8][8] = getBit(bits, 7);
	modules[8][7] = getBit(bits, 8);
	for (let i = 9; i < 15; i++) {
		modules[8][14 - i] = getBit(bits, i);
	}

	for (let i = 0; i < 8; i++) {
		modules[8][size - 1 - i] = getBit(bits, i);
	}
	for (let i = 8; i < 15; i++) {
		modules[size - 15 + i][8] = getBit(bits, i);
	}
	modules[size - 8][8] = true;
}

function drawCodewords(modules: boolean[][], isFunction: boolean[][], codewords: number[], mask: number): void {
	const size = modules.length;
	const totalBits = codewords.length * 8;
	let bitIndex = 0;
	let upward = true;

	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) {
			right--;
		}

		for (let vertical = 0; vertical < size; vertical++) {
			const y = upward ? size - 1 - vertical : vertical;
			for (let offset = 0; offset < 2; offset++) {
				const x = right - offset;
				if (isFunction[y][x]) {
					continue;
				}

				let dark = false;
				if (bitIndex < totalBits) {
					const codeword = codewords[Math.floor(bitIndex / 8)];
					dark = ((codeword >>> (7 - (bitIndex % 8))) & 1) !== 0;
					bitIndex++;
				}

				if (getMaskBit(mask, x, y)) {
					dark = !dark;
				}
				modules[y][x] = dark;
			}
		}

		upward = !upward;
	}
}

function getMaskBit(mask: number, x: number, y: number): boolean {
	switch (mask) {
		case 0:
			return (x + y) % 2 === 0;
		case 1:
			return y % 2 === 0;
		case 2:
			return x % 3 === 0;
		case 3:
			return (x + y) % 3 === 0;
		case 4:
			return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
		case 5:
			return ((x * y) % 2) + ((x * y) % 3) === 0;
		case 6:
			return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
		case 7:
			return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
		default:
			throw new Error('Invalid QR mask.');
	}
}

function setFunctionModule(modules: boolean[][], isFunction: boolean[][], x: number, y: number, dark: boolean): void {
	if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) {
		return;
	}

	modules[y][x] = dark;
	isFunction[y][x] = true;
}

function reserveFunctionModule(isFunction: boolean[][], x: number, y: number): void {
	if (x < 0 || y < 0 || y >= isFunction.length || x >= isFunction.length) {
		return;
	}

	isFunction[y][x] = true;
}

function calculatePenalty(modules: boolean[][]): number {
	return (
		calculateRunPenalty(modules) +
		calculateBlockPenalty(modules) +
		calculateFinderLikePenalty(modules) +
		calculateBalancePenalty(modules)
	);
}

function calculateRunPenalty(modules: boolean[][]): number {
	const size = modules.length;
	let penalty = 0;

	for (let y = 0; y < size; y++) {
		let runColor = modules[y][0];
		let runLength = 1;
		for (let x = 1; x < size; x++) {
			if (modules[y][x] === runColor) {
				runLength++;
			} else {
				penalty += getRunPenalty(runLength);
				runColor = modules[y][x];
				runLength = 1;
			}
		}
		penalty += getRunPenalty(runLength);
	}

	for (let x = 0; x < size; x++) {
		let runColor = modules[0][x];
		let runLength = 1;
		for (let y = 1; y < size; y++) {
			if (modules[y][x] === runColor) {
				runLength++;
			} else {
				penalty += getRunPenalty(runLength);
				runColor = modules[y][x];
				runLength = 1;
			}
		}
		penalty += getRunPenalty(runLength);
	}

	return penalty;
}

function getRunPenalty(runLength: number): number {
	return runLength >= 5 ? runLength - 2 : 0;
}

function calculateBlockPenalty(modules: boolean[][]): number {
	const size = modules.length;
	let penalty = 0;

	for (let y = 0; y < size - 1; y++) {
		for (let x = 0; x < size - 1; x++) {
			const color = modules[y][x];
			if (modules[y][x + 1] === color && modules[y + 1][x] === color && modules[y + 1][x + 1] === color) {
				penalty += 3;
			}
		}
	}

	return penalty;
}

function calculateFinderLikePenalty(modules: boolean[][]): number {
	const size = modules.length;
	let penalty = 0;
	const patternAfter = [true, false, true, true, true, false, true, false, false, false, false];
	const patternBefore = [false, false, false, false, true, false, true, true, true, false, true];

	for (let y = 0; y < size; y++) {
		for (let x = 0; x <= size - 11; x++) {
			if (matchesHorizontalPattern(modules, x, y, patternAfter) || matchesHorizontalPattern(modules, x, y, patternBefore)) {
				penalty += 40;
			}
		}
	}

	for (let x = 0; x < size; x++) {
		for (let y = 0; y <= size - 11; y++) {
			if (matchesVerticalPattern(modules, x, y, patternAfter) || matchesVerticalPattern(modules, x, y, patternBefore)) {
				penalty += 40;
			}
		}
	}

	return penalty;
}

function matchesHorizontalPattern(modules: boolean[][], x: number, y: number, pattern: boolean[]): boolean {
	for (let i = 0; i < pattern.length; i++) {
		if (modules[y][x + i] !== pattern[i]) {
			return false;
		}
	}
	return true;
}

function matchesVerticalPattern(modules: boolean[][], x: number, y: number, pattern: boolean[]): boolean {
	for (let i = 0; i < pattern.length; i++) {
		if (modules[y + i][x] !== pattern[i]) {
			return false;
		}
	}
	return true;
}

function calculateBalancePenalty(modules: boolean[][]): number {
	const size = modules.length;
	const total = size * size;
	const dark = countDarkModules(modules);
	return Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
}

function countDarkModules(modules: boolean[][]): number {
	let count = 0;
	for (let y = 0; y < modules.length; y++) {
		for (let x = 0; x < modules.length; x++) {
			if (modules[y][x]) {
				count++;
			}
		}
	}
	return count;
}

function getBit(value: number, index: number): boolean {
	return ((value >>> index) & 1) !== 0;
}

function createBooleanMatrix(size: number, value: boolean): boolean[][] {
	const matrix: boolean[][] = [];
	for (let y = 0; y < size; y++) {
		const row: boolean[] = [];
		for (let x = 0; x < size; x++) {
			row.push(value);
		}
		matrix.push(row);
	}
	return matrix;
}

function cloneBooleanMatrix(matrix: boolean[][]): boolean[][] {
	const clone: boolean[][] = [];
	for (const row of matrix) {
		clone.push(row.slice());
	}
	return clone;
}

function createNumberArray(length: number, value: number): number[] {
	const result: number[] = [];
	for (let i = 0; i < length; i++) {
		result.push(value);
	}
	return result;
}
