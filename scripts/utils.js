import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';

export const pubKeyHashNetworkLen = 21;
export const pubChksum = 4;
export const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

export function hexToBytes(str) {
    return Buffer.from(str, 'hex');
}

export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

export function reverseAndSwapEndianess(hex) {
    return bytesToHex(hexToBytes(hex).reverse());
}

/**
 * Double SHA256 hash a byte array
 * @param {Array<number>} buff - Bytes to hash
 * @returns {Uint8Array} Hash buffer
 */
export function dSHA256(buff) {
    return sha256(sha256(new Uint8Array(buff)));
}

/* --- UTILS --- */
// Cryptographic Random-Gen
export function getSafeRand(nSize = 32) {
    return crypto.getRandomValues(new Uint8Array(nSize));
}

export const MAP_ALPHANUMERIC =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random Alpha-Numeric sequence
 * @param {number} nSize - The amount of characters to generate
 * @returns {string} - A random alphanumeric string of nSize length
 */
export function getAlphaNumericRand(nSize = 32) {
    let result = '';
    const randValues = getSafeRand(nSize);
    for (const byte of randValues) {
        const index = byte % MAP_ALPHANUMERIC.length;
        result += MAP_ALPHANUMERIC.charAt(index);
    }
    return result;
}

// Writes a sequence of Array-like bytes into a location within a Uint8Array
export function writeToUint8(arr, bytes, pos) {
    const arrLen = arr.length;
    // Sanity: ensure an overflow cannot occur, if one is detected, somewhere in MPW's state could be corrupted.
    if (arrLen - pos - bytes.length < 0) {
        const strERR =
            'CRITICAL: Overflow detected (' +
            (arrLen - pos - bytes.length) +
            '), possible state corruption, backup and refresh advised.';
        throw new Error(strERR);
    }
    let i = 0;
    while (pos < arrLen) arr[pos++] = bytes[i++];
}

/** Convert a 2D array into a CSV string */
export function arrayToCSV(data) {
    return data
        .map(
            (row) =>
                row
                    .map(String) // convert every value to String
                    .map((v) => v.replaceAll('"', '""')) // escape double colons
                    .map((v) => `"${v}"`) // quote it
                    .join(',') // comma-separated
        )
        .join('\r\n'); // rows starting on new lines
}

/**
 * An artificial sleep function to pause code execution
 *
 * @param {Number} ms - The milliseconds to sleep
 *
 * @example
 * // Pause an asynchronous script for 1 second
 * await sleep(1000);
 */
export function sleep(ms) {
    return new Promise((res, _) => setTimeout(res, ms));
}

/**
 * Returns a random number in the range [0, N)
 * @param {number} N
 * @returns {number}
 */
export function getRandomInt(N) {
    return Math.floor(Math.random() * N);
}

/**
 * Returns a random element of arr
 * @template T
 * @param {T[]} arr
 * @returns T
 */
export function getRandomElement(arr) {
    return arr[getRandomInt(arr.length)];
}

/**
 * @param {string} blockbookUrl - Blockbook base URL
 * @param {string} address
 * @returns {string} URL to blockbook address
 */
export function getBlockbookUrl(blockbookUrl, address) {
    const urlPart = address.startsWith('xpub') ? 'xpub' : 'address';
    return `${blockbookUrl.replace(/\/$/, '')}/${urlPart}/${address}`;
}

export function timeToDate(time) {
    // Prepare time formatting
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    const dateOptions = {
        month: 'short',
        day: 'numeric',
    };
    const yearOptions = {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
    };
    // Unconfirmed Txs are simply 'Pending'
    if (!time) return 'Pending';
    const now = new Date();
    const date = new Date(time * 1000);

    // Check if it was today (same day, month and year)
    const fToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    // Figure out the most convenient time display for this Tx
    if (fToday) {
        // TXs made today are displayed by time (02:13 pm)
        return date.toLocaleTimeString(undefined, timeOptions);
    } else if (date.getFullYear() === now.getFullYear()) {
        // TXs older than today are displayed by short date (18 Nov)
        return date.toLocaleDateString(undefined, dateOptions);
    } else {
        // TXs in previous years are displayed by their short date and year (18 Nov 2023)
        return date.toLocaleDateString(undefined, yearOptions);
    }
}
