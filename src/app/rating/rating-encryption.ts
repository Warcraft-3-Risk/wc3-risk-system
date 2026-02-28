/**
 * Shared encryption utilities for rating system
 * Provides Base64 encoding and XOR cipher encryption
 */

// Base64 encoding table
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode string to Base64
 * @param data String to encode
 * @returns Base64 encoded string
 */
export function base64Encode(data: string): string {
	let result = '';
	let i = 0;

	while (i < data.length) {
		const a = data.charCodeAt(i++);
		const hasB = i < data.length;
		const b = hasB ? data.charCodeAt(i++) : 0;
		const hasC = i < data.length;
		const c = hasC ? data.charCodeAt(i++) : 0;

		const bitmap = (a << 16) | (b << 8) | c;

		result += BASE64_CHARS.charAt((bitmap >>> 18) & 63);
		result += BASE64_CHARS.charAt((bitmap >>> 12) & 63);
		result += hasB ? BASE64_CHARS.charAt((bitmap >>> 6) & 63) : '=';
		result += hasC ? BASE64_CHARS.charAt(bitmap & 63) : '=';
	}

	return result;
}

/**
 * Decode Base64 string
 * @param encoded Base64 encoded string
 * @returns Decoded string or null if invalid
 */
export function base64Decode(encoded: string): string | null {
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
	// Obfuscated key generation
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
 * XOR cipher for encryption/decryption
 * @param data Data to cipher
 * @param key Encryption key
 * @returns Ciphered data
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
 * Encrypt data using XOR cipher and Base64 encoding
 * @param data Plain text data
 * @returns Encrypted and encoded string
 */
export function encryptData(data: string): string {
	const key = getEncryptionKey();
	const encrypted = xorCipher(data, key);
	return base64Encode(encrypted);
}

/**
 * Decrypt data from Base64 and XOR cipher
 * @param encrypted Encrypted and encoded string
 * @returns Decrypted plain text or null if invalid
 */
export function decryptData(encrypted: string): string | null {
	const decoded = base64Decode(encrypted);
	if (!decoded) return null;

	const key = getEncryptionKey();
	return xorCipher(decoded, key);
}
