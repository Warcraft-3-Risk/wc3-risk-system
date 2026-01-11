import { File } from 'w3ts';
import { GlobalRatingFileData, PlayerRatingData } from './types';

/**
 * Handles file I/O operations for global ratings database
 * Manages aggregated rating data from all players
 */

// Reuse encryption functions from rating-file-handler
// (These would normally be imported, but tstl has limitations)

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(data: string): string {
	let result = '';
	let i = 0;

	while (i < data.length) {
		const a = data.charCodeAt(i++);
		const b = i < data.length ? data.charCodeAt(i++) : 0;
		const c = i < data.length ? data.charCodeAt(i++) : 0;

		const bitmap = (a << 16) | (b << 8) | c;

		result += BASE64_CHARS.charAt((bitmap >>> 18) & 63);
		result += BASE64_CHARS.charAt((bitmap >>> 12) & 63);
		result += i - 2 < data.length ? BASE64_CHARS.charAt((bitmap >>> 6) & 63) : '=';
		result += i - 1 < data.length ? BASE64_CHARS.charAt(bitmap & 63) : '=';
	}

	return result;
}

function base64Decode(encoded: string): string | null {
	try {
		let result = '';
		let i = 0;

		// Remove whitespace
		let cleanedEncoded = '';
		for (let j = 0; j < encoded.length; j++) {
			const char = encoded.charAt(j);
			if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
				cleanedEncoded += char;
			}
		}
		encoded = cleanedEncoded;

		while (i < encoded.length) {
			const a = BASE64_CHARS.indexOf(encoded.charAt(i++));
			const b = BASE64_CHARS.indexOf(encoded.charAt(i++));
			const c = BASE64_CHARS.indexOf(encoded.charAt(i++));
			const d = BASE64_CHARS.indexOf(encoded.charAt(i++));

			if (a === -1 || b === -1) return null;

			const bitmap = (a << 18) | (b << 12) | ((c === -1 ? 0 : c) << 6) | (d === -1 ? 0 : d);

			result += String.fromCharCode((bitmap >>> 16) & 255);
			if (c !== -1) result += String.fromCharCode((bitmap >>> 8) & 255);
			if (d !== -1) result += String.fromCharCode(bitmap & 255);
		}

		return result;
	} catch (error) {
		return null;
	}
}

function getEncryptionKey(): string {
	const parts = ['R1sK', 'W4r3', 'R4t1ng', 'Sy5t3m', '2026'];
	const seed = parts.join('_');

	let key = seed;
	for (let i = 0; i < 8; i++) {
		let hash = 0;
		for (let j = 0; j < key.length; j++) {
			hash = (hash << 5) - hash + key.charCodeAt(j);
			hash = hash & hash;
		}
		key += Math.abs(hash).toString(36);
	}

	return key;
}

function xorCipher(data: string, key: string): string {
	let result = '';
	const keyLen = key.length;

	for (let i = 0; i < data.length; i++) {
		const dataChar = data.charCodeAt(i);
		const keyChar = key.charCodeAt(i % keyLen);
		result += String.fromCharCode(dataChar ^ keyChar);
	}

	return result;
}

function encryptData(data: string): string {
	const key = getEncryptionKey();
	const encrypted = xorCipher(data, key);
	return base64Encode(encrypted);
}

function decryptData(encrypted: string): string | null {
	const decoded = base64Decode(encrypted);
	if (!decoded) return null;

	const key = getEncryptionKey();
	return xorCipher(decoded, key);
}

/**
 * Generate checksum hash for multiple players
 * Combines all player data into single hash
 * @param players Array of player rating data
 * @returns Hex string checksum
 */
export function generateGlobalChecksum(players: PlayerRatingData[]): string {
	// Sort players by btag for consistent ordering
	const sorted = players.slice().sort((a, b) => {
		if (a.btag < b.btag) return -1;
		if (a.btag > b.btag) return 1;
		return 0;
	});

	// Combine all player data
	let combinedData = '';
	for (let i = 0; i < sorted.length; i++) {
		const p = sorted[i];
		const rating = math.floor(p.rating);
		const gamesPlayed = math.floor(p.gamesPlayed);
		const lastUpdated = math.floor(p.lastUpdated);
		const wins = math.floor(p.wins);
		const losses = math.floor(p.losses);
		const totalKillValue = math.floor(p.totalKillValue);
		const totalDeathValue = math.floor(p.totalDeathValue);

		combinedData += `${p.btag}:${rating}:${gamesPlayed}:${lastUpdated}:${wins}:${losses}:${totalKillValue}:${totalDeathValue}|`;
	}

	// Generate hash
	let hash = 0;
	for (let i = 0; i < combinedData.length; i++) {
		hash = (hash << 5) - hash + combinedData.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash).toString(16);
}

/**
 * Validate checksum of global rating file data
 * @param data Global rating file data to validate
 * @returns True if checksum is valid
 */
export function validateGlobalChecksum(data: GlobalRatingFileData): boolean {
	const calculatedChecksum = generateGlobalChecksum(data.players);
	return calculatedChecksum === data.checksum;
}

/**
 * Get global ratings file path
 * @param seasonId Season identifier
 * @param isDev Whether in developer mode
 * @returns File path
 */
function getGlobalFilePath(seasonId: number, isDev: boolean): string {
	const prefix = isDev ? 'dev_global_ratings' : 'global_ratings';
	return `risk/${prefix}_s${seasonId}.txt`;
}

/**
 * Read global ratings database from file
 * @param seasonId Season identifier
 * @param isDev Whether in developer mode
 * @returns Global rating data or null if file doesn't exist/is invalid
 */
export function readGlobalRatings(seasonId: number, isDev: boolean): GlobalRatingFileData | null {
	try {
		const filePath = getGlobalFilePath(seasonId, isDev);
		const encryptedContents = File.read(filePath);

		// File doesn't exist or is empty
		if (!encryptedContents || encryptedContents.trim() === '') {
			return null;
		}

		// Decrypt the file contents
		const contents = decryptData(encryptedContents);
		if (!contents) {
			return null;
		}

		// Parse custom format
		const lines = contents.split('\n');
		let version = 0;
		let seasonIdParsed = 0;
		let checksum = '';
		let playerCount = 0;
		const players: PlayerRatingData[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '') continue;

			if (line.startsWith('version:')) {
				version = tonumber(line.substring(8)) || 0;
			} else if (line.startsWith('seasonId:')) {
				seasonIdParsed = tonumber(line.substring(9)) || 0;
			} else if (line.startsWith('checksum:')) {
				checksum = line.substring(9);
			} else if (line.startsWith('playerCount:')) {
				playerCount = tonumber(line.substring(12)) || 0;
			} else if (line.startsWith('player:')) {
				const parts = line.substring(7).split(':');
				if (parts.length >= 8) {
					const playerData: PlayerRatingData = {
						btag: parts[0],
						rating: tonumber(parts[1]) || 0,
						gamesPlayed: tonumber(parts[2]) || 0,
						lastUpdated: tonumber(parts[3]) || 0,
						wins: tonumber(parts[4]) || 0,
						losses: tonumber(parts[5]) || 0,
						totalKillValue: tonumber(parts[6]) || 0,
						totalDeathValue: tonumber(parts[7]) || 0,
					};
					players.push(playerData);
				}
			}
		}

		if (!version || !seasonIdParsed || !checksum) {
			return null;
		}

		// Validate player count matches
		if (playerCount !== players.length) {
			print(`[GLOBAL RATINGS] Player count mismatch: expected ${playerCount}, got ${players.length}`);
			return null;
		}

		const data: GlobalRatingFileData = {
			version: version,
			seasonId: seasonIdParsed,
			checksum: checksum,
			players: players,
			playerCount: playerCount,
		};

		// Validate checksum
		if (!validateGlobalChecksum(data)) {
			print(`[GLOBAL RATINGS] Checksum validation failed - file may be corrupted`);
			return null;
		}

		return data;
	} catch (error) {
		print(`[GLOBAL RATINGS] Error reading global ratings: ${error}`);
		return null;
	}
}

/**
 * Write global ratings database to file
 * @param data Global rating data to write
 * @param seasonId Season identifier
 * @param isDev Whether in developer mode
 * @returns True if write succeeded
 */
export function writeGlobalRatings(data: GlobalRatingFileData, seasonId: number, isDev: boolean): boolean {
	try {
		const filePath = getGlobalFilePath(seasonId, isDev);

		// Update metadata
		data.playerCount = data.players.length;
		data.checksum = generateGlobalChecksum(data.players);

		// Serialize to custom format
		const lines: string[] = [];
		lines.push(`version:${data.version}`);
		lines.push(`seasonId:${data.seasonId}`);
		lines.push(`checksum:${data.checksum}`);
		lines.push(`playerCount:${data.playerCount}`);

		// Add each player
		for (let i = 0; i < data.players.length; i++) {
			const p = data.players[i];
			lines.push(`player:${p.btag}:${p.rating}:${p.gamesPlayed}:${p.lastUpdated}:${p.wins}:${p.losses}:${p.totalKillValue}:${p.totalDeathValue}`);
		}

		// Join lines
		let plainContent = '';
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) {
				plainContent += '\n';
			}
			plainContent += lines[i];
		}

		// Encrypt the content
		const encryptedContent = encryptData(plainContent);

		// Create backup of existing file
		const backupPath = filePath.replace('.txt', '.bak');
		const existingData = File.read(filePath);
		if (existingData && existingData.trim() !== '') {
			try {
				File.write(backupPath, existingData);
			} catch (backupError) {
				// Backup failed but continue
			}
		}

		// Write encrypted data
		File.write(filePath, encryptedContent);

		return true;
	} catch (error) {
		print(`[GLOBAL RATINGS] Error writing global ratings: ${error}`);
		return false;
	}
}
