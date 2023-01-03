import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';

export function hexToBytes(str) {
    return Buffer.from(str, 'hex');
}

export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

/**
   @returns {Uint8Array} double sha256 or the buffer
 */
export function dSHA256(buff) {
    return sha256(sha256(new Uint8Array(buff)));
}
