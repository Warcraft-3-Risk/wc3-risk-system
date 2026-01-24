import { File } from 'w3ts';
import { OthersRatingFileData, PlayerRatingData } from './types';
import { RANKED_SEASON_RESET_KEY, RATING_FILE_ENCRYPTION_ENABLED } from 'src/configs/game-settings';
import { encryptData, decryptData } from './rating-encryption';
import { HexColors } from '../utils/hex-colors';

/**
 * Handles file I/O operations for "others" ratings database
 * Manages aggregated rating data from all OTHER players (not yourself)
 */

/**
 * Generate checksum hash for multiple players
 * Combines all player data into single hash
 * @param players Array of player rating data
 * @returns Hex string checksum
 */
export function generateOthersChecksum(players: PlayerRatingData[]): string {
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
		const totalKillValue = math.floor(p.totalKillValue || 0);
		const totalDeathValue = math.floor(p.totalDeathValue || 0);
		const totalPlacement = math.floor(p.totalPlacement || 0);

		combinedData += `${p.btag}:${rating}:${gamesPlayed}:${lastUpdated}:${wins}:${losses}:${totalKillValue}:${totalDeathValue}:${totalPlacement}|`;
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
 * Validate checksum of others rating file data
 * @param data Others rating file data to validate
 * @returns True if checksum is valid
 */
export function validateOthersChecksum(data: OthersRatingFileData): boolean {
	const calculatedChecksum = generateOthersChecksum(data.players);
	return calculatedChecksum === data.checksum;
}

/**
 * Get others ratings file path
 * File naming is obscured to prevent easy identification
 * @param hash Hash identifier for player (from sanitizePlayerName)
 * @param seasonId Season identifier
 * @returns File path
 */
function getOthersFilePath(hash: string, seasonId: number): string {
	// Include reset key if configured (allows resetting data without changing season ID)
	const resetKey = RANKED_SEASON_RESET_KEY || '';
	// Must use .txt extension - WC3 only supports .txt and .pld file extensions
	return `risk/q${seasonId}${resetKey}_${hash}.txt`;
}

/**
 * Read others ratings database from file
 * @param sanitizedName Sanitized player name (from sanitizePlayerName)
 * @param seasonId Season identifier
 * @returns Others rating data or null if file doesn't exist/is invalid
 */
export function readOthersRatings(sanitizedName: string, seasonId: number): OthersRatingFileData | null {
	try {
		const filePath = getOthersFilePath(sanitizedName, seasonId);
		const rawContents = File.read(filePath);

		// File doesn't exist or is empty - this is OK, will be created later
		if (!rawContents || rawContents.trim() === '') {
			return null;
		}

		// Conditionally decrypt based on config setting
		let contents: string | null;
		if (RATING_FILE_ENCRYPTION_ENABLED) {
			// Encryption enabled: decrypt the file
			contents = decryptData(rawContents);
			if (!contents) {
				// Decryption failed - file is corrupted, will be regenerated
				print(`${HexColors.RED}WARNING:|r External ratings decryption failed - file corrupted, will regenerate`);
				return null;
			}
		} else {
			// Encryption disabled: use raw contents as-is (plain text)
			contents = rawContents;
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
						totalPlacement: parts.length >= 9 ? (tonumber(parts[8]) || 0) : 0,
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
			print(`${HexColors.RED}WARNING:|r External ratings player count mismatch: expected ${playerCount}, got ${players.length}`);
			return null;
		}

		const data: OthersRatingFileData = {
			version: version,
			seasonId: seasonIdParsed,
			checksum: checksum,
			players: players,
			playerCount: playerCount,
		};

		// Validate checksum
		if (!validateOthersChecksum(data)) {
			print(`${HexColors.RED}WARNING:|r External ratings checksum validation failed - file corrupted, will regenerate`);
			return null;
		}

		return data;
	} catch (error) {
		print(`${HexColors.RED}WARNING:|r Error reading external ratings: ${error}`);
		return null;
	}
}

/**
 * Write others ratings database to file
 * @param data Others rating data to write
 * @param sanitizedName Sanitized player name (from sanitizePlayerName)
 * @param seasonId Season identifier
 * @returns True if write succeeded
 */
export function writeOthersRatings(data: OthersRatingFileData, sanitizedName: string, seasonId: number): boolean {
	try {
		const filePath = getOthersFilePath(sanitizedName, seasonId);

		// Update metadata
		data.playerCount = data.players.length;
		data.checksum = generateOthersChecksum(data.players);

		// Serialize to custom format
		const lines: string[] = [];
		lines.push(`version:${data.version}`);
		lines.push(`seasonId:${data.seasonId}`);
		lines.push(`checksum:${data.checksum}`);
		lines.push(`playerCount:${data.playerCount}`);

		// Add each player
		for (let i = 0; i < data.players.length; i++) {
			const p = data.players[i];
			const totalPlacement = math.floor(p.totalPlacement || 0);
			lines.push(`player:${p.btag}:${p.rating}:${p.gamesPlayed}:${p.lastUpdated}:${p.wins}:${p.losses}:${p.totalKillValue || 0}:${p.totalDeathValue || 0}:${totalPlacement}`);
		}

		// Join lines
		let plainContent = '';
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) {
				plainContent += '\n';
			}
			plainContent += lines[i];
		}

		// Conditionally encrypt based on config setting
		let finalContent: string;
		if (RATING_FILE_ENCRYPTION_ENABLED) {
			// Encryption enabled: encrypt the data
			finalContent = encryptData(plainContent);
		} else {
			// Encryption disabled: use plain text
			finalContent = plainContent;
		}

		// Write data (encrypted or plain based on mode)
		File.write(filePath, finalContent);

		return true;
	} catch (error) {
		print(`${HexColors.RED}WARNING:|r Error writing external ratings: ${error}`);
		return false;
	}
}
