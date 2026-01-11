import { PlayerRatingData, SyncMessage } from './types';
import { RATING_SYNC_CHUNK_SIZE } from '../../configs/game-settings';

/**
 * P2P Rating Sync Protocol
 * Handles encoding/decoding of rating data for transmission between players
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PROTOCOL_PREFIX = 'RATING_SYNC';
const FIELD_SEPARATOR = ':';

/**
 * Base64 encode a string
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
 * Base64 decode a string
 * @param encoded Base64 encoded string
 * @returns Decoded string or null if invalid
 */
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

/**
 * Serialize player rating data to compact string format
 * Format: btag:rating:games:updated:wins:losses:killVal:deathVal
 * @param playerData Player rating data to serialize
 * @returns Serialized string
 */
function serializePlayerData(playerData: PlayerRatingData): string {
	const parts = [
		playerData.btag,
		math.floor(playerData.rating).toString(),
		math.floor(playerData.gamesPlayed).toString(),
		math.floor(playerData.lastUpdated).toString(),
		math.floor(playerData.wins).toString(),
		math.floor(playerData.losses).toString(),
		math.floor(playerData.totalKillValue).toString(),
		math.floor(playerData.totalDeathValue).toString(),
	];

	return parts.join(FIELD_SEPARATOR);
}

/**
 * Deserialize player rating data from compact string format
 * @param data Serialized string
 * @returns Player rating data or null if invalid
 */
function deserializePlayerData(data: string): PlayerRatingData | null {
	try {
		const parts = data.split(FIELD_SEPARATOR);
		if (parts.length < 8) {
			return null;
		}

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

		// Basic validation
		if (!playerData.btag || playerData.btag === '') {
			return null;
		}

		return playerData;
	} catch (error) {
		return null;
	}
}

/**
 * Split a string into chunks of specified size
 * @param str String to chunk
 * @param chunkSize Maximum chunk size
 * @returns Array of chunks
 */
function chunkString(str: string, chunkSize: number): string[] {
	const chunks: string[] = [];
	let i = 0;

	while (i < str.length) {
		const end = Math.min(i + chunkSize, str.length);
		chunks.push(str.substring(i, end));
		i = end;
	}

	return chunks;
}

/**
 * Encode player data for P2P sync transmission
 * Serializes, encodes, chunks, and wraps in protocol
 * @param playerData Player rating data to encode
 * @param senderId Sender's player ID (0-23)
 * @returns Array of sync messages ready for transmission
 */
export function encodePlayerDataForSync(playerData: PlayerRatingData, senderId: number): SyncMessage[] {
	// Serialize player data
	const serialized = serializePlayerData(playerData);

	// Base64 encode
	const encoded = base64Encode(serialized);

	// Chunk into segments
	const chunks = chunkString(encoded, RATING_SYNC_CHUNK_SIZE);
	const totalChunks = chunks.length;

	// Create sync messages
	const messages: SyncMessage[] = [];
	for (let i = 0; i < chunks.length; i++) {
		messages.push({
			type: 'RATING_DATA',
			senderId: senderId,
			chunkIndex: i,
			totalChunks: totalChunks,
			payload: chunks[i],
		});
	}

	return messages;
}

/**
 * Encode a sync message to protocol string format
 * Format: RATING_SYNC|senderId|chunkIdx/totalChunks|payload
 * @param message Sync message to encode
 * @returns Protocol string
 */
export function encodeSyncMessageToString(message: SyncMessage): string {
	return `${PROTOCOL_PREFIX}|${message.senderId}|${message.chunkIndex}/${message.totalChunks}|${message.payload}`;
}

/**
 * Decode a protocol string into a sync message
 * @param protocolString Protocol string to decode
 * @returns Sync message or null if invalid
 */
export function decodeSyncMessage(protocolString: string): SyncMessage | null {
	try {
		// Validate prefix
		if (!protocolString.startsWith(PROTOCOL_PREFIX)) {
			return null;
		}

		// Split by pipe delimiter
		const parts = protocolString.split('|');
		if (parts.length !== 4) {
			return null;
		}

		// Parse sender ID
		const senderId = tonumber(parts[1]);
		if (!senderId || senderId < 0 || senderId > 23) {
			return null;
		}

		// Parse chunk info
		const chunkInfo = parts[2].split('/');
		if (chunkInfo.length !== 2) {
			return null;
		}

		const chunkIndex = tonumber(chunkInfo[0]);
		const totalChunks = tonumber(chunkInfo[1]);

		if (!chunkIndex || !totalChunks || chunkIndex < 0 || totalChunks <= 0 || chunkIndex >= totalChunks) {
			return null;
		}

		// Get payload
		const payload = parts[3];
		if (!payload || payload === '') {
			return null;
		}

		return {
			type: 'RATING_DATA',
			senderId: senderId,
			chunkIndex: chunkIndex,
			totalChunks: totalChunks,
			payload: payload,
		};
	} catch (error) {
		return null;
	}
}

/**
 * Reassemble chunks from a single player into player data
 * @param chunks Map of chunk index to payload
 * @param totalChunks Expected total number of chunks
 * @returns Player rating data or null if incomplete/invalid
 */
export function reassembleChunks(chunks: Map<number, string>, totalChunks: number): PlayerRatingData | null {
	try {
		// Verify we have all chunks
		if (chunks.size !== totalChunks) {
			return null;
		}

		// Reassemble in order
		let encoded = '';
		for (let i = 0; i < totalChunks; i++) {
			const chunk = chunks.get(i);
			if (!chunk) {
				return null;
			}
			encoded += chunk;
		}

		// Decode from Base64
		const serialized = base64Decode(encoded);
		if (!serialized) {
			return null;
		}

		// Deserialize to player data
		return deserializePlayerData(serialized);
	} catch (error) {
		return null;
	}
}

/**
 * Validate a sync message
 * @param message Sync message to validate
 * @returns True if message is valid
 */
export function validateSyncMessage(message: SyncMessage): boolean {
	// Validate type
	if (message.type !== 'RATING_DATA' && message.type !== 'SYNC_COMPLETE') {
		return false;
	}

	// Validate sender ID
	if (message.senderId < 0 || message.senderId > 23) {
		return false;
	}

	// Validate chunk info
	if (message.chunkIndex < 0 || message.totalChunks <= 0 || message.chunkIndex >= message.totalChunks) {
		return false;
	}

	// Validate payload
	if (!message.payload || message.payload === '') {
		return false;
	}

	return true;
}
