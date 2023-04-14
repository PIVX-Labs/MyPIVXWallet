import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';

export function hexToBytes(str) {
    return Buffer.from(str, 'hex');
}

export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

/**
 * Double SHA256 hash a byte array
 * @param {Array<number>} buff - Bytes to hash
 * @returns {Uint8Array} Hash buffer
 */
export function dSHA256(buff) {
    return sha256(sha256(new Uint8Array(buff)));
}
