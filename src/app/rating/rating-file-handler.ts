import { File } from 'w3ts';
import { PlayerRatingData, RatingFileData } from './types';
import { RATING_FILE_ENCRYPTION_ENABLED } from 'src/configs/game-settings';
import { encryptData, decryptData } from './rating-encryption';

/**
 * Handles all file I/O operations for rating data with optional encryption
 */

/**
 * Generate a simple checksum hash from single player data
 * @param player Player rating data
 * @returns Hex string checksum
 */
export function generateChecksum(player: PlayerRatingData): string {
	// Create data string from player stats (use math.floor to ensure integer formatting)
	const rating = math.floor(player.rating);
	const gamesPlayed = math.floor(player.gamesPlayed);
	const lastUpdated = math.floor(player.lastUpdated);
	const wins = math.floor(player.wins);
	const losses = math.floor(player.losses);
	const totalKillValue = math.floor(player.totalKillValue || 0);
	const totalDeathValue = math.floor(player.totalDeathValue || 0);
	const totalPlacement = math.floor(player.totalPlacement || 0);

	const data = `${player.btag}:${rating}:${gamesPlayed}:${lastUpdated}:${wins}:${losses}:${totalKillValue}:${totalDeathValue}:${totalPlacement}`;

	// Simple hash using string character codes
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		hash = (hash << 5) - hash + data.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash).toString(16);
}

/**
 * Validate checksum of rating file data
 * @param data Rating file data to validate
 * @returns True if checksum is valid
 */
export function validateChecksum(data: RatingFileData): boolean {
	const calculatedChecksum = generateChecksum(data.player);
	return calculatedChecksum === data.checksum;
}

/**
 * Read ratings from file (with optional decryption) - per-player file
 * @param filePath Path to ratings file (e.g., "risk/p1_abc123def456.txt")
 * @returns Rating file data or null if file doesn't exist or is invalid
 */
export function readRatings(filePath: string): RatingFileData | null {
	try {
		const rawContents = File.read(filePath);

		// File doesn't exist or is empty
		if (!rawContents || rawContents.trim() === '') {
			return null;
		}

		// Conditionally decrypt based on config setting
		let contents: string | null;
		if (RATING_FILE_ENCRYPTION_ENABLED) {
			// Encryption enabled: decrypt the file
			contents = decryptData(rawContents);
			if (!contents) {
				// Decryption failed - file is corrupted, will regenerate with starting rating
				print(`[RATING FILE] Decryption failed for ${filePath} - file corrupted, will regenerate`);
				return null;
			}
		} else {
			// Encryption disabled: use raw contents as-is (plain text)
			contents = rawContents;
		}

		// Parse custom format (simple key:value format)
		const lines = contents.split('\n');
		let version = 0;
		let seasonId = 0;
		let checksum = '';
		let playerData: PlayerRatingData | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '') continue;

			if (line.startsWith('version:')) {
				version = tonumber(line.substring(8)) || 0;
			} else if (line.startsWith('seasonId:')) {
				seasonId = tonumber(line.substring(9)) || 0;
			} else if (line.startsWith('checksum:')) {
				checksum = line.substring(9);
			} else if (line.startsWith('player:')) {
				const parts = line.substring(7).split(':');
				if (parts.length >= 6) {
					// Minimum fields: btag, rating, gamesPlayed, lastUpdated, wins, losses
					playerData = {
						btag: parts[0],
						rating: tonumber(parts[1]) || 0,
						gamesPlayed: tonumber(parts[2]) || 0,
						lastUpdated: tonumber(parts[3]) || 0,
						wins: tonumber(parts[4]) || 0,
						losses: tonumber(parts[5]) || 0,
					};
					// Optional: read K/D if present
					if (parts.length >= 8) {
						playerData.totalKillValue = tonumber(parts[6]) || 0;
						playerData.totalDeathValue = tonumber(parts[7]) || 0;
					}
					// Optional: read showRating if present (default: true)
					if (parts.length >= 9) {
						playerData.showRating = parts[8] === 'true';
					} else {
						playerData.showRating = true; // Default to true for existing files
					}
					// Optional: read totalPlacement if present (default: 0)
					if (parts.length >= 10) {
						playerData.totalPlacement = tonumber(parts[9]) || 0;
					}
				}
			} else if (line.startsWith('pending:')) {
				// Parse pending game data
				const parts = line.substring(8).split(':');
				if (parts.length >= 9 && playerData) {
					// Format: gameId:rating:wins:losses:gamesPlayed:totalKillValue:totalDeathValue:turn:timestamp:totalPlacement
					playerData.pendingGame = {
						gameId: parts[0],
						rating: tonumber(parts[1]) || 0,
						wins: tonumber(parts[2]) || 0,
						losses: tonumber(parts[3]) || 0,
						gamesPlayed: tonumber(parts[4]) || 0,
						totalKillValue: tonumber(parts[5]) || 0,
						totalDeathValue: tonumber(parts[6]) || 0,
						turn: tonumber(parts[7]) || 0,
						timestamp: tonumber(parts[8]) || 0,
						totalPlacement: parts.length >= 10 ? (tonumber(parts[9]) || 0) : 0,
					};
				}
			}
		}

		if (!version || !seasonId || !checksum || !playerData) {
			return null;
		}

		const data: RatingFileData = {
			version: version,
			seasonId: seasonId,
			checksum: checksum,
			player: playerData,
		};

		return data;
	} catch (error) {
		return null;
	}
}

/**
 * Write ratings to file (with optional encryption) - per-player file
 * @param filePath Path to ratings file
 * @param data Rating file data to write (contains single player)
 * @returns True if write succeeded
 */
export function writeRatings(filePath: string, data: RatingFileData): boolean {
	try {
		// Generate checksum for single player
		data.checksum = generateChecksum(data.player);

		// Serialize to custom format (simple key:value)
		const p = data.player;
		const lines: string[] = [];
		lines.push(`version:${data.version}`);
		lines.push(`seasonId:${data.seasonId}`);
		lines.push(`checksum:${data.checksum}`);
		// Format: player:btag:rating:gamesPlayed:lastUpdated:wins:losses:totalKillValue:totalDeathValue:showRating:totalPlacement
		const totalKillValue = math.floor(p.totalKillValue || 0);
		const totalDeathValue = math.floor(p.totalDeathValue || 0);
		const showRating = p.showRating !== undefined ? p.showRating : true; // Default to true
		const totalPlacement = math.floor(p.totalPlacement || 0);
		lines.push(`player:${p.btag}:${p.rating}:${p.gamesPlayed}:${p.lastUpdated}:${p.wins}:${p.losses}:${totalKillValue}:${totalDeathValue}:${showRating}:${totalPlacement}`);

		// Serialize pending game if exists
		if (p.pendingGame) {
			const pg = p.pendingGame;
			// Format: pending:gameId:rating:wins:losses:gamesPlayed:totalKillValue:totalDeathValue:turn:timestamp:totalPlacement
			lines.push(`pending:${pg.gameId}:${pg.rating}:${pg.wins}:${pg.losses}:${pg.gamesPlayed}:${pg.totalKillValue}:${pg.totalDeathValue}:${pg.turn}:${pg.timestamp}:${pg.totalPlacement}`);
		}

		// Manually join lines
		let plainContent = '';
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) {
				plainContent += '\n';
			}
			plainContent += lines[i];
		}

		// Conditionally encrypt based on config setting
		const finalContent = RATING_FILE_ENCRYPTION_ENABLED ? encryptData(plainContent) : plainContent;

		// Write data (encrypted or plain text based on config)
		File.write(filePath, finalContent);

		return true;
	} catch (error) {
		return false;
	}
}
