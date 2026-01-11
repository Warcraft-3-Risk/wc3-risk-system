import { File } from 'w3ts';
import { PlayerRatingData, RatingFileData } from './types';
import { RANKED_ENCRYPTION_ENABLED } from 'src/configs/game-settings';
import { debugPrint } from '../utils/debug-print';

/**
 * Handles all file I/O operations for rating data with optional encryption
 */

// Base64 encoding table
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode string to Base64
 * @param data String to encode
 * @returns Base64 encoded string
 */
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

/**
 * Decode Base64 string
 * @param encoded Base64 encoded string
 * @returns Decoded string or null if invalid
 */
function base64Decode(encoded: string): string | null {
	try {
		let result = '';
		let i = 0;

		// Remove any whitespace manually (can't use regex in tstl)
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

/**
 * Generate encryption key from seed
 * Uses a deterministic algorithm to generate a complex key
 * @returns Encryption key string
 */
function getEncryptionKey(): string {
	// Obfuscated key generation - don't make it too obvious in the code
	const parts = ['R1sK', 'W4r3', 'R4t1ng', 'Sy5t3m', '2026'];
	const seed = parts.join('_');

	// Expand key to at least 256 characters for better security
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

/**
 * XOR encrypt/decrypt data with key
 * XOR is symmetric, so same function works for both encryption and decryption
 * @param data Data to encrypt/decrypt
 * @param key Encryption key
 * @returns Encrypted/decrypted data
 */
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

/**
 * Encrypt data using XOR cipher + Base64 encoding
 * @param data Plain text data
 * @returns Encrypted and encoded string
 */
function encryptData(data: string): string {
	const key = getEncryptionKey();
	const encrypted = xorCipher(data, key);
	return base64Encode(encrypted);
}

/**
 * Decrypt data using Base64 decoding + XOR cipher
 * @param encrypted Encrypted and encoded string
 * @returns Decrypted plain text or null if decryption failed
 */
function decryptData(encrypted: string): string | null {
	const decoded = base64Decode(encrypted);
	if (!decoded) return null;

	const key = getEncryptionKey();
	return xorCipher(decoded, key);
}

/**
 * Generate a simple checksum hash from single player data
 * @param player Player rating data
 * @returns Hex string checksum
 */
export function generateChecksum(player: PlayerRatingData): string {
	// Create data string from player stats (use math.floor to ensure integer formatting)
	// Note: K/D values excluded from checksum (deprecated fields)
	const rating = math.floor(player.rating);
	const gamesPlayed = math.floor(player.gamesPlayed);
	const lastUpdated = math.floor(player.lastUpdated);
	const wins = math.floor(player.wins);
	const losses = math.floor(player.losses);

	const data = `${player.btag}:${rating}:${gamesPlayed}:${lastUpdated}:${wins}:${losses}`;

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
	debugPrint(`Checksum validation - Calculated: ${calculatedChecksum}, Stored: ${data.checksum}`);
	const isValid = calculatedChecksum === data.checksum;
	if (!isValid) {
		debugPrint(`CHECKSUM MISMATCH! This indicates data corruption or tampering.`);
	}
	return isValid;
}

/**
 * Read ratings from file (with optional decryption) - per-player file
 * @param filePath Path to ratings file (e.g., "risk/ratings_PlayerName_s1.txt")
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
		if (RANKED_ENCRYPTION_ENABLED) {
			contents = decryptData(rawContents);
			if (!contents) {
				// Decryption failed - file might be corrupted or tampered with
				return null;
			}
		} else {
			// No encryption - use raw contents as-is
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
					// Optional backward compatibility: read K/D if present (but deprecated)
					if (parts.length >= 8) {
						playerData.totalKillValue = tonumber(parts[6]) || 0;
						playerData.totalDeathValue = tonumber(parts[7]) || 0;
					}
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
 * Write ratings to file with backup (with optional encryption) - per-player file
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
		// Format: player:btag:rating:gamesPlayed:lastUpdated:wins:losses
		// Note: K/D fields removed from new format (but old files with K/D are still readable)
		lines.push(`player:${p.btag}:${p.rating}:${p.gamesPlayed}:${p.lastUpdated}:${p.wins}:${p.losses}`);

		// Manually join lines
		let plainContent = '';
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) {
				plainContent += '\n';
			}
			plainContent += lines[i];
		}

		// Conditionally encrypt based on config setting
		const finalContent = RANKED_ENCRYPTION_ENABLED ? encryptData(plainContent) : plainContent;

		// Create backup of existing file (only if it exists)
		const backupPath = filePath.replace('.txt', '.bak');
		const existingData = File.read(filePath);
		if (existingData && existingData.trim() !== '') {
			try {
				File.write(backupPath, existingData);
			} catch (backupError) {
				// Backup failed but continue with main write
			}
		}

		// Write data (encrypted or plain text based on config)
		File.write(filePath, finalContent);

		return true;
	} catch (error) {
		return false;
	}
}
