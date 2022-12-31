import conv from "binstring";
import { sha256 } from '@noble/hashes/sha256';

export function hexToBytes(str) {
    return conv(str, {in: "hex", out: "binary"});
}

export function bytesToHex(bytes) {
    return conv(bytes, {in: "binary", out: "hex"});
}

/**
   @returns {Uint8Array} double sha256 or the buffer
 */
export function dSHA256(buff) {
    return sha256(sha256(buff));
}
